import React, { useState } from 'react';
import { ExternalLink, AlertCircle, CheckCircle2, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useZohoCalendarAuth } from '@/hooks/useZohoCalendarAuth';

interface ZohoCalendarOAuthStatusProps {
  onAuthSuccess?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

export function ZohoCalendarOAuthStatus({ onAuthSuccess, onDisconnect, className }: ZohoCalendarOAuthStatusProps) {
  const {
    isConnected,
    isLoadingStatus,
    isAuthenticating,
    authenticate,
    disconnect
  } = useZohoCalendarAuth();

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnectClick = async () => {
    const success = await authenticate();
    if (success) {
      onAuthSuccess?.();
    }
  };

  const handleDisconnectClick = async () => {

    if (!confirm('Are you sure you want to disconnect your Zoho Calendar account? You will need to reconnect to use Zoho Calendar features.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const success = await disconnect();
      if (success) {
        onDisconnect?.();
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <div className={className}>
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Checking Connection</AlertTitle>
          <AlertDescription>
            Verifying your Zoho Calendar connection status...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={className}>
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">Connected</AlertTitle>
          <AlertDescription className="text-green-600 space-y-3">
            <p>Your Zoho Calendar is connected and ready to use.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleConnectClick}
                disabled={isAuthenticating || isDisconnecting}
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                title="Connect a different Zoho account"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Switch Account
                  </>
                )}
              </Button>
              <Button
                onClick={handleDisconnectClick}
                disabled={isDisconnecting || isAuthenticating}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                title="Disconnect Zoho Calendar integration"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-3 w-3" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-700">Authentication Required</AlertTitle>
        <AlertDescription className="text-amber-600 space-y-3">
          <p>Connect your Zoho Calendar account to use this.</p>
          <Button
            onClick={handleConnectClick}
            disabled={isAuthenticating}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            size="sm"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-3 w-3" />
                Connect Zoho Calendar
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
