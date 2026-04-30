import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { callLogs, scheduledCalls, insertCallConfigurationSchema, callConfiguration } from '../../shared/db/schema/calls_ai.js';
import { eq, and, desc } from 'drizzle-orm';
import AICallsService from '../services/ai-calls.js';
import { ensureAuthenticated, requireAnyPermission } from 'server/middleware.js';
import logger from '@shared/logger.js';
import { DEFAULT_AXIOS_CONFIG_OVERRIDES } from 'node_modules/@paypal/paypal-server-sdk/dist/esm/types/clientAdapter.js';

const router = Router();
const aiCallsService = new AICallsService();

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ============================================================
// GET /api/ai-calls/config
// Returns this company's call_configuration (no credentials exposed).
// If no config exists yet, returns { data: null, hasCredentials: false }.
// ============================================================
router.get('/config', ensureAuthenticated, async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  try {
    const [config] = await db
      .select()
      .from(callConfiguration)
      .where(eq(callConfiguration.companyId, companyId))
      .limit(1);

    if (!config) {
      return res.json({ success: true, data: null, hasCredentials: false });
    }

    return res.json({
      success: true,
      data: {
        id: config.id,
        voiceModel: config.voiceModel ?? 'shimmer',
        systemPrompt: config.systemPrompt ?? '',
        greetingPrompt: config.greetingPrompt ?? '',
        twlPhoneNumber: config.twlPhoneNumber ?? '',
      },
      hasCredentials: !!(config.openaiApiKey && config.twlAccountSid && config.twlAuthToken && config.twlPhoneNumber),
    });
  } catch (error) {
    logger.error('call-ai', 'Error fetching config:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// PATCH /api/ai-calls/config
// Company users update their own voice model + prompts.
// Also syncs prompts to the voice bot so they apply from the next call.
// ============================================================
router.patch('/config', ensureAuthenticated, async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const bodySchema = z.object({
    voiceModel: z.string().max(50).optional().nullable(),
    systemPrompt: z.string().optional().nullable(),
    greetingPrompt: z.string().optional().nullable(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid request body', details: parsed.error.flatten() });
  }

  try {
    const [existing] = await db
      .select({ id: callConfiguration.id })
      .from(callConfiguration)
      .where(eq(callConfiguration.companyId, companyId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'No call configuration found. Contact your administrator to set up credentials first.',
      });
    }

    const [updated] = await db
      .update(callConfiguration)
      .set({
        voiceModel: parsed.data.voiceModel ?? 'shimmer',
        systemPrompt: parsed.data.systemPrompt ?? null,
        greetingPrompt: parsed.data.greetingPrompt ?? null,
      })
      .where(eq(callConfiguration.id, existing.id))
      .returning({
        id: callConfiguration.id,
        voiceModel: callConfiguration.voiceModel,
        systemPrompt: callConfiguration.systemPrompt,
        greetingPrompt: callConfiguration.greetingPrompt,
        twlPhoneNumber: callConfiguration.twlPhoneNumber,
      });

    return res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('call-ai', 'Error updating config:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/call
// Makes an immediate AI call via the voice bot's POST /call endpoint.
// Inserts a call_log row so history is tracked.
// ============================================================
router.post('/call', ensureAuthenticated, async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const bodySchema = z.object({
    phoneNumber: z.string().min(1).max(50),
    contactName: z.string().max(100).optional().nullable(),
    customInstructions: z.string().optional().nullable(),
    useDefaultGreeting: z.boolean().default(true),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid request body', details: parsed.error.flatten() });
  }
  if(!parsed.data.useDefaultGreeting && !parsed.data.customInstructions) {
    return res.status(400).json({ success: false, error: 'Custom instructions are required if not using the default greeting.' });
  }

  try {
    const [config] = await db
      .select({
        id: callConfiguration.id,
        systemPrompt: callConfiguration.systemPrompt,
        greetingPrompt: callConfiguration.greetingPrompt,
      })
      .from(callConfiguration)
      .where(eq(callConfiguration.companyId, companyId))
      .limit(1);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'No call configuration found for this company. Ask your administrator to set up credentials.',
      });
    }

    // Voice bot uses its own .env credentials. We only pass the destination number.
    const result = await aiCallsService.makeCall({
      config_id: config.id,
      to: parsed.data.phoneNumber,
      contact_name: parsed.data.contactName ?? null,
      custom_instructions: `${parsed.data.useDefaultGreeting ? config.greetingPrompt : ''}\n\n ${parsed.data.customInstructions ?? ''}`.trim(),
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error ?? 'Voice bot rejected the call' });
    }

    logger.info('call-ai', `Call initiated → SID: ${result.sid}, to: ${parsed.data.phoneNumber}`);
    return res.status(201).json({ success: true, data: { call_sid: result.sid, to: result.to, from: result.from } });
  } catch (error) {
    logger.error('call-ai', 'Error making call:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/webhook
// Receives call completion events from the voice bot.
// Updates call_logs with final status, transcript, summary.
// ============================================================
router.post('/webhook', async (req, res) => {
  // No auth — called by the voice bot service
  const { call_sid, status, duration_seconds, transcript, summary, analysis } = req.body;

  if (!call_sid) {
    return res.json({ ok: true });
  }

  try {
    await db
      .update(callLogs)
      .set({
        status: status ?? 'completed',
        durationSeconds: duration_seconds ?? 0,
        transcript: transcript ?? '',
        summary: summary ?? '',
        analysis: analysis ?? '',
      })
      .where(eq(callLogs.callSid, call_sid));

    logger.info('call-ai', `Webhook received for call ${call_sid}: ${status}`);
    return res.json({ ok: true });
  } catch (error) {
    logger.error('call-ai', 'Error processing call webhook:', error);
    return res.status(500).json({ ok: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/scheduled-calls
// Schedules a future call via voice bot's POST /schedule-call.
// Stores the result in our DB for UI display and cancellation.
// ============================================================
router.post('/scheduled-calls', ensureAuthenticated, async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const bodySchema = z.object({
    phoneNumber: z.string().min(1).max(50),
    contactName: z.string().max(100).optional().nullable(),
    customInstructions: z.string().optional().nullable(),
    scheduledFor: z.string().datetime(),
    useDefaultGreeting: z.boolean().default(true),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid request body', details: parsed.error.flatten() });
  }

  if(!parsed.data.useDefaultGreeting && !parsed.data.customInstructions) {
    return res.status(400).json({ success: false, error: 'Custom instructions are required if not using the default greeting.' });
  }

  const configuration = await db
    .select()
    .from(callConfiguration)
    .where(eq(callConfiguration.companyId, companyId))
    .limit(1)
    .then(results => results[0]);

  try {
    // Format datetime as YYYY-MM-DDTHH:MM:SS (voice bot rejects ISO Z suffix)
    const scheduledForLocal = new Date(parsed.data.scheduledFor)
      .toISOString()
      .replace(/\.\d{3}Z$/, '');

    const result = await aiCallsService.scheduleCall({
      config_id: configuration?.id,
      to: parsed.data.phoneNumber,
      scheduled_for: scheduledForLocal,
      contact_name: parsed.data.contactName ?? null,
      custom_instructions: `${parsed.data.useDefaultGreeting ? configuration?.greetingPrompt : ''}\n\n${parsed.data.customInstructions ?? ''}`.trim(),
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error ?? 'Voice bot rejected the scheduled call' });
    }

    return res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    logger.error('call-ai', 'Error scheduling call:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/call
// Forwards a new call to the external AI calls service
// ============================================================
router.post('/call', ensureAuthenticated, async (req, res) => {
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
// Returns call logs for this company.
// ============================================================
router.get('/call-logs', ensureAuthenticated, async (req, res) => {
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
      .where(eq(callLogs.companyId, companyId))
      .orderBy(desc(callLogs.createdAt));

    return res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('call-ai', 'Error fetching call logs:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// GET /api/ai-calls/scheduled-calls/:configId
// Returns scheduled calls for this company from our DB.
// ============================================================
router.get('/scheduled-calls/:configId', ensureAuthenticated, async (req, res) => {
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
      ))
      .orderBy(desc(scheduledCalls.scheduledFor));

    return res.json({ success: true, data: calls });
  } catch (error) {
    logger.error('call-ai', 'Error fetching scheduled calls:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// DELETE /api/ai-calls/scheduled-calls/:callSid
// Cancels a scheduled call. callSid holds the voice bot's numeric id.
// ============================================================
router.delete('/scheduled-calls/:callSid', ensureAuthenticated, async (req, res) => {
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
        eq(scheduledCalls.callSid, callSid),
        eq(scheduledCalls.companyId, companyId)
      ))
      .limit(1);

    if (!scheduled) {
      return res.status(404).json({ success: false, error: 'Scheduled call not found for this company' });
    }

    const result = await aiCallsService.cancelScheduledCall(callSid);

    // Update our DB row to cancelled
    await db
      .update(scheduledCalls)
      .set({ status: 'cancelled' })
      .where(eq(scheduledCalls.callSid, callSid));

    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('call-ai', 'Error cancelling scheduled call:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/configurations  (admin use)
// Kept for backward compatibility but no longer calls voice bot.
// ============================================================
router.post('/configurations', ensureAuthenticated, async (_req, res) => {
  return res.status(501).json({ success: false, error: 'Use the admin panel to set credentials.' });
});

export default router;
