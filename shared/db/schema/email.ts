// filepath: /home/luisrcap/projects/WhatCEM_Powerchat/shared/db/schema/email.ts
import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { users, messages, companies } from "./base";
import { channelConnections } from "./assigns";

export const emailAttachments = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  contentId: text("content_id"),
  isInline: boolean("is_inline").default(false),
  filePath: text("file_path").notNull(),
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertEmailAttachmentSchema = createInsertSchema(emailAttachments).pick({
  messageId: true,
  filename: true,
  contentType: true,
  size: true,
  contentId: true,
  isInline: true,
  filePath: true,
  downloadUrl: true
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  subject: text("subject").notNull(),
  htmlContent: text("html_content"),
  plainTextContent: text("plain_text_content"),
  variables: jsonb("variables").default([]),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  companyId: true,
  createdById: true,
  name: true,
  description: true,
  category: true,
  subject: true,
  htmlContent: true,
  plainTextContent: true,
  variables: true,
  isActive: true
});

export const emailSignatures = pgTable("email_signatures", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  htmlContent: text("html_content"),
  plainTextContent: text("plain_text_content"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertEmailSignatureSchema = createInsertSchema(emailSignatures).pick({
  userId: true,
  companyId: true,
  name: true,
  htmlContent: true,
  plainTextContent: true,
  isDefault: true,
  isActive: true
});

export const emailConfigs = pgTable("email_configs", {
  id: serial("id").primaryKey(),
  channelConnectionId: integer("channel_connection_id").notNull().references(() => channelConnections.id, { onDelete: 'cascade' }),

  imapHost: text("imap_host").notNull(),
  imapPort: integer("imap_port").notNull().default(993),
  imapSecure: boolean("imap_secure").default(true),
  imapUsername: text("imap_username").notNull(),
  imapPassword: text("imap_password"),

  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull().default(465),
  smtpSecure: boolean("smtp_secure").default(false),
  smtpUsername: text("smtp_username").notNull(),
  smtpPassword: text("smtp_password"),

  oauthProvider: text("oauth_provider"),
  oauthClientId: text("oauth_client_id"),
  oauthClientSecret: text("oauth_client_secret"),
  oauthRefreshToken: text("oauth_refresh_token"),
  oauthAccessToken: text("oauth_access_token"),
  oauthTokenExpiry: timestamp("oauth_token_expiry"),

  emailAddress: text("email_address").notNull(),
  displayName: text("display_name"),
  signature: text("signature"),
  syncFolder: text("sync_folder").default("INBOX"),
  syncFrequency: integer("sync_frequency").default(60),
  maxSyncMessages: integer("max_sync_messages").default(100),

  status: text("status").notNull().default("active"),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  connectionData: jsonb("connection_data"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertEmailConfigSchema = createInsertSchema(emailConfigs).pick({
  channelConnectionId: true,
  imapHost: true,
  imapPort: true,
  imapSecure: true,
  imapUsername: true,
  imapPassword: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUsername: true,
  smtpPassword: true,
  oauthProvider: true,
  oauthClientId: true,
  oauthClientSecret: true,
  oauthRefreshToken: true,
  oauthAccessToken: true,
  oauthTokenExpiry: true,
  emailAddress: true,
  displayName: true,
  signature: true,
  syncFolder: true,
  syncFrequency: true,
  maxSyncMessages: true,
  status: true,
  connectionData: true
});

export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type EmailSignature = typeof emailSignatures.$inferSelect;
export type InsertEmailSignature = z.infer<typeof insertEmailSignatureSchema>;

export type EmailConfig = typeof emailConfigs.$inferSelect;
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
