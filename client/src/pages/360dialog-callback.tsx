import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export default function Dialog360Callback() {
  const [location] = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing onboarding...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('client');
        const channelsParam = urlParams.get('channels');
        
        if (!clientId || !channelsParam) {
          throw new Error('Missing required parameters from 360Dialog callback');
        }

        const channels = channelsParam.replace(/[\[\]]/g, '').split(',').filter(Boolean);
        
        if (channels.length === 0) {
          throw new Error('No channels provided in callback');
        }
        if (window.opener) {
          window.opener.postMessage({
            type: '360dialog-onboarding-success',
            clientId,
            channels
          }, window.location.origin);
          
          setStatus('success');
          setMessage('Onboarding completed successfully! You can close this window.');
          
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          setStatus('success');
          setMessage('Onboarding completed successfully! Redirecting to settings...');
          
          setTimeout(() => {
            window.location.href = '/settings?tab=channels';
          }, 2000);
        }
      } catch (error: any) {
        console.error('Error processing 360Dialog callback:', error);
        
        setStatus('error');
        setMessage(error.message || 'Failed to process onboarding callback');
        
        if (window.opener) {
          window.opener.postMessage({
            type: '360dialog-onboarding-error',
            error: error.message
          }, window.location.origin);
          
          setTimeout(() => {
            window.close();
          }, 3000);
        }
      }
    };

    processCallback();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>;
      case 'success':
        return <i className="ri-check-line text-4xl text-green-500"></i>;
      case 'error':
        return <i className="ri-error-warning-line text-4xl text-red-500"></i>;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            360Dialog WhatsApp Onboarding
          </h1>
          
          <p className={`text-sm ${getStatusColor()}`}>
            {message}
          </p>
        </div>

        {status === 'processing' && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500">
              Please wait while we process your WhatsApp Business account setup...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <i className="ri-check-line text-green-500 mr-2 mt-0.5"></i>
                <div className="text-left">
                  <p className="text-sm text-green-700 font-medium">Onboarding Complete</p>
                  <p className="text-xs text-green-600 mt-1">
                    Your WhatsApp Business account has been successfully connected through 360Dialog.
                    You can now start messaging your customers!
                  </p>
                </div>
              </div>
            </div>
            
            {!window.opener && (
              <button
                onClick={() => window.location.href = '/settings?tab=channels'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Settings
              </button>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <i className="ri-error-warning-line text-red-500 mr-2 mt-0.5"></i>
                <div className="text-left">
                  <p className="text-sm text-red-700 font-medium">Onboarding Failed</p>
                  <p className="text-xs text-red-600 mt-1">
                    There was an issue completing your WhatsApp Business account setup.
                    Please try again or contact support if the problem persists.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {!window.opener && (
                <button
                  onClick={() => window.location.href = '/settings?tab=channels'}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Back to Settings
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center text-xs text-gray-500">
            <i className="ri-whatsapp-line text-green-500 mr-1"></i>
            Powered by 360Dialog WhatsApp Business API
          </div>
        </div>
      </div>
    </div>
  );
}
