import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageInsert: (imageUrl: string, altText?: string) => void;
}

interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
    filename: string;
    size: number;
    mimetype: string;
  };
  error?: string;
  message?: string;
}

export function ImageUploadDialog({ isOpen, onClose, onImageInsert }: ImageUploadDialogProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  useEffect(() => {
    if (!isOpen) {

      setSelectedFile(null);
      setPreviewUrl(null);
      setImageUrl('');
      setAltText('');
      setError(null);
      setIsUploading(false);
      setUploadProgress(0);
      setActiveTab('upload');
    }
  }, [isOpen]);

  useEffect(() => {

    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);


    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }


    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setAltText(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for alt text
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);


      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/company-pages/upload-media');
        xhr.send(formData);
      });

      const response = await uploadPromise;

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Image uploaded successfully',
        });
        onImageInsert(response.data.url, altText);
        onClose();
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload image');
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlInsert = () => {
    if (!imageUrl.trim()) {
      setError('Please enter a valid image URL');
      return;
    }


    try {
      new URL(imageUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    onImageInsert(imageUrl, altText);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Insert Image
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select Image File</Label>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-2"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: JPEG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="space-y-3">
                <div className="text-sm">
                  <p><strong>File:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                  <p><strong>Type:</strong> {selectedFile.type}</p>
                </div>

                {previewUrl && (
                  <div className="border rounded-lg p-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-48 mx-auto rounded"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="alt-text">Alt Text (Optional)</Label>
                  <Input
                    id="alt-text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image..."
                    disabled={isUploading}
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="alt-text-url">Alt Text (Optional)</Label>
              <Input
                id="alt-text-url"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image..."
              />
            </div>

            {imageUrl && (
              <div className="border rounded-lg p-2">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-w-full max-h-48 mx-auto rounded"
                  onError={() => setError('Failed to load image from URL')}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          {activeTab === 'upload' ? (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload & Insert'}
            </Button>
          ) : (
            <Button
              onClick={handleUrlInsert}
              disabled={!imageUrl.trim()}
            >
              Insert Image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
