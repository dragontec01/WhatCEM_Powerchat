import { pgEnum, pgTable, serial, integer, text, timestamp, boolean, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users } from "./base";
import { channelConnections } from "./assigns";

export const backupStatusEnum = pgEnum('backup_status', ['pending', 'in_progress', 'completed', 'failed', 'cancelled']);
export const backupTypeEnum = pgEnum('backup_type', ['manual', 'scheduled']);
export const restoreStatusEnum = pgEnum('restore_status', ['pending', 'in_progress', 'completed', 'failed', 'cancelled']);

export const historySyncBatches = pgTable("history_sync_batches", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull().references(() => channelConnections.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  batchId: text("batch_id").notNull().unique(),
  syncType: text("sync_type", {
    enum: ['initial', 'manual', 'incremental']
  }).notNull(),
  status: text("status", {
    enum: ['pending', 'processing', 'completed', 'failed']
  }).notNull().default('pending'),
  totalChats: integer("total_chats").default(0),
  processedChats: integer("processed_chats").default(0),
  totalMessages: integer("total_messages").default(0),
  processedMessages: integer("processed_messages").default(0),
  totalContacts: integer("total_contacts").default(0),
  processedContacts: integer("processed_contacts").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertHistorySyncBatchSchema = createInsertSchema(historySyncBatches).pick({
  connectionId: true,
  companyId: true,
  batchId: true,
  syncType: true,
  status: true,
  totalChats: true,
  processedChats: true,
  totalMessages: true,
  processedMessages: true,
  totalContacts: true,
  processedContacts: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true
});

export const inboxBackups = pgTable("inbox_backups", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  type: backupTypeEnum("type").notNull().default('manual'),
  status: backupStatusEnum("status").notNull().default('pending'),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  compressedSize: integer("compressed_size"),
  checksum: text("checksum"),
  metadata: jsonb("metadata").default('{}'),
  includeContacts: boolean("include_contacts").default(true),
  includeConversations: boolean("include_conversations").default(true),
  includeMessages: boolean("include_messages").default(true),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  totalContacts: integer("total_contacts").default(0),
  totalConversations: integer("total_conversations").default(0),
  totalMessages: integer("total_messages").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertInboxBackupSchema = createInsertSchema(inboxBackups).pick({
  companyId: true,
  createdByUserId: true,
  name: true,
  description: true,
  type: true,
  includeContacts: true,
  includeConversations: true,
  includeMessages: true,
  dateRangeStart: true,
  dateRangeEnd: true
});

export const backupSchedules = pgTable("backup_schedules", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  frequency: text("frequency").notNull(),
  cronExpression: text("cron_expression"),
  retentionDays: integer("retention_days").default(30),
  includeContacts: boolean("include_contacts").default(true),
  includeConversations: boolean("include_conversations").default(true),
  includeMessages: boolean("include_messages").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertBackupScheduleSchema = createInsertSchema(backupSchedules).pick({
  companyId: true,
  createdByUserId: true,
  name: true,
  description: true,
  isActive: true,
  frequency: true,
  cronExpression: true,
  retentionDays: true,
  includeContacts: true,
  includeConversations: true,
  includeMessages: true
});

export const inboxRestores = pgTable("inbox_restores", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  backupId: integer("backup_id").references(() => inboxBackups.id),
  restoredByUserId: integer("restored_by_user_id").notNull().references(() => users.id),
  status: restoreStatusEnum("status").notNull().default('pending'),
  restoreType: text("restore_type").notNull(),
  conflictResolution: text("conflict_resolution").default('merge'),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  restoreContacts: boolean("restore_contacts").default(true),
  restoreConversations: boolean("restore_conversations").default(true),
  restoreMessages: boolean("restore_messages").default(true),
  totalItemsToRestore: integer("total_items_to_restore").default(0),
  itemsRestored: integer("items_restored").default(0),
  itemsSkipped: integer("items_skipped").default(0),
  itemsErrored: integer("items_errored").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertInboxRestoreSchema = createInsertSchema(inboxRestores).pick({
  companyId: true,
  backupId: true,
  restoredByUserId: true,
  restoreType: true,
  conflictResolution: true,
  dateRangeStart: true,
  dateRangeEnd: true,
  restoreContacts: true,
  restoreConversations: true,
  restoreMessages: true
});

export const backupAuditLogs = pgTable("backup_audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: jsonb("details").default('{}'),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertBackupAuditLogSchema = createInsertSchema(backupAuditLogs).pick({
  companyId: true,
  userId: true,
  action: true,
  entityType: true,
  entityId: true,
  details: true,
  ipAddress: true,
  userAgent: true
});

export type HistorySyncBatch = typeof historySyncBatches.$inferSelect;
export type InsertHistorySyncBatch = z.infer<typeof insertHistorySyncBatchSchema>;

export type InboxBackup = typeof inboxBackups.$inferSelect;
export type InsertInboxBackup = z.infer<typeof insertInboxBackupSchema>;

export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = z.infer<typeof insertBackupScheduleSchema>;

export type InboxRestore = typeof inboxRestores.$inferSelect;
export type InsertInboxRestore = z.infer<typeof insertInboxRestoreSchema>;

export type BackupAuditLog = typeof backupAuditLogs.$inferSelect;
export type InsertBackupAuditLog = z.infer<typeof insertBackupAuditLogSchema>;
