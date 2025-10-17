import { storage } from '../../storage';
import {
  InsertMessage,
  InsertConversation,
  InsertContact,
  ChannelConnection,
  MetaWhatsappClient,
  MetaWhatsappPhoneNumber
} from '@shared/schema';
import { EventEmitter } from 'events';
import axios from 'axios';
import path from 'path';
import fsExtra from 'fs-extra';
import crypto from 'crypto';

const activeConnections = new Map<number, boolean>();
const eventEmitter = new EventEmitter();

eventEmitter.setMaxListeners(50);

const WHATSAPP_API_VERSION = 'v22.0';
const WHATSAPP_GRAPH_URL = 'https://graph.facebook.com';

const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');
fsExtra.ensureDirSync(MEDIA_DIR);

const mediaCache = new Map<string, string>();

/**
 * Meta WhatsApp Business API Partner Service
 * Implements Partner API architecture for Meta WhatsApp Business API
 */
class WhatsAppMetaPartnerService {
  
  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: number): boolean {
    return activeConnections.get(connectionId) === true;
  }

  /**
   * Connect to Meta WhatsApp Business API using Partner credentials
   */
  async connect(connectionId: number): Promise<boolean> {
    try {
      const connection = await storage.getChannelConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const partnerConfig = await storage.getPartnerConfiguration('meta');
      if (!partnerConfig) {
        throw new Error('Meta Partner API not configured');
      }

      const connectionData = connection.connectionData as any;
      const { phoneNumberId, accessToken } = connectionData || {};
      if (!phoneNumberId || !accessToken) {
        throw new Error('Invalid connection data');
      }

      const response = await axios.get(
        `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.status === 200) {
        activeConnections.set(connectionId, true);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error connecting Meta WhatsApp ${connectionId}:`, error);
      activeConnections.set(connectionId, false);
      return false;
    }
  }

  /**
   * Process Meta WhatsApp embedded signup callback
   */
  async processEmbeddedSignupCallback(companyId: number, signupData: any): Promise<any> {
    try {
      

      const { 
        business_account_id,
        business_account_name,
        phone_numbers = []
      } = signupData;

      if (!business_account_id) {
        throw new Error('Business Account ID is required');
      }

      let client = await storage.getMetaWhatsappClientByBusinessAccountId(business_account_id);
      
      if (!client) {
        client = await storage.createMetaWhatsappClient({
          companyId,
          businessAccountId: business_account_id,
          businessAccountName: business_account_name || 'WhatsApp Business Account',
          status: 'active',
          onboardedAt: new Date()
        });
        
      } else {
        client = await storage.updateMetaWhatsappClient(client.id, {
          businessAccountName: business_account_name || client.businessAccountName,
          status: 'active'
        });
        
      }

      const createdPhoneNumbers = [];
      for (const phoneData of phone_numbers) {
        const {
          phone_number_id,
          phone_number,
          display_name,
          quality_rating,
          messaging_limit,
          access_token
        } = phoneData;

        if (!phone_number_id || !phone_number) {
          
          continue;
        }

        let phoneNumberRecord = await storage.getMetaWhatsappPhoneNumberByPhoneNumberId(phone_number_id);
        
        if (!phoneNumberRecord) {
          phoneNumberRecord = await storage.createMetaWhatsappPhoneNumber({
            clientId: client.id,
            phoneNumberId: phone_number_id,
            phoneNumber: phone_number,
            displayName: display_name || phone_number,
            status: 'verified',
            qualityRating: quality_rating || 'green',
            messagingLimit: messaging_limit || 1000,
            accessToken: access_token
          });
          
        } else {
          phoneNumberRecord = await storage.updateMetaWhatsappPhoneNumber(phoneNumberRecord.id, {
            displayName: display_name || phoneNumberRecord.displayName,
            status: 'verified',
            qualityRating: quality_rating || phoneNumberRecord.qualityRating,
            messagingLimit: messaging_limit || phoneNumberRecord.messagingLimit,
            accessToken: access_token || phoneNumberRecord.accessToken
          });
          
        }

        createdPhoneNumbers.push(phoneNumberRecord);

        await this.createChannelConnection(companyId, phoneNumberRecord);
      }

      return {
        client,
        phoneNumbers: createdPhoneNumbers,
        message: 'Meta WhatsApp Business account onboarded successfully'
      };

    } catch (error) {
      console.error('Error processing Meta WhatsApp embedded signup callback:', error);
      throw error;
    }
  }

  /**
   * Create channel connection for a Meta WhatsApp phone number
   */
  async createChannelConnection(companyId: number, phoneNumber: MetaWhatsappPhoneNumber): Promise<ChannelConnection> {
    try {
      const users = await storage.getUsersByCompany(companyId);
      const adminUser = users.find(user => user.role === 'admin') || users[0];
      
      if (!adminUser) {
        throw new Error('No user found for company');
      }

      const connectionData = {
        phoneNumberId: phoneNumber.phoneNumberId,
        phoneNumber: phoneNumber.phoneNumber,
        displayName: phoneNumber.displayName,
        accessToken: phoneNumber.accessToken,
        businessAccountId: phoneNumber.phoneNumberId,
        qualityRating: phoneNumber.qualityRating,
        messagingLimit: phoneNumber.messagingLimit,
        partnerManaged: true
      };

      const connection = await storage.createChannelConnection({
        userId: adminUser.id,
        channelType: 'whatsapp_official',
        accountId: phoneNumber.phoneNumberId,
        accountName: `${phoneNumber.displayName} (${phoneNumber.phoneNumber})`,
        connectionData,
        status: 'active'
      });

      
      return connection;

    } catch (error) {
      console.error('Error creating Meta WhatsApp channel connection:', error);
      throw error;
    }
  }

  /**
   * Send message through Meta WhatsApp Business API
   */
  async sendMessage(
    connectionId: number,
    userId: number,
    phoneNumber: string,
    message: string,
    mediaUrl?: string,
    mediaType?: string
  ): Promise<any> {
    try {
      const connection = await storage.getChannelConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const connectionData = connection.connectionData as any;
      const { phoneNumberId, accessToken } = connectionData || {};
      if (!phoneNumberId || !accessToken) {
        throw new Error('Invalid connection configuration');
      }

      const messageData: any = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: mediaUrl ? mediaType || 'image' : 'text'
      };

      if (mediaUrl) {
        messageData[mediaType || 'image'] = {
          link: mediaUrl,
          caption: message || ''
        };
      } else {
        messageData.text = { body: message };
      }

      const response = await axios.post(
        `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.messages && response.data.messages[0]) {
        const messageId = response.data.messages[0].id;
        
        await storage.createMessage({
          conversationId: 0,
          senderId: userId,
          content: message,
          type: mediaUrl ? 'media' : 'text',
          direction: 'outbound',
          externalId: messageId,
          metadata: {
            phoneNumber,
            mediaUrl,
            mediaType,
            whatsappMessageId: messageId
          }
        });

        return {
          success: true,
          messageId,
          data: response.data
        };
      }

      throw new Error('Failed to send message');

    } catch (error) {
      console.error('Error sending Meta WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Get event emitter for real-time updates
   */
  getEventEmitter(): EventEmitter {
    return eventEmitter;
  }
}

export default new WhatsAppMetaPartnerService();
