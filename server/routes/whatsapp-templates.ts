import express from 'express';
import { storage } from '../storage';
import { ensureAuthenticated, requirePermission } from '../middleware';
import { ChannelConnectionData, PERMISSIONS } from '@shared/db/schema';
import { db } from '../db';
import { campaignTemplates, channelConnections } from '@shared/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { syncSpecificTemplates } from '../services/template-status-sync';
import { createWabaTemplate, TemplateErrorResponse } from 'server/utils/whatsapp-templates-flow';

const router = express.Router();

const WHATSAPP_GRAPH_URL = 'https://graph.facebook.com';
const WHATSAPP_API_VERSION = 'v24.0';

/**
 * Get all templates for the company
 * Only returns official WhatsApp Business API templates
 */
router.get('/', ensureAuthenticated, requirePermission(PERMISSIONS.MANAGE_TEMPLATES), async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.companyId) {
      return res.status(403).json({ error: 'No company association found' });
    }


    const templates = await db
      .select({
        template: campaignTemplates,
        connection: channelConnections
      })
      .from(campaignTemplates)
      .leftJoin(channelConnections, eq(campaignTemplates.connectionId, channelConnections.id))
      .where(
        and(
          eq(campaignTemplates.companyId, user.companyId),
          eq(campaignTemplates.whatsappChannelType, 'official')
        )
      )
      .orderBy(desc(campaignTemplates.createdAt));


    const formattedTemplates = templates.map(({ template, connection }) => {
      const connectionData = connection?.connectionData as any;
      return {
        ...template,
        connection: connection ? {
          id: connection.id,
          accountName: connection.accountName,
          phoneNumber: connectionData?.phoneNumber || connectionData?.phone_number,
          status: connection.status
        } : null
      };
    });

    res.json(formattedTemplates);
  } catch (error) {
    logger.error('whatsapp-templates', 'Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get a single template by ID
 */
router.get('/:id', ensureAuthenticated, requirePermission(PERMISSIONS.MANAGE_TEMPLATES), async (req, res) => {
  try {
    const user = req.user as any;
    const templateId = parseInt(req.params.id);

    if (!user || !user.companyId) {
      return res.status(403).json({ error: 'No company association found' });
    }

    const template = await db
      .select()
      .from(campaignTemplates)
      .where(
        and(
          eq(campaignTemplates.id, templateId),
          eq(campaignTemplates.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!template || template.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template[0]);
  } catch (error) {
    logger.error('whatsapp-templates', 'Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Create a new template and submit to WhatsApp Business API
 */
router.post('/', ensureAuthenticated, requirePermission(PERMISSIONS.MANAGE_TEMPLATES), async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.companyId) {
      return res.status(403).json({ error: 'No company association found' });
    }

    const {
      body
    } = req;


    if (!body?.name || !body?.content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }


    if (!/^[a-z0-9_]+$/.test(body.name)) {
      return res.status(400).json({
        error: 'Template name must contain only lowercase letters, numbers, and underscores'
      });
    }

    if (!body.connectionId) {
      return res.status(400).json({ error: 'WhatsApp connection is required' });
    }


    const templateCreationResult = await createWabaTemplate(body, user);

    if( (templateCreationResult as TemplateErrorResponse)?.error ) {
      const {status, ...errorDetails} = templateCreationResult as TemplateErrorResponse;
      res.status(status || 400).json(errorDetails );
      return;
    }

    res.status(201).json(templateCreationResult);
  } catch (error) {
    logger.error('whatsapp-templates', 'Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Update a template (limited fields)
 */
router.patch('/:id', ensureAuthenticated, requirePermission(PERMISSIONS.MANAGE_TEMPLATES), async (req, res) => {
  try {
    const user = req.user as any;
    const templateId = parseInt(req.params.id);

    if (!user || !user.companyId) {
      return res.status(403).json({ error: 'No company association found' });
    }

    const { description, isActive } = req.body;


    const existingTemplate = await db
      .select()
      .from(campaignTemplates)
      .where(
        and(
          eq(campaignTemplates.id, templateId),
          eq(campaignTemplates.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!existingTemplate || existingTemplate.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }


    const updatedTemplate = await db
      .update(campaignTemplates)
      .set({
        description: description !== undefined ? description : existingTemplate[0].description,
        isActive: isActive !== undefined ? isActive : existingTemplate[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(campaignTemplates.id, templateId))
      .returning();

    res.json(updatedTemplate[0]);
  } catch (error) {
    logger.error('whatsapp-templates', 'Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Delete a template
 */
router.delete('/:id', ensureAuthenticated, requirePermission(PERMISSIONS.MANAGE_TEMPLATES), async (req, res) => {
  try {
    const user = req.user as any;
    const templateId = parseInt(req.params.id);

    if (!user || !user.companyId) {
      return res.status(403).json({ error: 'No company association found' });
    }


    const existingTemplate = await db
      .select()
      .from(campaignTemplates)
      .where(
        and(
          eq(campaignTemplates.id, templateId),
          eq(campaignTemplates.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!existingTemplate || existingTemplate.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }


    await db
      .delete(campaignTemplates)
      .where(eq(campaignTemplates.id, templateId));

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    logger.error('whatsapp-templates', 'Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * Sync template status with WhatsApp API
 * POST /api/whatsapp-templates/:id/sync-status
 */
router.post('/:id/sync-status', ensureAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    const templateId = parseInt(req.params.id);

    if (!user.companyId) {
      return res.status(403).json({ error: 'No company association found' });
    }


    const template = await db
      .select()
      .from(campaignTemplates)
      .where(
        and(
          eq(campaignTemplates.id, templateId),
          eq(campaignTemplates.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!template || template.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }


    await syncSpecificTemplates([templateId]);


    const updatedTemplate = await db
      .select()
      .from(campaignTemplates)
      .where(eq(campaignTemplates.id, templateId))
      .limit(1);

    res.json({
      message: 'Template status synced successfully',
      template: updatedTemplate[0]
    });
  } catch (error) {
    logger.error('whatsapp-templates', 'Error syncing template status:', error);
    res.status(500).json({ error: 'Failed to sync template status' });
  }
});

/**
 * Fetch and sync all templates from WhatsApp API
 * POST /api/whatsapp-templates/sync-from-meta
 */
router.post('/sync-from-meta', ensureAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    const { connectionId } = req.body;

    if (!user.companyId) {
      return res.status(403).json({ error: 'No company association found' });
    }

    if (!connectionId) {
      return res.status(400).json({ error: 'Connection ID is required' });
    }


    const whatsappChannel = await db
      .select()
      .from(channelConnections)
      .where(
        and(
          eq(channelConnections.id, connectionId),
          eq(channelConnections.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!whatsappChannel || whatsappChannel.length === 0) {
      return res.status(404).json({ error: 'WhatsApp connection not found' });
    }


    const channelType = whatsappChannel[0].channelType;
    if (channelType !== 'whatsapp' && channelType !== 'whatsapp_official') {
      return res.status(400).json({ error: 'Selected connection is not a WhatsApp connection' });
    }

    const connectionData = whatsappChannel[0].connectionData as ChannelConnectionData;
    const wabaId = connectionData.wabaId || connectionData.businessAccountId || connectionData.waba_id;
    const accessToken = connectionData.accessToken || connectionData.access_token || whatsappChannel[0].accessToken;

    if (!wabaId || !accessToken) {
      return res.status(400).json({
        error: 'WhatsApp Business Account ID or access token not found in connection'
      });
    }

    logger.info('whatsapp-templates', 'Fetching templates from Meta API', {
      wabaId,
      connectionId
    });


    const templatesUrl = `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=250`;
    const response = await axios.get(templatesUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 30000,
    });

    const metaTemplates = response.data?.data || [];

    logger.info('whatsapp-templates', 'Fetched templates from Meta', {
      count: metaTemplates.length
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const metaTemplate of metaTemplates) {
      try {

        const existingTemplate = await db
          .select()
          .from(campaignTemplates)
          .where(
            and(
              eq(campaignTemplates.whatsappTemplateId, metaTemplate.id),
              eq(campaignTemplates.companyId, user.companyId)
            )
          )
          .limit(1);

        const status = (metaTemplate.status || 'pending').toLowerCase();

        if (existingTemplate && existingTemplate.length > 0) {

          let mediaHandle: string | undefined;
          const mediaUrls: string[] = [];
          let headerFormat: string | undefined;

          if (metaTemplate.components && Array.isArray(metaTemplate.components)) {
            for (const component of metaTemplate.components) {
              if (component.type === 'HEADER') {
                headerFormat = component.format;
                

                if (headerFormat && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {

                  if (component.example?.header_handle && Array.isArray(component.example.header_handle)) {
                    const handleValue = component.example.header_handle[0];


                    if (handleValue && !handleValue.startsWith('http://') && !handleValue.startsWith('https://')) {
                      mediaHandle = handleValue;
                    } else if (handleValue) {

                      mediaUrls.push(handleValue);
                    }
                  }
                  

                  if (component.example?.header_url && Array.isArray(component.example.header_url)) {
                    const url = component.example.header_url[0];
                    if (url) {
                      mediaUrls.push(url);
                    }
                  }
                  

                  if (component.url) {
                    mediaUrls.push(component.url);
                  }
                }
              }
            }
          }

          await db
            .update(campaignTemplates)
            .set({
              whatsappTemplateStatus: status as 'pending' | 'approved' | 'rejected' | 'disabled',
              whatsappTemplateCategory: metaTemplate.category?.toLowerCase() || 'utility',
              mediaUrls: mediaUrls.length > 0 ? mediaUrls : existingTemplate[0].mediaUrls,
              mediaHandle: mediaHandle || existingTemplate[0].mediaHandle,
            })
            .where(eq(campaignTemplates.id, existingTemplate[0].id));

          updatedCount++;
          logger.info('whatsapp-templates', 'Updated existing template', {
            templateId: metaTemplate.id,
            name: metaTemplate.name,
            status,
            hasMediaHandle: !!mediaHandle,
            hasMediaUrls: mediaUrls.length > 0,
            headerFormat
          });
        } else {


          let content = '';
          let headerText = '';
          let mediaHandle: string | undefined;
          const mediaUrls: string[] = [];
          let headerFormat: string | undefined;

          if (metaTemplate.components && Array.isArray(metaTemplate.components)) {
            for (const component of metaTemplate.components) {
              if (component.type === 'HEADER') {
                headerText = component.text || '';
                headerFormat = component.format;
                

                if (headerFormat && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {

                  if (component.example?.header_handle && Array.isArray(component.example.header_handle)) {
                    const handleValue = component.example.header_handle[0];


                    if (handleValue && !handleValue.startsWith('http://') && !handleValue.startsWith('https://')) {
                      mediaHandle = handleValue;
                      logger.info('whatsapp-templates', 'Found media handle (ID) in template', {
                        templateId: metaTemplate.id,
                        templateName: metaTemplate.name,
                        mediaHandle,
                        format: headerFormat
                      });
                    } else if (handleValue) {

                      mediaUrls.push(handleValue);
                      logger.info('whatsapp-templates', 'Found media URL in header_handle', {
                        templateId: metaTemplate.id,
                        templateName: metaTemplate.name,
                        url: handleValue,
                        format: headerFormat
                      });
                    }
                  }
                  

                  if (component.example?.header_url && Array.isArray(component.example.header_url)) {
                    const url = component.example.header_url[0];
                    if (url) {
                      mediaUrls.push(url);
                      logger.info('whatsapp-templates', 'Found media URL in template', {
                        templateId: metaTemplate.id,
                        templateName: metaTemplate.name,
                        url,
                        format: headerFormat
                      });
                    }
                  }
                  

                  if (component.url) {
                    mediaUrls.push(component.url);
                    logger.info('whatsapp-templates', 'Found media URL directly in component', {
                      templateId: metaTemplate.id,
                      templateName: metaTemplate.name,
                      url: component.url,
                      format: headerFormat
                    });
                  }
                }

                if (headerText) {
                  content += headerText + '\n\n';
                }
              } else if (component.type === 'BODY') {
                content += component.text || '';
              } else if (component.type === 'FOOTER') {
                content += '\n\n' + (component.text || '');
              }
            }
          }

          await db
            .insert(campaignTemplates)
            .values({
              companyId: user.companyId,
              createdById: user.id,
              connectionId: connectionId,
              name: metaTemplate.name,
              description: `Synced from Meta - ${metaTemplate.category || 'Template'}`,
              category: 'whatsapp',
              whatsappTemplateCategory: metaTemplate.category?.toLowerCase() || 'utility',
              whatsappTemplateStatus: status as 'pending' | 'approved' | 'rejected' | 'disabled',
              whatsappTemplateId: metaTemplate.id,
              whatsappTemplateName: metaTemplate.name,
              whatsappTemplateLanguage: metaTemplate.language || 'en',
              content: content || 'Template content',
              variables: [],
              mediaUrls: mediaUrls,
              mediaHandle: mediaHandle,
              channelType: 'whatsapp',
              whatsappChannelType: 'official',
              isActive: true,
              usageCount: 0,
            });

          createdCount++;
          logger.info('whatsapp-templates', 'Created new template from Meta', {
            templateId: metaTemplate.id,
            name: metaTemplate.name,
            status,
            hasMediaHandle: !!mediaHandle,
            hasMediaUrls: mediaUrls.length > 0,
            headerFormat
          });
        }
      } catch (error: any) {
        logger.error('whatsapp-templates', 'Error syncing individual template', {
          templateId: metaTemplate.id,
          name: metaTemplate.name,
          error: error.message
        });
        skippedCount++;
      }
    }

    res.json({
      message: 'Templates synced successfully',
      summary: {
        total: metaTemplates.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount
      }
    });
  } catch (error: any) {
    logger.error('whatsapp-templates', 'Error syncing templates from Meta:', error);
    if( error instanceof AxiosError ) {
      logger.error('whatsapp-templates', 'Axios error details:', {
        message: error.message,
        responseData: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
    }
    res.status(500).json({
      error: 'Failed to sync templates from Meta',
      details: error.message
    });
  }
});

export default router;

