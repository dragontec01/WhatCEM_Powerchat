import { CampaignTemplate, campaignTemplates } from "@shared/db/schema";
import { db } from "../db";
import { storage } from "../storage";
import { eq, and, desc } from 'drizzle-orm';
import { logger } from "./logger";
import axios from "axios";

const WHATSAPP_GRAPH_URL = 'https://graph.facebook.com';
const WHATSAPP_API_VERSION = 'v23.0';

export interface TemplateErrorResponse { 
    error: string;
    status: number;
    errorCode?: number;
    errorType?: string; 
}

/**
 * Upload media for template using WhatsApp Resumable Upload API
 * This is required for template creation, not the regular media upload endpoint
 * Reference: https://developers.facebook.com/docs/graph-api/guides/upload
 */
async function uploadMediaForTemplate(
  mediaUrl: string,
  accessToken: string,
  wabaId: string,
  appId?: string
): Promise<string> {

  const uploadId = wabaId || appId;

  if (!uploadId) {
    throw new Error('Either WABA ID or App ID is required for media upload');
  }

  try {
    logger.info('whatsapp-templates', 'Starting Resumable Upload for template media', {
      mediaUrl,
      uploadId,
      usingWabaId: !!wabaId,
      usingAppId: !wabaId && !!appId
    });


    const mediaResponse = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });


    const contentType = mediaResponse.headers['content-type'] || 'application/octet-stream';
    const urlParts = mediaUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const fileSize = mediaResponse.data.byteLength;

    logger.info('whatsapp-templates', 'Media downloaded', {
      filename,
      contentType,
      fileSize
    });


    const sessionUrl = `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${uploadId}/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(contentType)}&access_token=${accessToken}`;

    logger.info('whatsapp-templates', 'Creating upload session', {
      sessionUrl: sessionUrl.replace(accessToken, 'REDACTED'),
      uploadId
    });

    const sessionResponse = await axios.post(sessionUrl, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!sessionResponse.data?.id) {
      throw new Error('Failed to create upload session: No session ID returned');
    }

    const uploadSessionId = sessionResponse.data.id;
    logger.info('whatsapp-templates', 'Upload session created', {
      uploadSessionId
    });


    const uploadUrl = `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${uploadSessionId}`;

    logger.info('whatsapp-templates', 'Uploading file data', {
      uploadUrl,
      fileSize
    });

    const uploadResponse = await axios.post(uploadUrl, mediaResponse.data, {
      headers: {
        'Authorization': `OAuth ${accessToken}`,
        'file_offset': '0',
        'Content-Type': 'application/octet-stream'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000
    });

    if (!uploadResponse.data?.h) {
      throw new Error('Failed to upload media: No media handle returned');
    }

    const mediaHandle = uploadResponse.data.h;
    logger.info('whatsapp-templates', 'Media uploaded successfully via Resumable Upload API', {
      mediaHandle
    });

    return mediaHandle;
  } catch (error: any) {
    logger.error('whatsapp-templates', 'Error uploading media for template', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      uploadId,
      usingWabaId: !!wabaId,
      usingAppId: !wabaId && !!appId
    });


    if (wabaId && appId && error.response?.status === 400) {
      logger.info('whatsapp-templates', 'Retrying with App ID instead of WABA ID');
      return uploadMediaForTemplate(mediaUrl, accessToken, '', appId);
    }

    throw error;
  }
}

export const createWabaTemplate = async (bodyTemplate: {
    name: string;
    description?: string;
    whatsappTemplateCategory: 'utility' | 'marketing' | 'authentication';
    whatsappTemplateLanguage: 'en' | 'en_us' | 'es' | 'pt_BR' | 'fr' | 'de' | 'it' | 'ar' | 'hi';
    content: string;
    variables: string[];
    connectionId: number;
    headerType: 'none' | 'text' | 'image' | 'video' | 'document';
    headerText?: string;
    headerMediaUrl?: string;
    footerText?: string;
}, user: any): Promise<CampaignTemplate | TemplateErrorResponse> => {

    const {
        name,
        description,
        whatsappTemplateCategory,
        whatsappTemplateLanguage,
        content,
        variables,
        connectionId,
        headerType,
        headerText,
        headerMediaUrl,
        footerText
    } = bodyTemplate;

    const existingTemplate = await db
        .select()
        .from(campaignTemplates)
        .where(
        and(
            eq(campaignTemplates.companyId, user?.companyId),
            eq(campaignTemplates.name, name)
        )
        )
        .limit(1);

    if (existingTemplate && existingTemplate.length > 0) {
        return { error: 'A template with this name already exists', status: 400 };
    }


    const whatsappChannel = await storage.getChannelConnection(connectionId);

    if (!whatsappChannel) {
        logger.error('whatsapp-templates', 'WhatsApp channel not found', { connectionId });
        return { error: 'WhatsApp connection not found', status: 404 };
    }


    if (whatsappChannel.companyId !== user.companyId) {
        logger.error('whatsapp-templates', 'Unauthorized access to channel', {
        connectionId,
        channelCompanyId: whatsappChannel.companyId,
        userCompanyId: user.companyId
        });
        return { error: 'Unauthorized access to this connection', status: 403 };
    }


    if (whatsappChannel.channelType !== 'whatsapp_official') {
        logger.error('whatsapp-templates', 'Invalid channel type', {
        connectionId,
        channelType: whatsappChannel.channelType
        });
        return { error: 'Selected connection is not a WhatsApp Official channel', status: 400 };
    }


    const connectionData = whatsappChannel.connectionData as any;
    const wabaId = connectionData.wabaId || connectionData.businessAccountId || connectionData.waba_id;
    const accessToken = connectionData.accessToken || connectionData.access_token || whatsappChannel.accessToken;
    const phoneNumberId = connectionData.phoneNumberId || connectionData.phone_number_id;
    const appId = connectionData.appId || connectionData.app_id;

    logger.info('whatsapp-templates', 'Connection credentials', {
        hasWabaId: !!wabaId,
        wabaId: wabaId,
        hasAccessToken: !!accessToken,
        hasPhoneNumberId: !!phoneNumberId,
        phoneNumberId: phoneNumberId,
        hasAppId: !!appId,
        appId: appId,
        connectionDataKeys: Object.keys(connectionData || {})
    });

    if (!wabaId || !accessToken) {
        return {
            error: 'WhatsApp Business Account ID or access token not found in connection',
            status: 400
        };
    }


    let mediaHandle: string | undefined;

    logger.info('whatsapp-templates', 'Checking if media upload needed', {
        hasHeaderMediaUrl: !!headerMediaUrl,
        headerType,
        headerMediaUrl,
        shouldUpload: headerMediaUrl && ['image', 'video', 'document'].includes(headerType)
    });

    if (headerMediaUrl && ['image', 'video', 'document'].includes(headerType)) {
        if (!appId) {
            logger.error('whatsapp-templates', 'App ID not found in connection data', {
                connectionDataKeys: Object.keys(connectionData || {})
            });
            return {
                error: 'App ID not found in connection. Media upload requires App ID for Resumable Upload API.',
                status: 400
            };
        }

        try {

            let fullMediaUrl = headerMediaUrl;
            
            if (!headerMediaUrl.startsWith('http')) {
                const baseUrl = process.env.APP_URL || process.env.BASE_URL || process.env.PUBLIC_URL;
                
                if (baseUrl) {

                const cleanBaseUrl = baseUrl.replace(/\/$/, '');
                const cleanMediaUrl = headerMediaUrl.startsWith('/') ? headerMediaUrl : `/${headerMediaUrl}`;
                fullMediaUrl = `${cleanBaseUrl}${cleanMediaUrl}`;
                } else {

                const basePort = process.env.PORT || '9000';
                const host = process.env.HOST || 'localhost';
                const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

                if (host === 'localhost' || host === '127.0.0.1') {
                    fullMediaUrl = `${protocol}://${host}:${basePort}${headerMediaUrl.startsWith('/') ? headerMediaUrl : `/${headerMediaUrl}`}`;
                } else {
                    fullMediaUrl = `${protocol}://${host}${headerMediaUrl.startsWith('/') ? headerMediaUrl : `/${headerMediaUrl}`}`;
                }
                }
            }

            logger.info('whatsapp-templates', 'Uploading media for template using Resumable Upload API with App ID', {
                headerType,
                mediaUrl: fullMediaUrl,
                appId
            });


            mediaHandle = await uploadMediaForTemplate(fullMediaUrl, accessToken, '', appId);

            logger.info('whatsapp-templates', 'Media uploaded, got handle', { mediaHandle });
        } catch (error: any) {
            logger.error('whatsapp-templates', 'Failed to upload media', {
                error: error.message,
                stack: error.stack
            });
            return {
                error: 'Failed to upload media to WhatsApp: ' + error.message,
                status: 400
            };
        }
    }


    const components: any[] = [];


    if (headerType === 'text' && headerText) {
        components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: headerText,
        });
    } else if (headerType === 'image' && mediaHandle) {
        components.push({
        type: 'HEADER',
        format: 'IMAGE',
        example: {
            header_handle: [mediaHandle]
        }
        });
    } else if (headerType === 'video' && mediaHandle) {
        components.push({
        type: 'HEADER',
        format: 'VIDEO',
        example: {
            header_handle: [mediaHandle]
        }
        });
    } else if (headerType === 'document' && mediaHandle) {
        components.push({
        type: 'HEADER',
        format: 'DOCUMENT',
        example: {
            header_handle: [mediaHandle]
        }
        });
    }


    const bodyComponent: any = {
        type: 'BODY',
        text: content,
    };


    if (variables && variables.length > 0) {
        bodyComponent.example = {
        body_text: [variables.map((_v: any, i: number) => `Example ${i + 1}`)]
        };
    }

    components.push(bodyComponent);


    if (footerText) {
        components.push({
        type: 'FOOTER',
        text: footerText,
        });
    }


    let whatsappTemplateId: string | undefined;
    let whatsappTemplateStatus = 'pending';

    try {
        const whatsappApiUrl = `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${wabaId}/message_templates`;


        const categoryUppercase = (whatsappTemplateCategory || 'utility').toUpperCase();

        const templatePayload = {
        name,
        language: whatsappTemplateLanguage || 'en',
        category: categoryUppercase,
        components,
        };

        logger.info('whatsapp-templates', 'Submitting template to WhatsApp API', {
        name,
        wabaId,
        category: categoryUppercase,
        language: whatsappTemplateLanguage || 'en',
        componentsCount: components.length,
        payload: JSON.stringify(templatePayload, null, 2)
        });

        const response = await axios.post(whatsappApiUrl, templatePayload, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        });

        if (response.data && response.data.id) {
        whatsappTemplateId = response.data.id;

        whatsappTemplateStatus = (response.data.status || 'pending').toLowerCase();

        logger.info('whatsapp-templates', 'Template submitted successfully', {
            templateId: whatsappTemplateId,
            status: whatsappTemplateStatus,
            response: response.data
        });


        try {
            const templateDetailsUrl = `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${whatsappTemplateId}?fields=id,name,status,category,language`;
            const detailsResponse = await axios.get(templateDetailsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            timeout: 30000, // 30 second timeout
            });

            if (detailsResponse.data && detailsResponse.data.status) {

            whatsappTemplateStatus = detailsResponse.data.status.toLowerCase();
            logger.info('whatsapp-templates', 'Fetched template status', {
                templateId: whatsappTemplateId,
                status: whatsappTemplateStatus,
                details: detailsResponse.data
            });
            }
        } catch (statusError: any) {
            logger.warn('whatsapp-templates', 'Could not fetch template status, using default', {
            error: statusError.message,
            defaultStatus: whatsappTemplateStatus
            });
        }
        }
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorDetails = error.response?.data?.error || error.response?.data || {};
        const errorSubcode = error.response?.data?.error?.error_subcode;


        const isNetworkError = error.code === 'ECONNABORTED' ||
                            error.code === 'ECONNRESET' ||
                            error.message?.includes('socket hang up') ||
                            error.message?.includes('timeout');

        logger.error('whatsapp-templates', 'Error submitting template to WhatsApp API', {
        message: errorMessage,
        errorCode: error.response?.data?.error?.code || error.code,
        errorType: error.response?.data?.error?.type,
        errorSubcode: errorSubcode,
        fullError: JSON.stringify(errorDetails, null, 2),
        statusCode: error.response?.status,
        isNetworkError,
        stack: error.stack
        });


        if (errorSubcode === 2388023) {

            return {
                error: 'A template with this name is currently being deleted. Please wait 1-2 minutes before creating a new template with the same name, or use a different name.',
                errorCode: errorSubcode,
                errorType: 'template_deletion_in_progress',
                status: 400
            };
        }

        if (errorSubcode === 2388024) {

            return {
                error: 'A template with this name and language already exists. Please use a different name or delete the existing template first.',
                errorCode: errorSubcode,
                errorType: 'template_already_exists',
                status: 400
            };
        }

        if (errorSubcode === 2494102) {

            return {
                error: 'Failed to upload media. Please try again or use a different image.',
                errorCode: errorSubcode,
                errorType: 'invalid_media_handle',
                status: 400
            };
        }


        if (isNetworkError) {
            logger.warn('whatsapp-templates', 'Network error during template submission, checking if template exists', {
                templateName: name
            });


            try {
                const checkUrl = `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`;
                const checkResponse = await axios.get(checkUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                timeout: 10000,
                });


                if (checkResponse.data?.data && Array.isArray(checkResponse.data.data)) {
                const existingTemplate = checkResponse.data.data.find((t: any) =>
                    t.name === name && t.language === (whatsappTemplateLanguage || 'en')
                );

                if (existingTemplate) {
                    whatsappTemplateId = existingTemplate.id;

                    whatsappTemplateStatus = (existingTemplate.status || 'pending').toLowerCase();
                    logger.info('whatsapp-templates', 'Found existing template after network error', {
                    templateId: whatsappTemplateId,
                    status: whatsappTemplateStatus
                    });
                } else {
                    whatsappTemplateStatus = 'pending';
                }
                } else {
                whatsappTemplateStatus = 'pending';
                }
            } catch (checkError: any) {
                logger.warn('whatsapp-templates', 'Could not verify template creation after network error', {
                error: checkError.message
                });
                whatsappTemplateStatus = 'pending';
            }
        } else {

            whatsappTemplateStatus = 'rejected';
        }
    }


    const newTemplate = await db
        .insert(campaignTemplates)
        .values({
        companyId: user.companyId,
        createdById: user.id,
        connectionId: connectionId,
        name,
        description: description || null,
        category: 'whatsapp',
        whatsappTemplateCategory: whatsappTemplateCategory || 'utility',
        whatsappTemplateStatus: whatsappTemplateStatus as 'pending' | 'approved' | 'rejected' | 'disabled',
        whatsappTemplateId: whatsappTemplateId || null,
        whatsappTemplateName: name,
        whatsappTemplateLanguage: whatsappTemplateLanguage || 'en',
        content,
        variables: variables || [],
        mediaUrls: headerMediaUrl ? [headerMediaUrl] : [],
        mediaHandle: mediaHandle || null, // Store the WhatsApp media handle for reuse in campaigns
        channelType: 'whatsapp',
        whatsappChannelType: 'official',
        isActive: true,
        usageCount: 0,
        })
        .returning();
    return newTemplate[0];
}