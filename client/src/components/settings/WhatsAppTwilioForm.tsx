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

interface TwilioFormData {
  accountName: string;
  accountSid: string;
  authToken: string;
  conversationServiceSid: string;
  whatsappNumber: string;
}

export function WhatsAppTwilioForm({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const [formData, setFormData] = useState<TwilioFormData>({
    accountName: '',
    accountSid: '',
    authToken: '',
    conversationServiceSid: '',
    whatsappNumber: 'whatsapp:+14155238886' // Default Twilio sandbox number
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
      accountSid: '',
      authToken: '',
      conversationServiceSid: '',
      whatsappNumber: 'whatsapp:+14155238886'
    });
    setIsSubmitting(false);
    setIsValidating(false);
  };

  const validateCredentials = async () => {
    if (!formData.accountSid || !formData.authToken || !formData.conversationServiceSid) {
      toast({
        title: t('whatsapp_twilio.validation_error', 'Validation Error'),
        description: t('whatsapp_twilio.required_fields', 'Account SID, Auth Token, and Conversation Service SID are required for validation.'),
        variant: "destructive"
      });
      return false;
    }

    setIsValidating(true);
    try {

      const auth = btoa(`${formData.accountSid}:${formData.authToken}`);
      const response = await fetch(`https://conversations.twilio.com/v1/Services/${formData.conversationServiceSid}`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: t('whatsapp_twilio.credentials_valid', 'Credentials Valid'),
          description: t('whatsapp_twilio.validation_success', 'Successfully validated Twilio service: {{serviceName}}', { serviceName: data.friendly_name || formData.conversationServiceSid }),
        });
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || t('whatsapp_twilio.invalid_credentials', 'Invalid credentials'));
      }
    } catch (error: any) {
      toast({
        title: t('whatsapp_twilio.validation_failed', 'Validation Failed'),
        description: error.message || t('whatsapp_twilio.validation_failed_desc', 'Failed to validate Twilio credentials.'),
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
          channelType: 'whatsapp_twilio',
          accountId: formData.conversationServiceSid,
          accountName: formData.accountName,
          connectionData: {
            accountSid: formData.accountSid,
            authToken: formData.authToken,
            conversationServiceSid: formData.conversationServiceSid,
            whatsappNumber: formData.whatsappNumber
          }
        })
      });

      if (response.ok) {
        toast({
          title: t('common.success', 'Success'),
          description: t('whatsapp_twilio.connection_created', 'Twilio WhatsApp connection created successfully!'),
        });

        resetForm();
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t('whatsapp_twilio.connection_failed', 'Failed to create connection'));
      }
    } catch (error: any) {
      console.error('Error connecting to Twilio WhatsApp:', error);
      toast({
        title: t('whatsapp_twilio.connection_error', 'Connection Error'),
        description: error.message || t('whatsapp_twilio.connection_error_desc', 'Failed to connect to Twilio WhatsApp'),
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
            {t('whatsapp_twilio.connect_title', 'Connect Twilio WhatsApp')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="accountName">{t('whatsapp_twilio.connection_name', 'Connection Name')}</Label>
              <Input
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleInputChange}
                placeholder={t('whatsapp_twilio.connection_name_placeholder', 'My Twilio WhatsApp')}
                required
              />
              <p className="text-sm text-gray-500">
                {t('whatsapp_twilio.connection_name_help', 'A friendly name for this connection')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accountSid">{t('whatsapp_twilio.account_sid', 'Account SID')}</Label>
              <Input
                id="accountSid"
                name="accountSid"
                value={formData.accountSid}
                onChange={handleInputChange}
                placeholder={t('whatsapp_twilio.account_sid_placeholder', 'ACxxxxx...')}
                required
              />
              <p className="text-sm text-gray-500">
                {t('whatsapp_twilio.account_sid_help', 'Your Twilio Account SID from the console')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authToken">{t('whatsapp_twilio.auth_token', 'Auth Token')}</Label>
              <Input
                id="authToken"
                name="authToken"
                type="password"
                value={formData.authToken}
                onChange={handleInputChange}
                placeholder={t('whatsapp_twilio.auth_token_placeholder', 'Your auth token...')}
                required
              />
              <p className="text-sm text-gray-500">
                {t('whatsapp_twilio.auth_token_help', 'Your Twilio Auth Token (keep this secure)')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="conversationServiceSid">{t('whatsapp_twilio.conversation_service_sid', 'Conversation Service SID')}</Label>
              <div className="flex gap-2">
                <Input
                  id="conversationServiceSid"
                  name="conversationServiceSid"
                  value={formData.conversationServiceSid}
                  onChange={handleInputChange}
                  placeholder={t('whatsapp_twilio.conversation_service_sid_placeholder', 'ISxxxxx...')}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={validateCredentials}
                  disabled={isValidating || !formData.accountSid || !formData.authToken || !formData.conversationServiceSid}
                  className="whitespace-nowrap"
                >
                  {isValidating ? t('whatsapp_twilio.validating', 'Validating...') : t('whatsapp_twilio.test', 'Test')}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                {t('whatsapp_twilio.conversation_service_sid_help', 'Your Twilio Conversations Service SID')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="whatsappNumber">{t('whatsapp_twilio.whatsapp_number', 'WhatsApp Number')}</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleInputChange}
                placeholder={t('whatsapp_twilio.whatsapp_number_placeholder', 'whatsapp:+14155238886')}
                required
              />
              <p className="text-sm text-gray-500">
                {t('whatsapp_twilio.whatsapp_number_help', 'Your Twilio WhatsApp number (sandbox or approved number)')}
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <i className="ri-information-line text-blue-500 mr-2 mt-0.5"></i>
              <div>
                <p className="text-sm text-blue-700 font-medium">{t('whatsapp_twilio.setup_title', 'Twilio WhatsApp Setup')}</p>
                <p className="text-xs text-blue-600 mt-1">
                  1. Create a Twilio account and Conversations Service<br/>
                  2. Enable WhatsApp for your service<br/>
                  3. Configure webhook: https://yourdomain.com/api/webhooks/twilio-whatsapp<br/>
                  4. Use sandbox number for testing or get approved for production
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
              {isSubmitting ? t('whatsapp_twilio.connecting', 'Connecting...') : t('whatsapp_twilio.connect', 'Connect')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
