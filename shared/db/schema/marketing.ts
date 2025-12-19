import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users, contacts, conversations, messages } from "./base";
import { channelConnections } from "./assigns";

/**
 * Shared TypeScript type for segment filter criteria.
 * 
 * This type defines the structure of criteria used in contact segments.
 * All fields are optional, allowing flexible filtering combinations.
 * 
 * Fields:
 * - tags: Array of tag strings that contacts must have (AND logic)
 * - created_after: ISO date string for filtering contacts created after this date
 * - created_before: ISO date string for filtering contacts created before this date
 * - excludedContactIds: Array of contact IDs to exclude from the segment
 */
export interface SegmentFilterCriteria {
  tags?: string[];
  created_after?: string;
  created_before?: string;
  excludedContactIds?: number[];
  contactIds?: number[];
  [key: string]: any; // Allow additional fields for extensibility
}

export const campaignStatusTypes = z.enum([
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
  'failed'
]);

export const campaignTypes = z.enum([
  'immediate',
  'scheduled',
  'drip'
]);

export const campaignRecipientStatusTypes = z.enum([
  'pending',
  'processing',
  'sent',
  'delivered',
  'read',
  'failed',
  'skipped'
]);

export const whatsappConnectionStatusTypes = z.enum([
  'connected',
  'disconnected',
  'connecting',
  'error',
  'banned'
]);

export const campaignTemplates = pgTable("campaign_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  connectionId: integer("connection_id").references(() => channelConnections.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  whatsappTemplateCategory: text("whatsapp_template_category", { enum: ['marketing', 'utility', 'authentication'] }),
  whatsappTemplateStatus: text("whatsapp_template_status", { enum: ['pending', 'approved', 'rejected', 'disabled'] }).default('pending'),
  whatsappTemplateId: text("whatsapp_template_id"),
  whatsappTemplateName: text("whatsapp_template_name"),
  whatsappTemplateLanguage: text("whatsapp_template_language").default('en'),
  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  mediaHandle: text("media_handle"),
  variables: jsonb("variables").default([]),
  channelType: text("channel_type").notNull().default("whatsapp"),
  whatsappChannelType: text("whatsapp_channel_type", { enum: ['official', 'unofficial'] }).default('unofficial'),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCampaignTemplateSchema = createInsertSchema(campaignTemplates).pick({
  companyId: true,
  createdById: true,
  name: true,
  description: true,
  category: true,
  content: true,
  mediaUrls: true,
  variables: true,
  channelType: true,
  isActive: true
});

export const quickReplyTemplates = pgTable("quick_reply_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  variables: jsonb("variables").default([]),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const contactSegments = pgTable("contact_segments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").notNull(),
  contactCount: integer("contact_count").default(0),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertContactSegmentSchema = createInsertSchema(contactSegments).pick({
  companyId: true,
  createdById: true,
  name: true,
  description: true,
  criteria: true
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  templateId: integer("template_id").references(() => campaignTemplates.id),
  segmentId: integer("segment_id").references(() => contactSegments.id),

  name: text("name").notNull(),
  description: text("description"),
  channelType: text("channel_type").notNull().default("whatsapp"),
  whatsappChannelType: text("whatsapp_channel_type", { enum: ['official', 'unofficial'] }).notNull().default('unofficial'),
  channelId: integer("channel_id").references(() => channelConnections.id),
  channelIds: jsonb("channel_ids").default([]),

  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  variables: jsonb("variables").default({}),

  campaignType: text("campaign_type", { enum: ['immediate', 'scheduled', 'drip'] }).notNull().default('immediate'),
  scheduledAt: timestamp("scheduled_at"),
  timezone: text("timezone").default("UTC"),
  dripSettings: jsonb("drip_settings"),

  status: text("status", { enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'] }).notNull().default('draft'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  pausedAt: timestamp("paused_at"),

  totalRecipients: integer("total_recipients").default(0),
  processedRecipients: integer("processed_recipients").default(0),
  successfulSends: integer("successful_sends").default(0),
  failedSends: integer("failed_sends").default(0),

  rateLimitSettings: jsonb("rate_limit_settings").default({
    messages_per_minute: 10,
    messages_per_hour: 200,
    messages_per_day: 1000,
    delay_between_messages: 6,
    random_delay_range: [3, 10],
    humanization_enabled: true
  }),

  complianceSettings: jsonb("compliance_settings").default({
    require_opt_out: true,
    spam_check_enabled: true,
    content_filter_enabled: true
  }),

  antiBanSettings: jsonb("anti_ban_settings").default({
    enabled: true,
    mode: "moderate",
    businessHoursOnly: false,
    respectWeekends: false,
    randomizeDelay: true,
    minDelay: 3,
    maxDelay: 15,
    accountRotation: true,
    cooldownPeriod: 30,
    messageVariation: false
  }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  companyId: true,
  createdById: true,
  templateId: true,
  segmentId: true,
  name: true,
  description: true,
  channelType: true,
  channelId: true,
  channelIds: true,
  content: true,
  mediaUrls: true,
  variables: true,
  campaignType: true,
  scheduledAt: true,
  timezone: true,
  dripSettings: true,
  rateLimitSettings: true,
  complianceSettings: true,
  antiBanSettings: true
});

export const campaignRecipients = pgTable("campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),

  personalizedContent: text("personalized_content"),
  variables: jsonb("variables").default({}),

  status: text("status", { enum: ['pending', 'processing', 'sent', 'delivered', 'read', 'failed', 'skipped'] }).notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),

  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),

  externalMessageId: text("external_message_id"),
  conversationId: integer("conversation_id").references(() => conversations.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCampaignContact: unique().on(table.campaignId, table.contactId)
}));

export const insertCampaignRecipientSchema = createInsertSchema(campaignRecipients).pick({
  campaignId: true,
  contactId: true,
  personalizedContent: true,
  variables: true,
  scheduledAt: true,
  maxRetries: true
});

export const campaignMessages = pgTable("campaign_messages", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  recipientId: integer("recipient_id").notNull().references(() => campaignRecipients.id),
  messageId: integer("message_id").references(() => messages.id),

  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  messageType: text("message_type").default("text"),

  status: text("status", { enum: ['pending', 'sent', 'delivered', 'read', 'failed'] }).notNull().default('pending'),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),

  whatsappMessageId: text("whatsapp_message_id"),
  whatsappStatus: text("whatsapp_status"),

  errorCode: text("error_code"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const campaignAnalytics = pgTable("campaign_analytics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),

  recordedAt: timestamp("recorded_at").notNull().defaultNow(),

  totalRecipients: integer("total_recipients").default(0),
  messagesSent: integer("messages_sent").default(0),
  messagesDelivered: integer("messages_delivered").default(0),
  messagesRead: integer("messages_read").default(0),
  messagesFailed: integer("messages_failed").default(0),

  deliveryRate: numeric("delivery_rate", { precision: 5, scale: 2 }).default("0.00"),
  readRate: numeric("read_rate", { precision: 5, scale: 2 }).default("0.00"),
  failureRate: numeric("failure_rate", { precision: 5, scale: 2 }).default("0.00"),

  avgDeliveryTime: integer("avg_delivery_time"),
  avgReadTime: integer("avg_read_time"),

  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 4 }).default("0.0000"),

  metricsData: jsonb("metrics_data").default({})
});

export const whatsappAccounts = pgTable("whatsapp_accounts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  channelId: integer("channel_id").references(() => channelConnections.id),

  accountName: text("account_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  accountType: text("account_type", { enum: ['official', 'unofficial'] }).notNull().default('unofficial'),

  sessionData: jsonb("session_data"),
  qrCode: text("qr_code"),
  connectionStatus: text("connection_status", { enum: ['connected', 'disconnected', 'connecting', 'error', 'banned'] }).default('disconnected'),

  lastActivityAt: timestamp("last_activity_at"),
  messageCountToday: integer("message_count_today").default(0),
  messageCountHour: integer("message_count_hour").default(0),
  warningCount: integer("warning_count").default(0),
  restrictionCount: integer("restriction_count").default(0),

  rateLimits: jsonb("rate_limits").default({
    max_messages_per_minute: 10,
    max_messages_per_hour: 200,
    max_messages_per_day: 1000,
    cooldown_period: 300,
    humanization_enabled: true
  }),

  healthScore: integer("health_score").default(100),
  lastHealthCheck: timestamp("last_health_check"),
  isActive: boolean("is_active").default(true),

  rotationGroup: text("rotation_group"),
  priority: integer("priority").default(1),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCompanyPhone: unique().on(table.companyId, table.phoneNumber)
}));

export const insertWhatsappAccountSchema = createInsertSchema(whatsappAccounts).pick({
  companyId: true,
  channelId: true,
  accountName: true,
  phoneNumber: true,
  accountType: true,
  rateLimits: true,
  rotationGroup: true,
  priority: true
});

export const whatsappAccountLogs = pgTable("whatsapp_account_logs", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => whatsappAccounts.id),

  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  message: text("message"),

  severity: text("severity", { enum: ['info', 'warning', 'error', 'critical'] }).default('info'),

  messagesSentToday: integer("messages_sent_today").default(0),
  healthScore: integer("health_score").default(100),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const campaignQueue = pgTable("campaign_queue", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  recipientId: integer("recipient_id").notNull().references(() => campaignRecipients.id),
  accountId: integer("account_id").references(() => channelConnections.id),

  priority: integer("priority").default(1),
  scheduledFor: timestamp("scheduled_for").notNull(),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),

  status: text("status", { enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] }).notNull().default('pending'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  errorMessage: text("error_message"),
  lastErrorAt: timestamp("last_error_at"),

  metadata: jsonb("metadata").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const whatsappProxyServers = pgTable("whatsapp_proxy_servers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  type: text("type", { enum: ['http', 'https', 'socks5'] }).notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username"),
  password: text("password"),
  testStatus: text("test_status", { enum: ['untested', 'working', 'failed'] }).default('untested'),
  lastTested: timestamp("last_tested"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertWhatsappProxyServerSchema = createInsertSchema(whatsappProxyServers).pick({
  companyId: true,
  name: true,
  enabled: true,
  type: true,
  host: true,
  port: true,
  username: true,
  password: true,
  testStatus: true,
  lastTested: true,
  description: true
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  channelId: integer("channel_id").references(() => channelConnections.id),
  contactId: integer("contact_id").references(() => contacts.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  direction: text("direction"), // 'inbound' | 'outbound'
  status: text("status"), // 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer'
  from: text("from"),
  to: text("to"),
  durationSec: integer("duration_sec"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  recordingUrl: text("recording_url"),
  recordingSid: text("recording_sid"),
  twilioCallSid: text("twilio_call_sid"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type InsertCampaignTemplate = z.infer<typeof insertCampaignTemplateSchema>;

export type ContactSegment = typeof contactSegments.$inferSelect;
export type InsertContactSegment = z.infer<typeof insertContactSegmentSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = z.infer<typeof insertCampaignRecipientSchema>;

export type CampaignMessage = typeof campaignMessages.$inferSelect;
export type CampaignAnalytics = typeof campaignAnalytics.$inferSelect;

export type WhatsappAccount = typeof whatsappAccounts.$inferSelect;
export type InsertWhatsappAccount = z.infer<typeof insertWhatsappAccountSchema>;

export type WhatsappAccountLog = typeof whatsappAccountLogs.$inferSelect;
export type CampaignQueue = typeof campaignQueue.$inferSelect;

export type CampaignStatus = z.infer<typeof campaignStatusTypes>;
export type CampaignType = z.infer<typeof campaignTypes>;
export type CampaignRecipientStatus = z.infer<typeof campaignRecipientStatusTypes>;
export type WhatsappConnectionStatus = z.infer<typeof whatsappConnectionStatusTypes>;

export type WhatsappProxyServer = typeof whatsappProxyServers.$inferSelect;
export type InsertWhatsappProxyServer = z.infer<typeof insertWhatsappProxyServerSchema>;