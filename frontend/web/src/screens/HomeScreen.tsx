import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';
import logoImg from '../assets/logo.png';
import ladderCharImg from '../assets/ladder-character.png';

// ── Types ──

type WorkerStatus = {
  employee_id: number;
  name: string;
  equipment_check: boolean;
};

type WorkSessionCard = {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string | null;
  status: 'READY' | 'IN_PROGRESS' | 'DONE';
  workers_detail: WorkerStatus[];
  risk_assessment: string;
  report: boolean;
};

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

// ── Utils ──

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

const workStatusColors: Record<string, { bg: string; text: string }> = {
  'READY': { bg: '#F0F1F3', text: '#71727A' },
  'IN_PROGRESS': { bg: '#E7F4E8', text: '#298A3E' },
  'DONE': { bg: '#EAF2FF', text: '#006FFD' },
};

const statusTextMap: Record<string, string> = {
  'READY': '작업 전',
  'IN_PROGRESS': '작업 중',
  'DONE': '작업 끝',
};

function formatAlertTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatSessionTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getAlertDescription(log: AdminLog): string {
  if (log.source === 'MANUAL') {
    const cat = log.compliance_category ? COMPLIANCE_LABEL[log.compliance_category] ?? log.compliance_category : '장비';
    return `수동 점검 요청 · ${cat}`;
  }
  return log.risk_type_name ?? '위험 감지';
}

// ── Alert Detail Modal ──

function AlertDetailModal({
  log,
  onClose,
  onMarkRead,
  onApprove,
  approving,
}: {
  log: AdminLog;
  onClose: () => void;
  onMarkRead: (id: number) => void;
  onApprove: (logId: number, approval: boolean) => void;
  approving: boolean;
}) {
  useEffect(() => {
    onMarkRead(log.id);
  }, [log.id, onMarkRead]);

  const isManual = log.source === 'MANUAL';
  const statusInfo = log.status ? STATUS_LABEL[log.status] : null;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <span style={{
              ...styles.modalTitle,
              color: isManual ? '#006FFD' : '#DC2626',
            }}>
              {isManual ? '📋 수동 점검 요청' : '⚠ 위험 알림 상세'}
            </span>
            <span style={styles.modalSub}>
              {formatAlertTime(log.created_at)} · {log.worksession_name}
            </span>
          </div>
          <button type="button" style={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Source badge */}
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

        {/* Info rows */}
        <div style={styles.modalInfoRow}>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>작업 현장</span>
            <span style={styles.modalInfoValue}>{log.worksession_name}</span>
          </div>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>
              {isManual ? '점검 항목' : '위험 유형'}
            </span>
            <span style={styles.modalInfoValue}>
              {isManual
                ? (log.compliance_category ? COMPLIANCE_LABEL[log.compliance_category] ?? log.compliance_category : '-')
                : (log.risk_type_name ?? '-')}
            </span>
          </div>
        </div>

        {/* MANUAL — accept / reject buttons */}
        {isManual && log.status === 'PENDING' && (
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

        {/* MANUAL — already handled */}
        {isManual && log.status && log.status !== 'PENDING' && (
          <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              color: statusInfo?.color ?? '#71727A',
            }}>
              이 요청은 이미 {statusInfo?.text ?? '처리'}되었습니다.
            </span>
          </div>
        )}

        {/* AUTO — contact placeholder */}
        {!isManual && (
          <button
            type="button"
            style={styles.contactBtn}
            onClick={() => window.open(`tel:010-0000-0000`)}>
            📞 작업자에게 연락
          </button>
        )}
      </div>
    </div>
  );
}

// ── Work Site Card Component ──

function WorkSiteCardComponent({
  card,
  isHovered,
  onHoverChange,
  onMemberClick,
  onCardClick,
  onReportClick,
  onActivateClick,
}: {
  card: WorkSessionCard;
  isHovered: boolean;
  onHoverChange: (hov: boolean) => void;
  onMemberClick: (id: number, siteName: string) => void;
  onCardClick: (card: WorkSessionCard) => void;
  onReportClick: (card: WorkSessionCard, e: React.MouseEvent<HTMLButtonElement>) => void;
  onActivateClick: (card: WorkSessionCard, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const sc = workStatusColors[card.status] ?? workStatusColors.READY;
  const statusText = statusTextMap[card.status] ?? '작업 전';

  const workers = Array.isArray(card.workers_detail) ? card.workers_detail : [];
  const riskAssessmentDone = String(card.risk_assessment ?? '').toUpperCase() !== 'PENDING';

  return (
    <div
      style={{
        ...styles.siteCard,
        boxShadow: isHovered
          ? '0 8px 24px rgba(0,0,0,0.14)'
          : '0 2px 10px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={() => onCardClick(card)} // 카드 바깥 클릭 시 상세 보기(원하면 제거 가능)
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onCardClick(card);
      }}
    >
      {/* Image area */}
      <div style={styles.cardImageArea}>
        <img src={ladderCharImg} alt="character" style={styles.cardCharImage} />
      </div>

      {/* Always-visible info */}
      <div style={styles.cardInfoArea}>
        <div style={styles.cardInfoTop}>
          <span style={styles.cardSiteName}>{card.name}</span>
          <span style={{ ...styles.workStatusBadge, backgroundColor: sc.bg, color: sc.text }}>
            {statusText}
          </span>
        </div>

        <div style={styles.cardMeta}>
          <span style={{ fontSize: 13 }}>⏰</span>
          <span style={styles.cardMetaText}>작업 시작 {formatSessionTime(card.starts_at)}</span>
        </div>

        <div style={styles.cardMembers}>
          {workers.length > 0 ? (
            workers.map((m, i) => (
              <React.Fragment key={`${m.employee_id}-${i}`}>
                {i > 0 && <span style={styles.memberSep}>, </span>}
                <button
                  type="button"
                  style={styles.memberBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMemberClick(m.employee_id, card.name);
                  }}
                >
                  {m.name}
                </button>
              </React.Fragment>
            ))
          ) : (
            <span style={{ ...styles.cardMetaText, opacity: 0.7 }}>작업자 미지정</span>
          )}
        </div>

        <button
          type="button"
          style={styles.detailBtn}
          onClick={(e) => {
            e.stopPropagation();
            onCardClick(card);
          }}
        >
          상세 보기
        </button>

        {card.status === 'READY' && (
          <button
            type="button"
            style={styles.activateBtn}
            onClick={(e) => {
              e.stopPropagation();
              onActivateClick(card, e);
            }}
          >
            작업 시작
          </button>
        )}
      </div>

      {/* Expandable section — grows card vertically on hover */}
      <div
        style={{
          maxHeight: isHovered ? 300 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={styles.expandSection}>
          <div style={styles.expandDivider} />

          {/* Equipment check */}
          <div style={styles.expandRow}>
            <span style={styles.expandLabel}>🦺 장비 점검</span>
            <div style={styles.expandEquipRow}>
              {workers.map((ec, i) => (
                <span key={`${ec.employee_id}-equip-${i}`} style={styles.expandEquipItem}>
                  {ec.name}:&nbsp;
                  <span style={{ color: ec.equipment_check ? '#22A06B' : '#D32F2F', fontWeight: 700 }}>
                    {ec.equipment_check ? 'O' : 'X'}
                  </span>
                </span>
              ))}
              {workers.length === 0 && (
                <span style={{ ...styles.cardMetaText, opacity: 0.7 }}>작업자 미지정</span>
              )}
            </div>
          </div>

          {/* Risk assessment */}
          <div style={styles.expandRow}>
            <span style={styles.expandLabel}>⚠️ 위험성 평가</span>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 12,
                color: riskAssessmentDone ? '#22A06B' : '#8F9098',
              }}
            >
              {riskAssessmentDone ? '완료' : '미완료'}
            </span>
          </div>

          {/* Report */}
          <div style={styles.expandRow}>
            <span style={styles.expandLabel}>📝 보고서</span>
            <button
              type="button"
              style={{
                ...styles.expandReportBtn,
                color: card.report ? '#006FFD' : '#8F9098',
                borderColor: card.report ? '#006FFD' : '#C5C6CC',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onReportClick(card, e);
              }}
            >
              {card.report ? '완료 · 보기' : '미완료 · 작성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alert Row Component ──

function AlertRowComponent({
  log,
  isRead,
  onClick,
}: {
  log: AdminLog;
  isRead: boolean;
  onClick: () => void;
}) {
  const isManual = log.source === 'MANUAL';
  const description = getAlertDescription(log);
  const statusInfo = log.status ? STATUS_LABEL[log.status] : null;

  return (
    <button
      type="button"
      style={{
        ...styles.alertCard,
        backgroundColor: isRead ? '#FFFFFF' : (isManual ? '#F0F4FF' : '#FFF5F5'),
        borderLeft: `3px solid ${isRead ? '#E8E9EB' : (isManual ? '#006FFD' : '#DC2626')}`,
      }}
      onClick={onClick}>
      <div style={styles.alertTopRow}>
        <span style={styles.alertTime}>{formatAlertTime(log.created_at)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 9,
            color: isManual ? '#006FFD' : '#DC2626',
            backgroundColor: isManual ? '#EAF2FF' : '#FFF5F5',
            padding: '1px 5px',
            borderRadius: 4,
          }}>
            {isManual ? 'MANUAL' : 'AUTO'}
          </span>
          {!isRead && <span style={styles.alertUnreadDot} />}
        </div>
      </div>
      <span style={styles.alertSite}>{log.worksession_name}</span>
      <span style={{ ...styles.alertType, color: isManual ? '#006FFD' : '#DC2626' }}>
        {description}
      </span>
      {isManual && statusInfo && (
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: 10,
          color: statusInfo.color,
        }}>
          {statusInfo.text}
        </span>
      )}
      {isManual && log.status === 'PENDING' && (
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: 10,
          color: '#006FFD',
          marginTop: 2,
        }}>
          요청 확인하기 →
        </span>
      )}
    </button>
  );
}

// ── Main Component ──

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeSidebar, setActiveSidebar] = useState('Home');
  const isProfileActive = location.pathname === '/profile';
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [approving, setApproving] = useState(false);

  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSessionCard[]>([]);
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

  const fetchWorkSessions = useCallback(async () => {
    try {
      const res = await apiFetch('/worksession/admin/today/');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setWorkSessions(json);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchWorkSessions();
    pollingRef.current = setInterval(() => {
      fetchLogs();
      fetchWorkSessions();
    }, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchLogs, fetchWorkSessions]);

  const unreadCount = useUnreadAlertCount();

  const markAsRead = useCallback((logId: number) => {
    setReadIds(prev => {
      if (prev.has(logId)) return prev;
      const next = new Set(prev);
      next.add(logId);
      persistReadAlertIds(next);
      return next;
    });
  }, []);

  const handleApprove = useCallback(async (logId: number, approval: boolean) => {
    setApproving(true);
    try {
      const res = await apiFetch('/check/approve/', {
        method: 'PATCH',
        body: JSON.stringify({ video_log_id: logId, approval }),
      });
      const json = await res.json();
      if (json.ok) {
        // Update local state
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCardClick = (card: WorkSessionCard) => {
    navigate(`/worksession/${card.id}`, { state: { card } });
  };

  const handleActivateClick = async (card: WorkSessionCard, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch('/worksession/activate/', {
        method: 'PATCH',
        body: JSON.stringify({ worksession_id: card.id }),
      });
      const json = await res.json();
      if (json.ok) {
        fetchWorkSessions();
      }
    } catch { /* ignore */ }
  };

  const handleReportClick = (card: WorkSessionCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.report) {
      navigate(`/report/${card.id}`);
    } else {
      navigate('/report');
    }
  };

  return (
    <div style={styles.container}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={logoImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'contain' }} />
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
          {/* Bell with unread badge */}
          <button type="button" style={{ ...styles.sidebarIconBtn, position: 'relative' }}>
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
        {/* ── Main ── */}
        <main style={styles.main}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.headerTitle}>Home</h1>
              {user && <span style={styles.headerUser}>관리자: {user.userName}</span>}
            </div>
            <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>

          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>오늘의 작업 현장</span>
            <span style={styles.sectionBadge}>{workSessions.length}</span>
          </div>

          <div style={styles.siteGrid}>
            {workSessions.map(card => (
              <WorkSiteCardComponent
                key={card.id}
                card={card}
                isHovered={hoveredCardId === card.id}
                onHoverChange={hov => setHoveredCardId(hov ? card.id : null)}
                onMemberClick={(id, siteName) => navigate(`/employee/${id}`, { state: { siteName } })}
                onCardClick={handleCardClick}
                onReportClick={handleReportClick}
                onActivateClick={handleActivateClick}
              />
            ))}
          </div>
        </main>

        {/* ── Alert Panel ── */}
        <aside style={styles.alertPanel}>
          <div style={styles.alertPanelHeader}>
            <span style={styles.alertPanelTitle}>⚠ 알림 로그</span>
            {unreadCount > 0 && (
              <span style={styles.alertBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          <div style={styles.alertList}>
            {logs.length === 0 ? (
              <div style={styles.alertEmpty}>
                <span style={{ fontSize: 28 }}>✅</span>
                <span style={styles.alertEmptyText}>알림 없음</span>
              </div>
            ) : (
              logs.map(log => (
                <AlertRowComponent
                  key={log.id}
                  log={log}
                  isRead={log.is_read || readIds.has(log.id)}
                  onClick={() => setSelectedLog(log)}
                />
              ))
            )}
          </div>
        </aside>
      </div>

      {/* ── Alert Detail Modal ── */}
      {selectedLog && (
        <AlertDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onMarkRead={markAsRead}
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

  // Sidebar
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

  // Body
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: '100vh',
  },

  // Main
  main: {
    flex: 1,
    paddingTop: 24,
    paddingLeft: 32,
    paddingRight: 24,
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
  sectionHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#1F2024',
  },
  sectionBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 12,
    color: '#FFFFFF',
    backgroundColor: '#006FFD',
    borderRadius: 12,
    padding: '2px 10px',
  },

  // Site grid
  siteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 20,
    alignItems: 'start',
  },

  // Work site card
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid #EBEBEB',
    cursor: 'default',
    transition: 'box-shadow 0.2s ease',
  },
  cardImageArea: {
    backgroundColor: '#EEF7E8',
    height: 180,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  cardCharImage: {
    width: 170,
    height: 170,
    objectFit: 'contain',
  },
  cardInfoArea: {
    padding: '14px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardInfoTop: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSiteName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#1F2024',
  },
  workStatusBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    flexShrink: 0,
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardMetaText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#71727A',
  },
  cardMembers: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  memberBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '1px 3px',
    borderRadius: 4,
  },
  memberSep: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#8F9098',
  },
  detailBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #006FFD',
    borderRadius: 8,
    padding: '7px 0',
    cursor: 'pointer',
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
  },
  activateBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#FFFFFF',
    backgroundColor: '#298A3E',
    border: 'none',
    borderRadius: 8,
    padding: '7px 0',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
  },

  // Expandable section (hover reveals)
  expandSection: {
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  expandDivider: {
    height: 1,
    backgroundColor: '#F0F1F3',
    marginBottom: 4,
  },
  expandRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expandLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#1F2024',
    flexShrink: 0,
  },
  expandEquipRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
  },
  expandEquipItem: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#1F2024',
  },
  expandReportBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 6,
    border: '1.5px solid',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },

  // Alert panel
  alertPanel: {
    width: 220,
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderLeft: '1px solid #F0F1F3',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  alertPanelHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 16px 12px',
    borderBottom: '1px solid #F0F1F3',
    flexShrink: 0,
  },
  alertPanelTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#DC2626',
  },
  alertBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    padding: '2px 7px',
    minWidth: 16,
    textAlign: 'center',
  },
  alertList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },

  // Alert card
  alertCard: {
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    cursor: 'pointer',
    border: 'none',
    borderLeft: '3px solid',
    borderBottom: '1px solid #F0F1F3',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
  },
  alertTopRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  alertTime: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 10,
    color: '#8F9098',
  },
  alertUnreadDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#DC2626',
    flexShrink: 0,
  },
  alertSite: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 12,
    color: '#1F2024',
  },
  alertType: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#DC2626',
  },
  alertEmpty: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: '40px 0',
  },
  alertEmptyText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
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
    color: '#DC2626',
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
  modalSectionLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#1F2024',
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
  sourceBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 6,
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
  contactBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#006FFD',
    border: 'none',
    borderRadius: 10,
    padding: '14px 0',
    cursor: 'pointer',
    margin: '4px 24px 24px',
    textAlign: 'center',
  },
};
