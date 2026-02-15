import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';

// ── Types ──

type TaskCard = {
  title: string;
  subtitle?: string;
  name?: string;
  category?: string;
  time?: string;
  memberCount: number;
};

type WorkSiteCard = {
  siteName: string;
  startTime: string;
  members: { id: number; name: string }[];
  status: '작업중' | '이동중' | '대기중';
};

type VideoAlert = {
  id: number;
  employee: number;
  is_risky: boolean;
  original_video: string | null;
  camera_type: 'BODY' | 'FULL';
  created_at: string;
};

// ── Data ──

const workSiteCards: WorkSiteCard[] = [
  {
    siteName: '봉천동 작업현장1',
    startTime: '08:30',
    members: [{ id: 2, name: '송영민' }, { id: 3, name: '임정원' }],
    status: '작업중',
  },
  {
    siteName: '신림동 작업현장2',
    startTime: '09:00',
    members: [{ id: 4, name: '김태호' }, { id: 5, name: '박지수' }],
    status: '작업중',
  },
  {
    siteName: '관악구 작업현장3',
    startTime: '09:15',
    members: [{ id: 6, name: '이준혁' }, { id: 7, name: '최서연' }],
    status: '이동중',
  },
];

// Map employee IDs to names for display
const employeeNameMap: Record<number, string> = {};
workSiteCards.forEach(site => {
  site.members.forEach(m => { employeeNameMap[m.id] = m.name; });
});

// Find the site name for a given employee ID
function getSiteForEmployee(empId: number): string | null {
  for (const site of workSiteCards) {
    if (site.members.some(m => m.id === empId)) return site.siteName;
  }
  return null;
}

const noticeCards: TaskCard[] = [
  { category: 'Category', title: '이번 달 외부 감사 일정', memberCount: 4 },
  { category: 'Category', title: '장비 교체 일정', memberCount: 3 },
  { category: 'Category', title: '이번 달 휴가자', memberCount: 4 },
  { category: 'Category', title: '경조사', memberCount: 4 },
];

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
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

// ── Sub Components ──

function MemberAvatars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: '#E8E9EB',
            border: '1.5px solid #FFFFFF',
            marginLeft: i > 0 ? -6 : 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 8,
            color: '#8F9098',
            boxSizing: 'border-box',
          }}>
          8
        </div>
      ))}
    </div>
  );
}

function CardActions() {
  return (
    <div style={styles.cardActions}>
      <span style={styles.actionIcon}>+</span>
      <span style={styles.actionIcon}>&#x1F4C5;</span>
      <span style={styles.actionIcon}>&#x2606;</span>
      <span style={styles.actionIcon}>&#x2691;</span>
      <div style={{ flex: 1 }} />
      <span style={styles.moreIcon}>•••</span>
    </div>
  );
}

function TaskCardComponent({ card }: { card: TaskCard }) {
  return (
    <div style={styles.taskCard}>
      {card.category && <span style={styles.cardCategory}>{card.category}</span>}
      {!card.category && (
        <>
          <span style={styles.cardTitle}>{card.title}</span>
          {card.subtitle && <span style={styles.cardSubtitle}>{card.subtitle}</span>}
          {card.name && <span style={styles.cardName}>{card.name}</span>}
        </>
      )}
      {card.category && (
        <span style={styles.cardTitle}>{card.title}</span>
      )}
      <MemberAvatars count={card.memberCount} />
      <CardActions />
    </div>
  );
}

const workStatusColors: Record<string, { bg: string; text: string }> = {
  '작업중': { bg: '#E7F4E8', text: '#298A3E' },
  '이동중': { bg: '#FFF4E5', text: '#E8900C' },
  '대기중': { bg: '#F0F1F3', text: '#71727A' },
};

function WorkSiteCardComponent({
  card,
  onMemberClick,
}: {
  card: WorkSiteCard;
  onMemberClick: (id: number) => void;
}) {
  const sc = workStatusColors[card.status] ?? workStatusColors['작업중'];
  return (
    <div style={styles.workCard}>
      <div style={styles.workCardHeader}>
        <span style={styles.workCardSite}>{card.siteName}</span>
        <span style={{ ...styles.workCardStatus, backgroundColor: sc.bg, color: sc.text }}>
          {card.status}
        </span>
      </div>
      <div style={styles.workCardMeta}>
        <span style={styles.workCardMetaIcon}>&#x1F552;</span>
        <span style={styles.workCardMetaText}>작업 시작 {card.startTime}</span>
      </div>
      <div style={styles.workCardDivider} />
      <div style={styles.workCardMembersLabel}>
        <span style={styles.workCardMetaIcon}>&#x1F465;</span>
        <span style={styles.workCardMetaText}>작업 인원</span>
      </div>
      <div style={styles.workCardMembers}>
        {card.members.map((m, i) => (
          <React.Fragment key={m.id}>
            {i > 0 && <span style={styles.workCardMemberSep}>,</span>}
            <button
              type="button"
              style={styles.workCardMemberBtn}
              onClick={() => onMemberClick(m.id)}>
              {m.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function formatAlertTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function AlertCardComponent({
  alert,
  isRead,
  onClick,
}: {
  alert: VideoAlert;
  isRead: boolean;
  onClick: () => void;
}) {
  const empName = employeeNameMap[alert.employee] ?? `직원 #${alert.employee}`;
  const camLabel = alert.camera_type === 'BODY' ? 'Body Cam' : 'Full Cam';

  return (
    <button
      type="button"
      style={{
        ...styles.alertCard,
        backgroundColor: isRead ? '#FFFFFF' : '#FFF0F0',
        borderLeft: isRead ? '3px solid transparent' : '3px solid #D32F2F',
      }}
      onClick={onClick}>
      <div style={styles.alertTopRow}>
        <span style={styles.alertTime}>{formatAlertTime(alert.created_at)}</span>
        <span style={styles.alertCamBadge}>{camLabel}</span>
      </div>
      <span style={styles.alertTitle}>위험 감지!</span>
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

  // Alert state
  const [alerts, setAlerts] = useState<VideoAlert[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(getReadAlertIds);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch('/detect/search/?is_risky=true');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setAlerts(json.data as VideoAlert[]);
        }
      }
    } catch {
      // ignore network errors on polling
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    pollingRef.current = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchAlerts]);

  const unreadCount = alerts.filter(a => !readIds.has(a.id)).length;

  const markAsRead = (alertId: number) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(alertId);
      persistReadAlertIds(next);
      return next;
    });
  };

  const handleAlertClick = (alert: VideoAlert) => {
    markAsRead(alert.id);
    const siteName = getSiteForEmployee(alert.employee);
    navigate(`/employee/${alert.employee}`, { state: { siteName } });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
          <button type="button" style={{ ...styles.sidebarIconBtn, ...(isProfileActive ? { backgroundColor: '#006FFD', boxShadow: '0 2px 8px rgba(0,111,253,0.3)' } : {}) }} onClick={() => navigate('/profile')}>👤</button>
          <button type="button" style={styles.sidebarIconBtn}>⚙️</button>
          <button type="button" style={{ ...styles.sidebarIconBtn, position: 'relative' }}>
            🔔
            {unreadCount > 0 && (
              <div style={styles.notifBadge}>
                <span style={styles.notifBadgeText}>{unreadCount > 99 ? '99' : unreadCount}</span>
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
                style={{
                  ...styles.sidebarNavItem,
                  ...(isActive ? styles.sidebarNavItemActive : {}),
                }}
                onClick={() => { setActiveSidebar(item.label); navigate(item.path); }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span
                  style={{
                    ...styles.sidebarNavLabel,
                    ...(isActive ? styles.sidebarNavLabelActive : {}),
                  }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Home</h1>
            {user && (
              <span style={styles.headerUser}>
                관리자: {user.userName}
              </span>
            )}
          </div>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div style={styles.board}>
          {/* Column: 현재 작업중 */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <span style={styles.columnTitle}>현재 작업중</span>
              <span style={styles.columnBadge}>{workSiteCards.length}</span>
            </div>
            <div style={styles.columnContent}>
              {workSiteCards.map((card, idx) => (
                <WorkSiteCardComponent
                  key={idx}
                  card={card}
                  onMemberClick={(id) => navigate(`/employee/${id}`, { state: { siteName: card.siteName } })}
                />
              ))}
            </div>
          </div>

          {/* Column: 공지사항 */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <span style={styles.columnTitle}>공지사항</span>
              <span style={styles.columnMore}>•••</span>
            </div>
            <div style={styles.columnContent}>
              {noticeCards.map((card, idx) => (
                <TaskCardComponent key={idx} card={card} />
              ))}
            </div>
          </div>

          {/* Column: 위험 알림 */}
          <div style={styles.alertColumn}>
            <div style={styles.columnHeader}>
              <div style={styles.alertHeaderLeft}>
                <span style={styles.alertColumnTitle}>위험 알림</span>
                {unreadCount > 0 && (
                  <span style={styles.alertBadge}>{unreadCount}</span>
                )}
              </div>
            </div>
            <div style={styles.columnContent}>
              {alerts.length === 0 ? (
                <div style={styles.alertEmpty}>
                  <span style={styles.alertEmptyText}>알림이 없습니다</span>
                </div>
              ) : (
                alerts.map(alert => (
                  <AlertCardComponent
                    key={alert.id}
                    alert={alert}
                    isRead={readIds.has(alert.id)}
                    onClick={() => handleAlertClick(alert)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
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
    paddingRight: 4,
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
    paddingRight: 4,
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
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#ED3241',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 700,
  },
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
    fontWeight: 400,
    fontSize: 13,
    color: '#1F2024',
    border: 'none',
    outline: 'none',
    padding: 0,
    height: '100%',
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
  sidebarNavItemActive: {
    backgroundColor: '#EAF2FF',
  },
  sidebarNavLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#71727A',
  },
  sidebarNavLabelActive: {
    color: '#006FFD',
    fontWeight: 600,
  },

  // Main
  main: {
    flex: 1,
    paddingTop: 24,
    paddingLeft: 32,
    paddingRight: 32,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    marginBottom: 16,
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
  },

  // Board
  board: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    overflowX: 'auto',
    paddingBottom: 40,
  },
  column: {
    width: 300,
    backgroundColor: '#F0F1F3',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flexShrink: 0,
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 4,
  },
  columnTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#1F2024',
  },
  columnMore: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#8F9098',
    letterSpacing: 2,
  },
  columnContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
    overflowY: 'auto',
  },

  // Task Card
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  cardCategory: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#71727A',
    backgroundColor: '#F0F1F3',
    alignSelf: 'flex-start',
    padding: '2px 8px',
    borderRadius: 4,
  },
  cardTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
  },
  cardSubtitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
  },
  cardName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#1F2024',
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  actionIcon: {
    fontSize: 14,
    color: '#8F9098',
    cursor: 'pointer',
  },
  moreIcon: {
    fontSize: 12,
    color: '#8F9098',
    letterSpacing: 2,
    cursor: 'pointer',
  },

  // Column badge
  columnBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    color: '#FFFFFF',
    backgroundColor: '#006FFD',
    borderRadius: 10,
    padding: '2px 8px',
    minWidth: 18,
    textAlign: 'center',
  },

  // Work Site Card
  workCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #F0F1F3',
  },
  workCardHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workCardSite: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#1F2024',
  },
  workCardStatus: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 12,
  },
  workCardMeta: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workCardMetaIcon: {
    fontSize: 13,
  },
  workCardMetaText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#71727A',
  },
  workCardDivider: {
    height: 1,
    backgroundColor: '#F0F1F3',
    margin: '2px 0',
  },
  workCardMembersLabel: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workCardMembers: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 20,
  },
  workCardMemberBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 4,
  },
  workCardMemberSep: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#8F9098',
  },

  // Alert Column
  alertColumn: {
    width: 300,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flexShrink: 0,
    border: '1px solid #FECACA',
  },
  alertHeaderLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertColumnTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#991B1B',
  },
  alertBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    padding: '2px 8px',
    minWidth: 18,
    textAlign: 'center',
  },

  // Alert Card
  alertCard: {
    borderRadius: 10,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    border: 'none',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
  },
  alertTopRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTime: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#8F9098',
  },
  alertCamBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 10,
    color: '#71727A',
    backgroundColor: '#F0F1F3',
    padding: '2px 8px',
    borderRadius: 4,
  },
  alertTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#DC2626',
  },
  alertEmployee: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#71727A',
  },

  // Alert Empty
  alertEmpty: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 0',
  },
  alertEmptyText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#8F9098',
  },
};
