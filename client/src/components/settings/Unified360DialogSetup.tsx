import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Info, Phone, Building, Globe, CreditCard, AlertTriangle } from 'lucide-react';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

interface DirectApiConfig {
  accountName: string;
  apiKey: string;
  phoneNumber: string;
  webhookUrl: string;
}

interface PartnerConfig {
  connectionName: string;
  clientId?: string;
  channels?: string[];
}

type IntegrationType = 'direct' | 'partner';

interface PrerequisiteCheck {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  required: boolean;
  helpUrl?: string;
}

export function Unified360DialogSetup({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [integrationType, setIntegrationType] = useState<IntegrationType>('partner');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [partnerConfigured, setPartnerConfigured] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');


  const [directConfig, setDirectConfig] = useState<DirectApiConfig>({
    accountName: '',
    apiKey: '',
    phoneNumber: '',
    webhookUrl: `${window.location.origin}/api/webhooks/360dialog-whatsapp`
  });


  const [partnerConfig, setPartnerConfig] = useState<PartnerConfig>({
    connectionName: ''
  });

  useEffect(() => {
    if (isOpen) {
      checkPartnerConfiguration();
    }
  }, [isOpen]);

  const checkPartnerConfiguration = async () => {
    try {
      const response = await fetch('/api/partner-configurations/360dialog/status');
      if (response.ok) {
        const config = await response.json();

        if (config.configured && config.hasApiKey && config.partnerId) {
          setPartnerConfigured(true);
          setPartnerId(config.partnerId);
    
        } else {
          setPartnerConfigured(false);
          setPartnerId('');

        }
      } else {
        console.error('Failed to fetch partner configuration status:', response.status);
        setPartnerConfigured(false);
        setPartnerId('');
      }
    } catch (error) {
      console.error('Error checking partner configuration:', error);
      setPartnerConfigured(false);
      setPartnerId('');
    }
  };

  const handleDirectConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDirectConfig(prev => ({ ...prev, [name]: value }));
    setValidationResult(null);
  };

  const handlePartnerConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPartnerConfig(prev => ({ ...prev, [name]: value }));
  };

  const validateDirectApiCredentials = async (): Promise<ValidationResult> => {
    if (!directConfig.apiKey || !directConfig.phoneNumber) {
      return {
        isValid: false,
        error: 'API key and phone number are required'
      };
    }

    setIsValidating(true);
    try {
      const response = await fetch('https://waba-v2.360dialog.io/v1/configs/webhook', {
        headers: {
          'D360-API-KEY': directConfig.apiKey
        }
      });
      
      if (response.ok || response.status === 404) {
        return {
          isValid: true,
          details: { phoneNumber: directConfig.phoneNumber }
        };
      } else {
        const errorData = await response.json();
        return {
          isValid: false,
          error: errorData.meta?.developer_message || 'Invalid credentials',
          details: errorData
        };
      }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Failed to validate credentials'
      };
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateCredentials = async () => {
    const result = await validateDirectApiCredentials();
    setValidationResult(result);
    
    if (result.isValid) {
      toast({
        title: "Credentials Valid",
        description: `Successfully validated 360Dialog API key for phone number: ${directConfig.phoneNumber}`,
      });
    } else {
      toast({
        title: "Validation Failed",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const handleDirectApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {

      const validation = await validateDirectApiCredentials();
      if (!validation.isValid) {
        toast({
          title: "Validation Failed",
          description: validation.error,
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/channel-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelType: 'whatsapp_360dialog',
          accountId: directConfig.phoneNumber,
          accountName: directConfig.accountName,
          connectionData: {
            apiKey: directConfig.apiKey,
            phoneNumber: directConfig.phoneNumber,
            webhookUrl: directConfig.webhookUrl
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "360Dialog WhatsApp connection created successfully!",
        });
        
        resetForms();
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create connection');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create connection",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePartnerOnboarding = () => {
    if (!partnerConfigured || !partnerId) {
      toast({
        title: "Configuration Error",
        description: "360Dialog Partner API is not configured. Please contact your administrator.",
        variant: "destructive"
      });
      return;
    }

    if (!partnerConfig.connectionName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a connection name before starting onboarding.",
        variant: "destructive"
      });
      return;
    }



    const baseUrl = 'https://hub.360dialog.com/signup';
    const redirectUrl = `${window.location.origin}/settings/channels/360dialog/callback`;


    const params = new URLSearchParams({
      redirect_url: redirectUrl,
      state: `connection_name=${encodeURIComponent(partnerConfig.connectionName)}`,



    });

    const onboardingUrl = `${baseUrl}/${partnerId}?${params.toString()}`;



    toast({
      title: "Starting Onboarding",
      description: "Opening 360Dialog onboarding. You'll first create/login to 360Dialog, then complete Facebook Embedded Signup for WhatsApp Business.",
    });


    const popup = window.open(
      onboardingUrl,
      '360dialog-onboarding',
      'width=600,height=900,scrollbars=yes,resizable=yes,toolbar=no,menubar=no'
    );

    if (!popup) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site and try again. Check your browser's popup blocker settings.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);


    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === '360dialog-onboarding-success') {
        window.removeEventListener('message', handleMessage);
        popup.close();
        handlePartnerOnboardingSuccess(event.data.clientId, event.data.channels);
      } else if (event.data.type === '360dialog-onboarding-error') {
        window.removeEventListener('message', handleMessage);
        popup.close();
        setIsSubmitting(false);


        const errorMessage = event.data.error || "Failed to complete WhatsApp Business onboarding.";
        let guidance = "";

        if (errorMessage.toLowerCase().includes('business manager')) {
          guidance = " Please ensure your Meta Business Manager has complete business information.";
        } else if (errorMessage.toLowerCase().includes('phone') || errorMessage.toLowerCase().includes('number')) {
          guidance = " Please verify your phone number can receive SMS/voice calls and has no existing WhatsApp account.";
        } else if (errorMessage.toLowerCase().includes('website')) {
          guidance = " Please ensure your business website is live, SSL-secured, and clearly explains your business model.";
        }

        toast({
          title: "Onboarding Failed",
          description: errorMessage + guidance,
          variant: "destructive"
        });
      }
    };

    window.addEventListener('message', handleMessage);


    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        setIsSubmitting(false);


        toast({
          title: "Onboarding Cancelled",
          description: "The onboarding process was cancelled. If you encountered issues, please check the prerequisites and try again.",
          variant: "default"
        });
      }
    }, 1000);
  };

  const handlePartnerOnboardingSuccess = async (clientId: string, channels: string[]) => {
    try {

      const response = await fetch('/api/channel-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelType: 'whatsapp_360dialog',
          accountId: clientId,
          accountName: partnerConfig.connectionName,
          connectionData: {
            clientId,
            channels,
            onboardedAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "360Dialog WhatsApp connection created successfully! Your channels are being set up.",
        });

        resetForms();
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create connection');
      }
    } catch (error: any) {
      console.error('Error creating 360Dialog connection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create WhatsApp connection. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };





  const resetForms = () => {
    setDirectConfig({
      accountName: '',
      apiKey: '',
      phoneNumber: '',
      webhookUrl: `${window.location.origin}/api/webhooks/360dialog-whatsapp`
    });
    setPartnerConfig({
      connectionName: ''
    });
    setValidationResult(null);
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="ri-whatsapp-line text-green-500"></i>
            Connect 360Dialog WhatsApp Business
          </DialogTitle>
        </DialogHeader>

        <Tabs value={integrationType} onValueChange={(value) => setIntegrationType(value as IntegrationType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="partner" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Partner Integration
              <Badge variant="secondary" className="ml-1">Recommended</Badge>
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Direct API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Partner Integration</CardTitle>
                <CardDescription>
                  Streamlined setup through 360Dialog's partner program with automatic channel management.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!partnerConfigured ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Partner integration is not configured. Please contact your administrator to set up the 360Dialog Partner API.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="mb-4">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700">
                      360Dialog Partner API is configured and ready. Partner ID: <code className="bg-green-100 px-1 rounded">{partnerId}</code>
                    </AlertDescription>
                  </Alert>
                )}

                {partnerConfigured && (
                  <>
                    {/* Prerequisites Information */}
                 

                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>Important:</strong> The onboarding process may take up to 1 hour. Don't close the popup window during setup, as this will expire your session.
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-2">
                      <Label htmlFor="connectionName">Connection Name</Label>
                      <Input
                        id="connectionName"
                        name="connectionName"
                        value={partnerConfig.connectionName}
                        onChange={handlePartnerConfigChange}
                        placeholder="My WhatsApp Business"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        A friendly name for this WhatsApp Business connection
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handlePartnerOnboarding}
                        disabled={!partnerConfig.connectionName || isSubmitting}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Starting Onboarding...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            Start WhatsApp Onboarding
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="direct" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Direct API Integration</CardTitle>
                <CardDescription>
                  Manual setup using your 360Dialog API credentials. Requires technical configuration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDirectApiSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      name="accountName"
                      value={directConfig.accountName}
                      onChange={handleDirectConfigChange}
                      placeholder="My Business WhatsApp"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="apiKey">360Dialog API Key</Label>
                    <Input
                      id="apiKey"
                      name="apiKey"
                      type="password"
                      value={directConfig.apiKey}
                      onChange={handleDirectConfigChange}
                      placeholder="Enter your 360Dialog API key"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={directConfig.phoneNumber}
                      onChange={handleDirectConfigChange}
                      placeholder="e.g., +1234567890"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      name="webhookUrl"
                      value={directConfig.webhookUrl}
                      onChange={handleDirectConfigChange}
                      placeholder="Webhook URL for receiving messages"
                      required
                      readOnly
                    />
                    <p className="text-sm text-gray-500">
                      This URL will be automatically configured in your 360Dialog account
                    </p>
                  </div>

                  {validationResult && (
                    <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                      {validationResult.isValid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {validationResult.isValid 
                          ? "Credentials validated successfully!" 
                          : validationResult.error
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleValidateCredentials}
                      disabled={isValidating || !directConfig.apiKey}
                    >
                      {isValidating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Validate Credentials
                    </Button>

                    <Button
                      type="submit"
                      disabled={isSubmitting || !validationResult?.isValid}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Create Connection
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
