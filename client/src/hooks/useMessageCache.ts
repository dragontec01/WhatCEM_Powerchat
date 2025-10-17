/**
 * Message Cache Hook
 * 
 * This hook provides cache-aware message loading functionality that integrates
 * with the existing ConversationContext without breaking existing functionality.
 * 
 * Features:
 * - Cache-first message loading
 * - Intelligent API fallback
 * - Real-time cache synchronization
 * - Backward compatibility
 */

import { useEffect, useCallback, useRef } from 'react';
import messageCacheService, { CachedMessage } from '@/services/message-cache';
import { apiRequest } from '@/lib/queryClient';

export interface CacheAwareMessageResult {
  messages: any[];
  hasMore: boolean;
  total: number;
  fromCache: boolean;
  cacheHitRate?: number;
}

export interface UseMessageCacheOptions {
  enabled?: boolean;
  cacheFirst?: boolean;
  maxCacheAge?: number;
  prefetchNext?: boolean;
}

export function useMessageCache(options: UseMessageCacheOptions = {}) {
  const {
    enabled = true,
    cacheFirst = true,
    maxCacheAge = 5 * 60 * 1000, // 5 minutes
    prefetchNext = true
  } = options;

  const initPromise = useRef<Promise<void> | null>(null);
  const isInitialized = useRef(false);


  const initializeCache = useCallback(async () => {
    if (isInitialized.current) return;
    if (initPromise.current) return initPromise.current;

    initPromise.current = messageCacheService.init();
    await initPromise.current;
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (enabled) {
      initializeCache().catch(console.error);
    }
  }, [enabled, initializeCache]);

  /**
   * Load messages with cache-first strategy
   */
  const loadMessages = useCallback(async (
    conversationId: number,
    page: number = 1,
    limit: number = 25,
    isGroup: boolean = false
  ): Promise<CacheAwareMessageResult> => {
    if (!enabled) {

      return await loadMessagesFromAPI(conversationId, page, limit, isGroup);
    }

    await initializeCache();

    try {

      if (cacheFirst) {
        const cacheResult = await loadMessagesFromCache(conversationId, page, limit);


        if (cacheResult.messages.length > 0) {
          const oldestMessage = cacheResult.messages[cacheResult.messages.length - 1];
          const cacheAge = Date.now() - oldestMessage.cachedAt;

          if (cacheAge < maxCacheAge) {

            if (prefetchNext && cacheResult.hasMore) {
              prefetchNextPage(conversationId, page + 1, limit, isGroup).catch(console.error);
            }

            return {
              ...cacheResult,
              fromCache: true,
              cacheHitRate: 1.0
            };
          }
        }
      }


      const apiResult = await loadMessagesFromAPI(conversationId, page, limit, isGroup);


      if (apiResult.messages.length > 0) {
        await messageCacheService.cacheMessages(conversationId, apiResult.messages);


        await messageCacheService.cachePagination(conversationId, {
          page,
          limit,
          total: apiResult.total,
          hasMore: apiResult.hasMore
        });
      }

      return {
        ...apiResult,
        fromCache: false,
        cacheHitRate: 0.0
      };

    } catch (error) {
      console.error('Error in cache-aware message loading:', error);


      return await loadMessagesFromAPI(conversationId, page, limit, isGroup);
    }
  }, [enabled, cacheFirst, maxCacheAge, prefetchNext, initializeCache]);

  /**
   * Load messages from cache
   */
  const loadMessagesFromCache = useCallback(async (
    conversationId: number,
    page: number,
    limit: number
  ): Promise<CacheAwareMessageResult> => {
    const result = await messageCacheService.getCachedMessages(conversationId, page, limit);
    
    return {
      messages: result.messages,
      hasMore: result.hasMore,
      total: result.total,
      fromCache: true
    };
  }, []);

  /**
   * Load messages from API
   */
  const loadMessagesFromAPI = useCallback(async (
    conversationId: number,
    page: number,
    limit: number,
    isGroup: boolean
  ): Promise<CacheAwareMessageResult> => {
    const endpoint = isGroup
      ? `/api/group-conversations/${conversationId}/messages?page=${page}&limit=${limit}`
      : `/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`;

    const res = await apiRequest('GET', endpoint);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch messages: ${res.status}`);
    }

    const data = await res.json();
    
    return {
      messages: data.messages,
      hasMore: data.pagination.hasMore,
      total: data.pagination.total,
      fromCache: false
    };
  }, []);

  /**
   * Prefetch next page of messages
   */
  const prefetchNextPage = useCallback(async (
    conversationId: number,
    page: number,
    limit: number,
    isGroup: boolean
  ): Promise<void> => {
    try {

      const hasCached = await messageCacheService.hasCachedMessages(conversationId, page, limit);
      if (hasCached) return;


      const result = await loadMessagesFromAPI(conversationId, page, limit, isGroup);
      if (result.messages.length > 0) {
        await messageCacheService.cacheMessages(conversationId, result.messages);

      }
    } catch (error) {
      console.error('Error prefetching messages:', error);
    }
  }, [loadMessagesFromAPI]);

  /**
   * Add a new message to cache (for real-time updates)
   */
  const addMessageToCache = useCallback(async (message: any): Promise<void> => {
    if (!enabled) return;

    try {
      await initializeCache();
      await messageCacheService.addMessage(message);
    } catch (error) {
      console.error('Error adding message to cache:', error);
    }
  }, [enabled, initializeCache]);

  /**
   * Update a message in cache
   */
  const updateMessageInCache = useCallback(async (
    messageId: number,
    updates: Partial<CachedMessage>
  ): Promise<void> => {
    if (!enabled) return;

    try {
      await initializeCache();
      await messageCacheService.updateMessage(messageId, updates);
    } catch (error) {
      console.error('Error updating message in cache:', error);
    }
  }, [enabled, initializeCache]);

  /**
   * Remove a message from cache
   */
  const removeMessageFromCache = useCallback(async (messageId: number): Promise<void> => {
    if (!enabled) return;

    try {
      await initializeCache();
      await messageCacheService.removeMessage(messageId);
    } catch (error) {
      console.error('Error removing message from cache:', error);
    }
  }, [enabled, initializeCache]);

  /**
   * Invalidate cache for a conversation
   */
  const invalidateConversationCache = useCallback(async (conversationId: number): Promise<void> => {
    if (!enabled) return;

    try {
      await initializeCache();
      await messageCacheService.invalidateConversation(conversationId);
    } catch (error) {
      console.error('Error invalidating conversation cache:', error);
    }
  }, [enabled, initializeCache]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(async () => {
    if (!enabled) return null;
    
    try {
      await initializeCache();
      return await messageCacheService.getCacheStats();
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }, [enabled, initializeCache]);

  /**
   * Cleanup cache
   */
  const cleanupCache = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    try {
      await initializeCache();
      const needsCleanup = await messageCacheService.needsCleanup();
      if (needsCleanup) {
        await messageCacheService.cleanup();
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }, [enabled, initializeCache]);

  return {
    loadMessages,
    addMessageToCache,
    updateMessageInCache,
    removeMessageFromCache,
    invalidateConversationCache,
    getCacheStats,
    cleanupCache,
    isEnabled: enabled
  };
}
