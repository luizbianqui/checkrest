"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncItemChecklistRun {
  type: "checklist_run";
  id: string; // local ID to deduplicate
  payload: {
    checklistTemplateId: string;
    companyId: string;
    unitId: string;
    assignedTo: string;
    score: number;
    performedByUserId?: string;
    answers: {
      questionId: string;
      answerValue: string;
      isNonConform: boolean;
      observation?: string;
    }[];
  };
  createdAt: string;
  attempts: number;
}

export interface SyncItemOccurrence {
  type: "occurrence";
  id: string;
  payload: {
    companyId: string;
    unitId: string;
    title: string;
    description?: string | null;
    sector: string;
    severity: string;
    createdBy: string;
  };
  createdAt: string;
  attempts: number;
}

export type SyncItem = SyncItemChecklistRun | SyncItemOccurrence;

const QUEUE_KEY = "checkrest_sync_queue";
const MAX_ATTEMPTS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // ── Queue helpers ──────────────────────────────────────────────────────────

  const readQueue = useCallback((): SyncItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as SyncItem[]) : [];
    } catch {
      return [];
    }
  }, []);

  const writeQueue = useCallback((items: SyncItem[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    setPendingCount(items.length);
  }, []);

  const refreshCount = useCallback(() => {
    setPendingCount(readQueue().length);
  }, [readQueue]);

  // ── Enqueue ────────────────────────────────────────────────────────────────

  const enqueue = useCallback(
    (item: Omit<SyncItem, "createdAt" | "attempts">) => {
      const queue = readQueue();
      // Deduplicate by id
      if (queue.some((q) => q.id === item.id)) return;
      const newItem: SyncItem = {
        ...(item as SyncItem),
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      writeQueue([...queue, newItem]);
    },
    [readQueue, writeQueue]
  );

  // ── Sync ───────────────────────────────────────────────────────────────────

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    // Import server actions lazily to avoid importing them at module level in the hook
    const { createChecklistRunAction, createOccurrenceAction } = await import(
      "@/app/actions/dbActions"
    );

    const remaining: SyncItem[] = [];

    for (const item of queue) {
      try {
        if (item.type === "checklist_run") {
          const res = await createChecklistRunAction(item.payload);
          if (!res.success) throw new Error("Server returned failure");
        } else if (item.type === "occurrence") {
          const res = await createOccurrenceAction(item.payload);
          if (!res.success) throw new Error("Server returned failure");
        }
        // Success → item removed from queue (not added to remaining)
        console.info(`[useOfflineSync] Synced item ${item.id} (${item.type})`);
      } catch (err) {
        console.warn(`[useOfflineSync] Failed to sync item ${item.id}:`, err);
        const updated = { ...item, attempts: item.attempts + 1 };
        // Keep in queue only if under max attempts
        if (updated.attempts < MAX_ATTEMPTS) {
          remaining.push(updated);
        } else {
          console.error(
            `[useOfflineSync] Item ${item.id} exceeded max attempts (${MAX_ATTEMPTS}), discarding.`
          );
        }
      }
    }

    writeQueue(remaining);
    syncingRef.current = false;
    setIsSyncing(false);
  }, [readQueue, writeQueue]);

  // ── Event listeners ────────────────────────────────────────────────────────

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when connection is restored
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // If we load already online with pending items, sync immediately
    if (navigator.onLine) {
      syncNow();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow, refreshCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    enqueue,
    syncNow,
  };
}
