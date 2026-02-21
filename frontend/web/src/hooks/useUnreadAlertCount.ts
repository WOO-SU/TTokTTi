import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../api/client';

const READ_ALERTS_KEY = 'rp_read_alerts';
const POLL_INTERVAL = 10_000;

function getReadAlertIds(): Set<number> {
  try {
    const raw = localStorage.getItem(READ_ALERTS_KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch { /* ignore */ }
  return new Set();
}

export default function useUnreadAlertCount(): number {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await apiFetch('/detect/admin/logs/');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const readIds = getReadAlertIds();
          setUnreadCount(data.filter((l: { id: number; is_read: boolean }) => !l.is_read && !readIds.has(l.id)).length);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCount();
    pollingRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchCount]);

  return unreadCount;
}
