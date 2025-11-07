import { Pinecone, type RecordMetadata } from '@pinecone-database/pinecone';
import { db } from '../db';
import { flows } from '../../shared/db/schema';
import { eq } from 'drizzle-orm';

interface PineconeCredentials {
  apiKey: string;
  environment?: string;
  indexName: string; // Will be auto-generated if not provided
}

interface VectorMetadata extends RecordMetadata {
  companyId: number;
  nodeId: string;
  documentId: number;
  chunkId: number;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  documentName: string;
  mimeType: string;
  startPosition: number;
  endPosition: number;
  createdAt: string;
}

interface UpsertVector {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

interface QueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

/**
 * Pinecone Service
 * Handles vector storage and retrieval using Pinecone
 */
export class PineconeService {
  private clients: Map<string, Pinecone> = new Map();

  constructor() {}

  /**
   * Get Pinecone credentials from node configuration
   */
  private async getPineconeCredentials(
    companyId: number,
    nodeId: string
  ): Promise<PineconeCredentials> {
    try {

      const companyFlows = await db.select()
        .from(flows)
        .where(eq(flows.companyId, companyId));

      for (const flow of companyFlows) {
        if (!flow.nodes) continue;

        const nodes = typeof flow.nodes === 'string'
          ? JSON.parse(flow.nodes)
          : flow.nodes;

        const node = (nodes as any)?.find?.((n: any) => n.id === nodeId);

        if (node?.data?.pineconeApiKey) {

          const indexName = node.data.pineconeIndexName ||
            `powerchat-kb-${companyId}`;

          return {
            apiKey: node.data.pineconeApiKey,
            environment: node.data.pineconeEnvironment || 'us-east-1',
            indexName,
          };
        }
      }

      throw new Error(
        'Pinecone API Key not configured. Please set Pinecone API Key in the AI Assistant node settings.'
      );
    } catch (error) {
      console.error('Failed to get Pinecone credentials:', error);
      throw new Error(
        'Pinecone API Key not configured. Please set Pinecone API Key in the AI Assistant node settings.'
      );
    }
  }

  /**
   * Get or create Pinecone client for given credentials
   */
  private async getPineconeClient(
    companyId: number,
    nodeId: string
  ): Promise<{ client: Pinecone; indexName: string }> {
    const credentials = await this.getPineconeCredentials(companyId, nodeId);
    const clientKey = `${credentials.apiKey}-${credentials.indexName}`;


    if (!this.clients.has(clientKey)) {
      const client = new Pinecone({
        apiKey: credentials.apiKey,
      });
      this.clients.set(clientKey, client);
    }

    return {
      client: this.clients.get(clientKey)!,
      indexName: credentials.indexName,
    };
  }

  /**
   * Generate namespace for multi-tenancy isolation
   */
  private getNamespace(companyId: number, nodeId: string): string {
    return `company-${companyId}-node-${nodeId}`;
  }

  /**
   * Ensure index exists (create if needed)
   */
  async ensureIndex(companyId: number, nodeId: string): Promise<void> {
    try {
      const { client, indexName } = await this.getPineconeClient(companyId, nodeId);


      const indexes = await client.listIndexes();
      const exists = indexes.indexes?.some(idx => idx.name === indexName);

      if (!exists) {

        await client.createIndex({
          name: indexName,
          dimension: 1536, // text-embedding-3-small dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
          waitUntilReady: true,
        });


      }
    } catch (error) {
      console.error('Error ensuring Pinecone index:', error);
      throw new Error(`Failed to ensure Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upsert vectors to Pinecone
   */
  async upsertVectors(
    companyId: number,
    nodeId: string,
    vectors: UpsertVector[]
  ): Promise<void> {
    try {
      const { client, indexName } = await this.getPineconeClient(companyId, nodeId);
      const namespace = this.getNamespace(companyId, nodeId);

      const index = client.index(indexName);


      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.namespace(namespace).upsert(batch);
      }


    } catch (error) {
      console.error('Error upserting vectors to Pinecone:', error);
      throw new Error(`Failed to upsert vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query vectors from Pinecone
   */
  async queryVectors(
    companyId: number,
    nodeId: string,
    queryEmbedding: number[],
    topK: number,
    similarityThreshold: number = 0.7
  ): Promise<QueryResult[]> {
    try {
      const { client, indexName } = await this.getPineconeClient(companyId, nodeId);
      const namespace = this.getNamespace(companyId, nodeId);

      const index = client.index(indexName);

      const results = await index.namespace(namespace).query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        includeValues: false, // Don't return embeddings to save bandwidth
      });


      return results.matches
        .filter(match => match.score !== undefined && match.score >= similarityThreshold)
        .map(match => ({
          id: match.id,
          score: match.score!,
          metadata: match.metadata as VectorMetadata,
        }));
    } catch (error) {
      console.error('Error querying vectors from Pinecone:', error);
      throw new Error(`Failed to query vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(
    companyId: number,
    nodeId: string,
    vectorIds: string[]
  ): Promise<void> {
    try {
      const { client, indexName } = await this.getPineconeClient(companyId, nodeId);
      const namespace = this.getNamespace(companyId, nodeId);

      const index = client.index(indexName);

      await index.namespace(namespace).deleteMany(vectorIds);


    } catch (error) {
      console.error('Error deleting vectors from Pinecone:', error);
      throw new Error(`Failed to delete vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all vectors for a document
   */
  async deleteDocumentVectors(
    companyId: number,
    nodeId: string,
    documentId: number
  ): Promise<void> {
    try {
      const { client, indexName } = await this.getPineconeClient(companyId, nodeId);
      const namespace = this.getNamespace(companyId, nodeId);

      const index = client.index(indexName);


      await index.namespace(namespace).deleteMany({
        documentId: { $eq: documentId },
      });


    } catch (error) {
      console.error('Error deleting document vectors from Pinecone:', error);
      throw new Error(`Failed to delete document vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete entire namespace (all vectors for a company-node combination)
   */
  async deleteNamespace(companyId: number, nodeId: string): Promise<void> {
    try {
      const { client, indexName } = await this.getPineconeClient(companyId, nodeId);
      const namespace = this.getNamespace(companyId, nodeId);

      const index = client.index(indexName);

      await index.namespace(namespace).deleteAll();


    } catch (error) {
      console.error('Error deleting namespace from Pinecone:', error);
      throw new Error(`Failed to delete namespace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(companyId: number, nodeId: string): Promise<any> {
    try {
      const { client, indexName } = await this.getPineconeClient(companyId, nodeId);
      const index = client.index(indexName);

      const stats = await index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Error getting index stats from Pinecone:', error);
      throw new Error(`Failed to get index stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}


export const pineconeService = new PineconeService();

