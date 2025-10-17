import express from 'express';
import { storage } from '../storage';
import FollowUpScheduler from '../services/follow-up-scheduler';
import { ensureAuthenticated } from '../middleware';

const router = express.Router();
const followUpScheduler = FollowUpScheduler.getInstance();

/**
 * Get follow-up schedules for a conversation
 */
router.get('/conversation/:conversationId', ensureAuthenticated, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const schedules = await storage.getFollowUpSchedulesByConversation(parseInt(conversationId));
    res.json(schedules);
  } catch (error) {
    console.error('Error getting follow-up schedules:', error);
    res.status(500).json({ error: 'Failed to get follow-up schedules' });
  }
});

/**
 * Get follow-up schedules for a contact
 */
router.get('/contact/:contactId', ensureAuthenticated, async (req, res) => {
  try {
    const { contactId } = req.params;
    const schedules = await storage.getFollowUpSchedulesByContact(parseInt(contactId));
    res.json(schedules);
  } catch (error) {
    console.error('Error getting follow-up schedules:', error);
    res.status(500).json({ error: 'Failed to get follow-up schedules' });
  }
});

/**
 * Get a specific follow-up schedule
 */
router.get('/:scheduleId', ensureAuthenticated, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await storage.getFollowUpSchedule(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Follow-up schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error getting follow-up schedule:', error);
    res.status(500).json({ error: 'Failed to get follow-up schedule' });
  }
});

/**
 * Create a new follow-up schedule
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const scheduleData = req.body;
    

    const requiredFields = ['conversationId', 'contactId', 'messageType', 'messageContent', 'scheduledFor'];
    for (const field of requiredFields) {
      if (!scheduleData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }


    const scheduleId = `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const followUpSchedule = {
      scheduleId,
      sessionId: scheduleData.sessionId || null,
      flowId: scheduleData.flowId || 0,
      conversationId: scheduleData.conversationId,
      contactId: scheduleData.contactId,
      companyId: scheduleData.companyId || 0,
      nodeId: scheduleData.nodeId || 'manual',
      messageType: scheduleData.messageType,
      messageContent: scheduleData.messageContent,
      mediaUrl: scheduleData.mediaUrl || null,
      caption: scheduleData.caption || null,
      templateId: scheduleData.templateId || null,
      triggerEvent: scheduleData.triggerEvent || 'manual',
      triggerNodeId: scheduleData.triggerNodeId || null,
      delayAmount: scheduleData.delayAmount || null,
      delayUnit: scheduleData.delayUnit || null,
      scheduledFor: new Date(scheduleData.scheduledFor),
      specificDatetime: scheduleData.specificDatetime ? new Date(scheduleData.specificDatetime) : null,
      status: 'scheduled' as const,
      maxRetries: scheduleData.maxRetries || 3,
      channelType: scheduleData.channelType || 'whatsapp',
      channelConnectionId: scheduleData.channelConnectionId || null,
      variables: scheduleData.variables || {},
      executionContext: scheduleData.executionContext || {},
      expiresAt: scheduleData.expiresAt ? new Date(scheduleData.expiresAt) : new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days default
    };

    const result = await storage.createFollowUpSchedule(followUpSchedule);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating follow-up schedule:', error);
    res.status(500).json({ error: 'Failed to create follow-up schedule' });
  }
});

/**
 * Update a follow-up schedule
 */
router.put('/:scheduleId', ensureAuthenticated, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;
    

    delete updates.id;
    delete updates.scheduleId;
    delete updates.createdAt;
    
    const result = await storage.updateFollowUpSchedule(scheduleId, updates);
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Follow-up schedule not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating follow-up schedule:', error);
    res.status(500).json({ error: 'Failed to update follow-up schedule' });
  }
});

/**
 * Cancel a follow-up schedule
 */
router.delete('/:scheduleId', ensureAuthenticated, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const success = await followUpScheduler.cancelFollowUp(scheduleId);
    
    if (!success) {
      return res.status(404).json({ error: 'Follow-up schedule not found' });
    }
    
    res.json({ message: 'Follow-up schedule cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling follow-up schedule:', error);
    res.status(500).json({ error: 'Failed to cancel follow-up schedule' });
  }
});

/**
 * Get execution logs for a follow-up schedule
 */
router.get('/:scheduleId/logs', ensureAuthenticated, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const logs = await storage.getFollowUpExecutionLogs(scheduleId);
    res.json(logs);
  } catch (error) {
    console.error('Error getting follow-up execution logs:', error);
    res.status(500).json({ error: 'Failed to get execution logs' });
  }
});

/**
 * Get follow-up templates for a company
 */
router.get('/templates/company/:companyId', ensureAuthenticated, async (req, res) => {
  try {
    const { companyId } = req.params;
    const templates = await storage.getFollowUpTemplatesByCompany(parseInt(companyId));
    res.json(templates);
  } catch (error) {
    console.error('Error getting follow-up templates:', error);
    res.status(500).json({ error: 'Failed to get follow-up templates' });
  }
});

/**
 * Create a follow-up template
 */
router.post('/templates', ensureAuthenticated, async (req, res) => {
  try {
    const templateData = req.body;
    

    const requiredFields = ['name', 'companyId', 'messageType', 'messageContent'];
    for (const field of requiredFields) {
      if (!templateData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const template = {
      name: templateData.name,
      description: templateData.description || null,
      companyId: templateData.companyId,
      messageType: templateData.messageType,
      messageContent: templateData.messageContent,
      mediaUrl: templateData.mediaUrl || null,
      caption: templateData.caption || null,
      defaultDelayAmount: templateData.defaultDelayAmount || 24,
      defaultDelayUnit: templateData.defaultDelayUnit || 'hours',
      variables: templateData.variables || {},
      isActive: templateData.isActive !== false
    };

    const result = await storage.createFollowUpTemplate(template);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating follow-up template:', error);
    res.status(500).json({ error: 'Failed to create follow-up template' });
  }
});

/**
 * Update a follow-up template
 */
router.put('/templates/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    

    delete updates.id;
    delete updates.createdAt;
    
    const result = await storage.updateFollowUpTemplate(parseInt(id), updates);
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Follow-up template not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating follow-up template:', error);
    res.status(500).json({ error: 'Failed to update follow-up template' });
  }
});

/**
 * Delete a follow-up template
 */
router.delete('/templates/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await storage.deleteFollowUpTemplate(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ error: 'Follow-up template not found' });
    }
    
    res.json({ message: 'Follow-up template deleted successfully' });
  } catch (error) {
    console.error('Error deleting follow-up template:', error);
    res.status(500).json({ error: 'Failed to delete follow-up template' });
  }
});

/**
 * Get scheduler status
 */
router.get('/scheduler/status', ensureAuthenticated, async (req, res) => {
  try {
    const status = followUpScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

export default router;
