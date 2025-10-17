import { storage } from '../storage';
import whatsAppService from './channels/whatsapp';
import { EventEmitter } from 'events';

interface ScheduledFollowUp {
  id: number;
  scheduleId: string;
  sessionId: string | null;
  flowId: number;
  conversationId: number;
  contactId: number;
  companyId: number | null;
  nodeId: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document';
  messageContent: string | null;
  mediaUrl: string | null;
  caption: string | null;
  templateId: number | null;
  triggerEvent: string;
  triggerNodeId: string | null;
  delayAmount: number | null;
  delayUnit: string | null;
  scheduledFor: Date | null;
  specificDatetime: Date | null;
  timezone: string | null;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'expired';
  sentAt: Date | null;
  failedReason: string | null;
  retryCount: number;
  maxRetries: number;
  channelType: string;
  channelConnectionId: number | null;
  variables: any;
  executionContext: any;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

/**
 * Follow-up Scheduler Service
 * Handles the execution of scheduled follow-up messages
 */
class FollowUpScheduler extends EventEmitter {
  private static instance: FollowUpScheduler;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();

    this.setMaxListeners(50);
  }

  static getInstance(): FollowUpScheduler {
    if (!FollowUpScheduler.instance) {
      FollowUpScheduler.instance = new FollowUpScheduler();
    }
    return FollowUpScheduler.instance;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      
      return;
    }

    this.isRunning = true;
    
    

    this.processScheduledFollowUps();
    this.intervalId = setInterval(() => {
      this.processScheduledFollowUps();
    }, this.POLL_INTERVAL);

    this.emit('started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    
    this.emit('stopped');
  }

  /**
   * Process scheduled follow-ups that are due
   */
  private async processScheduledFollowUps(): Promise<void> {
    try {
      const dueFollowUps = await storage.getScheduledFollowUps(100);

      if (dueFollowUps.length === 0) {
        
        return;
      }

      


      dueFollowUps.forEach((followUp: any) => {
        const timezoneInfo = followUp.timezone ? ` (timezone: ${followUp.timezone})` : '';
        
      });

      for (const followUp of dueFollowUps) {
        await this.executeFollowUp(followUp as ScheduledFollowUp);
      }
    } catch (error) {
      console.error('Error processing scheduled follow-ups:', error);
      this.emit('error', error);
    }
  }

  /**
   * Execute a single follow-up
   */
  private async executeFollowUp(followUp: ScheduledFollowUp): Promise<void> {
    const startTime = Date.now();
    
    try {
      


      const contact = await storage.getContact(followUp.contactId);
      const conversation = await storage.getConversation(followUp.conversationId);
      
      if (!contact || !conversation) {
        await this.markFollowUpFailed(followUp, 'Contact or conversation not found');
        return;
      }


      let channelConnection = null;
      if (followUp.channelConnectionId) {
        channelConnection = await storage.getChannelConnection(followUp.channelConnectionId);
      }

      if (!channelConnection) {
        await this.markFollowUpFailed(followUp, 'Channel connection not found');
        return;
      }


      const processedContent = this.replaceVariables(
        followUp.messageContent || '',
        followUp.variables,
        contact
      );

      const processedCaption = followUp.caption ? this.replaceVariables(
        followUp.caption,
        followUp.variables,
        contact
      ) : '';


      let messageId: string | null = null;
      
      if (followUp.channelType === 'whatsapp' || followUp.channelType === 'whatsapp_unofficial') {
        if (followUp.messageType === 'text') {
          const textResult = await whatsAppService.sendMessage(
            channelConnection.id,
            channelConnection.userId,
            contact.identifier!,
            processedContent
          );
          messageId = textResult?.id?.toString() || null;
        } else {

          const mediaType = followUp.messageType;
          if (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio' || mediaType === 'document') {
            const mediaResult = await whatsAppService.sendMedia(
              channelConnection.id,
              channelConnection.userId,
              contact.identifier!,
              mediaType,
              followUp.mediaUrl!,
              processedCaption
            );
            messageId = mediaResult?.id?.toString() || null;
          } else {
            throw new Error(`Unsupported media type: ${mediaType}`);
          }
        }
      } else {

        const insertMessage = {
          conversationId: conversation.id,
          contactId: contact.id,
          channelType: followUp.channelType,
          type: followUp.messageType,
          content: followUp.messageType === 'text' ? processedContent : processedCaption,
          direction: 'outbound' as const,
          status: 'sent' as const,
          mediaUrl: followUp.messageType === 'text' ? null : followUp.mediaUrl,
          timestamp: new Date()
        };

        const message = await storage.createMessage(insertMessage);
        messageId = message.id.toString();
      }


      await storage.updateFollowUpSchedule(followUp.scheduleId, {
        status: 'sent',
        sentAt: new Date()
      });


      await storage.createFollowUpExecutionLog({
        scheduleId: followUp.scheduleId,
        executionAttempt: followUp.retryCount + 1,
        status: 'success',
        messageId,
        executionDurationMs: Date.now() - startTime
      });

      
      this.emit('followUpExecuted', { scheduleId: followUp.scheduleId, messageId });

    } catch (error) {
      console.error(`Error executing follow-up ${followUp.scheduleId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      

      if (followUp.retryCount < followUp.maxRetries) {
        await this.scheduleRetry(followUp, errorMessage);
      } else {
        await this.markFollowUpFailed(followUp, errorMessage);
      }


      await storage.createFollowUpExecutionLog({
        scheduleId: followUp.scheduleId,
        executionAttempt: followUp.retryCount + 1,
        status: 'failed',
        errorMessage,
        executionDurationMs: Date.now() - startTime
      });

      this.emit('followUpFailed', { 
        scheduleId: followUp.scheduleId, 
        error: errorMessage,
        willRetry: followUp.retryCount < followUp.maxRetries
      });
    }
  }

  /**
   * Schedule a retry for a failed follow-up
   */
  private async scheduleRetry(followUp: ScheduledFollowUp, errorMessage: string): Promise<void> {
    const retryDelay = Math.min(Math.pow(2, followUp.retryCount) * 60 * 1000, 30 * 60 * 1000); // Exponential backoff, max 30 minutes
    const nextAttempt = new Date(Date.now() + retryDelay);

    await storage.updateFollowUpSchedule(followUp.scheduleId, {
      scheduledFor: nextAttempt,
      retryCount: followUp.retryCount + 1,
      failedReason: errorMessage
    });

    
  }

  /**
   * Mark a follow-up as failed
   */
  private async markFollowUpFailed(followUp: ScheduledFollowUp, errorMessage: string): Promise<void> {
    await storage.updateFollowUpSchedule(followUp.scheduleId, {
      status: 'failed',
      failedReason: errorMessage
    });

    
  }

  /**
   * Replace variables in text content
   */
  private replaceVariables(content: string, variables: any, contact: any): string {
    if (!content) return '';

    let processedContent = content;


    if (contact) {
      processedContent = processedContent.replace(/\{\{contact\.name\}\}/g, contact.name || '');
      processedContent = processedContent.replace(/\{\{contact\.phone\}\}/g, contact.phone || '');
      processedContent = processedContent.replace(/\{\{contact\.email\}\}/g, contact.email || '');
    }


    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedContent = processedContent.replace(regex, String(value || ''));
      });
    }

    return processedContent;
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; pollInterval: number } {
    return {
      isRunning: this.isRunning,
      pollInterval: this.POLL_INTERVAL
    };
  }

  /**
   * Cancel a scheduled follow-up
   */
  async cancelFollowUp(scheduleId: string): Promise<boolean> {
    try {
      await storage.cancelFollowUpSchedule(scheduleId);
      
      this.emit('followUpCancelled', { scheduleId });
      return true;
    } catch (error) {
      console.error(`Error cancelling follow-up ${scheduleId}:`, error);
      return false;
    }
  }
}

export default FollowUpScheduler;
