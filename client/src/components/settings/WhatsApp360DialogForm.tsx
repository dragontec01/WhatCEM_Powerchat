import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Dialog360FormData {
  accountName: string;
  apiKey: string;
  phoneNumber: string;
  webhookUrl: string;
}

export function WhatsApp360DialogForm({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const [formData, setFormData] = useState<Dialog360FormData>({
    accountName: '',
    apiKey: '',
    phoneNumber: '',
    webhookUrl: `${window.location.origin}/api/webhooks/360dialog-whatsapp`
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      accountName: '',
      apiKey: '',
      phoneNumber: '',
      webhookUrl: `${window.location.origin}/api/webhooks/360dialog-whatsapp`
    });
    setIsSubmitting(false);
    setIsValidating(false);
  };

  const validateCredentials = async () => {
    if (!formData.apiKey || !formData.phoneNumber) {
      toast({
        title: t('whatsapp_360dialog.validation_error', 'Validation Error'),
        description: t('whatsapp_360dialog.api_key_required', 'API Key and Phone Number are required for validation.'),
        variant: "destructive"
      });
      return false;
    }

    setIsValidating(true);
    try {

      const response = await fetch('https://waba-v2.360dialog.io/v1/configs/webhook', {
        headers: {
          'D360-API-KEY': formData.apiKey
        }
      });
      
      if (response.ok || response.status === 404) { // 404 is OK if no webhook is configured yet
        toast({
          title: t('whatsapp_360dialog.credentials_valid', 'Credentials Valid'),
          description: t('whatsapp_360dialog.validation_success', 'Successfully validated 360Dialog API key for phone number: {{phoneNumber}}', { phoneNumber: formData.phoneNumber }),
        });
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.meta?.developer_message || t('whatsapp_360dialog.invalid_credentials', 'Invalid credentials'));
      }
    } catch (error: any) {
      toast({
        title: t('whatsapp_360dialog.validation_failed', 'Validation Failed'),
        description: error.message || t('whatsapp_360dialog.validation_failed_desc', 'Failed to validate 360Dialog credentials.'),
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

      const isValid = await validateCredentials();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/channel-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelType: 'whatsapp_360dialog',
          accountId: formData.phoneNumber,
          accountName: formData.accountName,
          connectionData: {
            apiKey: formData.apiKey,
            phoneNumber: formData.phoneNumber,
            webhookUrl: formData.webhookUrl
          }
        })
      });

      if (response.ok) {
        toast({
          title: t('whatsapp_360dialog.success', 'Success'),
          description: t('whatsapp_360dialog.connection_created', '360Dialog WhatsApp connection created successfully!'),
        });

        resetForm();
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t('whatsapp_360dialog.connection_failed', 'Failed to create connection'));
      }
    } catch (error: any) {
      console.error('Error connecting to 360Dialog WhatsApp:', error);
      toast({
        title: t('whatsapp_360dialog.connection_error', 'Connection Error'),
        description: error.message || t('whatsapp_360dialog.connection_error_desc', 'Failed to connect to 360Dialog WhatsApp'),
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="ri-whatsapp-line text-green-500"></i>
            {t('whatsapp_360dialog.connect_title', 'Connect 360Dialog WhatsApp')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="accountName">{t('whatsapp_360dialog.connection_name', 'Connection Name')}</Label>
              <Input
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleInputChange}
                placeholder={t('whatsapp_360dialog.connection_name_placeholder', 'My 360Dialog WhatsApp')}
                required
              />
              <p className="text-sm text-gray-500">
                {t('whatsapp_360dialog.connection_name_help', 'A friendly name for this connection')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="apiKey">{t('whatsapp_360dialog.api_key', 'API Key')}</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={handleInputChange}
                placeholder={t('whatsapp_360dialog.api_key_placeholder', 'Your 360Dialog API key...')}
                required
              />
              <p className="text-sm text-gray-500">
                {t('whatsapp_360dialog.api_key_help', 'Your 360Dialog API key from the Hub dashboard')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">{t('whatsapp_360dialog.phone_number', 'WhatsApp Phone Number')}</Label>
              <div className="flex gap-2">
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder={t('whatsapp_360dialog.phone_number_placeholder', '+1234567890')}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={validateCredentials}
                  disabled={isValidating || !formData.apiKey || !formData.phoneNumber}
                  className="whitespace-nowrap"
                >
                  {isValidating ? t('whatsapp_360dialog.validating', 'Validating...') : t('whatsapp_360dialog.test', 'Test')}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                {t('whatsapp_360dialog.phone_number_help', 'Your WhatsApp Business phone number registered with 360Dialog')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhookUrl">{t('whatsapp_360dialog.webhook_url', 'Webhook URL')}</Label>
              <Input
                id="webhookUrl"
                name="webhookUrl"
                value={formData.webhookUrl}
                onChange={handleInputChange}
                placeholder={t('whatsapp_360dialog.webhook_url_placeholder', 'https://yourdomain.com/api/webhooks/360dialog-whatsapp')}
                required
              />
              <p className="text-sm text-gray-500">
                {t('whatsapp_360dialog.webhook_url_help', 'URL where 360Dialog will send webhook notifications')}
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <i className="ri-information-line text-blue-500 mr-2 mt-0.5"></i>
              <div>
                <p className="text-sm text-blue-700 font-medium">{t('whatsapp_360dialog.setup_title', '360Dialog WhatsApp Setup')}</p>
                <p className="text-xs text-blue-600 mt-1">
                  1. Create a 360Dialog account and get WhatsApp Business approved<br/>
                  2. Generate an API key in the 360Dialog Hub<br/>
                  3. Configure webhook URL in your 360Dialog dashboard<br/>
                  4. 360Dialog provides direct access to WhatsApp Business API
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="btn-brand-primary"
              disabled={isSubmitting || isValidating}
            >
              {isSubmitting ? t('whatsapp_360dialog.connecting', 'Connecting...') : t('whatsapp_360dialog.connect', 'Connect')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
