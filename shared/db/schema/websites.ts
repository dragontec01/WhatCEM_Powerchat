import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { users } from "./base";

export const websites = pgTable("websites", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),

  grapesData: jsonb("grapes_data").notNull().default('{}'),
  grapesHtml: text("grapes_html"),
  grapesCss: text("grapes_css"),
  grapesJs: text("grapes_js"),

  favicon: text("favicon"),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  customHead: text("custom_head"),

  status: text("status", {
    enum: ['draft', 'published', 'archived']
  }).notNull().default('draft'),
  publishedAt: timestamp("published_at"),

  googleAnalyticsId: text("google_analytics_id"),
  facebookPixelId: text("facebook_pixel_id"),

  theme: text("theme").default('default'),

  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertWebsiteSchema = createInsertSchema(websites).pick({
  title: true,
  slug: true,
  description: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  grapesData: true,
  grapesHtml: true,
  grapesCss: true,
  grapesJs: true,
  favicon: true,
  customCss: true,
  customJs: true,
  customHead: true,
  status: true,
  publishedAt: true,
  googleAnalyticsId: true,
  facebookPixelId: true,
  theme: true,
  createdById: true
});

export const websiteAssets = pgTable("website_assets", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").notNull().references(() => websites.id, { onDelete: 'cascade' }),

  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),

  path: text("path").notNull(),
  url: text("url").notNull(),

  alt: text("alt"),
  title: text("title"),

  assetType: text("asset_type", {
    enum: ['image', 'video', 'audio', 'document', 'font', 'icon']
  }).notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertWebsiteAssetSchema = createInsertSchema(websiteAssets).pick({
  websiteId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  path: true,
  url: true,
  alt: true,
  title: true,
  assetType: true
});

export type Website = typeof websites.$inferSelect;
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;

export type WebsiteAsset = typeof websiteAssets.$inferSelect;
export type InsertWebsiteAsset = z.infer<typeof insertWebsiteAssetSchema>;
