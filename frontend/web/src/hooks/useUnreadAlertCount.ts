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
      const res = await apiFetch('/api/detect/search/?is_risky=true');
      if (res.ok) {
        const data = await res.json();
        const videos: { id: number }[] = data.data ?? data.results ?? data ?? [];
        if (Array.isArray(videos)) {
          const readIds = getReadAlertIds();
          setUnreadCount(videos.filter(v => !readIds.has(v.id)).length);
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
