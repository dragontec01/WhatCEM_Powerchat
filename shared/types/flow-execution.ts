/**
 * Shared types for flow execution
 */

export interface FlowExecutionState {
  id: string;
  flowId: number;
  conversationId: number;
  contactId: number;
  currentNodeId: string | null;
  status: 'running' | 'waiting' | 'completed' | 'failed';
  startedAt: Date;
  lastActivity: Date;
  executionPath: string[];
  waitingForInput: boolean;
  lastNodeResult: any;
}

export interface FlowExecutionContext {
  variables: Record<string, any>;
  nodeData: Record<string, any>;
  startTime: Date;
}

export interface NodeExecutionResult {
  success: boolean;
  shouldContinue: boolean;
  nextNodeId?: string;
  waitForUserInput?: boolean;
  error?: string;
  data?: any;
}

export interface FlowExecutionEvent {
  type: 'flowExecutionStarted' | 'flowExecutionUpdated' | 'flowExecutionWaiting' | 'flowExecutionCompleted' | 'flowExecutionFailed' | 'flowExecutionResumed';
  data: {
    executionId: string;
    flowId: number;
    conversationId: number;
    contactId: number;
    currentNodeId?: string;
    status?: 'running' | 'waiting' | 'completed' | 'failed';
    executionPath?: string[];
    error?: string;
    result?: any;
    duration?: number;
    userInput?: any;
    waitingNodeId?: string;
  };
}

export interface FlowExecutionStats {
  total: number;
  running: number;
  waiting: number;
  completed: number;
  failed: number;
}

export interface FlowExecutionConfig {
  enableRealTimeUpdates: boolean;
  executionTimeout: number; // in milliseconds
  maxConcurrentExecutions: number;
  retryFailedNodes: boolean;
  logExecutionPath: boolean;
}

export interface NodeExecutionConfig {
  timeout?: number;
  retryCount?: number;
  skipOnError?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface FlowTriggerEvent {
  type: 'message_received' | 'webhook' | 'schedule' | 'manual';
  data: {
    messageId?: number;
    conversationId: number;
    contactId: number;
    channelConnectionId: number;
    triggerData?: any;
  };
}

export interface FlowExecutionMetrics {
  executionId: string;
  flowId: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  nodesExecuted: number;
  totalNodes: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  errorCount: number;
  lastError?: string;
  executionPath: string[];
  performance: {
    averageNodeExecutionTime: number;
    slowestNode: {
      nodeId: string;
      executionTime: number;
    };
    fastestNode: {
      nodeId: string;
      executionTime: number;
    };
  };
}

export interface FlowExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  duration?: number;
}

export interface FlowExecutionSummary {
  executionId: string;
  flowId: number;
  flowName: string;
  conversationId: number;
  contactId: number;
  contactName?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  nodesExecuted: number;
  totalNodes: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
  triggerType: string;
  executionPath: string[];
}


export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  clientId?: string;
}

export interface FlowExecutionWebSocketMessage extends WebSocketMessage {
  type: 'flowExecutionStarted' | 'flowExecutionUpdated' | 'flowExecutionWaiting' | 'flowExecutionCompleted' | 'flowExecutionFailed' | 'flowExecutionResumed';
  data: FlowExecutionEvent['data'];
}


export type NodeExecutionStatus = 'pending' | 'executing' | 'executed' | 'waiting' | 'failed' | 'skipped';

export interface NodeExecutionInfo {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  result?: any;
  retryCount?: number;
}


export interface FlowExecutionQuery {
  flowId?: number;
  conversationId?: number;
  contactId?: number;
  status?: FlowExecutionState['status'];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'startTime' | 'endTime' | 'duration' | 'status';
  sortOrder?: 'asc' | 'desc';
}


export interface FlowExecutionAnalytics {
  flowId: number;
  flowName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  successRate: number;
  mostExecutedNodes: Array<{
    nodeId: string;
    nodeType: string;
    executionCount: number;
  }>;
  commonFailurePoints: Array<{
    nodeId: string;
    nodeType: string;
    failureCount: number;
    failureRate: number;
  }>;
  performanceMetrics: {
    averageExecutionTime: number;
    medianExecutionTime: number;
    p95ExecutionTime: number;
    p99ExecutionTime: number;
  };
  triggerAnalytics: {
    messageReceived: number;
    webhook: number;
    schedule: number;
    manual: number;
  };
}

export default {
  FlowExecutionState,
  FlowExecutionContext,
  NodeExecutionResult,
  FlowExecutionEvent,
  FlowExecutionStats,
  FlowExecutionConfig,
  NodeExecutionConfig,
  FlowTriggerEvent,
  FlowExecutionMetrics,
  FlowExecutionLog,
  FlowExecutionSummary,
  WebSocketMessage,
  FlowExecutionWebSocketMessage,
  NodeExecutionStatus,
  NodeExecutionInfo,
  FlowExecutionQuery,
  FlowExecutionAnalytics
};
