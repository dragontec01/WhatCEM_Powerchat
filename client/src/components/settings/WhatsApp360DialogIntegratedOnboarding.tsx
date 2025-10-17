import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, CheckCircle, AlertTriangle, Info, Phone, Building, Globe, CreditCard } from 'lucide-react';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OnboardingFormData {
  connectionName: string;
}

interface PrerequisiteCheck {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  required: boolean;
  helpUrl?: string;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function WhatsApp360DialogIntegratedOnboarding({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  const [partnerConfigured, setPartnerConfigured] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  
  const [formData, setFormData] = useState<OnboardingFormData>({
    connectionName: 'My WhatsApp Business'
  });


  const [currentStep, setCurrentStep] = useState<'prerequisites' | 'account-check' | 'onboarding'>('prerequisites');
  const [hasExisting360DialogAccount, setHasExisting360DialogAccount] = useState<boolean | null>(null);
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCheck[]>([
    {
      id: 'meta-business-manager',
      title: 'Meta Business Manager Account',
      description: 'You have admin access to a Meta Business Manager with complete business information (legal name, address, website, business phone)',
      icon: <Building className="w-5 h-5" />,
      checked: false,
      required: true,
      helpUrl: 'https://business.facebook.com/settings'
    },
    {
      id: 'valid-phone-number',
      title: 'Valid Phone Number',
      description: 'Your phone number can receive SMS or voice calls for verification (no existing WhatsApp account)',
      icon: <Phone className="w-5 h-5" />,
      checked: false,
      required: true
    },
    {
      id: 'working-website',
      title: 'Working Business Website',
      description: 'Your business website is live, SSL-secured, and clearly explains your business model',
      icon: <Globe className="w-5 h-5" />,
      checked: false,
      required: true
    },
    {
      id: 'payment-method',
      title: 'Payment Method Ready',
      description: 'You have a payment method ready for WhatsApp Business API billing',
      icon: <CreditCard className="w-5 h-5" />,
      checked: false,
      required: true
    }
  ]);


  useEffect(() => {
    if (isOpen) {
      checkPartnerConfiguration();

      setCurrentStep('prerequisites');
    }
  }, [isOpen]);


  const togglePrerequisite = (id: string) => {
    setPrerequisites(prev => prev.map(req =>
      req.id === id ? { ...req, checked: !req.checked } : req
    ));
  };

  const allRequiredPrerequisitesMet = () => {
    return prerequisites.filter(req => req.required).every(req => req.checked);
  };

  const proceedToAccountCheck = () => {
    if (!allRequiredPrerequisitesMet()) {
      toast({
        title: "Prerequisites Required",
        description: "Please confirm all required prerequisites before proceeding.",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep('account-check');
  };

  const handleAccountChoice = (hasAccount: boolean) => {
    setHasExisting360DialogAccount(hasAccount);
    if (hasAccount) {

      handleExistingAccountFlow();
    } else {

      setCurrentStep('onboarding');
    }
  };

  const handleExistingAccountFlow = () => {
    toast({
      title: "Redirecting to 360Dialog Client Hub",
      description: "You'll be redirected to your 360Dialog Client Hub to add a new WhatsApp number.",
    });


    const clientHubUrl = 'https://hub.360dialog.com/dashboard';
    window.open(clientHubUrl, '_blank');


    toast({
      title: "Next Steps",
      description: "In the Client Hub: Go to Numbers → Add Number → Continue with Facebook to start the Embedded Signup.",
      duration: 8000
    });


    onClose();
  };

  const checkPartnerConfiguration = async () => {
    setIsCheckingConfig(true);
    try {
      const response = await fetch('/api/admin/partner-configurations/360dialog');
      if (response.ok) {
        const config = await response.json();
        setPartnerConfigured(true);
        setPartnerId(config.partnerId);
      } else {
        setPartnerConfigured(false);
      }
    } catch (error) {
      console.error('Error checking partner configuration:', error);
      setPartnerConfigured(false);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      connectionName: 'My WhatsApp Business'
    });
    setIsSubmitting(false);
  };

  const handleIntegratedOnboarding = () => {
    if (!partnerConfigured || !partnerId) {
      toast({
        title: "Configuration Error",
        description: "360Dialog Partner API is not configured. Please contact your administrator.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.connectionName.trim()) {
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
      state: `connection_name=${encodeURIComponent(formData.connectionName)}`,



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
        handleOnboardingSuccess(event.data.clientId, event.data.channels);
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

  const handleOnboardingSuccess = async (clientId: string, channels: string[]) => {
    try {

      const response = await fetch('/api/channel-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelType: 'whatsapp_360dialog',
          accountId: clientId,
          accountName: formData.connectionName,
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

        resetForm();
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





  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (isCheckingConfig) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Checking configuration...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!partnerConfigured) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="ri-whatsapp-line text-green-500"></i>
              360Dialog WhatsApp Integration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <i className="ri-information-line text-yellow-500 mr-2 mt-0.5"></i>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Partner Configuration Required</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    360Dialog Partner API is not configured. Please contact your system administrator to set up the Partner API credentials.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="ri-whatsapp-line text-green-500"></i>
            Connect 360Dialog WhatsApp Business
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'prerequisites' ? (
          <div className="space-y-6">
            {/* Prerequisites Step */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Before starting the WhatsApp Business onboarding, please ensure you meet all the requirements below. This will help ensure a smooth setup process.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Prerequisites Checklist</h3>

              {prerequisites.map((prerequisite) => (
                <Card key={prerequisite.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <input
                          type="checkbox"
                          id={prerequisite.id}
                          checked={prerequisite.checked}
                          onChange={() => togglePrerequisite(prerequisite.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {prerequisite.icon}
                          <h4 className="font-medium text-gray-900">
                            {prerequisite.title}
                            {prerequisite.required && <span className="text-red-500 ml-1">*</span>}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {prerequisite.description}
                        </p>
                        {prerequisite.helpUrl && (
                          <a
                            href={prerequisite.helpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Learn more
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Two Onboarding Paths:</strong> The next step will determine if you need to create a new 360Dialog account or use an existing one. Both paths lead to the same WhatsApp Business setup.
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Important:</strong> If your prerequisites are not met, the onboarding process may fail or your WhatsApp Business account may be blocked. Please ensure all requirements are satisfied before proceeding.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={proceedToAccountCheck}
                disabled={!allRequiredPrerequisitesMet()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue to Setup
              </Button>
            </div>
          </div>
        ) : currentStep === 'account-check' ? (
          <div className="space-y-6">
            {/* Account Check Step */}
            <div className="flex items-center space-x-2 mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('prerequisites')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Prerequisites
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                To provide you with the best onboarding experience, we need to know if you already have a 360Dialog Client Hub account.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Do you already have a 360Dialog Client Hub account?</h3>

              <div className="grid gap-4">
                <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleAccountChoice(true)}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Yes, I have an existing account</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          You'll be redirected to your 360Dialog Client Hub where you can add a new WhatsApp number.
                        </p>
                        <p className="text-xs text-blue-600">
                          Recommended: Use your existing account for better management
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleAccountChoice(false)}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Building className="w-6 h-6 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">No, I need to create a new account</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          We'll guide you through creating a new 360Dialog account and setting up your WhatsApp Business.
                        </p>
                        <p className="text-xs text-gray-600">
                          This will create both your 360Dialog account and WhatsApp Business setup
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Not sure?</strong> If you've never used 360Dialog services before, select "No, I need to create a new account".
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Onboarding Step */}
            <div className="flex items-center space-x-2 mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('account-check')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Account Check
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="connectionName">Connection Name</Label>
                <Input
                  id="connectionName"
                  name="connectionName"
                  value={formData.connectionName}
                  onChange={handleInputChange}
                  placeholder="My WhatsApp Business"
                  required
                />
                <p className="text-sm text-gray-500">
                  A friendly name for this WhatsApp Business connection
                </p>
              </div>
            </div>

            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  Ready for Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700 mb-3">
                  Great! You've confirmed all prerequisites. The onboarding process will:
                </p>
                <ul className="text-sm text-green-700 space-y-1 ml-4 list-disc">
                  <li>Create or connect to your 360Dialog account</li>
                  <li>Launch Facebook's Embedded Signup for WhatsApp Business</li>
                  <li>Register your phone number with WhatsApp Business API</li>
                  <li>Configure API access and permissions</li>
                </ul>
                <Alert className="mt-4 border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Note:</strong> The process may take up to 1 hour. Please don't close the popup window during onboarding, as this will expire your session.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleIntegratedOnboarding}
                disabled={isSubmitting || !formData.connectionName.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? 'Starting Onboarding...' : 'Start WhatsApp Onboarding'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
