import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../api/client';

// ── Types ──

export type AdminLog = {
    id: number;
    status: string | null;
    worksession_name: string;
    source: 'AUTO' | 'MANUAL';
    created_at: string;
    is_read: boolean;
    risk_type_name?: string | null;
    compliance_id?: number | null;
    compliance_category?: string | null;
};

export type ComplianceAlert = {
    log: AdminLog;
    imageUrl: string | null;
    resolving: boolean;
};

const COMPLIANCE_LABEL: Record<string, string> = {
    HELMET: '안전모',
    VEST: '안전조끼',
    GLOVE: '안전장갑',
    SHOES: '안전화',
};

const FAST_POLL_INTERVAL = 3_000;

// ── Browser Notification helper ──

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendBrowserNotification(log: AdminLog) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const isManual = log.source === 'MANUAL';
    const category = log.compliance_category
        ? COMPLIANCE_LABEL[log.compliance_category] ?? log.compliance_category
        : '장비';

    const title = isManual
        ? `📋 수동 점검 요청 – ${log.worksession_name}`
        : `⚠ 위험 감지 – ${log.worksession_name}`;

    const body = isManual
        ? `수동 점검 · ${category}`
        : log.risk_type_name ?? '위험 감지';

    try {
        new Notification(title, {
            body,
            icon: '🔔',
            tag: `rp-alert-${log.id}`,
            requireInteraction: false,
        });
    } catch {
        /* Safari may not support Notification constructor */
    }
}

// ── SAS URL resolver ──

async function resolveComplianceImageUrl(log: AdminLog): Promise<string | null> {
    if (log.source !== 'MANUAL') return null;

    try {
        // Fetch detail to get original_image blob name
        const detailRes = await apiFetch(`/check/admin/request/${log.id}/`);
        if (!detailRes.ok) return null;
        const detailJson = await detailRes.json();
        const detail = detailJson.data ?? detailJson;
        const blobName = detail?.original_image;
        if (!blobName) return null;

        const effectiveBlobName = blobName.includes('/') ? blobName : `compliance/${blobName}`;
        const sasRes = await apiFetch('/user/storage/sas/download/', {
            method: 'POST',
            body: JSON.stringify({ blob_name: effectiveBlobName }),
        });
        if (!sasRes.ok) return null;
        const sasData = await sasRes.json();
        return sasData.download_url ?? sasData.url ?? null;
    } catch {
        return null;
    }
}

// ── Hook ──

type UseComplianceNotificationsOptions = {
    /** Called for each new alert detected */
    onNewAlert?: (alert: ComplianceAlert) => void;
    /** Whether to enable polling (default: true) */
    enabled?: boolean;
};

export default function useComplianceNotifications(
    options: UseComplianceNotificationsOptions = {},
) {
    const { onNewAlert, enabled = true } = options;
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const knownIdsRef = useRef<Set<number>>(new Set());
    const initialLoadRef = useRef(true);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onNewAlertRef = useRef(onNewAlert);
    onNewAlertRef.current = onNewAlert;

    const poll = useCallback(async () => {
        try {
            const res = await apiFetch('/detect/admin/logs/');
            if (!res.ok) return;
            const json = await res.json();

            let fetchedLogs: AdminLog[] = [];
            if (Array.isArray(json)) fetchedLogs = json;
            else if (json && Array.isArray(json.data)) fetchedLogs = json.data;
            else if (json && Array.isArray(json.results)) fetchedLogs = json.results;

            // On first load, just populate known IDs without firing notifications
            if (initialLoadRef.current) {
                knownIdsRef.current = new Set(fetchedLogs.map(l => l.id));
                initialLoadRef.current = false;
                return;
            }

            // Find new logs that weren't in the previous set
            const newLogs = fetchedLogs.filter(l => !knownIdsRef.current.has(l.id));

            if (newLogs.length > 0) {
                // Update known IDs
                knownIdsRef.current = new Set(fetchedLogs.map(l => l.id));

                // Create alerts and fire notifications for each new log
                for (const log of newLogs) {
                    sendBrowserNotification(log);

                    const alert: ComplianceAlert = {
                        log,
                        imageUrl: null,
                        resolving: log.source === 'MANUAL',
                    };

                    setAlerts(prev => [alert, ...prev]);
                    onNewAlertRef.current?.(alert);

                    // Resolve SAS URL in background for MANUAL (compliance) alerts
                    if (log.source === 'MANUAL') {
                        resolveComplianceImageUrl(log).then(imageUrl => {
                            setAlerts(prev =>
                                prev.map(a =>
                                    a.log.id === log.id
                                        ? { ...a, imageUrl, resolving: false }
                                        : a,
                                ),
                            );
                        });
                    }
                }
            }
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        requestNotificationPermission();
        poll();
        pollingRef.current = setInterval(poll, FAST_POLL_INTERVAL);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [poll, enabled]);

    const dismissAlert = useCallback((logId: number) => {
        setAlerts(prev => prev.filter(a => a.log.id !== logId));
    }, []);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    return { alerts, dismissAlert, clearAlerts };
}
