import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';
import managerImg from '../assets/manager.jpg';

// ── Types ──

type AdminLog = {
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

type ManualCheckDetail = {
  videolog_id: number;
  status: string | null;
  employee: { id: number; name: string };
  worksession: { id: number; name: string };
  category: string;
  original_image: string | null;
  created_at: string;
};

type AutoCheckDetail = {
  videolog_id: number;
  status: string | null;
  workers: { id: number; name: string }[];
  worksession: { id: number; name: string };
  risk_type: { name: string };
  original_video: string | null;
  created_at: string;
};

const COMPLIANCE_LABEL: Record<string, string> = {
  HELMET: '안전모',
  VEST: '안전 조끼',
  SHOES: '안전화',
};

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  PENDING: { text: '대기 중', color: '#E37D00' },
  APPROVED: { text: '승인됨', color: '#22A06B' },
  REJECTED: { text: '거절됨', color: '#DC2626' },
};

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
  { label: '알림 로그 확인', icon: '🔔', path: '/alert-logs' },
];

const POLL_INTERVAL = 10_000;
const READ_ALERTS_KEY = 'rp_read_alerts';

function getReadAlertIds(): Set<number> {
  try {
    const raw = localStorage.getItem(READ_ALERTS_KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch { /* ignore */ }
  return new Set();
}

function persistReadAlertIds(ids: Set<number>) {
  localStorage.setItem(READ_ALERTS_KEY, JSON.stringify([...ids]));
}

type FilterType = 'ALL' | 'AUTO' | 'MANUAL';

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${month}/${day} ${h}:${m}:${s}`;
}

function getDescription(log: AdminLog): string {
  if (log.source === 'MANUAL') {
    const cat = log.compliance_category ? COMPLIANCE_LABEL[log.compliance_category] ?? log.compliance_category : '장비';
    return `수동 점검 요청 · ${cat}`;
  }
  return log.risk_type_name ?? '위험 감지';
}

// ── Detail Modal ──

function LogDetailModal({
  log,
  onClose,
  onApprove,
  approving,
}: {
  log: AdminLog;
  onClose: () => void;
  onApprove: (logId: number, approval: boolean) => void;
  approving: boolean;
}) {
  const [manualDetail, setManualDetail] = useState<ManualCheckDetail | null>(null);
  const [autoDetail, setAutoDetail] = useState<AutoCheckDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setDetailLoading(true);
    if (log.source === 'MANUAL') {
      apiFetch(`/check/admin/request/${log.id}/`)
        .then(res => res.json())
        .then(json => {
          if (json.ok && json.data) setManualDetail(json.data);
        })
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    } else {
      apiFetch(`/detect/admin/request/${log.id}/`)
        .then(res => res.json())
        .then(json => {
          if (json.ok && json.data) setAutoDetail(json.data);
        })
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    }
  }, [log.id, log.source]);

  const isManual = log.source === 'MANUAL';
  const currentStatus = isManual
    ? (manualDetail?.status ?? log.status)
    : (autoDetail?.status ?? log.status);
  const statusInfo = currentStatus ? STATUS_LABEL[currentStatus] : null;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <span style={{ ...styles.modalTitle, color: isManual ? '#006FFD' : '#DC2626' }}>
              {isManual ? '📋 수동 점검 요청' : '⚠ 위험 알림 상세'}
            </span>
            <span style={styles.modalSub}>
              {formatDateTime(log.created_at)} · {log.worksession_name}
            </span>
          </div>
          <button type="button" style={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalSection}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              ...styles.sourceBadge,
              backgroundColor: isManual ? '#EAF2FF' : '#FFF5F5',
              color: isManual ? '#006FFD' : '#DC2626',
            }}>
              {isManual ? 'MANUAL' : 'AUTO'}
            </span>
            {statusInfo && (
              <span style={{
                ...styles.sourceBadge,
                backgroundColor: '#F8F9FA',
                color: statusInfo.color,
              }}>
                {statusInfo.text}
              </span>
            )}
          </div>
        </div>

        {detailLoading && (
          <div style={{ padding: '16px 24px', textAlign: 'center', color: '#8F9098', fontSize: 13 }}>
            상세 정보를 불러오는 중...
          </div>
        )}

        <div style={styles.modalInfoRow}>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>작업 현장</span>
            <span style={styles.modalInfoValue}>
              {(isManual ? manualDetail?.worksession.name : autoDetail?.worksession.name) ?? log.worksession_name}
            </span>
          </div>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>{isManual ? '점검 항목' : '위험 유형'}</span>
            <span style={styles.modalInfoValue}>
              {isManual
                ? (COMPLIANCE_LABEL[manualDetail?.category ?? log.compliance_category ?? ''] ?? manualDetail?.category ?? log.compliance_category ?? '-')
                : (autoDetail?.risk_type.name ?? log.risk_type_name ?? '-')}
            </span>
          </div>
        </div>

        {/* AUTO: 작업자 목록 */}
        {!isManual && autoDetail?.workers && autoDetail.workers.length > 0 && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={styles.modalInfoItem}>
              <span style={styles.modalInfoLabel}>현장 작업자</span>
              <span style={styles.modalInfoValue}>
                {autoDetail.workers.map(w => w.name).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* AUTO: 영상 */}
        {!isManual && autoDetail?.original_video && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={styles.modalInfoItem}>
              <span style={styles.modalInfoLabel}>감지 영상</span>
              <video
                src={autoDetail.original_video}
                controls
                style={{ width: '100%', borderRadius: 8, marginTop: 8, maxHeight: 260, backgroundColor: '#000' }}
              />
            </div>
          </div>
        )}

        {/* MANUAL: 요청 작업자 */}
        {isManual && manualDetail?.employee && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={styles.modalInfoItem}>
              <span style={styles.modalInfoLabel}>요청 작업자</span>
              <span style={styles.modalInfoValue}>{manualDetail.employee.name}</span>
            </div>
          </div>
        )}

        {/* MANUAL: 촬영 이미지 */}
        {isManual && manualDetail?.original_image && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={styles.modalInfoItem}>
              <span style={styles.modalInfoLabel}>촬영 이미지</span>
              <img
                src={manualDetail.original_image}
                alt="점검 이미지"
                style={{ width: '100%', borderRadius: 8, marginTop: 8, maxHeight: 240, objectFit: 'contain', backgroundColor: '#F0F1F3' }}
              />
            </div>
          </div>
        )}

        {/* MANUAL: 수락/거절 */}
        {isManual && currentStatus === 'PENDING' && (
          <div style={styles.modalApprovalRow}>
            <button
              type="button"
              style={styles.rejectBtn}
              disabled={approving}
              onClick={() => onApprove(log.id, false)}>
              거절
            </button>
            <button
              type="button"
              style={styles.approveBtn}
              disabled={approving}
              onClick={() => onApprove(log.id, true)}>
              수락
            </button>
          </div>
        )}

        {isManual && currentStatus && currentStatus !== 'PENDING' && (
          <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              color: statusInfo?.color ?? '#71727A',
            }}>
              이 요청은 {statusInfo?.text ?? '처리'}되었습니다.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function AlertLogScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeSidebar, setActiveSidebar] = useState('알림 로그 확인');
  const isProfileActive = location.pathname === '/profile';

  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [approving, setApproving] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(getReadAlertIds);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await apiFetch('/detect/admin/logs/');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLogs();
    pollingRef.current = setInterval(fetchLogs, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchLogs]);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.source === filter);

  const handleApprove = useCallback(async (logId: number, approval: boolean) => {
    setApproving(true);
    try {
      const res = await apiFetch('/check/approve/', {
        method: 'PATCH',
        body: JSON.stringify({ video_log_id: logId, approval }),
      });
      const json = await res.json();
      if (json.ok) {
        setLogs(prev => prev.map(l =>
          l.id === logId ? { ...l, status: approval ? 'APPROVED' : 'REJECTED' } : l
        ));
        setSelectedLog(prev =>
          prev && prev.id === logId ? { ...prev, status: approval ? 'APPROVED' : 'REJECTED' } : prev
        );
      }
    } catch { /* ignore */ }
    setApproving(false);
  }, []);

  const markAsRead = useCallback((logId: number) => {
    setReadIds(prev => {
      if (prev.has(logId)) return prev;
      const next = new Set(prev);
      next.add(logId);
      persistReadAlertIds(next);
      return next;
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const unreadCount = useUnreadAlertCount();

  return (
    <div style={styles.container}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={managerImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: '50%' }} />
          <span style={styles.logoText}>TTokTTi</span>
        </button>

        <div style={styles.sidebarIcons}>
          <button
            type="button"
            style={{ ...styles.sidebarIconBtn, ...(isProfileActive ? { backgroundColor: '#006FFD', boxShadow: '0 2px 8px rgba(0,111,253,0.3)' } : {}) }}
            onClick={() => navigate('/profile')}>
            👤
          </button>
          <button type="button" style={styles.sidebarIconBtn}>⚙️</button>
          <button type="button" style={{ ...styles.sidebarIconBtn, position: 'relative' as const }}>
            🔔
            {unreadCount > 0 && (
              <div style={styles.notifBadge}>
                <span style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              </div>
            )}
          </button>
        </div>

        <div style={styles.sidebarSearch}>
          <span style={{ fontSize: 14, color: '#8F9098' }}>🔍</span>
          <input style={styles.sidebarSearchInput} type="text" placeholder="Search for..." />
        </div>

        <nav style={styles.sidebarNav}>
          {sidebarItems.map(item => {
            const isActive = activeSidebar === item.label;
            return (
              <button
                key={item.label}
                type="button"
                style={{ ...styles.sidebarNavItem, ...(isActive ? styles.sidebarNavItemActive : {}) }}
                onClick={() => { setActiveSidebar(item.label); navigate(item.path); }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ ...styles.sidebarNavLabel, ...(isActive ? styles.sidebarNavLabelActive : {}) }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Body ── */}
      <div style={styles.body}>
        <main style={styles.main}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.headerTitle}>알림 로그</h1>
              {user && <span style={styles.headerUser}>관리자: {user.userName}</span>}
            </div>
            <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>

          {/* Filter tabs */}
          <div style={styles.filterRow}>
            {(['ALL', 'AUTO', 'MANUAL'] as FilterType[]).map(f => (
              <button
                key={f}
                type="button"
                style={{
                  ...styles.filterBtn,
                  ...(filter === f ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFilter(f)}>
                {f === 'ALL' ? '전체' : f === 'AUTO' ? '자동 감지' : '수동 요청'}
                <span style={{
                  ...styles.filterCount,
                  backgroundColor: filter === f ? '#006FFD' : '#E8E9EB',
                  color: filter === f ? '#FFFFFF' : '#71727A',
                }}>
                  {f === 'ALL' ? logs.length : logs.filter(l => l.source === f).length}
                </span>
              </button>
            ))}
          </div>

          {/* Log table */}
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <span style={{ ...styles.tableHeaderCell, flex: 0.8 }}>시간</span>
              <span style={{ ...styles.tableHeaderCell, flex: 0.5 }}>유형</span>
              <span style={{ ...styles.tableHeaderCell, flex: 1 }}>작업 현장</span>
              <span style={{ ...styles.tableHeaderCell, flex: 1.2 }}>내용</span>
              <span style={{ ...styles.tableHeaderCell, flex: 0.6 }}>상태</span>
              <span style={{ ...styles.tableHeaderCell, flex: 0.5 }}>상세</span>
            </div>
            {filteredLogs.length === 0 ? (
              <div style={styles.emptyRow}>
                <span style={{ fontSize: 20 }}>📭</span>
                <span style={styles.emptyText}>로그가 없습니다.</span>
              </div>
            ) : (
              filteredLogs.map(log => {
                const isManual = log.source === 'MANUAL';
                const statusInfo = log.status ? STATUS_LABEL[log.status] : null;
                return (
                  <div
                    key={log.id}
                    style={{
                      ...styles.tableRow,
                      backgroundColor: (log.is_read || readIds.has(log.id)) ? '#FFFFFF' : (isManual ? '#F8FAFF' : '#FFFBFB'),
                    }}>
                    <span style={{ ...styles.tableCell, flex: 0.8, fontSize: 12, color: '#71727A' }}>
                      {formatDateTime(log.created_at)}
                    </span>
                    <span style={{ ...styles.tableCell, flex: 0.5 }}>
                      <span style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: 10,
                        color: isManual ? '#006FFD' : '#DC2626',
                        backgroundColor: isManual ? '#EAF2FF' : '#FFF5F5',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        {isManual ? 'MANUAL' : 'AUTO'}
                      </span>
                    </span>
                    <span style={{ ...styles.tableCell, flex: 1, fontWeight: 600, color: '#1F2024' }}>
                      {log.worksession_name}
                    </span>
                    <span style={{ ...styles.tableCell, flex: 1.2, color: '#1F2024' }}>
                      {getDescription(log)}
                    </span>
                    <span style={{ ...styles.tableCell, flex: 0.6 }}>
                      {statusInfo ? (
                        <span style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 600,
                          fontSize: 11,
                          color: statusInfo.color,
                        }}>
                          {statusInfo.text}
                        </span>
                      ) : (
                        <span style={{ color: '#8F9098', fontSize: 11 }}>-</span>
                      )}
                    </span>
                    <span style={{ ...styles.tableCell, flex: 0.5 }}>
                      <button
                        type="button"
                        style={styles.viewBtn}
                        onClick={() => { markAsRead(log.id); setSelectedLog(log); }}>
                        보기
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onApprove={handleApprove}
          approving={approving}
        />
      )}
    </div>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: '100vh',
    backgroundColor: '#F8F9FA',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E8E9EB',
    paddingTop: 24,
    paddingLeft: 16,
    paddingRight: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    flexShrink: 0,
  },
  sidebarLogo: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  logoText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#1F2024',
  },
  sidebarIcons: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 4,
  },
  sidebarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#F5F5F5',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 4px',
    boxSizing: 'border-box',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 700,
  },
  sidebarSearch: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    border: '1px solid #E8E9EB',
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 10,
    gap: 8,
    boxSizing: 'border-box',
  },
  sidebarSearchInput: {
    flex: 1,
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#1F2024',
    border: 'none',
    outline: 'none',
    padding: 0,
    backgroundColor: 'transparent',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sidebarNavItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: '10px 8px',
    borderRadius: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  sidebarNavItemActive: { backgroundColor: '#EAF2FF' },
  sidebarNavLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#71727A',
  },
  sidebarNavLabelActive: { color: '#006FFD', fontWeight: 600 },
  logoutBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#71727A',
    padding: '8px 16px',
    borderRadius: 8,
    background: 'none',
    border: '1px solid #E8E9EB',
    cursor: 'pointer',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: '100vh',
  },
  main: {
    flex: 1,
    paddingTop: 24,
    paddingLeft: 32,
    paddingRight: 32,
    paddingBottom: 40,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 28,
    color: '#1F2024',
    margin: 0,
  },
  headerUser: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#71727A',
    marginTop: 4,
    display: 'block',
  },
  filterRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#71727A',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E8E9EB',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  filterBtnActive: {
    color: '#006FFD',
    borderColor: '#006FFD',
    backgroundColor: '#F8FAFF',
  },
  filterCount: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 8,
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    padding: '12px 20px',
    borderBottom: '1px solid #E8E9EB',
    backgroundColor: '#F8F9FA',
  },
  tableHeaderCell: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    color: '#8F9098',
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    padding: '14px 20px',
    borderBottom: '1px solid #F0F1F3',
    alignItems: 'center',
    transition: 'background-color 0.15s ease',
  },
  tableCell: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
  },
  viewBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    color: '#006FFD',
    backgroundColor: 'transparent',
    border: '1.5px solid #006FFD',
    borderRadius: 6,
    padding: '4px 12px',
    cursor: 'pointer',
  },
  emptyRow: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: '48px 0',
  },
  emptyText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#8F9098',
  },

  // Modal
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 480,
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  modalHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #F0F1F3',
  },
  modalTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    display: 'block',
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#71727A',
    display: 'block',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: '#8F9098',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 6,
    flexShrink: 0,
  },
  modalSection: {
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sourceBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 6,
  },
  modalInfoRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    padding: '0 24px 16px',
  },
  modalInfoItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  modalInfoLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#8F9098',
  },
  modalInfoValue: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 15,
    color: '#1F2024',
  },
  modalApprovalRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    padding: '4px 24px 24px',
  },
  approveBtn: {
    flex: 1,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#22A06B',
    border: 'none',
    borderRadius: 10,
    padding: '14px 0',
    cursor: 'pointer',
    textAlign: 'center',
  },
  rejectBtn: {
    flex: 1,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    border: 'none',
    borderRadius: 10,
    padding: '14px 0',
    cursor: 'pointer',
    textAlign: 'center',
  },
};
