// Offline Drafts System for Inspection Items
// Saves inspection progress locally when offline and syncs when back online

const DRAFT_STORAGE_KEY = 'inspection_drafts';
const SYNC_QUEUE_KEY = 'inspection_sync_queue';

export interface InspectionDraft {
  itemId: number;
  propertyId: number;
  roomId: number;
  updates: {
    isCompleted?: boolean;
    notes?: string;
    isNotApplicable?: boolean;
    notApplicableReason?: string | null;
    completedDate?: string | null;
  };
  savedAt: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  itemId: number;
  updates: Record<string, any>;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
}

// Check if browser is online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Get all drafts from localStorage
export function getDrafts(): Record<number, InspectionDraft> {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save a draft for an inspection item
export function saveDraft(draft: InspectionDraft): void {
  try {
    const drafts = getDrafts();
    drafts[draft.itemId] = {
      ...draft,
      savedAt: new Date().toISOString(),
      synced: false,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    console.log(`[Offline] Draft saved for item ${draft.itemId}`);
  } catch (error) {
    console.error('[Offline] Failed to save draft:', error);
  }
}

// Get draft for a specific item
export function getDraft(itemId: number): InspectionDraft | null {
  const drafts = getDrafts();
  return drafts[itemId] || null;
}

// Remove a draft after successful sync
export function removeDraft(itemId: number): void {
  try {
    const drafts = getDrafts();
    delete drafts[itemId];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    console.log(`[Offline] Draft removed for item ${itemId}`);
  } catch (error) {
    console.error('[Offline] Failed to remove draft:', error);
  }
}

// Clear all drafts
export function clearAllDrafts(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    console.log('[Offline] All drafts cleared');
  } catch (error) {
    console.error('[Offline] Failed to clear drafts:', error);
  }
}

// Get count of unsynced drafts
export function getUnsyncedDraftCount(): number {
  const drafts = getDrafts();
  return Object.values(drafts).filter(d => !d.synced).length;
}

// Get all unsynced drafts
export function getUnsyncedDrafts(): InspectionDraft[] {
  const drafts = getDrafts();
  return Object.values(drafts).filter(d => !d.synced);
}

// Mark draft as synced
export function markDraftSynced(itemId: number): void {
  try {
    const drafts = getDrafts();
    if (drafts[itemId]) {
      drafts[itemId].synced = true;
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    }
  } catch (error) {
    console.error('[Offline] Failed to mark draft as synced:', error);
  }
}

// Sync queue for failed API calls
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToSyncQueue(itemId: number, updates: Record<string, any>): void {
  try {
    const queue = getSyncQueue();
    const id = `${itemId}-${Date.now()}`;
    queue.push({
      id,
      itemId,
      updates,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Offline] Added to sync queue: ${id}`);
  } catch (error) {
    console.error('[Offline] Failed to add to sync queue:', error);
  }
}

export function removeFromSyncQueue(id: string): void {
  try {
    const queue = getSyncQueue().filter(item => item.id !== id);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Offline] Failed to remove from sync queue:', error);
  }
}

export function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): void {
  try {
    const queue = getSyncQueue().map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Offline] Failed to update sync queue item:', error);
  }
}

export function clearSyncQueue(): void {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    console.log('[Offline] Sync queue cleared');
  } catch (error) {
    console.error('[Offline] Failed to clear sync queue:', error);
  }
}

// Get pending sync count
export function getPendingSyncCount(): number {
  return getSyncQueue().length + getUnsyncedDraftCount();
}
