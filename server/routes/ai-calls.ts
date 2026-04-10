import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { callLogs, scheduledCalls, insertCallConfigurationSchema, callConfiguration } from '../../shared/db/schema/calls_ai.js';
import { eq, and } from 'drizzle-orm';
import AICallsService from '../services/ai-calls.js';
import { requireAnyPermission } from 'server/middleware.js';
import logger from '@shared/logger.js';
import { DEFAULT_AXIOS_CONFIG_OVERRIDES } from 'node_modules/@paypal/paypal-server-sdk/dist/esm/types/clientAdapter.js';

const router = Router();
const aiCallsService = new AICallsService();

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ============================================================
// POST /api/ai-calls/scheduled-calls
// Forwards a new scheduled call to the external AI calls service
// ============================================================
router.post('/scheduled-calls', requireAnyPermission(['create_scheduled_calls']), async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const bodySchema = z.object({
    phoneNumber: z.string().min(1).max(50),
    contactName: z.string().max(100).optional().nullable(),
    customInstructions: z.string().optional().nullable(),
    systemPrompt: z.string().optional().nullable(),
    greetingPrompt: z.string().optional().nullable(),
    scheduledFor: z.string().datetime()
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parsed.error.message[0],
    });
  }

  const configuration = await db
    .select()
    .from(callConfiguration)
    .where(eq(callConfiguration.companyId, companyId))
    .limit(1)
    .then(results => results[0]);

  try {
    const result = await aiCallsService.scheduleCall({
      config_id: configuration?.id,
      to: parsed.data.phoneNumber,
      contact_name: parsed.data.contactName,
      custom_instructions: parsed.data.customInstructions,
      system_prompt: parsed.data.systemPrompt || configuration?.systemPrompt,
      greeting_prompt: parsed.data.greetingPrompt || configuration?.greetingPrompt,
      scheduled_for: parsed.data.scheduledFor,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('call-ai', 'Error scheduling call:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/call
// Forwards a new call to the external AI calls service
// ============================================================
router.post('/call', requireAnyPermission(['create_scheduled_calls']), async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const bodySchema = z.object({
    phoneNumber: z.string().min(1).max(50),
    contactName: z.string().max(100).optional().nullable(),
    customInstructions: z.string().optional().nullable(),
    systemPrompt: z.string().optional().nullable(),
    greetingPrompt: z.string().optional().nullable()
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parsed.error.message[0],
    });
  }

  const configuration = await db
    .select()
    .from(callConfiguration)
    .where(eq(callConfiguration.companyId, companyId))
    .limit(1)
    .then(results => results[0]);

  try {
    const result = await aiCallsService.makeCall({ 
      config_id: configuration?.id,
      to: parsed.data.phoneNumber,
      contact_name: parsed.data.contactName, 
      custom_instructions: parsed.data.customInstructions,
      system_prompt: parsed.data.systemPrompt || configuration?.systemPrompt,
      greeting_prompt: parsed.data.greetingPrompt || configuration?.greetingPrompt,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('call-ai', 'Error making call:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// GET /api/ai-calls/call-logs
// Returns all call logs for the authenticated user's company
// ============================================================
router.get('/call-logs', requireAnyPermission(['view_call_logs']), async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  try {
    const logs = await db
      .select({
        id: callLogs.id,
        callConfigurationId: callLogs.callConfigurationId,
        phoneNumber: callLogs.phoneNumber,
        callSid: callLogs.callSid,
        status: callLogs.status,
        systemPrompt: callLogs.systemPrompt,
        greetingPrompt: callLogs.greetingPrompt,
        durationSeconds: callLogs.durationSeconds,
        transcript: callLogs.transcript,
        summary: callLogs.summary,
        analysis: callLogs.analysis,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .where(eq(callLogs.companyId, companyId));

    return res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('call-ai', 'Error fetching call logs:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// GET /api/ai-calls/scheduled-calls/:configId
// Returns scheduled calls by call_configuration_id, validated by company
// ============================================================
router.get('/scheduled-calls/:configId', requireAnyPermission(['view_scheduled_calls']), async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const configId = parseInt(String(req.params.configId), 10);
  if (isNaN(configId)) {
    return res.status(400).json({ success: false, error: 'Invalid configuration ID' });
  }

  try {
    const calls = await db
      .select()
      .from(scheduledCalls)
      .where(and(
        eq(scheduledCalls.callConfigurationId, configId),
        eq(scheduledCalls.companyId, companyId)
      ));

    return res.json({ success: true, data: calls });
  } catch (error) {
    logger.error('call-ai', 'Error fetching scheduled calls:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// DELETE /api/ai-calls/scheduled-calls/:callSid
// Deletes a scheduled call via AICallsService after validating company ownership
// ============================================================
router.delete('/scheduled-calls/:callSid', requireAnyPermission(['create_scheduled_calls']), async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const { callSid } = req.params;

  try {
    const [scheduled] = await db
      .select({ id: scheduledCalls.id })
      .from(scheduledCalls)
      .where(and(
        eq(scheduledCalls.callSid, callSid as string),
        eq(scheduledCalls.companyId, companyId)
      ))
      .limit(1);

    if (!scheduled) {
      return res.status(404).json({ success: false, error: 'Scheduled call not found for this company' });
    }

    const result = await aiCallsService.deleteScheduledCall(callSid as string);
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('call-ai', 'Error deleting scheduled call:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/configurations
// Forwards a new call configuration to the external AI calls service
// ============================================================
router.post('/configurations', requireAnyPermission(['create_call_configurations']), async (req, res) => {
  const companyId = req.user?.companyId || req.body.companyId; // Allow companyId from body for flexibility
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const bodySchema = insertCallConfigurationSchema;

  const parsed = bodySchema.safeParse({...req.body, voiceModel: req.body.voiceModel || 'shimmer', companyId });
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parsed.error.message[0],
    });
  }

  try {
    const result = await aiCallsService.createConfiguration({
      system_prompt: parsed.data.systemPrompt,
      greeting_prompt: parsed.data.greetingPrompt,
      openai_api_key: parsed.data.openaiApiKey,
      twl_account_sid: parsed.data.twlAccountSid,
      twl_auth_token: parsed.data.twlAuthToken,
      twl_phone_number: parsed.data.twlPhoneNumber,
      voice_model: parsed.data.voiceModel, 
      company_id: companyId, 
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('call-ai', 'Error creating call configuration:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});


export default router;
