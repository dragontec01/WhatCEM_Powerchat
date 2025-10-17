import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConnectionControl from '@/components/whatsapp/ConnectionControl';

const TestConnectionControl: React.FC = () => {
  const [testStatus, setTestStatus] = useState<string>('disconnected');
  const [testConnectionId] = useState<number>(999);
  const [testChannelType, setTestChannelType] = useState<string>('whatsapp_unofficial');

  const statusOptions = [
    'connected',
    'active',
    'disconnected',
    'error',
    'failed',
    'timeout',
    'logged_out',
    'connecting',
    'reconnecting',
    'qr_code',
    'unknown',
    'inactive',
    null,
    undefined,
    ''
  ];

  const channelTypeOptions = [
    'whatsapp_unofficial',
    'whatsapp_official',
    'whatsapp'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ConnectionControl Component Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div>
              <h3 className="text-lg font-medium mb-3">Test Different Status Values</h3>
              <div className="grid grid-cols-3 gap-2">
                {statusOptions.map((status, index) => (
                  <Button
                    key={index}
                    variant={testStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTestStatus(status as string)}
                    className="text-xs"
                  >
                    {status === null ? 'null' : 
                     status === undefined ? 'undefined' : 
                     status === '' ? 'empty' : 
                     status}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Test Different Channel Types</h3>
              <div className="grid grid-cols-3 gap-2">
                {channelTypeOptions.map((channelType) => (
                  <Button
                    key={channelType}
                    variant={testChannelType === channelType ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTestChannelType(channelType)}
                    className="text-xs"
                  >
                    {channelType}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-100 rounded-lg">
              <h4 className="font-medium mb-2">Current Test Configuration:</h4>
              <p className="text-sm">
                <strong>Status:</strong> {testStatus === null ? 'null' :
                                       testStatus === undefined ? 'undefined' :
                                       testStatus === '' ? 'empty string' :
                                       `"${testStatus}"`}
              </p>
              <p className="text-sm">
                <strong>Channel Type:</strong> {testChannelType}
              </p>
              <p className="text-sm">
                <strong>Type:</strong> {typeof testStatus}
              </p>
            </div>

            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h4 className="font-medium mb-3">ConnectionControl Component:</h4>
              <div className="flex items-center gap-4">
                <ConnectionControl
                  connectionId={testConnectionId}
                  status={testStatus}
                  channelType={testChannelType}
                  onStatusChange={(newStatus: string) => {
                    setTestStatus(newStatus);
                  }}
                />
                <span className="text-sm text-gray-600">
                  Connection ID: {testConnectionId}
                </span>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium mb-2 text-green-800">Expected Behavior:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li><strong>WhatsApp Unofficial/Regular:</strong></li>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Connected/Active:</strong> Should show red "Disconnect" button</li>
                  <li>• <strong>Disconnected/Error/Failed/Timeout/Logged Out:</strong> Should show green "Reconnect" button</li>
                  <li>• <strong>Unknown/Null/Undefined/Empty:</strong> Should show green "Reconnect" button</li>
                  <li>• <strong>QR Code:</strong> Should show "Rescan QR" button</li>
                </ul>
                <li><strong>WhatsApp Official (Business API):</strong></li>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>All statuses:</strong> Should NOT show Reconnect or Disconnect buttons</li>
                  <li>• <strong>Only status indicator:</strong> Shows connection status without control buttons</li>
                </ul>
                <li><strong>All types:</strong> <strong>Connecting/Reconnecting:</strong> Should show loading spinner</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium mb-2 text-yellow-800">Debug Information:</h4>
              <p className="text-sm text-yellow-700">
                Check the browser console for detailed logging from the ConnectionControl component.
                The component should log button visibility logic and status information.
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-medium mb-2 text-purple-800">Manual Test Instructions:</h4>
              <ol className="text-sm text-purple-700 space-y-1 list-decimal list-inside">
                <li>Click different status buttons above to change the connection status</li>
                <li>Observe how the ConnectionControl component responds to each status</li>
                <li>Verify that the correct buttons appear for each status</li>
                <li>Check the browser console for debug logs</li>
                <li>Test clicking the Disconnect/Reconnect buttons (they will log to console)</li>
              </ol>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium mb-2 text-red-800">Real Connection Test:</h4>
              <p className="text-sm text-red-700 mb-3">
                To test with a real WhatsApp connection, go to Settings → Channel Connections 
                and look for the WhatsApp connection. The ConnectionControl component should 
                appear next to the connection with the appropriate buttons.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/settings'}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Go to Settings Page
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestConnectionControl;
