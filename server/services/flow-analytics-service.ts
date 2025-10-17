import { FlowExecutionManager } from './flow-execution-manager';
import { IStorage } from '../storage';

/**
 * Flow Analytics Service
 * Bridges the in-memory FlowExecutionManager with database tracking for analytics
 */
export class FlowAnalyticsService {
  private static instance: FlowAnalyticsService;
  private storage: IStorage;
  private executionManager: FlowExecutionManager;
  private executionDbIds: Map<string, number> = new Map();
  private stepExecutionIds: Map<string, number> = new Map();

  private constructor(storage: IStorage) {
    this.storage = storage;
    this.executionManager = FlowExecutionManager.getInstance();
    this.setupEventListeners();
  }

  static getInstance(storage: IStorage): FlowAnalyticsService {
    if (!FlowAnalyticsService.instance) {
      FlowAnalyticsService.instance = new FlowAnalyticsService(storage);
    }
    return FlowAnalyticsService.instance;
  }

  /**
   * Setup event listeners for flow execution events
   */
  private setupEventListeners(): void {
    this.executionManager.on('executionStarted', async (data) => {
      await this.handleExecutionStarted(data);
    });

    this.executionManager.on('executionUpdated', async (data) => {
      await this.handleExecutionUpdated(data);
    });

    this.executionManager.on('executionWaiting', async (data) => {
      await this.handleExecutionWaiting(data);
    });

    this.executionManager.on('executionCompleted', async (data) => {
      await this.handleExecutionCompleted(data);
    });

    this.executionManager.on('executionFailed', async (data) => {
      await this.handleExecutionFailed(data);
    });

    this.executionManager.on('nodeExecuted', async (data) => {
      await this.handleNodeExecuted(data);
    });

    
  }

  /**
   * Handle execution started event
   */
  private async handleExecutionStarted(data: {
    executionId: string;
    flowId: number;
    conversationId: number;
    contactId: number;
    currentNodeId: string;
  }): Promise<void> {
    try {
      const conversation = await this.storage.getConversation(data.conversationId);
      const companyId = conversation?.companyId || undefined;

      const dbExecutionId = await this.storage.createFlowExecution({
        executionId: data.executionId,
        flowId: data.flowId,
        conversationId: data.conversationId,
        contactId: data.contactId,
        companyId: companyId,
        triggerNodeId: data.currentNodeId,
        contextData: {}
      });

      this.executionDbIds.set(data.executionId, dbExecutionId);

      
    } catch (error) {
      console.error('Flow Analytics: Error tracking execution start:', error);
    }
  }

  /**
   * Handle execution updated event
   */
  private async handleExecutionUpdated(data: {
    executionId: string;
    currentNodeId: string;
    status: string;
    nodeResult?: any;
  }): Promise<void> {
    try {
      const execution = this.executionManager.getExecution(data.executionId);
      if (!execution) return;

      await this.storage.updateFlowExecution(data.executionId, {
        status: data.status,
        currentNodeId: data.currentNodeId,
        executionPath: execution.executionPath,
        contextData: execution.context.getAllVariables()
      });

      
    } catch (error) {
      console.error('Flow Analytics: Error tracking execution update:', error);
    }
  }

  /**
   * Handle execution waiting event
   */
  private async handleExecutionWaiting(data: {
    executionId: string;
    flowId: number;
    conversationId: number;
    contactId: number;
    waitingNodeId: string;
  }): Promise<void> {
    try {
      const execution = this.executionManager.getExecution(data.executionId);
      if (!execution) return;

      await this.storage.updateFlowExecution(data.executionId, {
        status: 'waiting',
        currentNodeId: data.waitingNodeId,
        executionPath: execution.executionPath,
        contextData: execution.context.getAllVariables()
      });

      
    } catch (error) {
      console.error('Flow Analytics: Error tracking execution waiting:', error);
    }
  }

  /**
   * Handle execution completed event
   */
  private async handleExecutionCompleted(data: {
    executionId: string;
    flowId: number;
    conversationId: number;
    contactId: number;
    result?: any;
    executionPath: string[];
    duration: number;
  }): Promise<void> {
    try {
      const completionRate = await this.calculateCompletionRate(data.executionPath, data.flowId);

      await this.storage.updateFlowExecution(data.executionId, {
        status: 'completed',
        completedAt: new Date(),
        totalDurationMs: data.duration,
        completionRate: completionRate,
        executionPath: data.executionPath
      });

      this.executionDbIds.delete(data.executionId);

      
    } catch (error) {
      console.error('Flow Analytics: Error tracking execution completion:', error);
    }
  }

  /**
   * Handle execution failed event
   */
  private async handleExecutionFailed(data: {
    executionId: string;
    flowId: number;
    conversationId: number;
    contactId: number;
    error: string;
    executionPath: string[];
  }): Promise<void> {
    try {
      const execution = this.executionManager.getExecution(data.executionId);
      const duration = execution ? 
        execution.lastActivity.getTime() - execution.startedAt.getTime() : 0;

      const completionRate = await this.calculateCompletionRate(data.executionPath, data.flowId);

      await this.storage.updateFlowExecution(data.executionId, {
        status: 'failed',
        completedAt: new Date(),
        totalDurationMs: duration,
        completionRate: completionRate,
        errorMessage: data.error,
        executionPath: data.executionPath
      });

      this.executionDbIds.delete(data.executionId);

      
    } catch (error) {
      console.error('Flow Analytics: Error tracking execution failure:', error);
    }
  }

  /**
   * Handle node execution event
   */
  private async handleNodeExecuted(data: {
    executionId: string;
    nodeId: string;
    nodeType: string;
    stepOrder: number;
    duration: number;
    status: 'completed' | 'failed' | 'skipped';
    inputData?: any;
    outputData?: any;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const dbExecutionId = this.executionDbIds.get(data.executionId);
      if (!dbExecutionId) return;

      const stepKey = `${data.executionId}_${data.nodeId}_${data.stepOrder}`;
      
      let stepExecutionId = this.stepExecutionIds.get(stepKey);
      
      if (!stepExecutionId) {
        stepExecutionId = await this.storage.createFlowStepExecution({
          flowExecutionId: dbExecutionId,
          nodeId: data.nodeId,
          nodeType: data.nodeType,
          stepOrder: data.stepOrder,
          inputData: data.inputData
        });
        this.stepExecutionIds.set(stepKey, stepExecutionId);
      }

      await this.storage.updateFlowStepExecution(stepExecutionId, {
        status: data.status,
        completedAt: new Date(),
        durationMs: data.duration,
        outputData: data.outputData,
        errorMessage: data.errorMessage
      });

      
    } catch (error) {
      console.error('Flow Analytics: Error tracking node execution:', error);
    }
  }

  /**
   * Calculate completion rate based on execution path vs total flow nodes
   */
  private async calculateCompletionRate(executionPath: string[], flowId: number): Promise<number> {
    try {
      const flow = await this.storage.getFlow(flowId);
      if (!flow || !Array.isArray(flow.nodes)) return 0;

      const totalNodes = flow.nodes.length;
      const executedNodes = executionPath.length;

      if (totalNodes === 0) return 100;
      
      const completionRate = Math.min(100, Math.round((executedNodes / totalNodes) * 100));
      return completionRate;
    } catch (error) {
      console.error('Flow Analytics: Error calculating completion rate:', error);
      return 0;
    }
  }

  /**
   * Mark execution as abandoned (for cleanup purposes)
   */
  async markExecutionAbandoned(executionId: string, reason: string = 'Timeout'): Promise<void> {
    try {
      const execution = this.executionManager.getExecution(executionId);
      if (!execution) return;

      const duration = execution.lastActivity.getTime() - execution.startedAt.getTime();
      const completionRate = await this.calculateCompletionRate(execution.executionPath, execution.flowId);

      await this.storage.updateFlowExecution(executionId, {
        status: 'abandoned',
        completedAt: new Date(),
        totalDurationMs: duration,
        completionRate: completionRate,
        errorMessage: reason
      });

      this.executionDbIds.delete(executionId);

      
    } catch (error) {
      console.error('Flow Analytics: Error marking execution as abandoned:', error);
    }
  }

  /**
   * Cleanup old execution mappings
   */
  cleanup(): void {
    
  }
}
