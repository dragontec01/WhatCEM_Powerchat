import { 
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  varchar,
  real 
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { plans } from "./billing";
import z from "zod";

// Re-export base tables so domain modules can depend on them without importing the monolith directly

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'agent']);

export const PERMISSIONS = {
  VIEW_ALL_CONVERSATIONS: 'view_all_conversations',
  VIEW_ASSIGNED_CONVERSATIONS: 'view_assigned_conversations',
  ASSIGN_CONVERSATIONS: 'assign_conversations',
  MANAGE_CONVERSATIONS: 'manage_conversations',

  VIEW_CONTACTS: 'view_contacts',
  MANAGE_CONTACTS: 'manage_contacts',

  VIEW_CHANNELS: 'view_channels',
  MANAGE_CHANNELS: 'manage_channels',

  VIEW_FLOWS: 'view_flows',
  MANAGE_FLOWS: 'manage_flows',

  VIEW_ANALYTICS: 'view_analytics',
  VIEW_DETAILED_ANALYTICS: 'view_detailed_analytics',

  VIEW_TEAM: 'view_team',
  MANAGE_TEAM: 'manage_team',

  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',

  VIEW_PIPELINE: 'view_pipeline',
  MANAGE_PIPELINE: 'manage_pipeline',

  VIEW_CALENDAR: 'view_calendar',
  MANAGE_CALENDAR: 'manage_calendar',

  VIEW_CAMPAIGNS: 'view_campaigns',
  CREATE_CAMPAIGNS: 'create_campaigns',
  EDIT_CAMPAIGNS: 'edit_campaigns',
  DELETE_CAMPAIGNS: 'delete_campaigns',
  MANAGE_TEMPLATES: 'manage_templates',
  MANAGE_SEGMENTS: 'manage_segments',
  VIEW_CAMPAIGN_ANALYTICS: 'view_campaign_analytics',
  MANAGE_WHATSAPP_ACCOUNTS: 'manage_whatsapp_accounts',
  CONFIGURE_CHANNELS: 'configure_channels',

  VIEW_PAGES: 'view_pages',
  MANAGE_PAGES: 'manage_pages',

  VIEW_TASKS: 'view_tasks',
  MANAGE_TASKS: 'manage_tasks',

  CREATE_BACKUPS: 'create_backups',
  RESTORE_BACKUPS: 'restore_backups',
  MANAGE_BACKUPS: 'manage_backups'
} as const;

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    [PERMISSIONS.VIEW_ALL_CONVERSATIONS]: true,
    [PERMISSIONS.VIEW_ASSIGNED_CONVERSATIONS]: true,
    [PERMISSIONS.ASSIGN_CONVERSATIONS]: true,
    [PERMISSIONS.MANAGE_CONVERSATIONS]: true,
    [PERMISSIONS.VIEW_CONTACTS]: true,
    [PERMISSIONS.MANAGE_CONTACTS]: true,
    [PERMISSIONS.VIEW_CHANNELS]: true,
    [PERMISSIONS.MANAGE_CHANNELS]: true,
    [PERMISSIONS.VIEW_FLOWS]: true,
    [PERMISSIONS.MANAGE_FLOWS]: true,
    [PERMISSIONS.VIEW_ANALYTICS]: true,
    [PERMISSIONS.VIEW_DETAILED_ANALYTICS]: true,
    [PERMISSIONS.VIEW_TEAM]: true,
    [PERMISSIONS.MANAGE_TEAM]: true,
    [PERMISSIONS.VIEW_SETTINGS]: true,
    [PERMISSIONS.MANAGE_SETTINGS]: true,
    [PERMISSIONS.VIEW_PIPELINE]: true,
    [PERMISSIONS.MANAGE_PIPELINE]: true,
    [PERMISSIONS.VIEW_CALENDAR]: true,
    [PERMISSIONS.MANAGE_CALENDAR]: true,
    [PERMISSIONS.VIEW_CAMPAIGNS]: true,
    [PERMISSIONS.CREATE_CAMPAIGNS]: true,
    [PERMISSIONS.EDIT_CAMPAIGNS]: true,
    [PERMISSIONS.DELETE_CAMPAIGNS]: true,
    [PERMISSIONS.MANAGE_TEMPLATES]: true,
    [PERMISSIONS.MANAGE_SEGMENTS]: true,
    [PERMISSIONS.VIEW_CAMPAIGN_ANALYTICS]: true,
    [PERMISSIONS.MANAGE_WHATSAPP_ACCOUNTS]: true,
    [PERMISSIONS.CONFIGURE_CHANNELS]: true,
    [PERMISSIONS.VIEW_PAGES]: true,
    [PERMISSIONS.MANAGE_PAGES]: true,
    [PERMISSIONS.VIEW_TASKS]: true,
    [PERMISSIONS.MANAGE_TASKS]: true,
    [PERMISSIONS.CREATE_BACKUPS]: true,
    [PERMISSIONS.RESTORE_BACKUPS]: true,
    [PERMISSIONS.MANAGE_BACKUPS]: true
  },
  agent: {
    [PERMISSIONS.VIEW_ALL_CONVERSATIONS]: false,
    [PERMISSIONS.VIEW_ASSIGNED_CONVERSATIONS]: true,
    [PERMISSIONS.ASSIGN_CONVERSATIONS]: false,
    [PERMISSIONS.MANAGE_CONVERSATIONS]: true,
    [PERMISSIONS.VIEW_CONTACTS]: true,
    [PERMISSIONS.MANAGE_CONTACTS]: false,
    [PERMISSIONS.VIEW_CHANNELS]: false,
    [PERMISSIONS.MANAGE_CHANNELS]: false,
    [PERMISSIONS.VIEW_FLOWS]: false,
    [PERMISSIONS.MANAGE_FLOWS]: false,
    [PERMISSIONS.VIEW_ANALYTICS]: false,
    [PERMISSIONS.VIEW_DETAILED_ANALYTICS]: false,
    [PERMISSIONS.VIEW_TEAM]: false,
    [PERMISSIONS.MANAGE_TEAM]: false,
    [PERMISSIONS.VIEW_SETTINGS]: false,
    [PERMISSIONS.MANAGE_SETTINGS]: false,
    [PERMISSIONS.VIEW_PIPELINE]: false,
    [PERMISSIONS.MANAGE_PIPELINE]: false,
    [PERMISSIONS.VIEW_CALENDAR]: true,
    [PERMISSIONS.MANAGE_CALENDAR]: false,
    [PERMISSIONS.VIEW_CAMPAIGNS]: true,
    [PERMISSIONS.CREATE_CAMPAIGNS]: false,
    [PERMISSIONS.EDIT_CAMPAIGNS]: false,
    [PERMISSIONS.DELETE_CAMPAIGNS]: false,
    [PERMISSIONS.MANAGE_TEMPLATES]: false,
    [PERMISSIONS.MANAGE_SEGMENTS]: false,
    [PERMISSIONS.VIEW_CAMPAIGN_ANALYTICS]: true,
    [PERMISSIONS.MANAGE_WHATSAPP_ACCOUNTS]: false,
    [PERMISSIONS.CONFIGURE_CHANNELS]: false,
    [PERMISSIONS.VIEW_PAGES]: false,
    [PERMISSIONS.MANAGE_PAGES]: false,
    [PERMISSIONS.VIEW_TASKS]: true,
    [PERMISSIONS.MANAGE_TASKS]: false,
    [PERMISSIONS.CREATE_BACKUPS]: false,
    [PERMISSIONS.RESTORE_BACKUPS]: false,
    [PERMISSIONS.MANAGE_BACKUPS]: false
  }
};

export const invitationStatusTypes = z.enum([
  'pending',
  'accepted',
  'expired',
  'revoked'
]);

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  subdomain: text("subdomain").unique(),
  logo: text("logo"),
  primaryColor: text("primary_color").default("#333235"),
  active: boolean("active").default(true),
  plan: text("plan").default("free"),
  planId: integer("plan_id").references(() => plans.id),
  subscriptionStatus: text("subscription_status", {
    enum: ['active', 'inactive', 'pending', 'cancelled', 'overdue', 'trial', 'grace_period', 'paused', 'past_due']
  }).default("inactive"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  isInTrial: boolean("is_in_trial").default(false),
  maxUsers: integer("max_users").default(5),


  registerNumber: text("register_number"),
  companyEmail: text("company_email"),
  contactPerson: text("contact_person"),
  iban: text("iban"),

  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  billingCycleAnchor: timestamp("billing_cycle_anchor"),
  gracePeriodEnd: timestamp("grace_period_end"),
  pauseStartDate: timestamp("pause_start_date"),
  pauseEndDate: timestamp("pause_end_date"),
  autoRenewal: boolean("auto_renewal").default(true),
  dunningAttempts: integer("dunning_attempts").default(0),
  lastDunningAttempt: timestamp("last_dunning_attempt"),
  subscriptionMetadata: jsonb("subscription_metadata").default('{}'),


  currentStorageUsed: integer("current_storage_used").default(0), // in MB
  currentBandwidthUsed: integer("current_bandwidth_used").default(0), // monthly bandwidth used in MB
  filesCount: integer("files_count").default(0), // current number of files
  lastUsageUpdate: timestamp("last_usage_update").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  name: true,
  slug: true,
  logo: true,
  primaryColor: true,
  active: true,
  plan: true,
  planId: true,
  subscriptionStatus: true,
  subscriptionStartDate: true,
  subscriptionEndDate: true,
  trialStartDate: true,
  trialEndDate: true,
  isInTrial: true,
  maxUsers: true,
  registerNumber: true,
  companyEmail: true,
  contactPerson: true,
  iban: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  billingCycleAnchor: true,
  gracePeriodEnd: true,
  pauseStartDate: true,
  pauseEndDate: true,
  autoRenewal: true,
  dunningAttempts: true,
  lastDunningAttempt: true,
  subscriptionMetadata: true,

  currentStorageUsed: true,
  currentBandwidthUsed: true,
  filesCount: true,
  lastUsageUpdate: true
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  whatsappNumber: text("whatsapp_number"),
  role: userRoleEnum("role").default("agent"),
  companyId: integer("company_id").references(() => companies.id),
  isSuperAdmin: boolean("is_super_admin").default(false),
  active: boolean("active").default(true),
  languagePreference: text("language_preference").default("en"),
  permissions: jsonb("permissions").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  whatsappNumber: true,
  avatarUrl: true,
  role: true,
  companyId: true,
  isSuperAdmin: true,
  active: true,
  languagePreference: true,
  permissions: true
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  isArchived: boolean("is_archived").default(false),
  identifier: text("identifier"),
  identifierType: text("identifier_type"),
  source: text("source"),
  notes: text("notes"),

  isHistorySync: boolean("is_history_sync").default(false),
  historySyncBatchId: text("history_sync_batch_id"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  companyId: true,
  name: true,
  avatarUrl: true,
  email: true,
  phone: true,
  company: true,
  tags: true,
  isActive: true,
  isArchived: true,
  identifier: true,
  identifierType: true,
  source: true,
  notes: true,
  isHistorySync: true,
  historySyncBatchId: true
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id"),
  channelType: text("channel_type").notNull(),
  channelId: integer("channel_id").notNull(),
  status: text("status").default("open"),
  assignedToUserId: integer("assigned_to_user_id"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  unreadCount: integer("unread_count").default(0),
  botDisabled: boolean("bot_disabled").default(false),
  disabledAt: timestamp("disabled_at"),
  disableDuration: integer("disable_duration"),
  disableReason: text("disable_reason"),

  isGroup: boolean("is_group").default(false),
  groupJid: text("group_jid"),
  groupName: text("group_name"),
  groupDescription: text("group_description"),
  groupParticipantCount: integer("group_participant_count").default(0),
  groupCreatedAt: timestamp("group_created_at"),
  groupMetadata: jsonb("group_metadata"),

  isHistorySync: boolean("is_history_sync").default(false),
  historySyncBatchId: text("history_sync_batch_id"),


  isStarred: boolean("is_starred").default(false),
  isArchived: boolean("is_archived").default(false),
  starredAt: timestamp("starred_at"),
  archivedAt: timestamp("archived_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  companyId: true,
  contactId: true,
  channelType: true,
  channelId: true,
  status: true,
  assignedToUserId: true,
  lastMessageAt: true,
  unreadCount: true,
  botDisabled: true,
  disabledAt: true,
  disableDuration: true,
  disableReason: true,
  isGroup: true,
  groupJid: true,
  groupName: true,
  groupDescription: true,
  groupParticipantCount: true,
  groupCreatedAt: true,
  groupMetadata: true,
  isHistorySync: true,
  historySyncBatchId: true,
  isStarred: true,
  isArchived: true,
  starredAt: true,
  archivedAt: true
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  externalId: text("external_id"),
  direction: text("direction").notNull(),
  type: text("type").default("text"),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  senderId: integer("sender_id"),
  senderType: text("sender_type"),
  status: text("status").default("sent"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  isFromBot: boolean("is_from_bot").default(false),
  mediaUrl: text("media_url"),

  groupParticipantJid: text("group_participant_jid"),
  groupParticipantName: text("group_participant_name"),

  emailMessageId: text("email_message_id"),
  emailInReplyTo: text("email_in_reply_to"),
  emailReferences: text("email_references"),
  emailSubject: text("email_subject"),
  emailFrom: text("email_from"),
  emailTo: text("email_to"),
  emailCc: text("email_cc"),
  emailBcc: text("email_bcc"),
  emailHtml: text("email_html"),
  emailPlainText: text("email_plain_text"),
  emailHeaders: jsonb("email_headers"),

  isHistorySync: boolean("is_history_sync").default(false),
  historySyncBatchId: text("history_sync_batch_id"),

  createdAt: timestamp("created_at").defaultNow()
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  externalId: true,
  direction: true,
  type: true,
  content: true,
  metadata: true,
  senderId: true,
  senderType: true,
  status: true,
  sentAt: true,
  readAt: true,
  isFromBot: true,
  mediaUrl: true,
  groupParticipantJid: true,
  groupParticipantName: true,
  isHistorySync: true,
  historySyncBatchId: true,
  createdAt: true
});

// User Groups - Main table for group definitions
export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // Blue default
  
  // Group configuration
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // For default assignment
  
  // Permissions and settings
  permissions: jsonb("permissions").default('{}'),
  settings: jsonb("settings").default('{}'),
  
  // Metadata
  maxMembers: integer("max_members"), // Optional limit
  tags: text("tags").array(), // For categorization
  
  // Audit fields
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  unique("unique_group_name_per_company").on(table.companyId, table.name)
]);

export const insertUserGroupSchema = createInsertSchema(userGroups).pick({
  companyId: true,
  name: true,
  description: true,
  color: true,
  isActive: true,
  isDefault: true,
  permissions: true,
  settings: true,
  maxMembers: true,
  tags: true,
  createdBy: true
});

// Junction table for many-to-many relationship between users and groups
export const userGroupMembers = pgTable("user_group_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer("group_id").notNull().references(() => userGroups.id, { onDelete: 'cascade' }),
  
  // Member-specific settings
  role: text("role").default("member"), // member, admin, moderator
  isActive: boolean("is_active").default(true),
  
  // Additional member data
  joinedAt: timestamp("joined_at").defaultNow(),
  invitedBy: integer("invited_by").references(() => users.id, { onDelete: 'set null' }),
  memberSettings: jsonb("member_settings").default('{}'),
  
  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  unique("unique_user_group").on(table.userId, table.groupId)
]);

export const insertUserGroupMemberSchema = createInsertSchema(userGroupMembers).pick({
  userId: true,
  groupId: true,
  role: true,
  isActive: true,
  invitedBy: true,
  memberSettings: true
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  role: userRoleEnum("role").notNull(),
  permissions: jsonb("permissions").notNull().default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).pick({
  companyId: true,
  role: true,
  permissions: true
});

export const companyPages = pgTable("company_pages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content").notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  isPublished: boolean("is_published").default(true),
  isFeatured: boolean("is_featured").default(false),
  template: varchar("template", { length: 100 }).default('default'),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  authorId: integer("author_id").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniqueCompanyPageSlug: unique("unique_company_page_slug").on(table.companyId, table.slug)
}));

export const insertCompanyPageSchema = createInsertSchema(companyPages).pick({
  companyId: true,
  title: true,
  slug: true,
  content: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  isPublished: true,
  isFeatured: true,
  template: true,
  customCss: true,
  customJs: true,
  authorId: true
});

export const teamInvitations = pgTable("team_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  invitedByUserId: integer("invited_by_user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  role: text("role").notNull().default("agent"),
  token: text("token").notNull().unique(),
  status: text("status", { enum: ['pending', 'accepted', 'expired', 'revoked'] }).notNull().default('pending'),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).pick({
  email: true,
  invitedByUserId: true,
  companyId: true,
  role: true,
  token: true,
  status: true,
  expiresAt: true
});

export const taskCategories = pgTable("task_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  color: text("color"),
  icon: text("icon"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const databaseBackupStatusEnum = pgEnum('database_backup_status', ['creating', 'completed', 'failed', 'uploading', 'uploaded']);
export const databaseBackupTypeEnum = pgEnum('database_backup_type', ['manual', 'scheduled']);
export const databaseBackupFormatEnum = pgEnum('database_backup_format', ['sql', 'custom']);

export const databaseBackups = pgTable("database_backups", {
  id: text("id").primaryKey(), // UUID
  filename: text("filename").notNull(),
  type: databaseBackupTypeEnum("type").notNull().default('manual'),
  description: text("description").notNull(),
  size: integer("size").notNull().default(0), // in bytes
  status: databaseBackupStatusEnum("status").notNull().default('creating'),
  storageLocations: jsonb("storage_locations").notNull().default('["local"]'), // array of storage locations
  checksum: text("checksum").notNull(),
  errorMessage: text("error_message"),

  databaseSize: integer("database_size").default(0),
  tableCount: integer("table_count").default(0),
  rowCount: integer("row_count").default(0),
  compressionRatio: real("compression_ratio"),
  encryptionEnabled: boolean("encryption_enabled").default(false),

  appVersion: text("app_version"),
  pgVersion: text("pg_version"),
  instanceId: text("instance_id"),
  dumpFormat: databaseBackupFormatEnum("dump_format").default('sql'),
  schemaChecksum: text("schema_checksum"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertDatabaseBackupSchema = createInsertSchema(databaseBackups).pick({
  id: true,
  filename: true,
  type: true,
  description: true,
  size: true,
  status: true,
  storageLocations: true,
  checksum: true,
  errorMessage: true,
  databaseSize: true,
  tableCount: true,
  rowCount: true,
  compressionRatio: true,
  encryptionEnabled: true,
  appVersion: true,
  pgVersion: true,
  instanceId: true,
  dumpFormat: true,
  schemaChecksum: true
});

export const databaseBackupLogs = pgTable("database_backup_logs", {
  id: text("id").primaryKey(), // UUID
  scheduleId: text("schedule_id").notNull(), // 'manual' (for non-scheduled events), 'restore' (for restore operations), or schedule UUID (for scheduled backups)
  backupId: text("backup_id").references(() => databaseBackups.id),
  status: text("status").notNull(), // 'success' | 'failed' | 'partial' | 'in_progress' - faithful to actual state, not coerced
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default('{}'), // Contains event_type for non-scheduled events (e.g., 'cleanup', 'cleanup_deleted', 'cleanup_failed')
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertDatabaseBackupLogSchema = createInsertSchema(databaseBackupLogs).pick({
  id: true,
  scheduleId: true,
  backupId: true,
  status: true,
  timestamp: true,
  errorMessage: true,
  metadata: true
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;

export type UserGroupMember = typeof userGroupMembers.$inferSelect;
export type InsertUserGroupMember = z.infer<typeof insertUserGroupMemberSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type CompanyPage = typeof companyPages.$inferSelect;
export type InsertCompanyPage = typeof companyPages.$inferInsert;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusTypes>;

export type TaskCategory = typeof taskCategories.$inferSelect;
export type InsertTaskCategory = typeof taskCategories.$inferInsert;

export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = z.infer<typeof insertDatabaseBackupSchema>;

export type DatabaseBackupLog = typeof databaseBackupLogs.$inferSelect;
export type InsertDatabaseBackupLog = z.infer<typeof insertDatabaseBackupLogSchema>;