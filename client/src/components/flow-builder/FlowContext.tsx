import React, { createContext, ReactNode, useCallback, useContext } from 'react';

interface FlowContextType {
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
}

export const FlowContext = createContext<FlowContextType | null>(null);

export function useFlowContext() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlowContext must be used within a FlowProvider');
  }
  return context;
}

interface FlowProviderProps {
  children: ReactNode;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
}

export function FlowProvider({ children, onDeleteNode, onDuplicateNode }: FlowProviderProps) {
  return (
    <FlowContext.Provider
      value={{
        onDeleteNode,
        onDuplicateNode
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}