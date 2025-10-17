import { useCallback, useEffect, useRef } from 'react';
import messageCacheService, { CachedMediaMetadata } from '@/services/message-cache';

export interface MediaCacheOptions {
  enabled?: boolean;
  maxCacheAge?: number;
  preloadImages?: boolean;
  preloadThumbnails?: boolean;
}

export interface CachedMediaInfo {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
  isCached: boolean;
  cacheAge?: number;
}

export function useMediaCache(options: MediaCacheOptions = {}) {
  const {
    enabled = true,
    maxCacheAge = 24 * 60 * 60 * 1000,
    preloadImages = true,
    preloadThumbnails = true
  } = options;

  const initPromise = useRef<Promise<void> | null>(null);
  const isInitialized = useRef(false);
  const preloadedUrls = useRef<Set<string>>(new Set());

  const initializeCache = useCallback(async () => {
    if (isInitialized.current) return;
    if (initPromise.current) return initPromise.current;

    initPromise.current = messageCacheService.init();
    await initPromise.current;
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (enabled) {
      initializeCache().catch(() => {});
    }
  }, [enabled, initializeCache]);

  /**
   * Cache media metadata
   */
  const cacheMediaMetadata = useCallback(async (
    url: string,
    metadata: Omit<CachedMediaMetadata, 'url' | 'cachedAt' | 'lastAccessed'>
  ): Promise<void> => {
    if (!enabled) return;

    try {
      await initializeCache();
      await messageCacheService.cacheMediaMetadata(url, metadata);

    } catch (error) {
    }
  }, [enabled, initializeCache]);

  /**
   * Get cached media metadata
   */
  const getCachedMediaMetadata = useCallback(async (url: string): Promise<CachedMediaInfo | null> => {
    if (!enabled) return null;

    try {
      await initializeCache();
      const cached = await messageCacheService.getCachedMediaMetadata(url);
      
      if (cached) {
        const cacheAge = Date.now() - cached.cachedAt;
        
        if (cacheAge < maxCacheAge) {
          return {
            url: cached.url,
            type: cached.type,
            fileName: cached.fileName,
            fileSize: cached.fileSize,
            mimeType: cached.mimeType,
            thumbnailUrl: cached.thumbnailUrl,
            duration: cached.duration,
            dimensions: cached.dimensions,
            isCached: true,
            cacheAge
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }, [enabled, maxCacheAge, initializeCache]);

  /**
   * Preload media for better user experience
   * Note: Caching is disabled to prevent browser cache issues with new media
   */
  const preloadMedia = useCallback(async (url: string, type: 'image' | 'video' | 'audio' | 'document'): Promise<void> => {
    if (!enabled) return;


    const baseUrl = url.split('?')[0];
    if (preloadedUrls.current.has(baseUrl)) return;

    try {
      preloadedUrls.current.add(baseUrl);

      if (type === 'image' && preloadImages) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {

            cacheMediaMetadata(baseUrl, {
              type: 'image',
              mimeType: 'image/*',
              dimensions: { width: img.naturalWidth, height: img.naturalHeight }
            }).catch(() => {});

            resolve();
          };
          img.onerror = reject;


          img.src = url;
        });


      }
    } catch (error) {
    }
  }, [enabled, preloadImages, cacheMediaMetadata]);

  /**
   * Preload multiple media items
   */
  const preloadMediaBatch = useCallback(async (
    mediaItems: Array<{ url: string; type: 'image' | 'video' | 'audio' | 'document' }>
  ): Promise<void> => {
    if (!enabled) return;

    const preloadPromises = mediaItems.map(item => preloadMedia(item.url, item.type));
    
    try {
      await Promise.allSettled(preloadPromises);

    } catch (error) {
    }
  }, [enabled, preloadMedia]);

  /**
   * Extract media URLs from messages and preload them
   */
  const preloadMessagesMedia = useCallback(async (messages: any[]): Promise<void> => {
    if (!enabled) return;

    const mediaItems: Array<{ url: string; type: 'image' | 'video' | 'audio' | 'document' }> = [];

    messages.forEach(message => {
      if (message.mediaUrl && message.type && message.type !== 'text') {
        const mediaType = message.type as 'image' | 'video' | 'audio' | 'document';
        mediaItems.push({ url: message.mediaUrl, type: mediaType });
      }
    });

    if (mediaItems.length > 0) {
      await preloadMediaBatch(mediaItems);
    }
  }, [enabled, preloadMediaBatch]);

  /**
   * Check if media is cached and valid
   */
  const isMediaCached = useCallback(async (url: string): Promise<boolean> => {
    const cached = await getCachedMediaMetadata(url);
    return cached !== null;
  }, [getCachedMediaMetadata]);

  /**
   * Get optimized media URL (returns cached version if available)
   */
  const getOptimizedMediaUrl = useCallback(async (url: string): Promise<string> => {
    if (!enabled) return url;

    try {
      return url;
    } catch (error) {
      return url;
    }
  }, [enabled]);

  /**
   * Clear media cache for specific URLs
   */
  const clearMediaCache = useCallback(async (_urls: string[]): Promise<void> => {
    if (!enabled) return;

    try {
      await initializeCache();

    } catch (error) {
    }
  }, [enabled, initializeCache]);

  /**
   * Get media cache statistics
   */
  const getMediaCacheStats = useCallback(async () => {
    if (!enabled) return null;

    try {
      await initializeCache();
      const stats = await messageCacheService.getCacheStats();
      return {
        mediaCount: stats.mediaCount,
        totalSize: stats.totalSize
      };
    } catch (error) {
      return null;
    }
  }, [enabled, initializeCache]);

  /**
   * Warm up media cache for a conversation
   */
  const warmupConversationMedia = useCallback(async (messages: any[]): Promise<void> => {
    if (!enabled) return;


    await preloadMessagesMedia(messages);
  }, [enabled, preloadMessagesMedia]);

  return {
    cacheMediaMetadata,
    getCachedMediaMetadata,
    preloadMedia,
    preloadMediaBatch,
    preloadMessagesMedia,
    isMediaCached,
    getOptimizedMediaUrl,
    clearMediaCache,
    getMediaCacheStats,
    warmupConversationMedia,
    isEnabled: enabled
  };
}
