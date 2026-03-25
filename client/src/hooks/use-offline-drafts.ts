// React hook for managing offline inspection drafts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { authenticatedApiRequest } from '@/lib/api';
import {
  isOnline,
  saveDraft,
  getDraft,
  removeDraft,
  getUnsyncedDrafts,
  getPendingSyncCount,
  clearSyncQueue,
  type InspectionDraft,
} from '@/lib/offline-drafts';

export function useOfflineDrafts() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(getPendingSyncCount());
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  
  // Use ref to store the sync function so it can be called from effects
  const syncFnRef = useRef<() => Promise<void>>();

  // Sync all pending changes - defined first so ref can be assigned
  const syncPendingChanges = useCallback(async () => {
    if (syncing || !isOnline()) return;
    
    setSyncing(true);
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Only sync drafts (single source of truth, no separate queue)
      const drafts = getUnsyncedDrafts();
      
      for (const draft of drafts) {
        try {
          const response = await authenticatedApiRequest('PUT', `/api/inspection-items/${draft.itemId}`, draft.updates);
          if (response.ok) {
            removeDraft(draft.itemId);
            syncedCount++;
          } else {
            // Keep draft for retry, but don't duplicate
            failedCount++;
            console.error(`[Sync] Failed to sync draft ${draft.itemId}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`[Sync] Error syncing draft ${draft.itemId}:`, error);
        }
      }

      if (syncedCount > 0) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synced ${syncedCount} change${syncedCount > 1 ? 's' : ''}.`,
        });
      }

      if (failedCount > 0) {
        toast({
          title: 'Sync Issues',
          description: `${failedCount} change${failedCount > 1 ? 's' : ''} failed to sync. Will retry later.`,
          variant: 'destructive',
        });
      }
    } finally {
      setSyncing(false);
      setPendingCount(getPendingSyncCount());
    }
  }, [syncing, toast]);

  // Update ref when syncPendingChanges changes
  useEffect(() => {
    syncFnRef.current = syncPendingChanges;
  }, [syncPendingChanges]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast({
        title: 'Back Online',
        description: 'Syncing your saved changes...',
      });
      // Use ref to call the current sync function
      syncFnRef.current?.();
    };

    const handleOffline = () => {
      setOnline(false);
      toast({
        title: 'You\'re Offline',
        description: 'Changes will be saved locally and synced when you\'re back online.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getPendingSyncCount());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Clear legacy sync queue on mount (using only drafts now)
  useEffect(() => {
    clearSyncQueue();
  }, []);

  // Save changes - works offline or online
  const saveInspectionChange = useCallback(async (
    itemId: number,
    propertyId: number,
    roomId: number,
    updates: Record<string, any>,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    // Always save draft first for offline resilience
    const draft: InspectionDraft = {
      itemId,
      propertyId,
      roomId,
      updates,
      savedAt: new Date().toISOString(),
      synced: false,
    };
    saveDraft(draft);
    setPendingCount(getPendingSyncCount());

    // If online, try to sync immediately
    if (isOnline()) {
      try {
        const response = await authenticatedApiRequest('PUT', `/api/inspection-items/${itemId}`, updates);
        if (response.ok) {
          // Success - remove the draft
          removeDraft(itemId);
          setPendingCount(getPendingSyncCount());
          onSuccess?.();
          return await response.json();
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Failed to update' }));
          // Keep draft for later retry (no separate queue)
          const error = new Error(errorData.message || 'Failed to update');
          onError?.(error);
          throw error;
        }
      } catch (error) {
        // Network error - draft already saved for later sync
        console.warn('[Offline] Request failed, draft saved for later sync');
        onError?.(error as Error);
        throw error;
      }
    } else {
      // Offline - draft already saved
      toast({
        title: 'Saved Offline',
        description: 'Your changes will sync when you\'re back online.',
      });
      onSuccess?.();
    }
  }, [toast]);

  // Get draft for an item (for displaying local changes)
  const getItemDraft = useCallback((itemId: number) => {
    return getDraft(itemId);
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (isOnline()) {
      syncPendingChanges();
    } else {
      toast({
        title: 'Cannot Sync',
        description: 'You\'re currently offline. Changes will sync when you\'re back online.',
        variant: 'destructive',
      });
    }
  }, [syncPendingChanges, toast]);

  return {
    online,
    pendingCount,
    syncing,
    saveInspectionChange,
    getItemDraft,
    triggerSync,
    syncPendingChanges,
  };
}
