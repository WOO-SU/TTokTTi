import React, { useEffect, useRef, useState } from 'react';
import type { ComplianceAlert } from '../hooks/useComplianceNotifications';

const COMPLIANCE_LABEL: Record<string, string> = {
    HELMET: '안전모',
    VEST: '안전조끼',
    GLOVE: '안전장갑',
    SHOES: '안전화',
};

const AUTO_DISMISS_MS = 6_000;

type ToastItem = ComplianceAlert & { enteredAt: number; exiting: boolean };

export default function ComplianceToast({
    alerts,
    onDismiss,
    onClickAlert,
}: {
    alerts: ComplianceAlert[];
    onDismiss: (logId: number) => void;
    onClickAlert?: (log: ComplianceAlert['log']) => void;
}) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    // Sync new alerts into toast items
    useEffect(() => {
        const currentIds = new Set(items.map(i => i.log.id));
        const newAlerts = alerts.filter(a => !currentIds.has(a.log.id));
        if (newAlerts.length === 0) return;

        const newItems: ToastItem[] = newAlerts.map(a => ({
            ...a,
            enteredAt: Date.now(),
            exiting: false,
        }));

        setItems(prev => [...newItems, ...prev].slice(0, 5));

        // Schedule auto-dismiss
        for (const item of newItems) {
            const timer = setTimeout(() => {
                dismissItem(item.log.id);
            }, AUTO_DISMISS_MS);
            timersRef.current.set(item.log.id, timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alerts]);

    // Update imageUrl for existing items when alerts resolve
    useEffect(() => {
        setItems(prev =>
            prev.map(item => {
                const matchingAlert = alerts.find(a => a.log.id === item.log.id);
                if (matchingAlert && matchingAlert.imageUrl !== item.imageUrl) {
                    return { ...item, imageUrl: matchingAlert.imageUrl, resolving: matchingAlert.resolving };
                }
                return item;
            }),
        );
    }, [alerts]);

    const dismissItem = (logId: number) => {
        // Start exit animation
        setItems(prev => prev.map(i => (i.log.id === logId ? { ...i, exiting: true } : i)));
        // Remove after animation
        setTimeout(() => {
            setItems(prev => prev.filter(i => i.log.id !== logId));
            onDismiss(logId);
        }, 300);
        // Clear auto-dismiss timer
        const timer = timersRef.current.get(logId);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(logId);
        }
    };

    // Cleanup timers
    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach(t => clearTimeout(t));
        };
    }, []);

    if (items.length === 0) return null;

    return (
        <>
            <style>{toastKeyframes}</style>
            <div style={styles.container}>
                {items.map(item => {
                    const log = item.log;
                    const isManual = log.source === 'MANUAL';
                    const category = log.compliance_category
                        ? COMPLIANCE_LABEL[log.compliance_category] ?? log.compliance_category
                        : '장비';
                    const time = formatTime(log.created_at);

                    return (
                        <div
                            key={log.id}
                            style={{
                                ...styles.toast,
                                borderLeftColor: isManual ? '#006FFD' : '#DC2626',
                                animation: item.exiting
                                    ? 'rpToastSlideOut 0.3s ease forwards'
                                    : 'rpToastSlideIn 0.35s ease',
                            }}
                            onClick={() => {
                                onClickAlert?.(log);
                                dismissItem(log.id);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onClickAlert?.(log);
                                    dismissItem(log.id);
                                }
                            }}
                        >
                            {/* Header row */}
                            <div style={styles.headerRow}>
                                <div style={styles.headerLeft}>
                                    <span
                                        style={{
                                            ...styles.sourceBadge,
                                            backgroundColor: isManual ? '#EAF2FF' : '#FFF5F5',
                                            color: isManual ? '#006FFD' : '#DC2626',
                                        }}
                                    >
                                        {isManual ? '📋 MANUAL' : '⚠ AUTO'}
                                    </span>
                                    <span style={styles.time}>{time}</span>
                                </div>
                                <button
                                    type="button"
                                    style={styles.closeBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismissItem(log.id);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div style={styles.contentRow}>
                                {/* Thumbnail */}
                                {isManual && (
                                    <div style={styles.thumbnailBox}>
                                        {item.resolving ? (
                                            <div style={styles.thumbnailPlaceholder}>
                                                <span style={{ fontSize: 16 }}>⏳</span>
                                            </div>
                                        ) : item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt="compliance"
                                                style={styles.thumbnailImg}
                                            />
                                        ) : (
                                            <div style={styles.thumbnailPlaceholder}>
                                                <span style={{ fontSize: 16 }}>📷</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={styles.textArea}>
                                    <span style={styles.siteName}>{log.worksession_name}</span>
                                    <span style={styles.description}>
                                        {isManual ? `수동 점검 · ${category}` : log.risk_type_name ?? '위험 감지'}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar for auto-dismiss */}
                            <div style={styles.progressBar}>
                                <div
                                    style={{
                                        ...styles.progressFill,
                                        backgroundColor: isManual ? '#006FFD' : '#DC2626',
                                        animation: `rpToastProgress ${AUTO_DISMISS_MS}ms linear`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

// ── Helpers ──

function formatTime(isoStr: string): string {
    const d = new Date(isoStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// ── Keyframes ──

const toastKeyframes = `
@keyframes rpToastSlideIn {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes rpToastSlideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(120%); opacity: 0; }
}
@keyframes rpToastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
`;

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 380,
        width: '100%',
        pointerEvents: 'none',
    },
    toast: {
        pointerEvents: 'all',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderLeft: '5px solid',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
        padding: '14px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    sourceBadge: {
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: 10,
        padding: '3px 8px',
        borderRadius: 6,
    },
    time: {
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        fontSize: 11,
        color: '#8F9098',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: 14,
        color: '#8F9098',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: 4,
        lineHeight: 1,
    },
    contentRow: {
        display: 'flex',
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    thumbnailBox: {
        width: 56,
        height: 56,
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0,
    },
    thumbnailImg: {
        width: 56,
        height: 56,
        objectFit: 'cover',
        borderRadius: 10,
        backgroundColor: '#F0F1F3',
    },
    thumbnailPlaceholder: {
        width: 56,
        height: 56,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F1F3',
        borderRadius: 10,
    },
    textArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minWidth: 0,
    },
    siteName: {
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: 14,
        color: '#1F2024',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    description: {
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        fontSize: 12,
        color: '#71727A',
    },
    progressBar: {
        height: 3,
        backgroundColor: '#F0F1F3',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 4,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
};
