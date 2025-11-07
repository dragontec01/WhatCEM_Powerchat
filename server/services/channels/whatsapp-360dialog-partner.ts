import { storage } from '../../storage';
import {
  InsertMessage,
  InsertConversation,
  InsertContact,
  ChannelConnection
} from '@shared/db/schema';
import { EventEmitter } from 'events';
import axios from 'axios';
import path from 'path';
import fsExtra from 'fs-extra';
import {
  parseDialog360Error,
  createErrorResponse,
  logDialog360Error,
  Dialog360ErrorCode
} from './360dialog-errors';

const activeConnections = new Map<number, boolean>();
const eventEmitter = new EventEmitter();

eventEmitter.setMaxListeners(50);

const DIALOG_360_PARTNER_API_BASE = 'https://hub.360dialog.io/api/v2';
const DIALOG_360_MESSAGING_API_BASE = 'https://waba-v2.360dialog.io';

interface Dialog360PartnerConfig {
  partnerApiKey: string;
  partnerId: string;
  partnerWebhookUrl?: string;
  redirectUrl?: string;
}

interface Dialog360ClientData {
  clientId: string;
  channels: string[];
}

interface Dialog360WebhookPayload {
  id: string;
  event: string;
  data: {
    id: string;
    setup_info?: {
      phone_number: string;
      phone_name: string;
    };
    status?: string;
    waba_account?: any;
    integration?: any;
  };
}

interface Dialog360MessagingWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
          image?: any;
          video?: any;
          audio?: any;
          document?: any;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
        errors?: Array<{
          code: number;
          title: string;
          message: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * Get 360Dialog Partner configuration
 */
async function getPartnerConfig(): Promise<Dialog360PartnerConfig> {
  const config = await storage.getPartnerConfiguration('360dialog');
  
  if (!config || !config.isActive) {
    throw new Error('360Dialog Partner configuration not found or inactive');
  }

  return {
    partnerApiKey: config.partnerApiKey,
    partnerId: config.partnerId,
    partnerWebhookUrl: config.partnerWebhookUrl || undefined,
    redirectUrl: config.redirectUrl || undefined
  };
}

/**
 * Create 360Dialog Partner API headers
 */
function createPartnerHeaders(config: Dialog360PartnerConfig): Record<string, string> {
  return {
    'Authorization': `Bearer ${config.partnerApiKey}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Create 360Dialog Messaging API headers for a specific channel
 */
async function createMessagingHeaders(channelId: string): Promise<Record<string, string>> {
  const channel = await storage.getDialog360ChannelByChannelId(channelId);
  
  if (!channel || !channel.apiKey) {
    throw new Error(`Channel API key not found for channel ${channelId}`);
  }

  return {
    'D360-API-KEY': channel.apiKey,
    'Content-Type': 'application/json'
  };
}

/**
 * Process Integrated Onboarding callback
 */
export async function processIntegratedOnboardingCallback(
  companyId: number,
  clientData: Dialog360ClientData
): Promise<boolean> {
  try {
    

    let client = await storage.getDialog360ClientByClientId(clientData.clientId);
    
    if (!client) {
      client = await storage.createDialog360Client({
        companyId,
        clientId: clientData.clientId,
        clientName: `Company ${companyId} Client`,
        status: 'active',
        onboardedAt: new Date()
      });
    }

    for (const channelId of clientData.channels) {
      let channel = await storage.getDialog360ChannelByChannelId(channelId);
      
      if (!channel) {
        channel = await storage.createDialog360Channel({
          clientId: client.id,
          channelId,
          phoneNumber: 'pending',
          status: 'pending'
        });
      }
    }

    
    return true;
  } catch (error: any) {
    console.error('Error processing integrated onboarding callback:', error);
    throw error;
  }
}

/**
 * Generate API key for a channel
 */
export async function generateChannelApiKey(channelId: string): Promise<string> {
  try {
    const config = await getPartnerConfig();
    
    const response = await axios.post(
      `${DIALOG_360_PARTNER_API_BASE}/partners/channels/${channelId}/api-keys`,
      {},
      { headers: createPartnerHeaders(config) }
    );

    if (response.status === 201 && response.data.api_key) {
      const channel = await storage.getDialog360ChannelByChannelId(channelId);
      if (channel) {
        await storage.updateDialog360Channel(channel.id, {
          apiKey: response.data.api_key
        });
      }

      return response.data.api_key;
    } else {
      throw new Error('Failed to generate API key');
    }
  } catch (error: any) {
    console.error('Error generating channel API key:', error);
    throw error;
  }
}

/**
 * Set webhook URL for a channel
 */
export async function setChannelWebhook(channelId: string, webhookUrl: string): Promise<boolean> {
  try {
    const headers = await createMessagingHeaders(channelId);
    
    const response = await axios.post(
      `${DIALOG_360_MESSAGING_API_BASE}/v1/configs/webhook`,
      { url: webhookUrl },
      { headers }
    );

    if (response.status === 200) {
      const channel = await storage.getDialog360ChannelByChannelId(channelId);
      if (channel) {
        await storage.updateDialog360Channel(channel.id, {
          webhookUrl
        });
      }
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Error setting channel webhook:', error);
    throw error;
  }
}

/**
 * Connect to 360Dialog WhatsApp via Partner API
 */
export async function connectTo360DialogPartnerWhatsApp(connectionId: number): Promise<boolean> {
  let connection: ChannelConnection | undefined;

  try {


    connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    if (!connection.companyId) {
      throw new Error(`Connection ${connectionId} has no associated company`);
    }

    const client = await storage.getDialog360ClientByCompanyId(connection.companyId);
    
    if (!client) {
      throw new Error('No 360Dialog client found for this company. Please complete onboarding first.');
    }

    const channels = await storage.getDialog360ChannelsByClientId(client.id);
    const activeChannel = channels.find(ch => ch.status === 'running');
    
    if (!activeChannel) {
      throw new Error('No active 360Dialog channels found. Please wait for channel approval.');
    }

    activeConnections.set(connectionId, true);
    
    await storage.updateChannelConnection(connectionId, {
      status: 'active',
      connectionData: {
        ...(connection.connectionData || {}),
        clientId: client.clientId,
        channelId: activeChannel.channelId,
        phoneNumber: activeChannel.phoneNumber,
        lastConnectedAt: new Date().toISOString()
      }
    });
    
    
    
    eventEmitter.emit('connected', { connectionId });
    
    return true;
  } catch (error: any) {
    const dialog360Error = parseDialog360Error(error);
    logDialog360Error('partner_connection', dialog360Error, connectionId);

    await storage.updateChannelConnection(connectionId, {
      status: 'error',
      connectionData: {
        ...(connection?.connectionData || {}),
        lastError: dialog360Error.message,
        lastErrorAt: new Date().toISOString(),
        errorCode: dialog360Error.code,
        retryable: dialog360Error.retryable
      }
    });

    activeConnections.set(connectionId, false);
    eventEmitter.emit('error', {
      connectionId,
      error: dialog360Error.userMessage,
      code: dialog360Error.code,
      retryable: dialog360Error.retryable
    });

    return false;
  }
}

/**
 * Disconnect from 360Dialog Partner WhatsApp
 */
export async function disconnectFrom360DialogPartnerWhatsApp(connectionId: number): Promise<boolean> {
  try {
    
    
    activeConnections.delete(connectionId);
    
    await storage.updateChannelConnection(connectionId, { status: 'inactive' });
    
    eventEmitter.emit('disconnected', { connectionId });
    
    return true;
  } catch (error: any) {
    console.error(`Error disconnecting 360Dialog Partner WhatsApp connection ${connectionId}:`, error);
    return false;
  }
}

/**
 * Check if 360Dialog Partner WhatsApp connection is active
 */
export function is360DialogPartnerConnectionActive(connectionId: number): boolean {
  return activeConnections.get(connectionId) === true;
}

/**
 * Get all active 360Dialog Partner WhatsApp connections
 */
export function getActive360DialogPartnerConnections(): number[] {
  return Array.from(activeConnections.entries())
    .filter(([_, isActive]) => isActive)
    .map(([connectionId, _]) => connectionId);
}

/**
 * Subscribe to 360Dialog Partner WhatsApp events
 */
export function subscribeTo360DialogPartnerWhatsAppEvents(callback: (event: any) => void) {
  eventEmitter.on('message', callback);
  eventEmitter.on('connected', callback);
  eventEmitter.on('disconnected', callback);
  eventEmitter.on('error', callback);
}

/**
 * Format phone number for 360Dialog WhatsApp
 */
function formatWhatsAppNumber(phoneNumber: string): string {
  let cleanNumber = phoneNumber.replace(/^whatsapp:/, '').replace(/^\+/, '');

  cleanNumber = cleanNumber.replace(/[^\d]/g, '');

  return cleanNumber;
}

/**
 * Send a text message via 360Dialog Partner WhatsApp
 */
export async function send360DialogPartnerWhatsAppMessage(
  connectionId: number,
  userId: number,
  to: string,
  message: string
): Promise<any> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    if (!connection.companyId) {
      throw new Error(`Connection ${connectionId} has no associated company`);
    }

    const connectionData = connection.connectionData as any;
    const channelId = connectionData?.channelId;

    if (!channelId) {
      throw new Error('Channel ID not found in connection data');
    }

    const formattedTo = formatWhatsAppNumber(to);

    

    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: "text",
      text: {
        body: message
      }
    };

    const headers = await createMessagingHeaders(channelId);
    const messageResponse = await axios.post(
      `${DIALOG_360_MESSAGING_API_BASE}/messages`,
      messagePayload,
      { headers }
    );

    

    const cleanTo = to.replace(/[^\d]/g, '');

    let contact = await storage.getContactByPhone(cleanTo, connection.companyId);
    if (!contact) {
      const contactData: InsertContact = {
        name: cleanTo,
        phone: cleanTo,
        companyId: connection.companyId,
        source: 'whatsapp_360dialog'
      };
      contact = await storage.createContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: connectionId,
        channelType: 'whatsapp_360dialog',
        companyId: connection.companyId,
        status: 'active'
      };
      conversation = await storage.createConversation(conversationData);
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      senderId: userId,
      content: message,
      type: 'text',
      direction: 'outbound',
      status: 'sent',
      externalId: messageResponse.data.messages[0].id,
      metadata: JSON.stringify({
        dialog360MessageId: messageResponse.data.messages[0].id,
        waId: messageResponse.data.contacts[0].wa_id,
        channelId
      })
    };

    const savedMessage = await storage.createMessage(messageData);

    if ((global as any).broadcastToAllClients) {
      (global as any).broadcastToAllClients({
        type: 'newMessage',
        data: savedMessage
      });
    }

    return savedMessage;
  } catch (error: any) {
    console.error('Error sending 360Dialog Partner WhatsApp message:', error);
    throw error;
  }
}

/**
 * Send media message via 360Dialog Partner WhatsApp
 */
export async function send360DialogPartnerWhatsAppMediaMessage(
  connectionId: number,
  userId: number,
  to: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<any> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    if (!connection.companyId) {
      throw new Error(`Connection ${connectionId} has no associated company`);
    }


    const connectionData = connection.connectionData as any;
    const channelId = connectionData?.channelId;

    if (!channelId) {
      throw new Error('Channel ID not found in connection data');
    }

    const formattedTo = formatWhatsAppNumber(to);

    

    const messagePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: mediaType
    };

    messagePayload[mediaType] = {
      link: mediaUrl
    };

    if (caption) {
      messagePayload[mediaType].caption = caption;
    }

    if (mediaType === 'document' && filename) {
      messagePayload[mediaType].filename = filename;
    }

    const headers = await createMessagingHeaders(channelId);
    const messageResponse = await axios.post(
      `${DIALOG_360_MESSAGING_API_BASE}/messages`,
      messagePayload,
      { headers }
    );

    

    const cleanTo = to.replace(/[^\d]/g, '');

    let contact = await storage.getContactByPhone(cleanTo, connection.companyId);
    if (!contact) {
      const contactData: InsertContact = {
        name: cleanTo,
        phone: cleanTo,
        companyId: connection.companyId,
        source: 'whatsapp_360dialog'
      };
      contact = await storage.getOrCreateContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: connectionId,
        channelType: 'whatsapp_360dialog',
        companyId: connection.companyId,
        status: 'active'
      };
      conversation = await storage.createConversation(conversationData);
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      senderId: userId,
      content: caption || `[${mediaType.toUpperCase()}]`,
      type: mediaType,
      direction: 'outbound',
      status: 'sent',
      mediaUrl: mediaUrl,
      externalId: messageResponse.data.messages[0].id,
      metadata: JSON.stringify({
        dialog360MessageId: messageResponse.data.messages[0].id,
        waId: messageResponse.data.contacts[0].wa_id,
        mediaType,
        filename,
        channelId
      })
    };

    const savedMessage = await storage.createMessage(messageData);

    if ((global as any).broadcastToAllClients) {
      (global as any).broadcastToAllClients({
        type: 'newMessage',
        data: savedMessage
      });
    }

    return savedMessage;
  } catch (error: any) {
    console.error('Error sending 360Dialog Partner WhatsApp media message:', error);
    throw error;
  }
}

/**
 * Process incoming 360Dialog Partner webhook (channel events)
 */
export async function process360DialogPartnerWebhook(payload: Dialog360WebhookPayload): Promise<void> {
  try {
    

    switch (payload.event) {
      case 'channel_created':
        await processChannelCreatedEvent(payload);
        break;

      case 'channel_running':
        await processChannelRunningEvent(payload);
        break;

      case 'channel_status_changed':
        await processChannelStatusChangedEvent(payload);
        break;

      case 'phone_number_quality_changed':
        await processPhoneNumberQualityChangedEvent(payload);
        break;

      default:
        
    }
  } catch (error: any) {
    console.error('Error processing 360Dialog Partner webhook:', error);
    throw error;
  }
}

/**
 * Process channel created event
 */
async function processChannelCreatedEvent(payload: Dialog360WebhookPayload): Promise<void> {
  try {
    const channelId = payload.data.id;
    const phoneNumber = payload.data.setup_info?.phone_number;
    const phoneName = payload.data.setup_info?.phone_name;

    

    let channel = await storage.getDialog360ChannelByChannelId(channelId);

    if (channel) {
      await storage.updateDialog360Channel(channel.id, {
        phoneNumber: phoneNumber || channel.phoneNumber,
        displayName: phoneName || channel.displayName,
        status: 'pending'
      });
    } else {
      
    }

    
  } catch (error: any) {
    console.error('Error processing channel created event:', error);
    throw error;
  }
}

/**
 * Process channel running event
 */
async function processChannelRunningEvent(payload: Dialog360WebhookPayload): Promise<void> {
  try {
    const channelId = payload.data.id;
    const phoneNumber = payload.data.setup_info?.phone_number;

    

    const channel = await storage.getDialog360ChannelByChannelId(channelId);

    if (channel) {
      await storage.updateDialog360Channel(channel.id, {
        phoneNumber: phoneNumber || channel.phoneNumber,
        status: 'running'
      });

      try {
        await generateChannelApiKey(channelId);
        
      } catch (error) {
        console.error(`Failed to generate API key for channel ${channelId}:`, error);
      }

      try {
        const webhookUrl = `${process.env.BASE_URL || 'http://localhost:9000'}/api/webhooks/360dialog-messaging`;
        await setChannelWebhook(channelId, webhookUrl);
        
      } catch (error) {
        console.error(`Failed to set webhook for channel ${channelId}:`, error);
      }
    }

    
  } catch (error: any) {
    console.error('Error processing channel running event:', error);
    throw error;
  }
}

/**
 * Process channel status changed event
 */
async function processChannelStatusChangedEvent(payload: Dialog360WebhookPayload): Promise<void> {
  try {
    const channelId = payload.data.id;
    const status = payload.data.status;

    

    const channel = await storage.getDialog360ChannelByChannelId(channelId);

    if (channel) {
      await storage.updateDialog360Channel(channel.id, {
        status: status || 'unknown'
      });
    }

    
  } catch (error: any) {
    console.error('Error processing channel status changed event:', error);
    throw error;
  }
}

/**
 * Process phone number quality changed event
 */
async function processPhoneNumberQualityChangedEvent(payload: Dialog360WebhookPayload): Promise<void> {
  try {
    const channelId = payload.data.id;

    

    const channel = await storage.getDialog360ChannelByChannelId(channelId);

    if (channel) {
      const updateData: any = {};

      if (payload.data && typeof payload.data === 'object') {
      }

      if (Object.keys(updateData).length > 0) {
        await storage.updateDialog360Channel(channel.id, updateData);
      }
    }

    
  } catch (error: any) {
    console.error('Error processing phone number quality changed event:', error);
    throw error;
  }
}

/**
 * Process incoming 360Dialog messaging webhook (same as before but with channel lookup)
 */
export async function process360DialogMessagingWebhook(payload: Dialog360MessagingWebhookPayload): Promise<void> {
  try {
    

    if (payload.object === 'whatsapp_business_account') {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            if (change.value.messages) {
              for (const message of change.value.messages) {
                await processIncoming360DialogMessage(message, change.value.metadata, change.value.contacts);
              }
            }
            if (change.value.statuses) {
              for (const status of change.value.statuses) {
                await process360DialogMessageStatusUpdate(status);
              }
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Error processing 360Dialog messaging webhook:', error);
    throw error;
  }
}

/**
 * Process incoming message from 360Dialog messaging webhook
 */
async function processIncoming360DialogMessage(
  message: any,
  metadata: any,
  contacts?: any[]
): Promise<void> {
  try {
    

    const phoneNumber = metadata.display_phone_number;
    const channel = await storage.getDialog360ChannelByPhoneNumber(phoneNumber);

    if (!channel) {
      
      return;
    }

    const client = await storage.getDialog360ClientByClientId(channel.clientId.toString());
    if (!client) {
      
      return;
    }

    const connections = await storage.getChannelConnectionsByType('whatsapp_360dialog');
    const activeConnection = connections.find(conn =>
      conn.companyId === client.companyId &&
      conn.status === 'active'
    );

    if (!activeConnection) {
      
      return;
    }

    const fromPhoneNumber = message.from;

    let contact = await storage.getContactByPhone(fromPhoneNumber, client.companyId);
    if (!contact) {
      const contactName = contacts?.find(c => c.wa_id === fromPhoneNumber)?.profile?.name || fromPhoneNumber;

      const contactData: InsertContact = {
        name: contactName,
        phone: fromPhoneNumber,
        companyId: client.companyId,
        source: 'whatsapp_360dialog'
      };
      contact = await storage.createContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, activeConnection.id);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: activeConnection.id,
        channelType: 'whatsapp_360dialog',
        companyId: client.companyId,
        status: 'active'
      };
      conversation = await storage.createConversation(conversationData);
    }

    let messageType = message.type || 'text';
    let content = '';
    let mediaUrl = null;

    switch (messageType) {
      case 'text':
        content = message.text?.body || '';
        break;
      case 'image':
        content = message.image?.caption || '[IMAGE]';
        mediaUrl = message.image?.id;
        break;
      case 'video':
        content = message.video?.caption || '[VIDEO]';
        mediaUrl = message.video?.id;
        break;
      case 'audio':
        content = '[AUDIO]';
        mediaUrl = message.audio?.id;
        break;
      case 'document':
        content = message.document?.caption || message.document?.filename || '[DOCUMENT]';
        mediaUrl = message.document?.id;
        break;
      default:
        content = `[${messageType.toUpperCase()}]`;
        break;
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      content: content,
      type: messageType as any,
      direction: 'inbound',
      status: 'delivered',
      mediaUrl: mediaUrl,
      externalId: message.id,
      metadata: JSON.stringify({
        dialog360MessageId: message.id,
        timestamp: message.timestamp,
        from: message.from,
        phoneNumberId: metadata.phone_number_id,
        displayPhoneNumber: metadata.display_phone_number,
        channelId: channel.channelId
      })
    };

    const savedMessage = await storage.createMessage(messageData);

    await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date(),
      status: 'active'
    });

    if ((global as any).broadcastToAllClients) {
      (global as any).broadcastToAllClients({
        type: 'newMessage',
        data: savedMessage
      });
    }

    eventEmitter.emit('message', {
      connectionId: activeConnection.id,
      message: savedMessage,
      conversation: conversation,
      contact: contact
    });

    
  } catch (error: any) {
    console.error('Error processing incoming 360Dialog message:', error);
    throw error;
  }
}

/**
 * Process message status update from 360Dialog messaging webhook
 */
async function process360DialogMessageStatusUpdate(status: any): Promise<void> {
  try {
    

    const message = await storage.getMessageByExternalId(status.id);
    if (!message) {
      
      return;
    }

    let newStatus = message.status;
    switch (status.status) {
      case 'sent':
        newStatus = 'sent';
        break;
      case 'delivered':
        newStatus = 'delivered';
        break;
      case 'read':
        newStatus = 'read';
        break;
      case 'failed':
        newStatus = 'failed';
        break;
    }

    if (newStatus !== message.status) {
      await storage.updateMessage(message.id, { status: newStatus });

      if ((global as any).broadcastToAllClients) {
        (global as any).broadcastToAllClients({
          type: 'messageStatusUpdate',
          data: { messageId: message.id, status: newStatus }
        });
      }
    }

    
  } catch (error: any) {
    console.error('Error processing 360Dialog message status update:', error);
    throw error;
  }
}

/**
 * Get connection status for 360Dialog Partner WhatsApp
 */
export async function get360DialogPartnerConnectionStatus(connectionId: number): Promise<any> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      return { status: 'error', message: 'Connection not found' };
    }

    if (!connection.companyId) {
      return { status: 'error', message: 'Connection has no associated company' };
    }

    const isActive = is360DialogPartnerConnectionActive(connectionId);

    if (!isActive) {
      return { status: 'disconnected', message: 'Connection is inactive' };
    }

    const client = await storage.getDialog360ClientByCompanyId(connection.companyId);
    if (!client) {
      return { status: 'error', message: 'No 360Dialog client found for this company' };
    }

    const channels = await storage.getDialog360ChannelsByClientId(client.id);
    const activeChannel = channels.find(ch => ch.status === 'running');

    if (!activeChannel) {
      return { status: 'pending', message: 'Waiting for channel approval' };
    }

    return {
      status: 'connected',
      message: 'Connected to 360Dialog Partner WhatsApp',
      clientId: client.clientId,
      channelId: activeChannel.channelId,
      phoneNumber: activeChannel.phoneNumber,
      displayName: activeChannel.displayName,
      qualityRating: activeChannel.qualityRating,
      messagingLimit: activeChannel.messagingLimit
    };
  } catch (error: any) {
    console.error('Error getting 360Dialog Partner connection status:', error);
    return { status: 'error', message: error.message };
  }
}

export default {
  connect: connectTo360DialogPartnerWhatsApp,
  disconnect: disconnectFrom360DialogPartnerWhatsApp,
  sendMessage: send360DialogPartnerWhatsAppMessage,
  sendMedia: send360DialogPartnerWhatsAppMediaMessage,
  isActive: is360DialogPartnerConnectionActive,
  getActiveConnections: getActive360DialogPartnerConnections,
  subscribeToEvents: subscribeTo360DialogPartnerWhatsAppEvents,
  processPartnerWebhook: process360DialogPartnerWebhook,
  processMessagingWebhook: process360DialogMessagingWebhook,
  processOnboardingCallback: processIntegratedOnboardingCallback,
  generateChannelApiKey,
  setChannelWebhook,
  getConnectionStatus: get360DialogPartnerConnectionStatus
};
