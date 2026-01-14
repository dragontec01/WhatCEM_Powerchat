import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { initFacebookSDK, setupWhatsAppSignupListener, launchWhatsAppSignup, FacebookLoginResponse } from '@/lib/facebook-sdk';
import { FACEBOOK_APP_CONFIG, validateFacebookConfig } from '@/lib/facebook-config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TermsState {
  acceptTerms: boolean;
  acceptPrivacyPolicy: boolean;
}

export function WhatsAppEmbeddedSignup({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configValid, setConfigValid] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [terms, setTerms] = useState<TermsState>({
    acceptTerms: false,
    acceptPrivacyPolicy: false
  });

  useEffect(() => {
    if (isOpen && !sdkInitialized) {
      const initSdk = async () => {
        try {

          const validation = validateFacebookConfig();

          if (!validation.isValid) {
            setConfigError(`Missing configuration: ${validation.missingFields.join(', ')}`);
            setConfigValid(false);
            toast({
              title: "Configuration Error",
              description: `Missing environment variables: ${validation.missingFields.join(', ')}. Please contact your administrator.`,
              variant: "destructive"
            });
            return;
          }

          setConfigValid(true);
          setConfigError(null);

          await initFacebookSDK(FACEBOOK_APP_CONFIG.appId, FACEBOOK_APP_CONFIG.apiVersion);
          setSdkInitialized(true);

          setupWhatsAppSignupListener((data) => {
            if (data.wabaId && data.phoneNumberId) {
              handleSuccessfulSignup(data.wabaId, data.phoneNumberId);
            } else if (data.screen) {
              toast({
                title: "Signup Incomplete",
                description: `Signup was abandoned at the ${data.screen} screen. Please try again.`,
                variant: "destructive"
              });
            }
          });

        } catch (error) {
          console.error('Failed to initialize Facebook SDK:', error);
          setConfigError('Failed to initialize Facebook SDK');
          toast({
            title: "Integration Error",
            description: "Failed to initialize the WhatsApp Business signup process. Please try again later.",
            variant: "destructive"
          });
        }
      };

      initSdk();
    }
  }, [isOpen, sdkInitialized, toast]);

  const handleTermsChange = (checked: boolean) => {
    setTerms({
      ...terms,
      acceptTerms: checked
    });
  };

  const handlePrivacyPolicyChange = (checked: boolean) => {
    setTerms({
      ...terms,
      acceptPrivacyPolicy: checked
    });
  };

  const handleFacebookLoginResponse = (response: FacebookLoginResponse) => {
    console.log('Facebook login response:', response);
    
    if (response.authResponse && response.authResponse.code) {
      exchangeCodeForWhatsAppConnection(response.authResponse.code);
    } else {
      setLoading(false);
      
      let errorMessage = 'The WhatsApp Business signup process was cancelled or encountered an error.';
      
      if (response.status === 'unknown') {
        errorMessage = 'Failed to start signup. Please check: 1) Your domain is whitelisted in Facebook App settings, 2) Third-party cookies are enabled, 3) Your Facebook App is configured correctly.';
      } else if (response.status === 'not_authorized') {
        errorMessage = 'You did not authorize the application. Please try again and grant the necessary permissions.';
      } else if (!response.authResponse) {
        errorMessage = 'No authorization received from Facebook. Please try again.';
      }
      
      console.error('Signup failed:', { response, errorMessage });
      
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const exchangeCodeForWhatsAppConnection = async (code: string) => {
    try {
      const response = await fetch('/api/channel-connections/whatsapp-embedded-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: "Connection Successful",
          description: "Your WhatsApp Business account has been connected successfully.",
        });
        
        onSuccess();
        
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to connect WhatsApp Business account');
      }
    } catch (error: any) {
      console.error('Error connecting WhatsApp account:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect your WhatsApp Business account.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulSignup = async (wabaId: string, phoneNumberId: string) => {
    try {
      const response = await fetch('/api/channel-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelType: 'whatsapp_official',
          accountId: wabaId,
          accountName: 'WhatsApp Business',
          connectionData: {
            phoneNumberId: phoneNumberId,
            wabaId: wabaId
          }
        })
      });
      
      if (response.ok) {
        toast({
          title: "Connection Successful",
          description: "Your WhatsApp Business account has been connected successfully.",
        });
        
        onSuccess();
        
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to connect WhatsApp Business account');
      }
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect your WhatsApp Business account.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const launchSignup = () => {
    if (!terms.acceptTerms || !terms.acceptPrivacyPolicy) {
      toast({
        title: "Terms Required",
        description: "Please accept both the terms and privacy policy to continue.",
        variant: "destructive"
      });
      return;
    }

    if (!configValid) {
      toast({
        title: "Configuration Error",
        description: configError || "WhatsApp Business API is not properly configured.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    if (!sdkInitialized) {
      toast({
        title: "Please Wait",
        description: "The signup process is still initializing. Please try again in a moment.",
      });
      setLoading(false);
      return;
    }

    try {
      launchWhatsAppSignup(
        FACEBOOK_APP_CONFIG.whatsAppConfigId,
        handleFacebookLoginResponse
      );
    } catch (error: any) {
      console.error('Error launching WhatsApp signup:', error);
      toast({
        title: "Launch Error",
        description: error.message || "Failed to launch WhatsApp Business signup flow.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>WhatsApp Business API - Easy Setup</DialogTitle>
          <DialogDescription>
            Quickly create a WhatsApp Business API account through Facebook Business.
            This is the official Meta-approved integration method.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 mb-4">
            <h3 className="text-sm font-medium mb-2">How it works:</h3>
            <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
              <li>You'll be redirected to Facebook to connect your business account</li>
              <li>Select a Facebook Business Manager account or create a new one</li>
              <li>Provide your business information and verify your phone number</li>
              <li>We'll create a WhatsApp Business API connection automatically</li>
            </ol>
            
            {!configValid && configError && (
              <div className="mt-3 flex p-2 text-red-800 bg-red-50 rounded border border-red-200">
                <i className="ri-error-warning-line mt-0.5 mr-2"></i>
                <p className="text-xs">
                  <strong>Configuration Error:</strong> {configError}.
                  Contact your administrator to set up the required environment variables.
                </p>
              </div>
            )}

            {configValid && (
              <div className="mt-3 flex p-2 text-green-800 bg-green-50 rounded border border-green-200">
                <i className="ri-check-line mt-0.5 mr-2"></i>
                <p className="text-xs">
                  <strong>Configuration Valid:</strong> WhatsApp Business API integration is properly configured.
                </p>
              </div>
            )}

            {!configValid && !configError && (
              <div className="mt-3 flex p-2 text-amber-800 bg-amber-50 rounded border border-amber-200">
                <i className="ri-error-warning-line mt-0.5 mr-2"></i>
                <p className="text-xs">
                  <strong>Note:</strong> This feature requires configuration of a Facebook App with WhatsApp Business permissions.
                  Contact your administrator to set up the app credentials.
                </p>
              </div>
            )}
          </div>
          
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={terms.acceptTerms}
                onCheckedChange={(checked) => handleTermsChange(checked === true)}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the <a href="https://www.facebook.com/legal/whatsapp_api_terms_of_service" target="_blank" rel="noopener noreferrer" className="text-primary underline">WhatsApp Business API Terms of Service</a>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="privacy" 
                checked={terms.acceptPrivacyPolicy}
                onCheckedChange={(checked) => handlePrivacyPolicyChange(checked === true)}
              />
              <label
                htmlFor="privacy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta Privacy Policy</a>
              </label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={launchSignup}
            disabled={loading || !sdkInitialized || !configValid}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <i className="ri-facebook-fill w-4 h-4 mr-2 text-blue-600"></i>
                Continue with Facebook
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}