import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { users } from "./base";

export const socialProviderTypes = z.enum(['google', 'facebook', 'apple']);

export const userSocialAccounts = pgTable("user_social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text("provider", { enum: ['google', 'facebook', 'apple'] }).notNull(),
  providerUserId: text("provider_user_id").notNull(),
  providerEmail: text("provider_email"),
  providerName: text("provider_name"),
  providerAvatarUrl: text("provider_avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  providerData: jsonb("provider_data").default('{}'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertUserSocialAccountSchema = createInsertSchema(userSocialAccounts).pick({
  userId: true,
  provider: true,
  providerUserId: true,
  providerEmail: true,
  providerName: true,
  providerAvatarUrl: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiresAt: true,
  providerData: true
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
  ipAddress: true,
  userAgent: true
});

export type UserSocialAccount = typeof userSocialAccounts.$inferSelect;
export type InsertUserSocialAccount = z.infer<typeof insertUserSocialAccountSchema>;
export type SocialProvider = z.infer<typeof socialProviderTypes>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
