// filepath: /home/luisrcap/projects/WhatCEM_Powerchat/shared/db/schema/contacts_extras.ts
import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies, users, contacts, conversations } from "./base";

export const groupParticipants = pgTable("group_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").references(() => contacts.id),
  participantJid: text("participant_jid").notNull(),
  participantName: text("participant_name"),
  isAdmin: boolean("is_admin").default(false),
  isSuperAdmin: boolean("is_super_admin").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertGroupParticipantSchema = createInsertSchema(groupParticipants).pick({
  conversationId: true,
  contactId: true,
  participantJid: true,
  participantName: true,
  isAdmin: true,
  isSuperAdmin: true,
  joinedAt: true,
  leftAt: true,
  isActive: true
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  userId: integer("created_by_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  contactId: true,
  userId: true,
  content: true
});

export const contactDocuments = pgTable("contact_documents", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),

  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),

  filePath: text("file_path").notNull(),
  fileUrl: text("file_url").notNull(),

  category: text("category").notNull().default('general'),
  description: text("description"),

  uploadedBy: integer("uploaded_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const contactAppointments = pgTable("contact_appointments", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),

  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),

  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").default(60),

  type: text("type").notNull().default('meeting'),
  status: text("status", {
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled']
  }).notNull().default('scheduled'),

  createdBy: integer("created_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const contactTasks = pgTable("contact_tasks", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),

  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ['low', 'medium', 'high', 'urgent']
  }).notNull().default('medium'),
  status: text("status", {
    enum: ['not_started', 'in_progress', 'completed', 'cancelled']
  }).notNull().default('not_started'),

  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),

  assignedTo: text("assigned_to"),
  category: text("category"),
  tags: text("tags").array(),

  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const contactAuditLogs = pgTable("contact_audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),

  actionType: text("action_type").notNull(),
  actionCategory: text("action_category").notNull().default('contact'),
  description: text("description").notNull(),

  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  metadata: jsonb("metadata"),

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow()
});

export type GroupParticipant = typeof groupParticipants.$inferSelect;
export type InsertGroupParticipant = z.infer<typeof insertGroupParticipantSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type ContactDocument = typeof contactDocuments.$inferSelect;
export type InsertContactDocument = typeof contactDocuments.$inferInsert;

export type ContactAppointment = typeof contactAppointments.$inferSelect;
export type InsertContactAppointment = typeof contactAppointments.$inferInsert;

export type ContactTask = typeof contactTasks.$inferSelect;
export type InsertContactTask = typeof contactTasks.$inferInsert;

export type ContactAuditLog = typeof contactAuditLogs.$inferSelect;
export type InsertContactAuditLog = typeof contactAuditLogs.$inferInsert;
