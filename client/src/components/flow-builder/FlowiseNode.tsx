import { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useReactFlow } from 'reactflow';
import { Trash2, Copy, Brain, Settings, Plus, X, Play, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Workflow, Eye, EyeOff } from 'lucide-react';
import { useFlowContext } from '../../pages/flow-builder';
import { useTranslation } from '@/hooks/use-translation';

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from '@/lib/utils';
import { standardHandleStyle } from './StyledHandle';

const FLOWISE_OPERATIONS = [
  { id: 'start_chatflow', name: 'Start Chatflow', description: 'Initialize new AI conversation' },
  { id: 'send_message', name: 'Send Message', description: 'Send message to AI chatflow' },
  { id: 'get_response', name: 'Get Response', description: 'Retrieve AI response' },
  { id: 'manage_session', name: 'Manage Session', description: 'Create/update/close session' },
  { id: 'stream_response', name: 'Stream Response', description: 'Handle streaming AI responses' },
  { id: 'get_chatflow_info', name: 'Get Chatflow Info', description: 'Retrieve chatflow details' }
];

const SESSION_ACTIONS = [
  { id: 'create', name: 'Create Session' },
  { id: 'update', name: 'Update Session' },
  { id: 'close', name: 'Close Session' },
  { id: 'get_status', name: 'Get Status' }
];

const RESPONSE_FORMATS = [
  { id: 'text', name: 'Text Only' },
  { id: 'json', name: 'JSON Response' },
  { id: 'markdown', name: 'Markdown' },
  { id: 'html', name: 'HTML' }
];



type ConfigField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  default?: boolean | string | number;
  description?: string;
  options?: string[];
}

const OPERATION_CONFIG: Record<string, ConfigField[]> = {
  start_chatflow: [
    { key: 'question', label: 'Initial Question', type: 'text', required: true },
    { key: 'sessionId', label: 'Session ID', type: 'text', required: false },
    { key: 'returnSourceDocuments', label: 'Return Source Documents', type: 'boolean', default: false, required: false },
    { key: 'overrideConfig', label: 'Override Config', type: 'object', description: 'JSON configuration override', required: false }
  ],
  send_message: [
    { key: 'question', label: 'Message Content', type: 'text', required: true },
    { key: 'sessionId', label: 'Session ID', type: 'text', required: true },
    { key: 'streaming', label: 'Enable Streaming', type: 'boolean', default: false, required: false },
    { key: 'uploads', label: 'File Uploads', type: 'object', description: 'File upload configuration', required: false }
  ],
  get_response: [
    { key: 'sessionId', label: 'Session ID', type: 'text', required: true },
    { key: 'waitForResponse', label: 'Wait for Response', type: 'boolean', default: true, required: false },
    { key: 'timeout', label: 'Timeout (seconds)', type: 'number', default: 30, required: false },
    { key: 'format', label: 'Response Format', type: 'select', options: RESPONSE_FORMATS.map(f => f.id), required: false }
  ],
  manage_session: [
    { key: 'action', label: 'Session Action', type: 'select', options: SESSION_ACTIONS.map(a => a.id), required: true },
    { key: 'sessionId', label: 'Session ID', type: 'text', required: false },
    { key: 'memory', label: 'Session Memory', type: 'object', description: 'Memory configuration', required: false }
  ],
  stream_response: [
    { key: 'question', label: 'Question', type: 'text', required: true },
    { key: 'sessionId', label: 'Session ID', type: 'text', required: false },
    { key: 'streaming', label: 'Enable Streaming', type: 'boolean', default: true, required: false },
    { key: 'onChunk', label: 'Chunk Handler', type: 'text', description: 'JavaScript function for handling chunks', required: false }
  ],
  get_chatflow_info: [
    { key: 'includeCredentials', label: 'Include Credentials', type: 'boolean', default: false, required: false },
    { key: 'includeNodes', label: 'Include Nodes', type: 'boolean', default: true, required: false }
  ]
};

interface ConfigValue {
  [key: string]: string | boolean | number | object;
}

interface VariableMapping {
  responseField: string;
  variableName: string;
}

interface FlowiseNodeProps {
  id: string;
  data: {
    label: string;
    instanceUrl?: string;
    apiKey?: string;
    chatflowId?: string;
    chatflowName?: string;
    operation?: string;
    config?: ConfigValue;
    variableMappings?: VariableMapping[];
    sessionTimeout?: number;
    onDeleteNode?: (id: string) => void;
    onDuplicateNode?: (id: string) => void;
  };
  isConnectable: boolean;
}

export function FlowiseNode({ id, data, isConnectable }: FlowiseNodeProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  const FLOWISE_TEMPLATES = [
    {
      id: 'start_ai_chat',
      name: t('flow_builder.flowise_template_start_ai_chat', 'Start AI Chat'),
      operation: 'start_chatflow',
      config: {
        question: '{{message.content}}',
        overrideConfig: {
          sessionId: '{{contact.id}}_{{timestamp}}',
          returnSourceDocuments: true
        }
      }
    },
    {
      id: 'send_query',
      name: t('flow_builder.flowise_template_send_query', 'Send AI Query'),
      operation: 'send_message',
      config: {
        question: '{{user.query}}',
        sessionId: '{{flowise.session.id}}',
        streaming: false
      }
    },
    {
      id: 'get_ai_response',
      name: t('flow_builder.flowise_template_get_response', 'Get AI Response'),
      operation: 'get_response',
      config: {
        sessionId: '{{flowise.session.id}}',
        waitForResponse: true,
        timeout: 30
      }
    },
    {
      id: 'stream_ai_chat',
      name: t('flow_builder.flowise_template_stream_chat', 'Stream AI Chat'),
      operation: 'stream_response',
      config: {
        question: '{{message.content}}',
        streaming: true,
        sessionId: '{{contact.id}}_stream'
      }
    }
  ];
  const [instanceUrl, setInstanceUrl] = useState(data.instanceUrl || '');
  const [apiKey, setApiKey] = useState(data.apiKey || '');
  const [chatflowId, setChatflowId] = useState(data.chatflowId || '');
  const [chatflowName, setChatflowName] = useState(data.chatflowName || '');
  const [operation, setOperation] = useState(data.operation || 'start_chatflow');
  const [config, setConfig] = useState<ConfigValue>(data.config || {});
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>(data.variableMappings || []);
  const [sessionTimeout, setSessionTimeout] = useState(data.sessionTimeout || 3600);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
    chatflowInfo?: any;
    sessionId?: string;
    responseTime?: number;
  } | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);
  const [showVariablePreview, setShowVariablePreview] = useState(false);

  const { setNodes } = useReactFlow();
  const { onDeleteNode, onDuplicateNode } = useFlowContext();

  const updateNodeData = useCallback((updates: any) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updates
            }
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  useEffect(() => {
    updateNodeData({
      instanceUrl,
      apiKey,
      chatflowId,
      chatflowName,
      operation,
      config,
      variableMappings,
      sessionTimeout
    });
  }, [
    updateNodeData,
    instanceUrl,
    apiKey,
    chatflowId,
    chatflowName,
    operation,
    config,
    variableMappings,
    sessionTimeout
  ]);

  const addVariableMapping = () => {
    setVariableMappings([...variableMappings, { responseField: '', variableName: '' }]);
  };

  const removeVariableMapping = (index: number) => {
    setVariableMappings(variableMappings.filter((_, i) => i !== index));
  };

  const updateVariableMapping = (index: number, field: 'responseField' | 'variableName', value: string) => {
    const newMappings = [...variableMappings];
    newMappings[index][field] = value;
    setVariableMappings(newMappings);
  };

  const applyTemplate = (templateId: string) => {
    const template = FLOWISE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setOperation(template.operation);
      const configWithoutUndefined = Object.fromEntries(
        Object.entries(template.config).filter(([_, value]) => value !== undefined)
      );
      setConfig(configWithoutUndefined as ConfigValue);
    }
  };

  const updateConfig = (key: string, value: string | boolean | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const removeConfig = (key: string) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig[key];
      return newConfig;
    });
  };

  const isValidInstanceUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const replaceVariables = (text: string): string => {
    const testData: Record<string, string> = {
      'contact.id': 'contact_123456789',
      'contact.first_name': 'John',
      'contact.email': 'john.doe@example.com',
      'message.content': 'Hello, I need help with my account',
      'user.query': 'What are your business hours?',
      'flowise.session.id': 'session_987654321',
      'flowise.response.text': 'I can help you with that!',
      'timestamp': Date.now().toString(),
      'user.id': 'user_456789123'
    };

    let result = text;
    Object.entries(testData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  };

  const buildApiUrl = (operation: string, chatflowId?: string, sessionId?: string): string => {
    const baseUrl = instanceUrl.replace(/\/$/, '');

    switch (operation) {
      case 'start_chatflow':
      case 'send_message':
        return `${baseUrl}/api/v1/prediction/${chatflowId}`;
      case 'stream_response':
        return `${baseUrl}/api/v1/prediction/${chatflowId}`;
      case 'get_response':
        return `${baseUrl}/api/v1/chatmessage/${chatflowId}`;
      case 'manage_session':
        return `${baseUrl}/api/v1/chatmessage/${chatflowId}`;
      case 'get_chatflow_info':
        return `${baseUrl}/api/v1/chatflows/${chatflowId}`;
      default:
        return `${baseUrl}/api/v1/prediction/${chatflowId}`;
    }
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'start_chatflow': return 'text-green-600';
      case 'send_message': return 'text-blue-600';
      case 'get_response': return 'text-purple-600';
      case 'manage_session': return 'text-orange-600';
      case 'stream_response': return 'text-indigo-600';
      case 'get_chatflow_info': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  const testConnection = async () => {
    if (!instanceUrl.trim()) {
      setTestResult({
        success: false,
        error: 'Please enter your Flowise instance URL'
      });
      setShowTestResult(true);
      return;
    }

    if (!isValidInstanceUrl(instanceUrl)) {
      setTestResult({
        success: false,
        error: 'Please enter a valid URL (must include http:// or https://)'
      });
      setShowTestResult(true);
      return;
    }

    if (!chatflowId.trim()) {
      setTestResult({
        success: false,
        error: 'Please enter your Chatflow ID'
      });
      setShowTestResult(true);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setShowTestResult(true);

    const startTime = Date.now();

    try {
      const chatflowInfoUrl = buildApiUrl('get_chatflow_info', chatflowId);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const chatflowInfoResponse = await fetch(chatflowInfoUrl, {
        headers
      });

      let chatflowInfo = null;
      if (chatflowInfoResponse.ok) {
        chatflowInfo = await chatflowInfoResponse.json();
        setChatflowName(chatflowInfo.name || 'Unknown Chatflow');
      }

      const apiUrl = buildApiUrl(operation, chatflowId, config.sessionId as string);
      let requestBody: any = {};
      let method = 'GET';

      switch (operation) {
        case 'start_chatflow':
        case 'send_message':
          method = 'POST';
          requestBody = {
            question: replaceVariables(config.question as string || 'Hello, this is a test message'),
            sessionId: config.sessionId || `test_session_${Date.now()}`,
            streaming: config.streaming || false,
            overrideConfig: config.overrideConfig || {}
          };
          break;
        case 'stream_response':
          method = 'POST';
          requestBody = {
            question: replaceVariables(config.question as string || 'Test streaming message'),
            sessionId: config.sessionId || `stream_session_${Date.now()}`,
            streaming: true
          };
          break;
        case 'get_response':
          method = 'GET';
          break;
        case 'manage_session':
          method = config.action === 'create' ? 'POST' : 'PUT';
          requestBody = {
            sessionId: config.sessionId || `managed_session_${Date.now()}`,
            memory: config.memory || {}
          };
          break;
        case 'get_chatflow_info':
          method = 'GET';
          break;
      }

      const response = await fetch(apiUrl, {
        method,
        headers,
        ...(method !== 'GET' && { body: JSON.stringify(requestBody) })
      });

      const responseTime = Date.now() - startTime;

      let responseData: any;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      if (response.ok) {
        let sessionId = null;
        if (responseData.sessionId) {
          sessionId = responseData.sessionId;
        } else if (requestBody.sessionId) {
          sessionId = requestBody.sessionId;
        }

        setTestResult({
          success: true,
          data: responseData,
          chatflowInfo,
          sessionId,
          responseTime
        });
      } else {
        let errorMessage = 'Request failed';
        if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.error) {
          errorMessage = responseData.error;
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Please check your API key.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (response.status === 404) {
          errorMessage = 'Chatflow not found. Please check your Chatflow ID.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        }

        setTestResult({
          success: false,
          error: errorMessage,
          responseTime
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      let errorMessage = 'Connection failed';
      if (error.message) {
        if (error.message.includes('CORS')) {
          errorMessage = 'CORS error. Please ensure your Flowise instance allows cross-origin requests.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }

      setTestResult({
        success: false,
        error: errorMessage,
        responseTime
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="node-flowise p-3 rounded-lg bg-white border border-purple-200 shadow-sm max-w-[320px] group">
      <div className="absolute -top-8 -right-2 bg-background border rounded-md shadow-sm flex z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDeleteNode(id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{t('flow_builder.flowise_delete_node', 'Delete node')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="font-medium flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-purple-600" />
        <span>{t('flow_builder.flowise_integration', 'Flowise Integration')}</span>
       <button
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    Edit
                  </>
                )}
              </button>
      </div>

      <div className="text-sm p-2 bg-secondary/40 rounded border border-border">
        <div className="flex items-center gap-1 mb-1">
          <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("font-medium", getOperationColor(operation))}>
            {FLOWISE_OPERATIONS.find(op => op.id === operation)?.name || operation}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground truncate">
            {chatflowName || t('flow_builder.flowise_no_chatflow_selected', 'No chatflow selected')}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-1">
          {chatflowId && (
            <span className="text-[10px] bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
              {t('flow_builder.flowise_flow_label', 'Flow:')} {chatflowId.slice(0, 8)}...
            </span>
          )}
          {Object.keys(config).length > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
              {Object.keys(config).length !== 1 ? t('flow_builder.flowise_config_plural', '{{count}} configs', { count: Object.keys(config).length }) : t('flow_builder.flowise_config_single', '{{count}} config', { count: Object.keys(config).length })}
            </span>
          )}
          {variableMappings.length > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded">
              {variableMappings.length !== 1 ? t('flow_builder.flowise_mapping_plural', '{{count}} mappings', { count: variableMappings.length }) : t('flow_builder.flowise_mapping_single', '{{count}} mapping', { count: variableMappings.length })}
            </span>
          )}
          {apiKey && (
            <span className="text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">
              {t('flow_builder.flowise_api_connected', 'API Connected')}
            </span>
          )}
          <span className="text-[10px] bg-gray-100 text-gray-800 px-1 py-0.5 rounded">
            {t('flow_builder.flowise_timeout_label', 'Timeout: {{timeout}}s', { timeout: sessionTimeout })}
          </span>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 text-xs space-y-3 border rounded p-2 bg-secondary/10">
          <div>
            <Label className="block mb-1 font-medium">{t('flow_builder.flowise_quick_templates', 'Quick Templates')}</Label>
            <Select
              value=""
              onValueChange={applyTemplate}
            >
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder={t('flow_builder.flowise_choose_operation', 'Choose a Flowise operation...')} />
              </SelectTrigger>
              <SelectContent>
                {FLOWISE_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="block font-medium">Flowise API Configuration</Label>
            <div>
              <Label className="block mb-1 text-xs">Instance URL</Label>
              <Input
                placeholder="https://your-flowise-instance.com"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                className="text-xs h-7"
              />
            </div>
            <div>
              <Label className="block mb-1 text-xs">API Key (Optional)</Label>
              <Input
                type="password"
                placeholder="your-api-key-here"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-xs h-7"
              />
            </div>
            <div>
              <Label className="block mb-1 text-xs">Chatflow ID</Label>
              <Input
                placeholder="chatflow-uuid-here"
                value={chatflowId}
                onChange={(e) => setChatflowId(e.target.value)}
                className="text-xs h-7"
              />
            </div>
            <div>
              <Label className="block mb-1 text-xs">Session Timeout (seconds)</Label>
              <NumberInput
                value={sessionTimeout}
                onChange={setSessionTimeout}
                fallbackValue={3600}
                min={1}
                className="text-xs h-7"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 flex-1"
                onClick={testConnection}
                disabled={isTesting || !instanceUrl.trim() || !chatflowId.trim()}
                title="Test connection to your Flowise instance"
              >
                {isTesting ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                Test Connection
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div>
              <Label className="block mb-1 font-medium">Flowise Operation</Label>
              <Select
                value={operation}
                onValueChange={setOperation}
              >
                <SelectTrigger className="text-xs h-7">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  {FLOWISE_OPERATIONS.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      <div>
                        <div className={cn("font-medium", getOperationColor(op.id))}>{op.name}</div>
                        <div className="text-[10px] text-muted-foreground">{op.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {OPERATION_CONFIG[operation as keyof typeof OPERATION_CONFIG] && (
            <div className="pt-2 border-t">
              <Label className="block mb-2 font-medium">Operation Configuration</Label>
              <div className="space-y-2">
                {OPERATION_CONFIG[operation as keyof typeof OPERATION_CONFIG].map((configField) => (
                  <div key={configField.key} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Label className="block mb-1 text-[10px] text-muted-foreground">
                        {configField.label}
                        {configField.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {configField.type === 'select' ? (
                        <Select
                          value={config[configField.key] as string || ''}
                          onValueChange={(value) => updateConfig(configField.key, value)}
                        >
                          <SelectTrigger className="text-xs h-6">
                            <SelectValue placeholder={`Select ${configField.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {configField.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : configField.type === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={config[configField.key] as boolean || configField.default as boolean || false}
                            onCheckedChange={(checked) => updateConfig(configField.key, checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {config[configField.key] ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ) : configField.type === 'object' ? (
                        <Textarea
                          placeholder='{"key": "value"}'
                          value={typeof config[configField.key] === 'object'
                            ? JSON.stringify(config[configField.key], null, 2)
                            : config[configField.key] as string || ''}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              updateConfig(configField.key, parsed);
                            } catch {
                              updateConfig(configField.key, e.target.value);
                            }
                          }}
                          className="text-xs h-16 font-mono"
                        />
                      ) : configField.type === 'number' ? (
                        <NumberInput
                          value={Number(config[configField.key]) || Number(configField.default) || 0}
                          onChange={(value) => updateConfig(configField.key, value)}
                          fallbackValue={Number(configField.default) || 0}
                          className="text-xs h-6"
                        />
                      ) : (
                        <Input
                          type={configField.type}
                          placeholder={configField.description || `Enter ${configField.label.toLowerCase()}`}
                          value={config[configField.key] as string || configField.default as string || ''}
                          onChange={(e) => updateConfig(configField.key, e.target.value)}
                          className="text-xs h-6"
                        />
                      )}
                    </div>
                    {config[configField.key] !== undefined && !configField.required && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 mt-4"
                        onClick={() => removeConfig(configField.key)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                Use &#123;&#123;variable&#125;&#125; syntax for dynamic values
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="font-medium">Response Variable Mapping</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={addVariableMapping}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {variableMappings.map((mapping, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="text or sessionId"
                  value={mapping.responseField}
                  onChange={(e) => updateVariableMapping(index, 'responseField', e.target.value)}
                  className="text-xs h-7 flex-1"
                />
                <span className="text-xs text-muted-foreground self-center">→</span>
                <Input
                  placeholder="flowise.ai_response"
                  value={mapping.variableName}
                  onChange={(e) => updateVariableMapping(index, 'variableName', e.target.value)}
                  className="text-xs h-7 flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => removeVariableMapping(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground">
              Map Flowise response fields to flow variables for use in subsequent nodes
            </div>
          </div>

          <div className="pt-2 border-t">
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 w-full"
              onClick={() => setShowVariablePreview(!showVariablePreview)}
            >
              Available Output Variables
              {showVariablePreview ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showVariablePreview && (
              <div className="mt-2 text-[10px] bg-gray-50 p-2 rounded space-y-1">
                <div><code>&#123;&#123;flowise.response.text&#125;&#125;</code> - AI response text</div>
                <div><code>&#123;&#123;flowise.session.id&#125;&#125;</code> - Conversation session ID</div>
                <div><code>&#123;&#123;flowise.chatflow.name&#125;&#125;</code> - Chatflow name</div>
                <div><code>&#123;&#123;flowise.conversation.status&#125;&#125;</code> - Conversation status</div>
                <div><code>&#123;&#123;flowise.timestamp&#125;&#125;</code> - Response timestamp</div>
                <div><code>&#123;&#123;flowise.success&#125;&#125;</code> - Operation success status</div>
                {operation === 'start_chatflow' && (
                  <>
                    <div><code>&#123;&#123;flowise.session.new&#125;&#125;</code> - New session created</div>
                    <div><code>&#123;&#123;flowise.config.override&#125;&#125;</code> - Override configuration</div>
                  </>
                )}
                {operation === 'send_message' && (
                  <>
                    <div><code>&#123;&#123;flowise.message.sent&#125;&#125;</code> - Message sent status</div>
                    <div><code>&#123;&#123;flowise.streaming.enabled&#125;&#125;</code> - Streaming status</div>
                  </>
                )}
                {operation === 'get_response' && (
                  <>
                    <div><code>&#123;&#123;flowise.response.format&#125;&#125;</code> - Response format</div>
                    <div><code>&#123;&#123;flowise.response.complete&#125;&#125;</code> - Response completion status</div>
                  </>
                )}
                {operation === 'stream_response' && (
                  <>
                    <div><code>&#123;&#123;flowise.stream.chunks&#125;&#125;</code> - Stream chunks array</div>
                    <div><code>&#123;&#123;flowise.stream.complete&#125;&#125;</code> - Stream completion status</div>
                  </>
                )}
                {operation === 'get_chatflow_info' && (
                  <>
                    <div><code>&#123;&#123;flowise.chatflow.nodes&#125;&#125;</code> - Chatflow nodes</div>
                    <div><code>&#123;&#123;flowise.chatflow.version&#125;&#125;</code> - Chatflow version</div>
                  </>
                )}
                {variableMappings.map((mapping, index) => (
                  mapping.variableName && (
                    <div key={index}>
                      <code>&#123;&#123;{mapping.variableName}&#125;&#125;</code> - {mapping.responseField || 'Custom mapping'}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="text-[10px] text-muted-foreground mt-2">
            <p>
              The Flowise Integration node connects to your Flowise AI workflows via API.
              Response data will be available as variables in subsequent nodes.
            </p>
          </div>

          {showTestResult && testResult && (
            <div className="mt-3 border rounded p-2 bg-secondary/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-xs font-medium">
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </span>
                  {testResult.responseTime && (
                    <span className="text-[10px] text-muted-foreground">
                      ({testResult.responseTime}ms)
                    </span>
                  )}
                  {testResult.sessionId && (
                    <span className="text-[10px] text-purple-600">
                      Session: {testResult.sessionId.slice(0, 8)}...
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setShowTestResult(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {testResult.error ? (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {testResult.error}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    Successfully connected to Flowise and executed {FLOWISE_OPERATIONS.find(op => op.id === operation)?.name.toLowerCase()} operation.
                  </div>

                  {testResult.chatflowInfo && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Chatflow Information:
                      </div>
                      <div className="text-[10px] bg-gray-50 p-2 rounded">
                        <div>Name: {testResult.chatflowInfo.name || 'Unknown'}</div>
                        <div>ID: {testResult.chatflowInfo.id || chatflowId}</div>
                        <div>Status: {testResult.chatflowInfo.deployed ? 'Deployed' : 'Draft'}</div>
                        <div>Category: {testResult.chatflowInfo.category || 'General'}</div>
                      </div>
                    </div>
                  )}

                  {testResult.data && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Sample Response Data:
                      </div>
                      <div className="text-[10px] bg-gray-50 p-2 rounded font-mono max-h-32 overflow-y-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={standardHandleStyle}
        isConnectable={isConnectable}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={standardHandleStyle}
        isConnectable={isConnectable}
      />
    </div>
  );
}