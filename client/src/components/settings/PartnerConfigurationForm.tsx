import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  provider: '360dialog';
}

interface PartnerConfigFormData {
  partnerApiKey: string;
  partnerId: string;
  partnerWebhookUrl: string;
  redirectUrl: string;
  companyName: string;
  logoUrl: string;
}

export function PartnerConfigurationForm({ isOpen, onClose, onSuccess, provider }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingConfig, setExistingConfig] = useState<any>(null);
  
  const [formData, setFormData] = useState<PartnerConfigFormData>({
    partnerApiKey: '',
    partnerId: '',
    partnerWebhookUrl: `${window.location.origin}/api/webhooks/360dialog-partner`,
    redirectUrl: `${window.location.origin}/settings/channels/360dialog/callback`,
    companyName: '',
    logoUrl: ''
  });


  useEffect(() => {
    if (isOpen) {
      loadExistingConfiguration();
    }
  }, [isOpen]);

  const loadExistingConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/partner-configurations/${provider}`);
      if (response.ok) {
        const config = await response.json();
        setExistingConfig(config);
        setFormData({
          partnerApiKey: config.partnerApiKey || '',
          partnerId: config.partnerId || '',
          partnerWebhookUrl: config.partnerWebhookUrl || `${window.location.origin}/api/webhooks/360dialog-partner`,
          redirectUrl: config.redirectUrl || `${window.location.origin}/settings/channels/360dialog/callback`,
          companyName: config.publicProfile?.companyName || '',
          logoUrl: config.publicProfile?.logoUrl || ''
        });
      }
    } catch (error) {
      console.error('Error loading partner configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      partnerApiKey: '',
      partnerId: '',
      partnerWebhookUrl: `${window.location.origin}/api/webhooks/360dialog-partner`,
      redirectUrl: `${window.location.origin}/settings/channels/360dialog/callback`,
      companyName: '',
      logoUrl: ''
    });
    setExistingConfig(null);
    setIsSubmitting(false);
    setIsValidating(false);
  };

  const validatePartnerCredentials = async () => {
    if (!formData.partnerApiKey || !formData.partnerId) {
      toast({
        title: "Validation Error",
        description: "Partner API Key and Partner ID are required for validation.",
        variant: "destructive"
      });
      return false;
    }

    setIsValidating(true);
    try {

      const response = await fetch('/api/admin/partner-configurations/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          partnerApiKey: formData.partnerApiKey,
          partnerId: formData.partnerId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Credentials Valid",
          description: result.partnerInfo
            ? `Successfully validated credentials for ${result.partnerInfo.name} (ID: ${result.partnerInfo.id})`
            : `Successfully validated 360Dialog Partner credentials for Partner ID: ${formData.partnerId}`,
        });
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid partner credentials');
      }
    } catch (error: any) {

      let errorMessage = error.message || "Failed to validate 360Dialog Partner credentials.";
      let errorDescription = "";

      if (error.message?.includes('401') || error.message?.includes('invalid') || error.message?.includes('revoked')) {
        errorDescription = "Please check your API key in the 360Dialog Partner dashboard and ensure it's correct.";
      } else if (error.message?.includes('Partner ID mismatch')) {
        errorDescription = "The Partner ID doesn't match your API key. Please verify both values.";
      } else if (error.message?.includes('permissions')) {
        errorDescription = "Your API key may not have sufficient permissions for partner operations.";
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorDescription = "Please check your internet connection and try again.";
      }

      toast({
        title: "Validation Failed",
        description: errorDescription || errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {

      const isValid = await validatePartnerCredentials();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      const configData = {
        provider,
        partnerApiKey: formData.partnerApiKey,
        partnerId: formData.partnerId,
        partnerWebhookUrl: formData.partnerWebhookUrl,
        redirectUrl: formData.redirectUrl,
        publicProfile: {
          companyName: formData.companyName,
          logoUrl: formData.logoUrl
        },
        isActive: true
      };

      const url = existingConfig 
        ? `/api/admin/partner-configurations/${existingConfig.id}`
        : '/api/admin/partner-configurations';
      
      const method = existingConfig ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `360Dialog Partner configuration ${existingConfig ? 'updated' : 'created'} successfully!`,
        });
        
        resetForm();
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save partner configuration');
      }
    } catch (error: any) {
      console.error('Error saving partner configuration:', error);
      toast({
        title: "Configuration Error",
        description: error.message || "Failed to save 360Dialog Partner configuration",
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

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading configuration...</p>
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
            <i className="ri-settings-3-line text-blue-500"></i>
            360Dialog Partner Configuration
            {existingConfig && <span className="text-sm text-gray-500">(Edit)</span>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <i className="ri-information-line text-yellow-500 mr-2 mt-0.5"></i>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Super Admin Configuration</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    This configuration is platform-wide and enables 360Dialog Partner API integration for all companies.
                    Companies will use Integrated Onboarding to connect their WhatsApp accounts.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start">
                <i className="ri-lightbulb-line text-blue-500 mr-2 mt-0.5"></i>
                <div>
                  <p className="text-sm text-blue-700 font-medium">How to get your credentials:</p>
                  <ul className="text-xs text-blue-600 mt-1 space-y-1">
                    <li>1. Log in to your 360Dialog Partner dashboard</li>
                    <li>2. Navigate to the <strong>"API Keys"</strong> tab</li>
                    <li>3. Click <strong>"Generate API Key"</strong> and add a name (e.g., "Application Integration")</li>
                    <li>4. Complete the OTP verification</li>
                    <li>5. Copy the API key immediately (it's only shown once)</li>
                    <li>6. Find your Partner ID in the <strong>"Partner Integration"</strong> section</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-2">
                    <strong>Note:</strong> Use the new API Key authentication method (recommended) rather than legacy Bearer tokens.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partnerApiKey">Partner API Key</Label>
              <Input
                id="partnerApiKey"
                name="partnerApiKey"
                type="password"
                value={formData.partnerApiKey}
                onChange={handleInputChange}
                placeholder="Your 360Dialog Partner API key..."
                required
              />
              <p className="text-sm text-gray-500">
                Generate your API key from the "API Keys" tab in your 360Dialog Partner dashboard.
                This is the new recommended authentication method (not Bearer tokens).
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partnerId">Partner ID</Label>
              <div className="flex gap-2">
                <Input
                  id="partnerId"
                  name="partnerId"
                  value={formData.partnerId}
                  onChange={handleInputChange}
                  placeholder="your-partner-id"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={validatePartnerCredentials}
                  disabled={isValidating || !formData.partnerApiKey || !formData.partnerId}
                  className="whitespace-nowrap"
                >
                  {isValidating ? 'Validating...' : 'Test'}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Your unique Partner ID from 360Dialog Partner Hub
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partnerWebhookUrl">Partner Webhook URL</Label>
              <Input
                id="partnerWebhookUrl"
                name="partnerWebhookUrl"
                value={formData.partnerWebhookUrl}
                onChange={handleInputChange}
                placeholder="https://yourdomain.com/api/webhooks/360dialog-partner"
                required
              />
              <p className="text-sm text-gray-500">
                URL where 360Dialog will send partner-level events (channel creation, status changes)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="redirectUrl">Redirect URL</Label>
              <Input
                id="redirectUrl"
                name="redirectUrl"
                value={formData.redirectUrl}
                onChange={handleInputChange}
                placeholder="https://yourdomain.com/settings/channels/360dialog/callback"
                required
              />
              <p className="text-sm text-gray-500">
                URL where users are redirected after completing Integrated Onboarding
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Your Company Name"
              />
              <p className="text-sm text-gray-500">
                Company name displayed during client onboarding
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleInputChange}
                placeholder="https://yourdomain.com/logo.png"
              />
              <p className="text-sm text-gray-500">
                Company logo displayed during client onboarding
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="outline" 
              className="btn-brand-primary"
              disabled={isSubmitting || isValidating}
            >
              {isSubmitting ? 'Saving...' : existingConfig ? 'Update Configuration' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
