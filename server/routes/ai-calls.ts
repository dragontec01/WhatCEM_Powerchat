import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { callLogs, insertCallConfigurationSchema } from '../../shared/db/schema/calls_ai.js';
import { eq } from 'drizzle-orm';
import AICallsService from '../services/ai-calls.js';

const router = Router();
const aiCallsService = new AICallsService();

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ============================================================
// POST /api/ai-calls/scheduled-calls
// Forwards a new scheduled call to the external AI calls service
// ============================================================
router.post('/scheduled-calls', async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(403).json({ success: false, error: 'Company ID not found in session' });
  }

  const bodySchema = z.object({
    callConfigurationId: z.number().int().positive(),
    campaignId: z.number().int().positive().optional().nullable(),
    phoneNumber: z.string().min(1).max(50),
    contactName: z.string().max(100).optional().nullable(),
    customInstructions: z.string().optional().nullable(),
    scheduledFor: z.string().datetime(),
    status: z.enum(['pending', 'called', 'failed', 'cancelled']).optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await aiCallsService.scheduleCall({ ...parsed.data, companyId });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error scheduling call:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// GET /api/ai-calls/call-logs
// Returns all call logs for the authenticated user's company
// ============================================================
router.get('/call-logs', async (req, res) => {
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
    console.error('Error fetching call logs:', error);
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ============================================================
// POST /api/ai-calls/configurations
// Forwards a new call configuration to the external AI calls service
// ============================================================
router.post('/configurations', async (req, res) => {
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
    console.error('Error creating configuration');
    return res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});


export default router;
