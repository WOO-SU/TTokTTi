import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import ladderCharImg from '../assets/ladder-character.png';

// ── Types ──

type WorkSiteCard = {
  id: number;
  siteName: string;
  startTime: string;
  location: string;
  members: { id: number; name: string }[];
  workStatus: '작업 전' | '작업 중' | '작업 끝';
  equipmentCheck: { memberId: number; name: string; complied: boolean }[];
  riskAssessmentDone: boolean;
  reportDone: boolean;
  reportId?: number;
};

type VideoAlert = {
  id: number;
  employee: number;
  is_risky: boolean;
  original_video: string | null;
  camera_type: 'BODY' | 'FULL';
  created_at: string;
};

// ── Mock Data ──

const workSiteCards: WorkSiteCard[] = [
  {
    id: 1,
    siteName: '봉천동 작업공간',
    startTime: '08:30',
    location: '봉천동',
    members: [{ id: 1, name: '송영민' }, { id: 2, name: '임정원' }],
    workStatus: '작업 전',
    equipmentCheck: [
      { memberId: 1, name: '송영민', complied: true },
      { memberId: 2, name: '임정원', complied: false },
    ],
    riskAssessmentDone: true,
    reportDone: false,
  },
  {
    id: 2,
    siteName: '신대방동 작업공간',
    startTime: '08:30',
    location: '신대방동',
    members: [{ id: 3, name: '김태호' }, { id: 4, name: '박지수' }],
    workStatus: '작업 중',
    equipmentCheck: [
      { memberId: 3, name: '김태호', complied: true },
      { memberId: 4, name: '박지수', complied: true },
    ],
    riskAssessmentDone: false,
    reportDone: false,
  },
  {
    id: 3,
    siteName: '신림동 작업공간',
    startTime: '08:50',
    location: '신림동',
    members: [{ id: 5, name: '이준혁' }, { id: 6, name: '최서연' }],
    workStatus: '작업 중',
    equipmentCheck: [
      { memberId: 5, name: '이준혁', complied: false },
      { memberId: 6, name: '최서연', complied: false },
    ],
    riskAssessmentDone: false,
    reportDone: false,
  },
  {
    id: 4,
    siteName: '보라매동 작업공간',
    startTime: '09:10',
    location: '보라매동',
    members: [{ id: 7, name: '우수연' }, { id: 8, name: '원인영' }],
    workStatus: '작업 끝',
    equipmentCheck: [
      { memberId: 7, name: '우수연', complied: true },
      { memberId: 8, name: '원인영', complied: true },
    ],
    riskAssessmentDone: true,
    reportDone: true,
    reportId: 1,
  },
];

const employeeNameMap: Record<number, string> = {};
workSiteCards.forEach(site => {
  site.members.forEach(m => { employeeNameMap[m.id] = m.name; });
});

function getSiteForEmployee(empId: number): string | null {
  for (const site of workSiteCards) {
    if (site.members.some(m => m.id === empId)) return site.siteName;
  }
  return null;
}

function getRiskType(alert: VideoAlert): string {
  return alert.camera_type === 'BODY' ? '개인 안전 위험' : '작업 구역 위험';
}

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
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
  '작업 전': { bg: '#F0F1F3', text: '#71727A' },
  '작업 중': { bg: '#E7F4E8', text: '#298A3E' },
  '작업 끝': { bg: '#EAF2FF', text: '#006FFD' },
};

function formatAlertTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ── Alert Detail Modal ──

function AlertDetailModal({
  alert,
  onClose,
  onMarkRead,
}: {
  alert: VideoAlert;
  onClose: () => void;
  onMarkRead: (id: number) => void;
}) {
  const empName = employeeNameMap[alert.employee] ?? `직원 #${alert.employee}`;
  const siteName = getSiteForEmployee(alert.employee) ?? '알 수 없는 현장';
  const riskType = getRiskType(alert);

  useEffect(() => {
    onMarkRead(alert.id);
  }, [alert.id, onMarkRead]);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <span style={styles.modalTitle}>⚠ 위험 알림 상세</span>
            <span style={styles.modalSub}>{formatAlertTime(alert.created_at)} · {siteName}</span>
          </div>
          <button type="button" style={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Video */}
        <div style={styles.modalSection}>
          <span style={styles.modalSectionLabel}>위험 발생 영상</span>
          {alert.original_video ? (
            <video
              src={alert.original_video}
              controls
              style={styles.modalVideo}
            />
          ) : (
            <div style={styles.modalVideoPlaceholder}>
              <span style={{ fontSize: 32 }}>🎥</span>
              <span style={styles.modalVideoPlaceholderText}>영상 없음</span>
            </div>
          )}
        </div>

        {/* Risk type + status */}
        <div style={styles.modalInfoRow}>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>위험 유형</span>
            <span style={styles.modalInfoValue}>{riskType}</span>
          </div>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>조치 여부</span>
            <span style={{ ...styles.modalInfoValue, color: '#E37D00' }}>미조치</span>
          </div>
        </div>

        {/* Contact button */}
        <button
          type="button"
          style={styles.contactBtn}
          onClick={() => alert && window.open(`tel:010-0000-0000`)}>
          📞 작업자에게 연락 ({empName})
        </button>
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
}: {
  card: WorkSiteCard;
  isHovered: boolean;
  onHoverChange: (hov: boolean) => void;
  onMemberClick: (id: number, siteName: string) => void;
  onCardClick: (card: WorkSiteCard) => void;
  onReportClick: (card: WorkSiteCard, e: React.MouseEvent) => void;
}) {
  const sc = workStatusColors[card.workStatus] ?? workStatusColors['작업 전'];

  return (
    <div
      style={{
        ...styles.siteCard,
        boxShadow: isHovered
          ? '0 8px 24px rgba(0,0,0,0.14)'
          : '0 2px 10px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}>

      {/* Image area */}
      <div style={styles.cardImageArea}>
        <img src={ladderCharImg} alt="character" style={styles.cardCharImage} />
      </div>

      {/* Always-visible info */}
      <div style={styles.cardInfoArea}>
        <div style={styles.cardInfoTop}>
          <span style={styles.cardSiteName}>{card.siteName}</span>
          <span style={{ ...styles.workStatusBadge, backgroundColor: sc.bg, color: sc.text }}>
            {card.workStatus}
          </span>
        </div>
        <div style={styles.cardMeta}>
          <span style={{ fontSize: 13 }}>⏰</span>
          <span style={styles.cardMetaText}>작업 시작 {card.startTime}</span>
        </div>
        <div style={styles.cardMembers}>
          {card.members.map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <span style={styles.memberSep}>, </span>}
              <button
                type="button"
                style={styles.memberBtn}
                onClick={e => { e.stopPropagation(); onMemberClick(m.id, card.siteName); }}>
                {m.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        <button
          type="button"
          style={styles.detailBtn}
          onClick={e => { e.stopPropagation(); onCardClick(card); }}>
          상세 보기
        </button>
      </div>

      {/* Expandable section — grows card vertically on hover */}
      <div style={{
        maxHeight: isHovered ? 300 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={styles.expandSection}>
          <div style={styles.expandDivider} />

          {/* Equipment check */}
          <div style={styles.expandRow}>
            <span style={styles.expandLabel}>🦺 장비 점검</span>
            <div style={styles.expandEquipRow}>
              {card.equipmentCheck.map(ec => (
                <span key={ec.memberId} style={styles.expandEquipItem}>
                  {ec.name}:&nbsp;
                  <span style={{ color: ec.complied ? '#22A06B' : '#D32F2F', fontWeight: 700 }}>
                    {ec.complied ? 'O' : 'X'}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Risk assessment */}
          <div style={styles.expandRow}>
            <span style={styles.expandLabel}>⚠️ 위험성 평가</span>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              color: card.riskAssessmentDone ? '#22A06B' : '#8F9098',
            }}>
              {card.riskAssessmentDone ? '완료' : '미완료'}
            </span>
          </div>

          {/* Report */}
          <div style={styles.expandRow}>
            <span style={styles.expandLabel}>📝 보고서</span>
            <button
              type="button"
              style={{
                ...styles.expandReportBtn,
                color: card.reportDone ? '#006FFD' : '#8F9098',
                borderColor: card.reportDone ? '#006FFD' : '#C5C6CC',
              }}
              onClick={e => { e.stopPropagation(); onReportClick(card, e); }}>
              {card.reportDone ? '완료 · 보기' : '미완료 · 작성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alert Row Component ──

function AlertRowComponent({
  alert,
  isRead,
  onClick,
}: {
  alert: VideoAlert;
  isRead: boolean;
  onClick: () => void;
}) {
  const empName = employeeNameMap[alert.employee] ?? `직원 #${alert.employee}`;
  const siteName = getSiteForEmployee(alert.employee) ?? '알 수 없음';
  const riskType = getRiskType(alert);

  return (
    <button
      type="button"
      style={{
        ...styles.alertCard,
        backgroundColor: isRead ? '#FFFFFF' : '#FFF5F5',
        borderLeft: `3px solid ${isRead ? '#E8E9EB' : '#DC2626'}`,
      }}
      onClick={onClick}>
      <div style={styles.alertTopRow}>
        <span style={styles.alertTime}>{formatAlertTime(alert.created_at)}</span>
        {!isRead && <span style={styles.alertUnreadDot} />}
      </div>
      <span style={styles.alertSite}>{siteName}</span>
      <span style={styles.alertType}>{riskType}</span>
      <span style={styles.alertEmployee}>{empName}</span>
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
  const [selectedAlert, setSelectedAlert] = useState<VideoAlert | null>(null);

  const [alerts, setAlerts] = useState<VideoAlert[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(getReadAlertIds);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch('/detect/search/?is_risky=true');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          // Sort by created_at descending (newest first)
          const sorted = [...(json.data as VideoAlert[])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          setAlerts(sorted);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAlerts();
    pollingRef.current = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchAlerts]);

  const unreadCount = alerts.filter(a => !readIds.has(a.id)).length;

  const markAsRead = useCallback((alertId: number) => {
    setReadIds(prev => {
      if (prev.has(alertId)) return prev;
      const next = new Set(prev);
      next.add(alertId);
      persistReadAlertIds(next);
      return next;
    });
  }, []);

  const handleAlertClick = (alert: VideoAlert) => {
    setSelectedAlert(alert);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCardClick = (card: WorkSiteCard) => {
    navigate(`/worksession/${card.id}`, { state: { card } });
  };

  const handleReportClick = (card: WorkSiteCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.reportDone && card.reportId) {
      navigate(`/report/${card.reportId}`);
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
            <span style={styles.sectionBadge}>{workSiteCards.length}</span>
          </div>

          <div style={styles.siteGrid}>
            {workSiteCards.map(card => (
              <WorkSiteCardComponent
                key={card.id}
                card={card}
                isHovered={hoveredCardId === card.id}
                onHoverChange={hov => setHoveredCardId(hov ? card.id : null)}
                onMemberClick={(id, siteName) => navigate(`/employee/${id}`, { state: { siteName } })}
                onCardClick={handleCardClick}
                onReportClick={handleReportClick}
              />
            ))}
          </div>
        </main>

        {/* ── Alert Panel ── */}
        <aside style={styles.alertPanel}>
          <div style={styles.alertPanelHeader}>
            <span style={styles.alertPanelTitle}>⚠ 위험 알림</span>
            {unreadCount > 0 && (
              <span style={styles.alertBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          <div style={styles.alertList}>
            {alerts.length === 0 ? (
              <div style={styles.alertEmpty}>
                <span style={{ fontSize: 28 }}>✅</span>
                <span style={styles.alertEmptyText}>알림 없음</span>
              </div>
            ) : (
              alerts.map(alert => (
                <AlertRowComponent
                  key={alert.id}
                  alert={alert}
                  isRead={readIds.has(alert.id)}
                  onClick={() => handleAlertClick(alert)}
                />
              ))
            )}
          </div>
        </aside>
      </div>

      {/* ── Alert Detail Modal ── */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onMarkRead={markAsRead}
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
  alertEmployee: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#71727A',
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
  modalVideo: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#000',
    maxHeight: 260,
    objectFit: 'contain',
  },
  modalVideoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F1F3',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalVideoPlaceholderText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#8F9098',
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
