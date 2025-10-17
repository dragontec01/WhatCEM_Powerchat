import { useState, useEffect } from 'react';

export interface FlowVariable {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'contact' | 'message' | 'system' | 'flow' | 'captured';
  dataType?: string;
  nodeId?: string;
}


const BASE_VARIABLES: FlowVariable[] = [

  { value: 'contact.name', label: 'Contact Name', description: 'Full name of the contact', icon: null, category: 'contact' },
  { value: 'contact.phone', label: 'Contact Phone', description: 'Phone number of the contact', icon: null, category: 'contact' },
  { value: 'contact.email', label: 'Contact Email', description: 'Email address of the contact', icon: null, category: 'contact' },
  { value: 'contact.company', label: 'Contact Company', description: 'Company name of the contact', icon: null, category: 'contact' },


  { value: 'message.content', label: 'Message Content', description: 'Text content of the message', icon: null, category: 'message' },
  { value: 'message.type', label: 'Message Type', description: 'Type of message (text, image, etc.)', icon: null, category: 'message' },
  { value: 'message.timestamp', label: 'Message Timestamp', description: 'When the message was sent', icon: null, category: 'message' },


  { value: 'current.timestamp', label: 'Current Timestamp', description: 'Current date and time', icon: null, category: 'system' },
  { value: 'current.date', label: 'Current Date', description: 'Current date (YYYY-MM-DD)', icon: null, category: 'system' },
  { value: 'current.time', label: 'Current Time', description: 'Current time (HH:MM:SS)', icon: null, category: 'system' },


  { value: 'flow.result', label: 'Flow Result', description: 'Result from previous flow node', icon: null, category: 'flow' },
];

export function useFlowVariables(flowId?: number) {
  const [variables, setVariables] = useState<FlowVariable[]>(BASE_VARIABLES);
  const [capturedVariables, setCapturedVariables] = useState<FlowVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const fetchCapturedVariables = async () => {
    if (!flowId) return;

    setLoading(true);
    setError(null);

    try {

      const response = await fetch(`/api/flows/${flowId}/variables`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch flow variables');
      }

      const data = await response.json();
      
      const captured: FlowVariable[] = data.variables?.map((variable: any) => ({
        value: variable.variableKey,
        label: variable.label || variable.variableKey,
        description: variable.description || `Captured variable of type ${variable.variableType}`,
        icon: null,
        category: 'captured' as const,
        dataType: variable.variableType,
        nodeId: variable.nodeId
      })) || [];

      setCapturedVariables(captured);
      setVariables([...BASE_VARIABLES, ...captured]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching flow variables:', err);
    } finally {
      setLoading(false);
    }
  };


  const addCapturedVariable = (variable: Omit<FlowVariable, 'category'>) => {
    const capturedVar: FlowVariable = {
      ...variable,
      category: 'captured'
    };

    setCapturedVariables(prev => {
      const existing = prev.find(v => v.value === variable.value);
      if (existing) {

        return prev.map(v => v.value === variable.value ? capturedVar : v);
      } else {

        return [...prev, capturedVar];
      }
    });

    setVariables(prev => {
      const existing = prev.find(v => v.value === variable.value);
      if (existing) {
        return prev.map(v => v.value === variable.value ? capturedVar : v);
      } else {
        return [...prev, capturedVar];
      }
    });
  };


  const removeCapturedVariable = (variableKey: string) => {
    setCapturedVariables(prev => prev.filter(v => v.value !== variableKey));
    setVariables(prev => prev.filter(v => v.value !== variableKey || v.category !== 'captured'));
  };


  const getVariablesByCategory = (category: FlowVariable['category']) => {
    return variables.filter(v => v.category === category);
  };


  const getVariableKeys = () => {
    return variables.map(v => v.value);
  };


  const hasVariable = (variableKey: string) => {
    return variables.some(v => v.value === variableKey);
  };


  const getVariable = (variableKey: string) => {
    return variables.find(v => v.value === variableKey);
  };

  useEffect(() => {
    fetchCapturedVariables();
  }, [flowId]);

  return {
    variables,
    capturedVariables,
    loading,
    error,
    fetchCapturedVariables,
    addCapturedVariable,
    removeCapturedVariable,
    getVariablesByCategory,
    getVariableKeys,
    hasVariable,
    getVariable
  };
}

export const getCategoryLabel = (category: FlowVariable['category']): string => {
  switch (category) {
    case 'contact': return 'Contact Information';
    case 'message': return 'Message Data';
    case 'system': return 'System Variables';
    case 'flow': return 'Flow Variables';
    case 'captured': return 'Captured Variables';
    default: return 'Other';
  }
};

export const getCategoryIcon = (category: FlowVariable['category']): string => {
  switch (category) {
    case 'contact': return '👤';
    case 'message': return '💬';
    case 'system': return '⚙️';
    case 'flow': return '🔄';
    case 'captured': return '📊';
    default: return '📝';
  }
};
