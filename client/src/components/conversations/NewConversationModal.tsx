import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ChannelConnection } from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageCircle, Phone, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated?: (conversation: any) => void;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated
}: NewConversationModalProps) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const getChannelDisplayName = (channelType: string) => {
    switch (channelType) {
      case 'whatsapp_unofficial':
      case 'whatsapp':
        return t('new_conversation.channel_unofficial', 'Unofficial');
      case 'whatsapp_official':
        return t('new_conversation.channel_official', 'Business API');
      default:
        return channelType;
    }
  };

  const { data: channelConnections = [], isLoading: isLoadingConnections } = useQuery<ChannelConnection[]>({
    queryKey: ['/api/channel-connections'],
    staleTime: 1000 * 60 * 5,
  });

  const activeWhatsAppConnections = channelConnections.filter(
    (conn: ChannelConnection) =>
      (conn.channelType === 'whatsapp_unofficial' ||
       conn.channelType === 'whatsapp' ||
       conn.channelType === 'whatsapp_official') &&
      conn.status === 'active'
  );

  useEffect(() => {
    if (activeWhatsAppConnections.length > 0 && !selectedChannelId) {
      setSelectedChannelId(activeWhatsAppConnections[0].id);
    }
  }, [activeWhatsAppConnections, selectedChannelId]);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d\s\-\(\)\+]/g, '');
    setPhoneNumber(value);

    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push(t('new_conversation.name_required', 'Contact name is required'));
    }

    if (!phoneNumber.trim()) {
      errors.push(t('new_conversation.phone_required', 'Phone number is required'));
    } else {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      if (cleanPhoneNumber.length < 10) {
        errors.push(t('new_conversation.phone_invalid', 'Please enter a valid phone number with at least 10 digits'));
      }
    }

    if (!selectedChannelId) {
      errors.push(t('new_conversation.connection_required', 'Please select a WhatsApp connection'));
    }

    if (activeWhatsAppConnections.length === 0) {
      errors.push(t('new_conversation.no_connections', 'No active WhatsApp connections found. Please connect WhatsApp in Settings first.'));
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const createConversationMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      phoneNumber: string;
      channelConnectionId: number;
      initialMessage?: string;
    }) => {
      const res = await apiRequest('POST', '/api/conversations/whatsapp/initiate', data);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || t('new_conversation.create_failed', 'Failed to create conversation'));
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('common.success', 'Success'),
        description: t('new_conversation.success_message', 'WhatsApp conversation initiated successfully.'),
      });

      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });

      if (onConversationCreated) {
        onConversationCreated(data.conversation);
      }

      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('new_conversation.create_error', 'Failed to create conversation. Please try again.'),
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const resetForm = () => {
    setName('');
    setPhoneNumber('');
    setInitialMessage('');
    setValidationErrors([]);
    setSelectedChannelId(activeWhatsAppConnections.length > 0 ? activeWhatsAppConnections[0].id : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!selectedChannelId) {
      toast({
        title: t('new_conversation.no_connection_selected', 'No Connection Selected'),
        description: t('new_conversation.select_connection', 'Please select a WhatsApp connection.'),
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await createConversationMutation.mutateAsync({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        channelConnectionId: selectedChannelId,
        initialMessage: initialMessage.trim() || undefined
      });

    } catch (error) {
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            {t('new_conversation.title', 'Start New WhatsApp Conversation')}
          </DialogTitle>
          <DialogDescription>
            {t('new_conversation.description', 'Enter contact details to initiate a new WhatsApp conversation.')}
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingConnections && activeWhatsAppConnections.length === 0 && (
          <Alert>
            <AlertDescription>
              {t('new_conversation.no_connections', 'No active WhatsApp connections found. Please connect WhatsApp in Settings first.')}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('new_conversation.contact_name_required', 'Contact Name *')}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationErrors.length > 0) setValidationErrors([]);
              }}
              placeholder={t('new_conversation.enter_contact_name', "Enter contact's full name")}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t('new_conversation.phone_number_required', 'Phone Number *')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder={t('new_conversation.enter_phone_number', 'Enter phone number (e.g., +1234567890)')}
              required
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">
              {t('new_conversation.include_country_code', 'Include country code for international numbers')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="connection" className="flex items-center gap-2">
              <i className="ri-whatsapp-line w-4 h-4 text-green-600"></i>
              {t('new_conversation.whatsapp_connection_required', 'WhatsApp Connection *')}
            </Label>
            {isLoadingConnections ? (
              <div className="flex items-center gap-2 p-2 border rounded">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('new_conversation.loading_connections', 'Loading connections...')}
              </div>
            ) : activeWhatsAppConnections.length > 0 ? (
              <Select
                value={selectedChannelId?.toString() || ''}
                onValueChange={(value) => setSelectedChannelId(parseInt(value))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('new_conversation.select_whatsapp_connection', 'Select WhatsApp connection')} />
                </SelectTrigger>
                <SelectContent>
                  {activeWhatsAppConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {conn.accountName || `WhatsApp ${conn.id}`}
                        <span className="text-xs text-gray-500">({getChannelDisplayName(conn.channelType)})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 border rounded bg-gray-50 text-gray-600 text-sm">
                {t('new_conversation.no_connections_available', 'No active WhatsApp connections available')}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {t('new_conversation.initial_message_optional', 'Initial Message (Optional)')}
            </Label>
            <Textarea
              id="message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder={t('new_conversation.enter_initial_message', 'Enter an optional first message to send...')}
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">
              {t('new_conversation.initial_message_help', 'This message will be sent immediately after creating the conversation')}
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || activeWhatsAppConnections.length === 0}
              className="w-full sm:w-auto btn-brand-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('new_conversation.creating', 'Creating...')}
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('new_conversation.start_conversation', 'Start Conversation')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}