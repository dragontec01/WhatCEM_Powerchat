import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X } from 'lucide-react';
import { useConversations } from '@/context/ConversationContext';

interface MediaUploadModalProps {
  conversationId: number;
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
}

export default function MediaUploadModal({ 
  conversationId, 
  isOpen, 
  onClose, 
  file 
}: MediaUploadModalProps) {
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { sendMediaMessage } = useConversations();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleSend = async () => {
    if (!file) {
      toast({
        title: t('common.error', 'Error'),
        description: t('media_upload.no_file_selected', 'No media file selected'),
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      await sendMediaMessage(conversationId, file, caption);

      toast({
        title: t('common.success', 'Success'),
        description: t('media_upload.sent_successfully', 'Media message sent successfully')
      });
      onClose();
    } catch (error: any) {
      toast({
        title: t('media_upload.error_sending', 'Error Sending Media'),
        description: error.message || t('media_upload.send_failed', 'Failed to send media message'),
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getMediaPreview = () => {
    if (!file || !previewUrl) return null;

    const fileType = file.type;
    
    if (fileType.startsWith('image/')) {
      return (
        <img
          src={previewUrl}
          alt={t('media_upload.image_preview', 'Image preview')}
          className="max-h-64 max-w-full object-contain rounded-lg"
        />
      );
    } else if (fileType.startsWith('video/')) {
      return (
        <video
          src={previewUrl}
          controls
          className="max-h-64 max-w-full rounded-lg"
        />
      );
    } else if (fileType.startsWith('audio/')) {
      return (
        <audio
          src={previewUrl}
          controls
          className="w-full"
        />
      );
    } else {
      return (
        <div className="flex items-center justify-center p-6 bg-gray-100 rounded-lg w-full">
          <div className="text-center">
            <i className="ri-file-line text-4xl text-gray-600 mb-2"></i>
            <p className="text-sm text-gray-600 break-all">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('media_upload.file_size_kb', '{{size}} KB', { size: (file.size / 1024).toFixed(2) })}
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('media_upload.title', 'Send Media')}</DialogTitle>
          <DialogDescription>
            {t('media_upload.description', 'Preview and send media files through WhatsApp')}
          </DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          {file ? (
            <>
              <div className="flex justify-center">
                {getMediaPreview()}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{file.name}</span> ({t('media_upload.file_size_kb', '{{size}} KB', { size: (file.size / 1024).toFixed(2) })})
              </div>
              <Textarea
                placeholder={t('media_upload.caption_placeholder', 'Add a caption (optional)')}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-24"
              />
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">{t('media_upload.no_file_selected', 'No media file selected')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!file || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('media_upload.sending', 'Sending...')}
              </>
            ) : (
              t('media_upload.send', 'Send')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}