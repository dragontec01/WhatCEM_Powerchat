import { db } from '../db';
import {
  knowledgeBaseDocuments,
  knowledgeBaseChunks,
  knowledgeBaseConfigs,
  knowledgeBaseDocumentNodes,
  knowledgeBaseUsage,
  flows,
  type KnowledgeBaseDocument,
  type KnowledgeBaseChunk,
  type KnowledgeBaseConfig,
  type InsertKnowledgeBaseDocument,
  type InsertKnowledgeBaseConfig,
  type InsertKnowledgeBaseUsage
} from '../../shared/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TextDocumentProcessor } from './document-processors/text-processor';
import { aiCredentialsService } from './ai-credentials-service';
import { pineconeService } from './pinecone-service';

interface DocumentChunk {
  content: string;
  index: number;
  startPosition: number;
  endPosition: number;
  tokenCount: number;
}

interface RetrievalResult {
  chunk: KnowledgeBaseChunk;
  similarity: number;
  document: KnowledgeBaseDocument;
}

interface ContextEnhancementResult {
  enhancedPrompt: string;
  contextUsed: string[];
  retrievalStats: {
    chunksRetrieved: number;
    chunksUsed: number;
    averageSimilarity: number;
    retrievalDurationMs: number;
  };
}

/**
 * Knowledge Base Service
 * Handles document processing, embedding generation, and RAG retrieval
 */
export class KnowledgeBaseService {
  private readonly CHUNK_SIZE = 1000; // tokens per chunk
  private readonly CHUNK_OVERLAP = 200; // token overlap between chunks
  private readonly DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

  constructor() {

  }

  /**
   * Get OpenAI client with appropriate API key based on node configuration
   */
  private async getOpenAIClient(companyId: number, nodeId: string): Promise<OpenAI> {
    try {

      if (nodeId === 'fallback' || !nodeId) {
        const credentialSource = await aiCredentialsService.getCredentialForCompany(companyId, 'openai');

        if (!credentialSource) {
          throw new Error(`No OpenAI API key configured for this company. Please configure OpenAI credentials in the AI settings.`);
        }

        return new OpenAI({ apiKey: credentialSource.apiKey });
      }


      const nodeConfig = await this.getNodeCredentialConfig(companyId, nodeId);

      if (nodeConfig && nodeConfig.credentialSource === 'manual' && nodeConfig.apiKey) {

        return new OpenAI({ apiKey: nodeConfig.apiKey });
      }


      const credentialPreference = nodeConfig?.credentialSource || 'auto';
      const credentialSource = await aiCredentialsService.getCredentialWithPreference(
        companyId,
        'openai',
        credentialPreference as 'company' | 'system' | 'auto'
      );

      if (!credentialSource) {
        throw new Error(`No OpenAI API key configured. Please configure OpenAI credentials in the AI settings or set a manual API key in the AI Assistant node.`);
      }

      return new OpenAI({ apiKey: credentialSource.apiKey });
    } catch (error) {
      console.error('Failed to get OpenAI credentials:', error);
      throw new Error('OpenAI API key not configured. Please set up OpenAI credentials in the AI settings or set a manual API key in the AI Assistant node.');
    }
  }

  /**
   * Get node credential configuration from flow data
   */
  private async getNodeCredentialConfig(companyId: number, nodeId: string): Promise<{
    credentialSource?: 'manual' | 'company' | 'system' | 'auto';
    apiKey?: string;
    provider?: string;
  } | null> {
    try {

      const companyFlows = await db.select()
        .from(flows)
        .where(eq(flows.companyId, companyId));


      for (const flow of companyFlows) {
        const nodes = flow.nodes as any[];
        const node = nodes?.find((n: any) => n.id === nodeId);

        if (node && node.data) {
          return {
            credentialSource: node.data.credentialSource,
            apiKey: node.data.apiKey,
            provider: node.data.provider
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get node credential config:', error);
      return null;
    }
  }

  /**
   * Process uploaded document: extract text, chunk, and generate embeddings
   */
  async processDocument(documentId: number): Promise<void> {
    const startTime = Date.now();
    
    try {

      await db.update(knowledgeBaseDocuments)
        .set({ status: 'processing' })
        .where(eq(knowledgeBaseDocuments.id, documentId));


      const [document] = await db.select()
        .from(knowledgeBaseDocuments)
        .where(eq(knowledgeBaseDocuments.id, documentId));

      if (!document) {
        throw new Error('Document not found');
      }


      const extractedText = await this.extractTextFromFile(document.filePath, document.mimeType);
      

      const chunks = await this.chunkText(extractedText);
      


      const nodeId = document.nodeId || 'fallback';
      const chunksWithEmbeddings = await this.generateEmbeddings(document.companyId, nodeId, chunks);
      

      await this.storeChunks(documentId, chunksWithEmbeddings);
      

      const processingDuration = Date.now() - startTime;
      await db.update(knowledgeBaseDocuments)
        .set({ 
          status: 'completed',
          extractedText,
          chunkCount: chunks.length,
          processingDurationMs: processingDuration
        })
        .where(eq(knowledgeBaseDocuments.id, documentId));

    } catch (error) {
      console.error('Error processing document:', error);
      

      await db.update(knowledgeBaseDocuments)
        .set({ 
          status: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown error',
          processingDurationMs: Date.now() - startTime
        })
        .where(eq(knowledgeBaseDocuments.id, documentId));
      
      throw error;
    }
  }

  /**
   * Extract text from various file formats
   */
  private async extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
    const fullPath = path.resolve(filePath);


    await TextDocumentProcessor.validateFile(fullPath, mimeType);


    return TextDocumentProcessor.extractText(fullPath, mimeType);
  }



  /**
   * Split text into semantic chunks
   */
  private async chunkText(text: string): Promise<DocumentChunk[]> {

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    
    let currentChunk = '';
    let currentTokenCount = 0;
    let chunkIndex = 0;
    let startPosition = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokenCount + sentenceTokens > this.CHUNK_SIZE && currentChunk.length > 0) {

        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex,
          startPosition,
          endPosition: startPosition + currentChunk.length,
          tokenCount: currentTokenCount
        });
        

        const overlapText = this.getOverlapText(currentChunk, this.CHUNK_OVERLAP);
        currentChunk = overlapText + sentence;
        currentTokenCount = this.estimateTokens(currentChunk);
        startPosition += currentChunk.length - overlapText.length;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentTokenCount += sentenceTokens;
      }
    }
    

    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        startPosition,
        endPosition: startPosition + currentChunk.length,
        tokenCount: currentTokenCount
      });
    }
    
    return chunks;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get overlap text from end of chunk
   */
  private getOverlapText(text: string, maxTokens: number): string {
    const words = text.split(' ');
    const maxWords = Math.floor(maxTokens / 0.75); // Rough word-to-token ratio
    
    if (words.length <= maxWords) return text;
    
    return words.slice(-maxWords).join(' ');
  }

  /**
   * Generate embeddings for chunks using OpenAI
   */
  private async generateEmbeddings(companyId: number, nodeId: string, chunks: DocumentChunk[]): Promise<(DocumentChunk & { embedding: number[] })[]> {
    const batchSize = 100; // OpenAI batch limit
    const results: (DocumentChunk & { embedding: number[] })[] = [];


    const openai = await this.getOpenAIClient(companyId, nodeId);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);

      const response = await openai.embeddings.create({
        model: this.DEFAULT_EMBEDDING_MODEL,
        input: texts
      });
      
      batch.forEach((chunk, index) => {
        results.push({
          ...chunk,
          embedding: response.data[index].embedding
        });
      });
    }
    
    return results;
  }

  /**
   * Store chunks with embeddings in Pinecone
   */
  private async storeChunks(documentId: number, chunks: (DocumentChunk & { embedding: number[] })[]): Promise<void> {

    const [document] = await db.select()
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.id, documentId));

    if (!document) {
      throw new Error('Document not found');
    }

    const nodeId = document.nodeId || 'fallback';


    const chunkRecords = chunks.map(chunk => ({
      documentId,
      content: chunk.content,
      chunkIndex: chunk.index,
      tokenCount: chunk.tokenCount,
      embedding: null, // No longer storing embeddings in PostgreSQL
      startPosition: chunk.startPosition,
      endPosition: chunk.endPosition
    }));


    const insertedChunks = await db.insert(knowledgeBaseChunks)
      .values(chunkRecords)
      .returning();


    const vectors = insertedChunks.map((dbChunk, index) => ({
      id: `chunk-${dbChunk.id}`,
      values: chunks[index].embedding,
      metadata: {
        companyId: document.companyId,
        nodeId,
        documentId,
        chunkId: dbChunk.id,
        chunkIndex: dbChunk.chunkIndex,
        content: dbChunk.content,
        tokenCount: dbChunk.tokenCount || 0,
        documentName: document.originalName,
        mimeType: document.mimeType,
        startPosition: dbChunk.startPosition || 0,
        endPosition: dbChunk.endPosition || 0,
        createdAt: new Date().toISOString(),
      },
    }));


    await pineconeService.ensureIndex(document.companyId, nodeId);


    await pineconeService.upsertVectors(document.companyId, nodeId, vectors);


  }

  /**
   * Delete document vectors from Pinecone
   */
  async deleteDocumentVectors(companyId: number, nodeId: string, documentId: number): Promise<void> {
    try {
      await pineconeService.deleteDocumentVectors(companyId, nodeId, documentId);

    } catch (error) {
      console.error('Error deleting document vectors:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant context for a query using vector similarity
   */
  async retrieveContext(
    companyId: number,
    nodeId: string,
    query: string
  ): Promise<RetrievalResult[]> {
    const startTime = Date.now();

    try {

      const [config] = await db.select()
        .from(knowledgeBaseConfigs)
        .where(and(
          eq(knowledgeBaseConfigs.companyId, companyId),
          eq(knowledgeBaseConfigs.nodeId, nodeId)
        ));

      if (!config || !config.enabled) {
        return [];
      }


      const queryEmbedding = await this.generateQueryEmbedding(companyId, nodeId, query);


      const associatedDocs = await db.select({ documentId: knowledgeBaseDocumentNodes.documentId })
        .from(knowledgeBaseDocumentNodes)
        .where(and(
          eq(knowledgeBaseDocumentNodes.companyId, companyId),
          eq(knowledgeBaseDocumentNodes.nodeId, nodeId)
        ));

      if (associatedDocs.length === 0) {
        return [];
      }

      const documentIds = associatedDocs.map(doc => doc.documentId);


      const results = await this.performVectorSearch(
        companyId,
        nodeId,
        queryEmbedding,
        documentIds,
        config.maxRetrievedChunks || 3,
        config.similarityThreshold || 0.7
      );


      await this.trackUsage({
        companyId,
        nodeId,
        queryText: query,
        queryEmbedding: JSON.stringify(queryEmbedding),
        chunksRetrieved: results.length,
        chunksUsed: results.length,
        similarityScores: results.map(r => r.similarity),
        retrievalDurationMs: Date.now() - startTime,
        embeddingDurationMs: 0, // Would be measured separately
        contextInjected: results.length > 0,
        contextLength: results.reduce((sum, r) => sum + r.chunk.content.length, 0)
      });

      return results;

    } catch (error) {
      console.error('Error retrieving context:', error);
      return [];
    }
  }

  /**
   * Generate embedding for query
   */
  private async generateQueryEmbedding(companyId: number, nodeId: string, query: string): Promise<number[]> {

    const openai = await this.getOpenAIClient(companyId, nodeId);

    const response = await openai.embeddings.create({
      model: this.DEFAULT_EMBEDDING_MODEL,
      input: query
    });

    return response.data[0].embedding;
  }

  /**
   * Perform vector similarity search using Pinecone
   */
  private async performVectorSearch(
    companyId: number,
    nodeId: string,
    queryEmbedding: number[],
    documentIds: number[],
    maxResults: number,
    similarityThreshold: number
  ): Promise<RetrievalResult[]> {

    const pineconeResults = await pineconeService.queryVectors(
      companyId,
      nodeId,
      queryEmbedding,
      maxResults,
      similarityThreshold
    );

    if (pineconeResults.length === 0) {
      return [];
    }


    const chunkIds = pineconeResults.map(result =>
      parseInt(result.id.replace('chunk-', ''))
    );


    const chunks = await db.select({
      chunk: knowledgeBaseChunks,
      document: knowledgeBaseDocuments
    })
    .from(knowledgeBaseChunks)
    .innerJoin(knowledgeBaseDocuments, eq(knowledgeBaseChunks.documentId, knowledgeBaseDocuments.id))
    .where(inArray(knowledgeBaseChunks.id, chunkIds));


    const results: RetrievalResult[] = [];
    for (const pineconeResult of pineconeResults) {
      const chunkId = parseInt(pineconeResult.id.replace('chunk-', ''));
      const chunkData = chunks.find(c => c.chunk.id === chunkId);

      if (chunkData) {
        results.push({
          chunk: chunkData.chunk,
          document: chunkData.document,
          similarity: pineconeResult.score,
        });
      }
    }

    return results;
  }

  /**
   * Track knowledge base usage
   */
  private async trackUsage(usage: InsertKnowledgeBaseUsage): Promise<void> {
    try {
      await db.insert(knowledgeBaseUsage).values(usage);
    } catch (error) {
      console.error('Error tracking knowledge base usage:', error);
    }
  }

  /**
   * Enhance system prompt with retrieved context
   */
  async enhancePromptWithContext(
    companyId: number,
    nodeId: string,
    systemPrompt: string,
    userQuery: string
  ): Promise<ContextEnhancementResult> {
    const startTime = Date.now();

    try {

      const [config] = await db.select()
        .from(knowledgeBaseConfigs)
        .where(and(
          eq(knowledgeBaseConfigs.companyId, companyId),
          eq(knowledgeBaseConfigs.nodeId, nodeId)
        ));

      if (!config || !config.enabled) {
        return {
          enhancedPrompt: systemPrompt,
          contextUsed: [],
          retrievalStats: {
            chunksRetrieved: 0,
            chunksUsed: 0,
            averageSimilarity: 0,
            retrievalDurationMs: 0
          }
        };
      }


      const retrievalResults = await this.retrieveContext(companyId, nodeId, userQuery);

      if (retrievalResults.length === 0) {
        return {
          enhancedPrompt: systemPrompt,
          contextUsed: [],
          retrievalStats: {
            chunksRetrieved: 0,
            chunksUsed: 0,
            averageSimilarity: 0,
            retrievalDurationMs: Date.now() - startTime
          }
        };
      }


      const contextChunks = retrievalResults.map(result => result.chunk.content);
      const contextText = contextChunks.join('\n\n---\n\n');


      const enhancedPrompt = this.injectContext(
        systemPrompt,
        contextText,
        config.contextTemplate || 'Based on the following knowledge base information:\n\n{context}\n\nPlease answer the user\'s question using this information when relevant.',
        config.contextPosition || 'before_system'
      );


      const averageSimilarity = retrievalResults.reduce((sum, r) => sum + r.similarity, 0) / retrievalResults.length;

      return {
        enhancedPrompt,
        contextUsed: contextChunks,
        retrievalStats: {
          chunksRetrieved: retrievalResults.length,
          chunksUsed: retrievalResults.length,
          averageSimilarity,
          retrievalDurationMs: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Error enhancing prompt with context:', error);
      return {
        enhancedPrompt: systemPrompt,
        contextUsed: [],
        retrievalStats: {
          chunksRetrieved: 0,
          chunksUsed: 0,
          averageSimilarity: 0,
          retrievalDurationMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Inject context into prompt based on position configuration
   */
  private injectContext(
    systemPrompt: string,
    contextText: string,
    contextTemplate: string,
    contextPosition: 'before_system' | 'after_system' | 'before_user'
  ): string {
    const formattedContext = contextTemplate.replace('{context}', contextText);

    switch (contextPosition) {
      case 'before_system':
        return `${formattedContext}\n\n${systemPrompt}`;

      case 'after_system':
        return `${systemPrompt}\n\n${formattedContext}`;

      case 'before_user':

        return systemPrompt;

      default:
        return `${formattedContext}\n\n${systemPrompt}`;
    }
  }

  /**
   * Get knowledge base configuration for a node
   */
  async getNodeConfig(companyId: number, nodeId: string): Promise<KnowledgeBaseConfig | null> {
    const [config] = await db.select()
      .from(knowledgeBaseConfigs)
      .where(and(
        eq(knowledgeBaseConfigs.companyId, companyId),
        eq(knowledgeBaseConfigs.nodeId, nodeId)
      ));

    return config || null;
  }

  /**
   * Create or update knowledge base configuration
   */
  async upsertNodeConfig(config: InsertKnowledgeBaseConfig): Promise<KnowledgeBaseConfig> {
    const [existingConfig] = await db.select()
      .from(knowledgeBaseConfigs)
      .where(and(
        eq(knowledgeBaseConfigs.companyId, config.companyId),
        eq(knowledgeBaseConfigs.nodeId, config.nodeId)
      ));

    if (existingConfig) {
      const [updated] = await db.update(knowledgeBaseConfigs)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(knowledgeBaseConfigs.id, existingConfig.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(knowledgeBaseConfigs)
        .values({
          companyId: config.companyId,
          nodeId: config.nodeId,
          flowId: config.flowId,
          enabled: config.enabled ?? true,
          maxRetrievedChunks: config.maxRetrievedChunks ?? 3,
          similarityThreshold: config.similarityThreshold ?? 0.7,
          embeddingModel: config.embeddingModel ?? 'text-embedding-3-small',
          contextPosition: config.contextPosition ?? 'before_system',
          contextTemplate: config.contextTemplate ?? 'Based on the following knowledge base information:\n\n{context}\n\nPlease answer the user\'s question using this information when relevant.'
        })
        .returning();
      return created;
    }
  }

  /**
   * Associate document with AI Assistant node
   */
  async associateDocumentWithNode(
    documentId: number,
    companyId: number,
    nodeId: string,
    flowId?: number
  ): Promise<void> {
    await db.insert(knowledgeBaseDocumentNodes)
      .values({
        documentId,
        companyId,
        nodeId,
        flowId
      })
      .onConflictDoNothing();
  }

  /**
   * Get documents associated with a node
   */
  async getNodeDocuments(companyId: number, nodeId: string): Promise<KnowledgeBaseDocument[]> {
    const results = await db.select({ document: knowledgeBaseDocuments })
      .from(knowledgeBaseDocuments)
      .innerJoin(
        knowledgeBaseDocumentNodes,
        eq(knowledgeBaseDocuments.id, knowledgeBaseDocumentNodes.documentId)
      )
      .where(and(
        eq(knowledgeBaseDocumentNodes.companyId, companyId),
        eq(knowledgeBaseDocumentNodes.nodeId, nodeId)
      ));

    return results.map(r => r.document);
  }
}


let knowledgeBaseServiceInstance: KnowledgeBaseService | null = null;

export function getKnowledgeBaseService(): KnowledgeBaseService {
  if (!knowledgeBaseServiceInstance) {
    knowledgeBaseServiceInstance = new KnowledgeBaseService();
  }
  return knowledgeBaseServiceInstance;
}

export default {
  processDocument: (documentId: number) => getKnowledgeBaseService().processDocument(documentId),
  retrieveContext: (companyId: number, nodeId: string, query: string) =>
    getKnowledgeBaseService().retrieveContext(companyId, nodeId, query),
  enhancePromptWithContext: (companyId: number, nodeId: string, systemPrompt: string, userQuery: string) =>
    getKnowledgeBaseService().enhancePromptWithContext(companyId, nodeId, systemPrompt, userQuery),
  getNodeConfig: (companyId: number, nodeId: string) =>
    getKnowledgeBaseService().getNodeConfig(companyId, nodeId),
  upsertNodeConfig: (config: any) =>
    getKnowledgeBaseService().upsertNodeConfig(config),
  associateDocumentWithNode: (documentId: number, companyId: number, nodeId: string, flowId?: number) =>
    getKnowledgeBaseService().associateDocumentWithNode(documentId, companyId, nodeId, flowId),
  getNodeDocuments: (companyId: number, nodeId: string) =>
    getKnowledgeBaseService().getNodeDocuments(companyId, nodeId),
  deleteDocumentVectors: (companyId: number, nodeId: string, documentId: number) =>
    getKnowledgeBaseService().deleteDocumentVectors(companyId, nodeId, documentId)
};
