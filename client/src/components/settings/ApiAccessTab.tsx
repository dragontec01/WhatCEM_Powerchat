import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  Activity,
  Code,
  BookOpen,
  BarChart3,
  Settings,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
}

interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgDuration: number;
  totalDataTransfer: number;
}

export function ApiAccessTab() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadApiKeys();
    loadUsageStats();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/settings/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await fetch('/api/settings/api-usage-stats');
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newKeyName.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.key);
        setShowKeyModal(true);
        setShowCreateModal(false);
        setNewKeyName('');
        await loadApiKeys();
        
        toast({
          title: "Success",
          description: "API key created successfully"
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create API key');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadApiKeys();
        toast({
          title: "Success",
          description: "API key deleted successfully"
        });
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive"
      });
    }
  };

  const toggleApiKey = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !isActive
        })
      });

      if (response.ok) {
        await loadApiKeys();
        toast({
          title: "Success",
          description: `API key ${!isActive ? 'activated' : 'deactivated'} successfully`
        });
      } else {
        throw new Error('Failed to update API key');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update API key",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard"
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading API access...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Access</h2>
          <p className="text-gray-600">
            Manage API keys and programmatic access to your channels
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage Statistics
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="w-4 h-4 mr-2" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Key className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No API Keys</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first API key to start sending messages programmatically
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          {apiKey.name}
                          <Badge 
                            variant={apiKey.isActive ? "default" : "secondary"}
                            className="ml-2"
                          >
                            {apiKey.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Key: {apiKey.keyPrefix}••••••••
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleApiKey(apiKey.id, apiKey.isActive)}
                        >
                          {apiKey.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteApiKey(apiKey.id, apiKey.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-500">Created</Label>
                        <p className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Last Used</Label>
                        <p className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {apiKey.lastUsedAt 
                            ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })
                            : 'Never'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Rate Limits</Label>
                        <p>{apiKey.rateLimitPerMinute}/min, {apiKey.rateLimitPerHour}/hr</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Permissions</Label>
                        <p>{apiKey.permissions.join(', ')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {usageStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Total Requests</p>
                      <p className="text-2xl font-bold">{usageStats.totalRequests.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Successful</p>
                      <p className="text-2xl font-bold">{usageStats.successfulRequests.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Failed</p>
                      <p className="text-2xl font-bold">{usageStats.failedRequests.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Avg Duration</p>
                      <p className="text-2xl font-bold">{Math.round(usageStats.avgDuration)}ms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <div className="ml-2">
                      <p className="text-sm font-medium">Data Transfer</p>
                      <p className="text-2xl font-bold">{formatBytes(usageStats.totalDataTransfer)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Complete guide to integrate WhatsApp messaging into your applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                  <TabsTrigger value="errors">Errors</TabsTrigger>
                  <TabsTrigger value="examples">Examples</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">🚀 Getting Started</h4>
                      <p className="text-blue-800 text-sm">
                        The API allows you to send WhatsApp messages programmatically.
                        Follow this guide to integrate messaging capabilities into your applications.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Base URL</h4>
                        <code className="text-sm bg-white px-3 py-2 rounded border block">
                          {window.location.origin}/api/v1
                        </code>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Content Type</h4>
                        <code className="text-sm bg-white px-3 py-2 rounded border block">
                          application/json
                        </code>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-2">🔐 Authentication</h4>
                      <p className="text-yellow-800 text-sm mb-3">
                        All API requests require authentication using your API key in the Authorization header:
                      </p>
                      <code className="text-sm bg-white px-3 py-2 rounded border block">
                        Authorization: Bearer YOUR_API_KEY
                      </code>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">⚡ Rate Limits</h4>
                      <div className="text-green-800 text-sm space-y-1">
                        <p>• <strong>Per Minute:</strong> 60 requests</p>
                        <p>• <strong>Per Hour:</strong> 1,000 requests</p>
                        <p>• <strong>Per Day:</strong> 10,000 requests</p>
                        <p className="mt-2 text-xs">Rate limits are enforced per API key. Exceeded limits return HTTP 429.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Quick Start Workflow</h4>
                      <div className="space-y-2">
                        <div className="flex items-center p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                          <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">1</div>
                          <div>
                            <p className="font-medium">Get Available Channels</p>
                            <p className="text-sm text-gray-600">Fetch your configured WhatsApp channels</p>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-50 rounded border-l-4 border-green-500">
                          <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">2</div>
                          <div>
                            <p className="font-medium">Send Messages</p>
                            <p className="text-sm text-gray-600">Send text or media messages through your channels</p>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-50 rounded border-l-4 border-purple-500">
                          <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">3</div>
                          <div>
                            <p className="font-medium">Handle Responses</p>
                            <p className="text-sm text-gray-600">Process success/error responses and message IDs</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Channels Tab */}
                <TabsContent value="channels" className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">GET /channels</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Retrieve all active WhatsApp channels configured for your account.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">Request</h5>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">GET</Badge>
                            <code className="text-sm">/api/v1/channels</code>
                          </div>
                          <div className="text-sm">
                            <strong>Headers:</strong>
                            <pre className="bg-white p-2 rounded border mt-1 text-xs overflow-x-auto">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h5 className="font-medium mb-2 text-green-900">Success Response (200)</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "MyBusinessNumber",
      "type": "whatsapp_unofficial",
      "status": "active",
      "phoneNumber": "1234567890",
      "displayName": "My Business"
    }
  ],
  "count": 1
}`}
                        </pre>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="font-medium mb-2 text-blue-900">Response Fields</h5>
                        <div className="space-y-2 text-sm">
                          <div><code className="bg-white px-2 py-1 rounded">id</code> - Unique channel identifier</div>
                          <div><code className="bg-white px-2 py-1 rounded">name</code> - Channel display name</div>
                          <div><code className="bg-white px-2 py-1 rounded">type</code> - Channel type (whatsapp_unofficial, whatsapp_360dialog, etc.)</div>
                          <div><code className="bg-white px-2 py-1 rounded">status</code> - Channel status (active, inactive)</div>
                          <div><code className="bg-white px-2 py-1 rounded">phoneNumber</code> - WhatsApp phone number (if available)</div>
                          <div><code className="bg-white px-2 py-1 rounded">displayName</code> - WhatsApp display name</div>
                        </div>
                      </div>

                      <div className="bg-gray-100 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">cURL Example</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`curl -X GET "${window.location.origin}/api/v1/channels" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Messages Tab */}
                <TabsContent value="messages" className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">POST /messages/send</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Send text messages through your configured WhatsApp channels.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">Request</h5>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">POST</Badge>
                            <code className="text-sm">/api/v1/messages/send</code>
                          </div>
                          <div className="text-sm">
                            <strong>Headers:</strong>
                            <pre className="bg-white p-2 rounded border mt-1 text-xs overflow-x-auto">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
                            </pre>
                          </div>
                          <div className="text-sm">
                            <strong>Body:</strong>
                            <pre className="bg-white p-2 rounded border mt-1 text-xs overflow-x-auto">
{`{
  "channelId": 1,
  "to": "1234567890",
  "message": "Hello! This is a test message from application API."
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="font-medium mb-2 text-blue-900">Request Parameters</h5>
                        <div className="space-y-2 text-sm">
                          <div><code className="bg-white px-2 py-1 rounded">channelId</code> <span className="text-red-500">*</span> - Channel ID from /channels endpoint</div>
                          <div><code className="bg-white px-2 py-1 rounded">to</code> <span className="text-red-500">*</span> - Recipient phone number (with country code)</div>
                          <div><code className="bg-white px-2 py-1 rounded">message</code> <span className="text-red-500">*</span> - Text message content (max 4096 characters)</div>
                          <div className="text-xs text-gray-600 mt-2"><span className="text-red-500">*</span> Required fields</div>
                        </div>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h5 className="font-medium mb-2 text-green-900">Success Response (200)</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "messageId": "msg_1234567890",
    "status": "sent",
    "channelId": 1,
    "to": "1234567890",
    "sentAt": "2024-01-15T10:30:00Z"
  }
}`}
                        </pre>
                      </div>

                      <div className="bg-gray-100 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">cURL Example</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`curl -X POST "${window.location.origin}/api/v1/messages/send" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channelId": 1,
    "to": "1234567890",
    "message": "Hello from application API!"
  }'`}
                        </pre>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h5 className="font-medium mb-2 text-yellow-900">📱 Phone Number Format</h5>
                        <div className="text-sm text-yellow-800 space-y-1">
                          <p>• Include country code (e.g., 1 for US, 44 for UK)</p>
                          <p>• No spaces, dashes, or special characters</p>
                          <p>• Examples: 1234567890, 447123456789</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media" className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">POST /messages/send-media</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Send media messages (images, documents, audio, video) through WhatsApp.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">Request</h5>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">POST</Badge>
                            <code className="text-sm">/api/v1/messages/send-media</code>
                          </div>
                          <div className="text-sm">
                            <strong>Headers:</strong>
                            <pre className="bg-white p-2 rounded border mt-1 text-xs overflow-x-auto">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
                            </pre>
                          </div>
                          <div className="text-sm">
                            <strong>Body (URL Method):</strong>
                            <pre className="bg-white p-2 rounded border mt-1 text-xs overflow-x-auto">
{`{
  "channelId": 1,
  "to": "1234567890",
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "image",
  "caption": "Check out this image!"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="font-medium mb-2 text-blue-900">Request Parameters</h5>
                        <div className="space-y-2 text-sm">
                          <div><code className="bg-white px-2 py-1 rounded">channelId</code> <span className="text-red-500">*</span> - Channel ID from /channels endpoint</div>
                          <div><code className="bg-white px-2 py-1 rounded">to</code> <span className="text-red-500">*</span> - Recipient phone number</div>
                          <div><code className="bg-white px-2 py-1 rounded">mediaUrl</code> <span className="text-red-500">*</span> - Public URL to media file</div>
                          <div><code className="bg-white px-2 py-1 rounded">mediaType</code> <span className="text-red-500">*</span> - Media type: image, document, audio, video</div>
                          <div><code className="bg-white px-2 py-1 rounded">caption</code> - Optional caption text</div>
                          <div><code className="bg-white px-2 py-1 rounded">filename</code> - Optional filename for documents</div>
                        </div>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h5 className="font-medium mb-2 text-green-900">Success Response (200)</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "messageId": "msg_media_1234567890",
    "status": "sent",
    "channelId": 1,
    "to": "1234567890",
    "mediaType": "image",
    "sentAt": "2024-01-15T10:30:00Z"
  }
}`}
                        </pre>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h5 className="font-medium mb-2 text-purple-900">📎 Supported Media Types</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Images:</strong>
                            <ul className="text-xs mt-1 space-y-1">
                              <li>• JPEG, PNG, WebP</li>
                              <li>• Max 5MB</li>
                              <li>• Max 4096x4096px</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Documents:</strong>
                            <ul className="text-xs mt-1 space-y-1">
                              <li>• PDF, DOC, DOCX, XLS, etc.</li>
                              <li>• Max 100MB</li>
                              <li>• Include filename parameter</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Audio:</strong>
                            <ul className="text-xs mt-1 space-y-1">
                              <li>• MP3, AAC, OGG</li>
                              <li>• Max 16MB</li>
                              <li>• Max 30 minutes</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Video:</strong>
                            <ul className="text-xs mt-1 space-y-1">
                              <li>• MP4, 3GPP</li>
                              <li>• Max 16MB</li>
                              <li>• Max 30 seconds</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Errors Tab */}
                <TabsContent value="errors" className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Error Handling</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Understanding API error responses and how to handle them in your application.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h5 className="font-medium mb-2 text-red-900">HTTP Status Codes</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><code className="bg-white px-2 py-1 rounded">200</code> <span>Success</span></div>
                          <div className="flex justify-between"><code className="bg-white px-2 py-1 rounded">400</code> <span>Bad Request - Invalid parameters</span></div>
                          <div className="flex justify-between"><code className="bg-white px-2 py-1 rounded">401</code> <span>Unauthorized - Invalid API key</span></div>
                          <div className="flex justify-between"><code className="bg-white px-2 py-1 rounded">403</code> <span>Forbidden - Insufficient permissions</span></div>
                          <div className="flex justify-between"><code className="bg-white px-2 py-1 rounded">404</code> <span>Not Found - Resource doesn't exist</span></div>
                          <div className="flex justify-between"><code className="bg-white px-2 py-1 rounded">429</code> <span>Rate Limited - Too many requests</span></div>
                          <div className="flex justify-between"><code className="bg-white px-2 py-1 rounded">500</code> <span>Server Error - Internal error</span></div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">Error Response Format</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`{
  "success": false,
  "error": {
    "code": "INVALID_PHONE_NUMBER",
    "message": "The phone number format is invalid",
    "details": "Phone number must include country code"
  }
}`}
                        </pre>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h5 className="font-medium mb-2 text-yellow-900">Common Error Codes</h5>
                        <div className="space-y-2 text-sm">
                          <div><code className="bg-white px-2 py-1 rounded">INVALID_API_KEY</code> - API key is invalid or expired</div>
                          <div><code className="bg-white px-2 py-1 rounded">INSUFFICIENT_PERMISSIONS</code> - API key lacks required permissions</div>
                          <div><code className="bg-white px-2 py-1 rounded">CHANNEL_NOT_FOUND</code> - Specified channel ID doesn't exist</div>
                          <div><code className="bg-white px-2 py-1 rounded">CHANNEL_INACTIVE</code> - Channel is not active</div>
                          <div><code className="bg-white px-2 py-1 rounded">INVALID_PHONE_NUMBER</code> - Phone number format is incorrect</div>
                          <div><code className="bg-white px-2 py-1 rounded">MESSAGE_TOO_LONG</code> - Message exceeds character limit</div>
                          <div><code className="bg-white px-2 py-1 rounded">MEDIA_TOO_LARGE</code> - Media file exceeds size limit</div>
                          <div><code className="bg-white px-2 py-1 rounded">UNSUPPORTED_MEDIA_TYPE</code> - Media type not supported</div>
                          <div><code className="bg-white px-2 py-1 rounded">RATE_LIMIT_EXCEEDED</code> - Too many requests</div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="font-medium mb-2 text-blue-900">Rate Limit Response</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642248000
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": "Try again in 60 seconds"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Examples Tab */}
                <TabsContent value="examples" className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">cURL Examples</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Universal cURL command examples that work across all platforms and programming languages.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">Get Channels</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`curl -X GET "${window.location.origin}/api/v1/channels" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                        </pre>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">Send Text Message</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`curl -X POST "${window.location.origin}/api/v1/messages/send" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channelId": 1,
    "to": "1234567890",
    "message": "Hello from cURL!"
  }'`}
                        </pre>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium mb-2">Send Media Message</h5>
                        <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`curl -X POST "${window.location.origin}/api/v1/messages/send-media" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channelId": 1,
    "to": "1234567890",
    "mediaUrl": "https://example.com/document.pdf",
    "mediaType": "document",
    "caption": "Here is the document you requested",
    "filename": "report.pdf"
  }'`}
                        </pre>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="font-medium mb-2 text-blue-900">💡 Pro Tips</h5>
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>• Replace YOUR_API_KEY with your actual API key</p>
                          <p>• Use proper phone number format with country code</p>
                          <p>• Check response status codes for error handling</p>
                          <p>• Implement retry logic for rate-limited requests</p>
                          <p>• Store API keys securely, never in client-side code</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to access the messaging API programmatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">API Key Name</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Bot, Marketing Automation"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={createApiKey} disabled={isCreating}>
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create API Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show API Key Modal */}
      <Dialog open={showKeyModal} onOpenChange={setShowKeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Your API key has been created. Copy it now as it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all">{newApiKey}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newApiKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Store this API key securely. You won't be able to see it again.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowKeyModal(false)}>
              I've Saved the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
