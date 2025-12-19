import { pgTable, serial, integer, text, jsonb, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, userGroups, users } from "./base";
import { whatsappProxyServers } from "./marketing";


export const channelTypes = z.enum([
  "whatsapp_official",
  "whatsapp_unofficial",
  "whatsapp_twilio",
  "whatsapp_360dialog",
  "messenger",
  "instagram",
  "email",
  "telegram",
  "tiktok",
  "webchat",
  "twilio_sms",
  "twilio_voice"
]);

export interface ChannelConnectionData {
    appId:             string;
    wabaId:            string;
    appSecret:         string;
    webhookUrl:        string;
    accessToken:       string;
    verifyToken:       string;
    phoneNumberId:     string;
    businessAccountId: string;
    waba_id?:         string;
    access_token?:    string;
}

export const channelConnections = pgTable("channel_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  assignId: integer("assign_id").references(() => assigns.id, { onDelete: 'set null' }),
  companyId: integer("company_id").references(() => companies.id),
  channelType: text("channel_type").notNull(),
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  accessToken: text("access_token"),
  status: text("status").default("active"),
  connectionData: jsonb("connection_data"),
  historySyncEnabled: boolean("history_sync_enabled").default(false),
  historySyncStatus: text("history_sync_status", {
    enum: ['pending', 'syncing', 'completed', 'failed', 'disabled']
  }).default("pending"),
  historySyncProgress: integer("history_sync_progress").default(0),
  historySyncTotal: integer("history_sync_total").default(0),
  lastHistorySyncAt: timestamp("last_history_sync_at"),
  historySyncError: text("history_sync_error"),
  proxyServerId: integer("proxy_server_id").references(() => whatsappProxyServers.id, { onDelete: 'set null' }),
  proxyEnabled: boolean("proxy_enabled").default(false),
  proxyType: text("proxy_type", { enum: ['http', 'https', 'socks5'] }),
  proxyHost: text("proxy_host"),
  proxyPort: integer("proxy_port"),
  proxyUsername: text("proxy_username"),
  proxyPassword: text("proxy_password"),
  proxyTestStatus: text("proxy_test_status", { enum: ['untested', 'working', 'failed'] }).default('untested'),
  proxyLastTested: timestamp("proxy_last_tested"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertChannelConnectionSchema = createInsertSchema(channelConnections).pick({
  userId: true,
  companyId: true,
  channelType: true,
  accountId: true,
  accountName: true,
  accessToken: true,
  status: true,
  connectionData: true,
  historySyncEnabled: true,
  historySyncStatus: true,
  historySyncProgress: true,
  historySyncTotal: true,
  lastHistorySyncAt: true,
  historySyncError: true,
  proxyServerId: true,
  proxyEnabled: true,
  proxyType: true,
  proxyHost: true,
  proxyPort: true,
  proxyUsername: true,
  proxyPassword: true,
  proxyTestStatus: true,
  proxyLastTested: true
}).superRefine((data, ctx) => {

  if (data.proxyEnabled === true) {
    if (!data.proxyType) {
      ctx.addIssue({
        code: 'custom',
        path: ['proxyType'],
        message: 'Proxy type is required when proxy is enabled'
      });
    }
    if (!data.proxyHost) {
      ctx.addIssue({
        code: 'custom',
        path: ['proxyHost'],
        message: 'Proxy host is required when proxy is enabled'
      });
    }
    if (!data.proxyPort) {
      ctx.addIssue({
        code: 'custom',
        path: ['proxyPort'],
        message: 'Proxy port is required when proxy is enabled'
      });
    } else if (data.proxyPort < 1 || data.proxyPort > 65535) {
      ctx.addIssue({
        code: 'custom',
        path: ['proxyPort'],
        message: 'Proxy port must be between 1 and 65535'
      });
    }
  }
});

export interface scheduleMilestone {
  scheduleStart: String;
  scheduleEnd: String;
  scheduleIndex: number;
  dayOfWeek: number;
  color: string;
  textColor: string;
}

export interface userIndexSchedule {
  index: number;
  assigned: boolean;
}

export const assigns = pgTable("assigns", {
  id: serial("id").primaryKey(),
  assignName: text("assign_name"),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  useAdmins: boolean("use_admins").default(false),
  relatedGroupId: integer("related_group_id").references(() => userGroups.id, { onDelete: 'set null' }),
  
  // Store schedule as JSONB for flexibility (following your pattern)
  schedule: jsonb("schedule").notNull().default('[]'), // Array of milestone schedules
  
  isActive: boolean("is_active").default(true),
  timeZone: integer("time_zone").default(-6), // Hours difference with UTC because more users are in Mexico
  isDefault: boolean("is_default").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  dateDown: timestamp("date_down")
});

export const insertAssignSchema = createInsertSchema(assigns).pick({
  companyId: true,
  schedule: true,
  useAdmins: true,
  relatedGroupId: true,
  assignName: true,
  isDefault: true,
  isActive: true,
  timeZone: true,
  dateDown: true
});

// Separate table for assign users (many-to-many relationship)
export const assignUsers = pgTable("assign_users", {
  id: serial("id").primaryKey(),
  assignId: integer("assign_id").notNull().references(() => assigns.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Store index_schedules as JSONB array
  indexSchedules: jsonb("index_schedules").notNull().default('[]'), // Array of {index: number, assigned: boolean}
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  unique("unique_assign_user").on(table.assignId, table.userId)
]);

export const insertAssignUserSchema = createInsertSchema(assignUsers).pick({
  assignId: true,
  userId: true,
  indexSchedules: true
});

export type ChannelConnection = typeof channelConnections.$inferSelect;
export type InsertChannelConnection = z.infer<typeof insertChannelConnectionSchema>;

export type Assign = typeof assigns.$inferSelect;
export type InsertAssign = z.infer<typeof insertAssignSchema>;

export type AssignUser = typeof assignUsers.$inferSelect;
export type InsertAssignUser = z.infer<typeof insertAssignUserSchema>;

export type ChannelType = z.infer<typeof channelTypes>;