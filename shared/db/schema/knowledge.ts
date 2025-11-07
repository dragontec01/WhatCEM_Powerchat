import { pgTable, serial, integer, text, jsonb, timestamp, real, unique, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { companies } from "./base";
import { flows } from "./index";

export const knowledgeBaseDocuments = pgTable("knowledge_base_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id"),

  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),

  status: text("status", {
    enum: ['uploading', 'processing', 'completed', 'failed']
  }).notNull().default('uploading'),

  filePath: text("file_path").notNull(),
  fileUrl: text("file_url"),

  extractedText: text("extracted_text"),
  chunkCount: integer("chunk_count").default(0),
  embeddingModel: text("embedding_model").default('text-embedding-3-small'),

  processingError: text("processing_error"),
  processingDurationMs: integer("processing_duration_ms"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertKnowledgeBaseDocumentSchema = createInsertSchema(knowledgeBaseDocuments).pick({
  companyId: true,
  nodeId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  fileSize: true,
  status: true,
  filePath: true,
  fileUrl: true,
  extractedText: true,
  chunkCount: true,
  embeddingModel: true,
  processingError: true,
  processingDurationMs: true
});

export const knowledgeBaseChunks = pgTable("knowledge_base_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeBaseDocuments.id, { onDelete: 'cascade' }),

  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  tokenCount: integer("token_count"),

  startPosition: integer("start_position"),
  endPosition: integer("end_position"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertKnowledgeBaseChunkSchema = createInsertSchema(knowledgeBaseChunks).pick({
  documentId: true,
  content: true,
  chunkIndex: true,
  tokenCount: true,
  startPosition: true,
  endPosition: true
});

export const knowledgeBaseConfigs = pgTable("knowledge_base_configs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id").notNull(),
  flowId: integer("flow_id").references(() => flows.id, { onDelete: 'cascade' }),

  enabled: boolean("enabled").default(true),
  maxRetrievedChunks: integer("max_retrieved_chunks").default(3),
  similarityThreshold: real("similarity_threshold").default(0.7),
  embeddingModel: text("embedding_model").default('text-embedding-3-small'),

  contextPosition: text("context_position", {
    enum: ['before_system', 'after_system', 'before_user']
  }).default('before_system'),

  contextTemplate: text("context_template").default(
    "Based on the following knowledge base information:\n\n{context}\n\nPlease answer the user's question using this information when relevant."
  ),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  unique().on(table.companyId, table.nodeId)
]);

export const insertKnowledgeBaseConfigSchema = createInsertSchema(knowledgeBaseConfigs).pick({
  companyId: true,
  nodeId: true,
  flowId: true,
  enabled: true,
  maxRetrievedChunks: true,
  similarityThreshold: true,
  embeddingModel: true,
  contextPosition: true,
  contextTemplate: true
});

export const knowledgeBaseDocumentNodes = pgTable("knowledge_base_document_nodes", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeBaseDocuments.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id").notNull(),
  flowId: integer("flow_id").references(() => flows.id, { onDelete: 'cascade' }),

  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  unique().on(table.documentId, table.nodeId)
]);

export const insertKnowledgeBaseDocumentNodeSchema = createInsertSchema(knowledgeBaseDocumentNodes).pick({
  documentId: true,
  companyId: true,
  nodeId: true,
  flowId: true
});

export const knowledgeBaseUsage = pgTable("knowledge_base_usage", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id").notNull(),
  documentId: integer("document_id").references(() => knowledgeBaseDocuments.id, { onDelete: 'set null' }),

  queryText: text("query_text").notNull(),
  queryEmbedding: text("query_embedding"),

  chunksRetrieved: integer("chunks_retrieved").default(0),
  chunksUsed: integer("chunks_used").default(0),
  similarityScores: jsonb("similarity_scores").default('[]'),

  retrievalDurationMs: integer("retrieval_duration_ms"),
  embeddingDurationMs: integer("embedding_duration_ms"),

  contextInjected: boolean("context_injected").default(false),
  contextLength: integer("context_length"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertKnowledgeBaseUsageSchema = createInsertSchema(knowledgeBaseUsage).pick({
  companyId: true,
  nodeId: true,
  documentId: true,
  queryText: true,
  queryEmbedding: true,
  chunksRetrieved: true,
  chunksUsed: true,
  similarityScores: true,
  retrievalDurationMs: true,
  embeddingDurationMs: true,
  contextInjected: true,
  contextLength: true
});

export type KnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferSelect;
export type InsertKnowledgeBaseDocument = z.infer<typeof insertKnowledgeBaseDocumentSchema>;

export type KnowledgeBaseChunk = typeof knowledgeBaseChunks.$inferSelect;
export type InsertKnowledgeBaseChunk = z.infer<typeof insertKnowledgeBaseChunkSchema>;

export type KnowledgeBaseConfig = typeof knowledgeBaseConfigs.$inferSelect;
export type InsertKnowledgeBaseConfig = z.infer<typeof insertKnowledgeBaseConfigSchema>;

export type KnowledgeBaseDocumentNode = typeof knowledgeBaseDocumentNodes.$inferSelect;
export type InsertKnowledgeBaseDocumentNode = z.infer<typeof insertKnowledgeBaseDocumentNodeSchema>;

export type KnowledgeBaseUsage = typeof knowledgeBaseUsage.$inferSelect;
export type InsertKnowledgeBaseUsage = z.infer<typeof insertKnowledgeBaseUsageSchema>;
