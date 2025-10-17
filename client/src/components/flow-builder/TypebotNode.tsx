import { Bot, CheckCircle, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Loader2, MessageCircle, Play, Plus, Trash2, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import BotIcon from '@/components/ui/bot-icon';
import { useFlowContext } from '../../pages/flow-builder';
import { useTranslation } from '@/hooks/use-translation';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { standardHandleStyle } from './StyledHandle';







type ConfigField = {
  key: string;
  label: string;
  type: string;
  description?: string;
  required: boolean;
  default?: boolean | number;
  options?: string[];
};

interface ConfigValue {
  [key: string]: string | boolean | number | object;
}

interface VariableMapping {
  responseField: string;
  variableName: string;
}

interface TypebotNodeProps {
  id: string;
  data: {
    label: string;
    apiToken?: string;
    workspaceId?: string;
    typebotId?: string;
    botName?: string;
    operation?: string;
    config?: ConfigValue;
    variableMappings?: VariableMapping[];
    sessionTimeout?: number;
    onDeleteNode?: (id: string) => void;
    onDuplicateNode?: (id: string) => void;
  };
  isConnectable: boolean;
}

export function TypebotNode({ id, data, isConnectable }: TypebotNodeProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  const SESSION_ACTIONS = [
    { id: 'create', name: t('flow_builder.typebot_create_session', 'Create Session') },
    { id: 'update', name: t('flow_builder.typebot_update_session', 'Update Session') },
    { id: 'close', name: t('flow_builder.typebot_close_session', 'Close Session') },
    { id: 'get_status', name: t('flow_builder.typebot_get_status', 'Get Status') }
  ];

  const INPUT_TYPES = [
    { id: 'text', name: t('flow_builder.typebot_text_input', 'Text Input') },
    { id: 'number', name: t('flow_builder.typebot_number_input', 'Number Input') },
    { id: 'email', name: t('flow_builder.typebot_email_input', 'Email Input') },
    { id: 'url', name: t('flow_builder.typebot_url_input', 'URL Input') },
    { id: 'date', name: t('flow_builder.typebot_date_input', 'Date Input') },
    { id: 'phone', name: t('flow_builder.typebot_phone_input', 'Phone Input') },
    { id: 'choice', name: t('flow_builder.typebot_multiple_choice', 'Multiple Choice') },
    { id: 'file', name: t('flow_builder.typebot_file_upload', 'File Upload') }
  ];

  const TYPEBOT_TEMPLATES = [
    {
      id: 'start_chat',
      name: t('flow_builder.typebot_start_new_chat', 'Start New Chat'),
      operation: 'start_conversation',
      config: {
        prefilledVariables: {
          'contact_name': '{{contact.first_name}}',
          'contact_email': '{{contact.email}}'
        }
      }
    },
    {
      id: 'send_user_message',
      name: t('flow_builder.typebot_send_user_message', 'Send User Message'),
      operation: 'send_message',
      config: {
        message: '{{message.content}}',
        sessionId: '{{typebot.session.id}}'
      }
    },
    {
      id: 'get_bot_response',
      name: t('flow_builder.typebot_get_bot_response', 'Get Bot Response'),
      operation: 'get_response',
      config: {
        sessionId: '{{typebot.session.id}}',
        waitForResponse: true
      }
    },
    {
      id: 'close_conversation',
      name: t('flow_builder.typebot_close_conversation', 'Close Conversation'),
      operation: 'manage_session',
      config: {
        action: 'close',
        sessionId: '{{typebot.session.id}}'
      }
    }
  ];

  const getTypebotOperations = () => [
    { id: 'start_conversation', name: t('flow_builder.typebot_node.start_conversation', 'Start Conversation'), description: t('flow_builder.typebot_node.start_conversation_desc', 'Initialize new chat session') },
    { id: 'send_message', name: t('flow_builder.typebot_node.send_message', 'Send Message'), description: t('flow_builder.typebot_node.send_message_desc', 'Send user message to bot') },
    { id: 'get_response', name: t('flow_builder.typebot_node.get_response', 'Get Response'), description: t('flow_builder.typebot_node.get_response_desc', 'Retrieve bot response') },
    { id: 'manage_session', name: t('flow_builder.typebot_node.manage_session', 'Manage Session'), description: t('flow_builder.typebot_node.manage_session_desc', 'Create/update/close session') },
    { id: 'webhook_event', name: t('flow_builder.typebot_node.webhook_event', 'Webhook Event'), description: t('flow_builder.typebot_node.webhook_event_desc', 'Handle incoming webhook') },
    { id: 'get_analytics', name: t('flow_builder.typebot_node.get_analytics', 'Get Analytics'), description: t('flow_builder.typebot_node.get_analytics_desc', 'Retrieve conversation analytics') }
  ];

  const TYPEBOT_OPERATIONS = getTypebotOperations();

  const OPERATION_CONFIG: Record<string, ConfigField[]> = {
    start_conversation: [
      { key: 'prefilledVariables', label: 'Prefilled Variables', type: 'object', description: 'Variables to pass to the bot', required: false },
      { key: 'isStreamEnabled', label: 'Enable Streaming', type: 'boolean', default: false, required: false },
      { key: 'isOnlyRegisteredResults', label: 'Only Registered Results', type: 'boolean', default: false, required: false }
    ],
    send_message: [
      { key: 'message', label: 'Message Content', type: 'text', required: true },
      { key: 'sessionId', label: 'Session ID', type: 'text', required: true },
      { key: 'inputType', label: 'Input Type', type: 'select', options: INPUT_TYPES.map((t: any) => t.id), required: false }
    ],
    get_response: [
      { key: 'sessionId', label: 'Session ID', type: 'text', required: true },
      { key: 'waitForResponse', label: 'Wait for Response', type: 'boolean', default: true, required: false },
      { key: 'timeout', label: 'Timeout (seconds)', type: 'number', default: 30, required: false }
    ],
    manage_session: [
      { key: 'action', label: 'Session Action', type: 'select', options: SESSION_ACTIONS.map((a: any) => a.id), required: true },
      { key: 'sessionId', label: 'Session ID', type: 'text', required: false },
      { key: 'variables', label: 'Session Variables', type: 'object', required: false }
    ],
    webhook_event: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', required: true },
      { key: 'eventType', label: 'Event Type', type: 'select', options: ['conversation_started', 'conversation_completed', 'response_received'], required: false }
    ],
    get_analytics: [
      { key: 'dateFrom', label: 'From Date', type: 'date', required: false },
      { key: 'dateTo', label: 'To Date', type: 'date', required: false },
      { key: 'includeDetails', label: 'Include Details', type: 'boolean', default: false, required: false }
    ]
  };
  const [apiToken, setApiToken] = useState(data.apiToken || '');
  const [workspaceId, setWorkspaceId] = useState(data.workspaceId || '');
  const [typebotId, setTypebotId] = useState(data.typebotId || '');
  const [botName, setBotName] = useState(data.botName || '');
  const [operation, setOperation] = useState(data.operation || 'start_conversation');
  const [config, setConfig] = useState<ConfigValue>(data.config || {});
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>(data.variableMappings || []);
  const [sessionTimeout, setSessionTimeout] = useState(data.sessionTimeout || 3600);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
    botInfo?: any;
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
      apiToken,
      workspaceId,
      typebotId,
      botName,
      operation,
      config,
      variableMappings,
      sessionTimeout
    });
  }, [
    updateNodeData,
    apiToken,
    workspaceId,
    typebotId,
    botName,
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
    const template = TYPEBOT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setOperation(template.operation);
      const cleanConfig = Object.fromEntries(
        Object.entries(template.config).filter(([_, value]) => value !== undefined)
      ) as ConfigValue;
      setConfig(cleanConfig);
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

  const isValidApiToken = (token: string): boolean => {
    return token.startsWith('tb_') && token.length >= 35;
  };

  const replaceVariables = (text: string): string => {
    const testData: Record<string, string> = {
      'contact.first_name': 'John',
      'contact.last_name': 'Doe',
      'contact.email': 'john.doe@example.com',
      'contact.phone': '+1234567890',
      'message.content': 'Hello, I need help with my order',
      'typebot.session.id': 'session_123456789',
      'typebot.response.text': 'How can I help you today?',
      'user.id': 'user_987654321',
      'conversation.id': 'conv_456789123'
    };

    let result = text;
    Object.entries(testData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  };

  const buildApiUrl = (operation: string, typebotId?: string, sessionId?: string): string => {
    const baseUrl = 'https://typebot.io/api/v1';

    switch (operation) {
      case 'start_conversation':
        return `${baseUrl}/typebots/${typebotId}/startChat`;
      case 'send_message':
        return `${baseUrl}/sessions/${sessionId}/continueChat`;
      case 'get_response':
        return `${baseUrl}/sessions/${sessionId}`;
      case 'manage_session':
        return `${baseUrl}/sessions/${sessionId || 'new'}`;
      case 'get_analytics':
        return `${baseUrl}/typebots/${typebotId}/analytics`;
      case 'webhook_event':
        return `${baseUrl}/typebots/${typebotId}/webhooks`;
      default:
        return `${baseUrl}/typebots/${typebotId}`;
    }
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'start_conversation': return 'text-green-600';
      case 'send_message': return 'text-blue-600';
      case 'get_response': return 'text-purple-600';
      case 'manage_session': return 'text-orange-600';
      case 'webhook_event': return 'text-indigo-600';
      case 'get_analytics': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  const testConnection = async () => {
    if (!apiToken.trim()) {
      setTestResult({
        success: false,
        error: 'Please enter your Typebot API token'
      });
      setShowTestResult(true);
      return;
    }

    if (!isValidApiToken(apiToken)) {
      setTestResult({
        success: false,
        error: 'Please enter a valid Typebot API token (should start with "tb_")'
      });
      setShowTestResult(true);
      return;
    }

    if (!typebotId.trim()) {
      setTestResult({
        success: false,
        error: 'Please enter your Typebot ID'
      });
      setShowTestResult(true);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setShowTestResult(true);

    const startTime = Date.now();

    try {
      const botInfoUrl = `https://typebot.io/api/v1/typebots/${typebotId}`;
      const botInfoResponse = await fetch(botInfoUrl, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      let botInfo = null;
      if (botInfoResponse.ok) {
        botInfo = await botInfoResponse.json();
        setBotName(botInfo.name || 'Unknown Bot');
      }

      const apiUrl = buildApiUrl(operation, typebotId, config.sessionId as string);
      let requestBody: any = {};
      let method = 'GET';

      switch (operation) {
        case 'start_conversation':
          method = 'POST';
          requestBody = {
            isStreamEnabled: config.isStreamEnabled || false,
            prefilledVariables: config.prefilledVariables || {},
            isOnlyRegisteredResults: config.isOnlyRegisteredResults || false
          };
          break;
        case 'send_message':
          method = 'POST';
          requestBody = {
            message: replaceVariables(config.message as string || 'Test message'),
            sessionId: config.sessionId || 'test_session'
          };
          break;
        case 'get_response':
          method = 'GET';
          break;
        case 'manage_session':
          method = config.action === 'create' ? 'POST' : 'PUT';
          requestBody = {
            variables: config.variables || {}
          };
          break;
        case 'get_analytics':
          method = 'GET';
          break;
      }

      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
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
        } else if (responseData.session?.id) {
          sessionId = responseData.session.id;
        }

        setTestResult({
          success: true,
          data: responseData,
          botInfo,
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
          errorMessage = 'Authentication failed. Please check your API token.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (response.status === 404) {
          errorMessage = 'Typebot not found. Please check your Typebot ID.';
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
          errorMessage = 'CORS error. Please ensure your domain is allowed in Typebot settings.';
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
    <div className="node-typebot p-3 rounded-lg bg-white border border-blue-200 shadow-sm max-w-[320px] group">
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
              <p className="text-xs">Delete node</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="font-medium flex items-center gap-2 mb-2">
        <MessageCircle className="h-4 w-4 text-blue-600" />
        <span>{t('flow_builder.typebot_node.typebot_integration', 'Typebot Integration')}</span>
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
          <BotIcon size={14} className="text-muted-foreground" />
          <span className={cn("font-medium", getOperationColor(operation))}>
            {getTypebotOperations().find((op: any) => op.id === operation)?.name || operation}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground truncate">
            {botName || t('flow_builder.typebot_node.no_bot_selected', 'No bot selected')}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-1">
          {typebotId && (
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
              {t('flow_builder.typebot_node.bot_label', 'Bot:')} {typebotId.slice(0, 8)}...
            </span>
          )}
          {Object.keys(config).length > 0 && (
            <span className="text-[10px] bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
              {Object.keys(config).length} {Object.keys(config).length !== 1 ? t('flow_builder.typebot_node.configs_label', 'configs') : t('flow_builder.typebot_node.config_label', 'config')}
            </span>
          )}
          {variableMappings.length > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded">
              {variableMappings.length} {variableMappings.length !== 1 ? t('flow_builder.typebot_node.mappings_label', 'mappings') : t('flow_builder.typebot_node.mapping_label', 'mapping')}
            </span>
          )}
          {apiToken && (
            <span className="text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">
              {t('flow_builder.typebot_node.api_connected', 'API Connected')}
            </span>
          )}
          <span className="text-[10px] bg-gray-100 text-gray-800 px-1 py-0.5 rounded">
            {t('flow_builder.typebot_node.timeout_label', 'Timeout:')} {sessionTimeout}s
          </span>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 text-xs space-y-3 border rounded p-2 bg-secondary/10">
          <div>
            <Label className="block mb-1 font-medium">Quick Templates</Label>
            <Select
              value=""
              onValueChange={applyTemplate}
            >
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="Choose a Typebot operation..." />
              </SelectTrigger>
              <SelectContent>
                {TYPEBOT_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="block font-medium">Typebot API Configuration</Label>
            <div>
              <Label className="block mb-1 text-xs">API Token</Label>
              <Input
                type="password"
                placeholder="tb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="text-xs h-7"
              />
            </div>
            <div>
              <Label className="block mb-1 text-xs">Workspace ID (Optional)</Label>
              <Input
                placeholder="workspace_123456789"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="text-xs h-7"
              />
            </div>
            <div>
              <Label className="block mb-1 text-xs">Typebot ID</Label>
              <Input
                placeholder="typebot_987654321"
                value={typebotId}
                onChange={(e) => setTypebotId(e.target.value)}
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
                disabled={isTesting || !apiToken.trim() || !typebotId.trim()}
                title="Test connection to your Typebot"
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
              <Label className="block mb-1 font-medium">Typebot Operation</Label>
              <Select
                value={operation}
                onValueChange={setOperation}
              >
                <SelectTrigger className="text-xs h-7">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  {TYPEBOT_OPERATIONS.map((op) => (
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
                          value={String(config[configField.key] ?? configField.default ?? '')}
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
                  placeholder="response.text or sessionId"
                  value={mapping.responseField}
                  onChange={(e) => updateVariableMapping(index, 'responseField', e.target.value)}
                  className="text-xs h-7 flex-1"
                />
                <span className="text-xs text-muted-foreground self-center">→</span>
                <Input
                  placeholder="typebot.response_text"
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
              Map Typebot response fields to flow variables for use in subsequent nodes
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
                <div><code>&#123;&#123;typebot.response.text&#125;&#125;</code> - Bot response message</div>
                <div><code>&#123;&#123;typebot.session.id&#125;&#125;</code> - Conversation session ID</div>
                <div><code>&#123;&#123;typebot.bot.name&#125;&#125;</code> - Bot name</div>
                <div><code>&#123;&#123;typebot.conversation.status&#125;&#125;</code> - Conversation status</div>
                <div><code>&#123;&#123;typebot.timestamp&#125;&#125;</code> - Response timestamp</div>
                <div><code>&#123;&#123;typebot.success&#125;&#125;</code> - Operation success status</div>
                {operation === 'start_conversation' && (
                  <>
                    <div><code>&#123;&#123;typebot.session.new&#125;&#125;</code> - New session created</div>
                    <div><code>&#123;&#123;typebot.variables&#125;&#125;</code> - Prefilled variables</div>
                  </>
                )}
                {operation === 'send_message' && (
                  <>
                    <div><code>&#123;&#123;typebot.message.sent&#125;&#125;</code> - Message sent status</div>
                    <div><code>&#123;&#123;typebot.input.type&#125;&#125;</code> - Input type used</div>
                  </>
                )}
                {operation === 'get_response' && (
                  <>
                    <div><code>&#123;&#123;typebot.response.blocks&#125;&#125;</code> - Response blocks array</div>
                    <div><code>&#123;&#123;typebot.response.input&#125;&#125;</code> - Expected input type</div>
                  </>
                )}
                {operation === 'get_analytics' && (
                  <>
                    <div><code>&#123;&#123;typebot.analytics.views&#125;&#125;</code> - Total views</div>
                    <div><code>&#123;&#123;typebot.analytics.completions&#125;&#125;</code> - Completion rate</div>
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
              The Typebot Integration node connects to your Typebot chatbot via API.
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
                    <span className="text-[10px] text-blue-600">
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
                    Successfully connected to Typebot and executed {TYPEBOT_OPERATIONS.find(op => op.id === operation)?.name.toLowerCase()} operation.
                  </div>

                  {testResult.botInfo && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Bot Information:
                      </div>
                      <div className="text-[10px] bg-gray-50 p-2 rounded">
                        <div>Name: {testResult.botInfo.name || 'Unknown'}</div>
                        <div>ID: {testResult.botInfo.id || typebotId}</div>
                        <div>Status: {testResult.botInfo.isPublished ? 'Published' : 'Draft'}</div>
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