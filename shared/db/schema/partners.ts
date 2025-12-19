import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies } from "./base";

export const partnerConfigurations = pgTable("partner_configurations", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  partnerApiKey: text("partner_api_key").notNull(),
  partnerId: text("partner_id").notNull(),
  partnerSecret: text("partner_secret"),
  webhookVerifyToken: text("webhook_verify_token"),
  accessToken: text("access_token"),
  configId: text("config_id"),
  partnerWebhookUrl: text("partner_webhook_url"),
  redirectUrl: text("redirect_url"),
  publicProfile: jsonb("public_profile"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertPartnerConfigurationSchema = createInsertSchema(partnerConfigurations).pick({
  provider: true,
  partnerApiKey: true,
  partnerId: true,
  partnerSecret: true,
  webhookVerifyToken: true,
  accessToken: true,
  configId: true,
  partnerWebhookUrl: true,
  redirectUrl: true,
  publicProfile: true,
  isActive: true
});

export const dialog360Clients = pgTable("dialog_360_clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  clientId: text("client_id").notNull().unique(),
  clientName: text("client_name"),
  status: text("status").notNull().default("active"),
  onboardedAt: timestamp("onboarded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertDialog360ClientSchema = createInsertSchema(dialog360Clients).pick({
  companyId: true,
  clientId: true,
  clientName: true,
  status: true,
  onboardedAt: true
});

export const dialog360Channels = pgTable("dialog_360_channels", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => dialog360Clients.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  displayName: text("display_name"),
  status: text("status").notNull().default("pending"),
  apiKey: text("api_key"),
  webhookUrl: text("webhook_url"),
  qualityRating: text("quality_rating"),
  messagingLimit: integer("messaging_limit").default(250),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertDialog360ChannelSchema = createInsertSchema(dialog360Channels).pick({
  clientId: true,
  channelId: true,
  phoneNumber: true,
  displayName: true,
  status: true,
  apiKey: true,
  webhookUrl: true,
  qualityRating: true,
  messagingLimit: true
});

export const metaWhatsappClients = pgTable("meta_whatsapp_clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  businessAccountId: text("business_account_id").notNull().unique(),
  businessAccountName: text("business_account_name"),
  status: text("status").notNull().default('active'),
  onboardedAt: timestamp("onboarded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertMetaWhatsappClientSchema = createInsertSchema(metaWhatsappClients).pick({
  companyId: true,
  businessAccountId: true,
  businessAccountName: true,
  status: true,
  onboardedAt: true
});

export const metaWhatsappPhoneNumbers = pgTable("meta_whatsapp_phone_numbers", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => metaWhatsappClients.id, { onDelete: 'cascade' }),
  phoneNumberId: text("phone_number_id").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  displayName: text("display_name"),
  status: text("status").notNull().default('pending'),
  qualityRating: text("quality_rating"),
  messagingLimit: integer("messaging_limit"),
  accessToken: text("access_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertMetaWhatsappPhoneNumberSchema = createInsertSchema(metaWhatsappPhoneNumbers).pick({
  clientId: true,
  phoneNumberId: true,
  phoneNumber: true,
  displayName: true,
  status: true,
  qualityRating: true,
  messagingLimit: true,
  accessToken: true
});

export type PartnerConfiguration = typeof partnerConfigurations.$inferSelect;
export type InsertPartnerConfiguration = z.infer<typeof insertPartnerConfigurationSchema>;

export type Dialog360Client = typeof dialog360Clients.$inferSelect;
export type InsertDialog360Client = z.infer<typeof insertDialog360ClientSchema>;

export type Dialog360Channel = typeof dialog360Channels.$inferSelect;
export type InsertDialog360Channel = z.infer<typeof insertDialog360ChannelSchema>;

export type MetaWhatsappClient = typeof metaWhatsappClients.$inferSelect;
export type InsertMetaWhatsappClient = z.infer<typeof insertMetaWhatsappClientSchema>;

export type MetaWhatsappPhoneNumber = typeof metaWhatsappPhoneNumbers.$inferSelect;
export type InsertMetaWhatsappPhoneNumber = z.infer<typeof insertMetaWhatsappPhoneNumberSchema>;
