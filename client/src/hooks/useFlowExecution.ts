import { useState, useEffect, useCallback } from 'react';
import useSocket from './useSocket';

interface FlowExecutionState {
  executionId: string;
  flowId: number;
  conversationId: number;
  contactId: number;
  currentNodeId: string | null;
  status: 'running' | 'waiting' | 'completed' | 'failed';
  executionPath: string[];
}

interface FlowExecutionEvent {
  type: 'flowExecutionStarted' | 'flowExecutionUpdated' | 'flowExecutionWaiting' | 'flowExecutionCompleted' | 'flowExecutionFailed';
  data: FlowExecutionState;
}

/**
 * Hook for tracking flow execution in real-time
 */
export function useFlowExecution(flowId?: number) {
  const [activeExecutions, setActiveExecutions] = useState<Map<string, FlowExecutionState>>(new Map());
  const [currentlyExecutingNode, setCurrentlyExecutingNode] = useState<string | null>(null);
  const [executionHistory, setExecutionHistory] = useState<FlowExecutionEvent[]>([]);
  const { isConnected, onMessage } = useSocket('/ws');

  const handleExecutionEvent = useCallback((event: FlowExecutionEvent) => {
    const { type, data } = event;

    if (flowId && data.flowId !== flowId) {
      return;
    }

    setActiveExecutions(prev => {
      const updated = new Map(prev);
      
      switch (type) {
        case 'flowExecutionStarted':
        case 'flowExecutionUpdated':
        case 'flowExecutionWaiting':
          updated.set(data.executionId, data);
          break;
          
        case 'flowExecutionCompleted':
        case 'flowExecutionFailed':
          updated.set(data.executionId, data);
          setTimeout(() => {
            setActiveExecutions(current => {
              const newMap = new Map(current);
              newMap.delete(data.executionId);
              return newMap;
            });
          }, 5000);
          break;
      }
      
      return updated;
    });

    if (type === 'flowExecutionUpdated' && data.status === 'running') {
      setCurrentlyExecutingNode(data.currentNodeId);
      
      setTimeout(() => {
        setCurrentlyExecutingNode(null);
      }, 2000);
    } else if (type === 'flowExecutionCompleted' || type === 'flowExecutionFailed') {
      setCurrentlyExecutingNode(null);
    }

    setExecutionHistory(prev => [...prev.slice(-49), event]);
  }, [flowId]);

  useEffect(() => {
    const unsubscribe = onMessage('flowExecution', (data: any) => {
      if (data.type && data.type.startsWith('flowExecution')) {
        handleExecutionEvent(data as FlowExecutionEvent);
      }
    });

    return unsubscribe;
  }, [onMessage, handleExecutionEvent]);

  const getFlowExecutions = useCallback((targetFlowId: number) => {
    return Array.from(activeExecutions.values()).filter(exec => exec.flowId === targetFlowId);
  }, [activeExecutions]);

  const getConversationExecutions = useCallback((conversationId: number) => {
    return Array.from(activeExecutions.values()).filter(exec => exec.conversationId === conversationId);
  }, [activeExecutions]);

  const isNodeExecuting = useCallback((nodeId: string) => {
    return currentlyExecutingNode === nodeId;
  }, [currentlyExecutingNode]);

  const wasNodeExecuted = useCallback((nodeId: string) => {
    return Array.from(activeExecutions.values()).some(exec => 
      exec.executionPath.includes(nodeId)
    );
  }, [activeExecutions]);

  const getNodeExecutionStatus = useCallback((nodeId: string) => {
    if (isNodeExecuting(nodeId)) {
      return 'executing';
    }
    
    if (wasNodeExecuted(nodeId)) {
      return 'executed';
    }
    
    return 'pending';
  }, [isNodeExecuting, wasNodeExecuted]);

  const getAllActiveExecutions = useCallback(() => {
    return Array.from(activeExecutions.values());
  }, [activeExecutions]);

  const getExecutionStats = useCallback(() => {
    const executions = Array.from(activeExecutions.values());
    return {
      total: executions.length,
      running: executions.filter(e => e.status === 'running').length,
      waiting: executions.filter(e => e.status === 'waiting').length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length
    };
  }, [activeExecutions]);

  const clearExecutionHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  const clearAllExecutions = useCallback(() => {
    setActiveExecutions(new Map());
    setCurrentlyExecutingNode(null);
    setExecutionHistory([]);
  }, []);

  return {
    isConnected,
    
    activeExecutions: getAllActiveExecutions(),
    currentlyExecutingNode,
    executionHistory,
    
    getFlowExecutions,
    getConversationExecutions,
    isNodeExecuting,
    wasNodeExecuted,
    getNodeExecutionStatus,
    getExecutionStats,
    
    clearExecutionHistory,
    clearAllExecutions
  };
}

export default useFlowExecution;
