import { Router } from 'express';
import { authenticateApiKey, requirePermission, rateLimitMiddleware, logApiUsage } from '../middleware/api-auth';
import apiMessageService from '../services/api-message-service';
import { storage } from '../storage';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';

const router = Router();

router.use(authenticateApiKey);
router.use(rateLimitMiddleware);
router.use(logApiUsage);

const sendMessageSchema = z.object({
  channelId: z.number().int().positive(),
  to: z.string().min(1).max(20),
  message: z.string().min(1).max(4096),
  messageType: z.literal('text').optional().default('text')
});

const sendMediaSchema = z.object({
  channelId: z.number().int().positive(),
  to: z.string().min(1).max(20),
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
  mediaUrl: z.string().url(),
  caption: z.string().max(1024).optional(),
  filename: z.string().max(255).optional()
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'api');
      fs.ensureDirSync(uploadDir);
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const fileExt = path.extname(file.originalname) || '';
      cb(null, `${uniqueId}${fileExt}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/3gpp',
      'audio/mpeg', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/webm',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

/**
 * GET /api/v1/channels
 * Get list of available channels for the authenticated company
 */
router.get('/channels', requirePermission('channels:read'), async (req, res) => {
  try {
    const channels = await apiMessageService.getChannels(req.companyId!);
    
    res.json({
      success: true,
      data: channels,
      count: channels.length
    });
  } catch (error: any) {
    console.error('Error getting channels:', error);
    res.status(500).json({
      success: false,
      error: 'CHANNELS_FETCH_ERROR',
      message: error.message || 'Failed to retrieve channels'
    });
  }
});

/**
 * POST /api/v1/messages/send
 * Send a text message through the specified channel
 */
router.post('/messages/send', requirePermission('messages:send'), async (req, res) => {
  try {
    const validatedData = sendMessageSchema.parse(req.body);
    
    const result = await apiMessageService.sendMessage(req.companyId!, validatedData);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'MESSAGE_SEND_ERROR',
      message: error.message || 'Failed to send message'
    });
  }
});

/**
 * POST /api/v1/messages/send-media
 * Send a media message through the specified channel
 */
router.post('/messages/send-media', requirePermission('messages:send'), async (req, res) => {
  try {
    const validatedData = sendMediaSchema.parse(req.body);
    
    const result = await apiMessageService.sendMedia(req.companyId!, validatedData);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error sending media message:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'MEDIA_SEND_ERROR',
      message: error.message || 'Failed to send media message'
    });
  }
});

/**
 * POST /api/v1/media/upload
 * Upload media file and get URL for sending
 */
router.post('/media/upload', requirePermission('media:upload'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE_PROVIDED',
        message: 'No file was uploaded'
      });
    }

    let finalUrl = `${req.protocol}://${req.get('host')}/uploads/api/${path.basename(req.file.path)}`;
    let finalMimeType = req.file.mimetype;
    let finalSize = req.file.size;

    let mediaType: string;
    if (req.file.mimetype.startsWith('image/')) mediaType = 'image';
    else if (req.file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) mediaType = 'audio';
    else mediaType = 'document';


    if (mediaType === 'audio') {
      try {
        const { convertAudioForWhatsAppWithFallback, getWhatsAppMimeType } = await import('../utils/audio-converter');
        const tempDir = path.join(process.cwd(), 'temp', 'api-audio');
        await fs.ensureDir(tempDir);

        const conversionResult = await convertAudioForWhatsAppWithFallback(
          req.file.path,
          tempDir,
          req.file.originalname
        );


        const mediaDir = path.join(process.cwd(), 'public', 'media', 'audio');
        await fs.ensureDir(mediaDir);

        const convertedFileName = path.basename(conversionResult.outputPath);
        const publicMediaPath = path.join(mediaDir, convertedFileName);

        await fs.move(conversionResult.outputPath, publicMediaPath);


        finalUrl = `${req.protocol}://${req.get('host')}/media/audio/${convertedFileName}`;
        finalMimeType = conversionResult.mimeType;
        finalSize = conversionResult.metadata.size || req.file.size;


      } catch (conversionError) {
        console.warn('API audio conversion failed, using original file:', conversionError);

      }
    }

    res.json({
      success: true,
      data: {
        url: finalUrl,
        mediaType,
        filename: req.file.originalname,
        size: finalSize,
        mimetype: finalMimeType
      }
    });
  } catch (error: any) {
    console.error('Error uploading media:', error);

    if (req.file && req.file.path) {
      fs.unlink(req.file.path).catch(console.error);
    }

    res.status(500).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: error.message || 'Failed to upload media'
    });
  }
});

/**
 * GET /api/v1/messages/:messageId/status
 * Get message delivery status
 */
router.get('/messages/:messageId/status', requirePermission('messages:read'), async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MESSAGE_ID',
        message: 'Message ID must be a valid number'
      });
    }

    const status = await apiMessageService.getMessageStatus(req.companyId!, messageId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('Error getting message status:', error);
    res.status(500).json({
      success: false,
      error: 'STATUS_FETCH_ERROR',
      message: error.message || 'Failed to get message status'
    });
  }
});

/**
 * GET /api/v1/health
 * API health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

/**
 * Error handler for API routes
 */
router.use((error: any, req: any, res: any, next: any) => {
  console.error('API v1 error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds the 10MB limit'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});










router.get('/messages/:messageId/email-attachments', requirePermission('messages:read'), async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MESSAGE_ID',
        message: 'Invalid message ID'
      });
    }


    const message = await storage.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      });
    }


    const conversation = await storage.getConversation(message.conversationId);
    if (!conversation || conversation.companyId !== req.companyId) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'You can only access messages from your company'
      });
    }

    const attachments = await storage.getEmailAttachmentsByMessageId(messageId);

    res.json({
      success: true,
      attachments: attachments
    });

  } catch (error: any) {
    console.error('Error fetching email attachments:', error);
    res.status(500).json({
      success: false,
      error: 'EMAIL_ATTACHMENTS_ERROR',
      message: error.message || 'Failed to fetch email attachments'
    });
  }
});

export default router;
