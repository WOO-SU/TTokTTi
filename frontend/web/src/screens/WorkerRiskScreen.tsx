import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import tripodImg from '../assets/tripod-character.png';
import ladderImg from '../assets/ladder-character.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type VideoRecord = {
  id: number;
  employee: number;
  is_risky: boolean;
  original_video: string | null;
  camera_type: 'BODY' | 'FULL';
  created_at: string;
};

type CameraTab = 'FULL' | 'BODY';

// ── Data ──

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

// Employee name map (shared with HomeScreen work site data)
const employeeNames: Record<number, string> = {
  2: '송영민',
  3: '임정원',
  4: '김태호',
  5: '박지수',
  6: '이준혁',
  7: '최서연',
};

const siteLookup: Record<number, string> = {
  2: '봉천동 작업현장1',
  3: '봉천동 작업현장1',
  4: '신림동 작업현장2',
  5: '신림동 작업현장2',
  6: '관악구 작업현장3',
  7: '관악구 작업현장3',
};

const POLL_INTERVAL = 15_000;

// ── Helpers ──

function timeAgo(isoStr: string): string {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// ── Main Component ──

export default function WorkerRiskScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isProfileActive = location.pathname === '/profile';
  const unreadCount = useUnreadAlertCount();
  const [activeTab, setActiveTab] = useState<CameraTab>('FULL');
  const [allRecords, setAllRecords] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await apiFetch('/detect/search/?is_risky=true');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setAllRecords(json.data as VideoRecord[]);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRecords();
    pollingRef.current = setInterval(fetchRecords, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchRecords]);

  const filtered = allRecords.filter(r => r.camera_type === activeTab);
  const fullCount = allRecords.filter(r => r.camera_type === 'FULL').length;
  const bodyCount = allRecords.filter(r => r.camera_type === 'BODY').length;

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
            {unreadCount > 0 && <div style={styles.notifBadge}><span style={styles.notifBadgeText}>{unreadCount > 99 ? '99' : unreadCount}</span></div>}
          </button>
        </div>
        <div style={styles.sidebarSearch}>
          <span style={{ fontSize: 14, color: '#8F9098' }}>🔍</span>
          <input style={styles.sidebarSearchInput} type="text" placeholder="Search for..." />
        </div>
        <nav style={styles.sidebarNav}>
          {sidebarItems.map(item => {
            const isActive = item.path === '/risk';
            return (
              <button key={item.label} type="button" style={{ ...styles.sidebarNavItem, ...(isActive ? styles.sidebarNavItemActive : {}) }} onClick={() => navigate(item.path)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ ...styles.sidebarNavLabel, ...(isActive ? styles.sidebarNavLabelActive : {}) }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>위험성 평가</h1>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Hero Section with camera tabs */}
        <div style={styles.heroRow}>
          {/* Full Cam Card */}
          <button
            type="button"
            style={{
              ...styles.heroCard,
              ...(activeTab === 'FULL' ? styles.heroCardActive : {}),
            }}
            onClick={() => setActiveTab('FULL')}>
            <div style={styles.heroImgWrap}>
              <img src={tripodImg} alt="Full Cam" style={styles.heroImg} />
            </div>
            <div style={styles.heroTextArea}>
              <span style={styles.heroLabel}>전체</span>
              <span style={styles.heroSublabel}>Full Cam</span>
            </div>
            {fullCount > 0 && (
              <span style={styles.heroBadge}>{fullCount}</span>
            )}
          </button>

          {/* Body Cam Card */}
          <button
            type="button"
            style={{
              ...styles.heroCard,
              ...(activeTab === 'BODY' ? styles.heroCardActive : {}),
            }}
            onClick={() => setActiveTab('BODY')}>
            <div style={styles.heroImgWrap}>
              <img src={ladderImg} alt="Body Cam" style={styles.heroImg} />
            </div>
            <div style={styles.heroTextArea}>
              <span style={styles.heroLabel}>작업자</span>
              <span style={styles.heroSublabel}>Body Cam</span>
            </div>
            {bodyCount > 0 && (
              <span style={styles.heroBadge}>{bodyCount}</span>
            )}
          </button>
        </div>

        {/* Alert List */}
        <div style={styles.listSection}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>
              {activeTab === 'FULL' ? 'Full Cam 위험 감지' : 'Body Cam 위험 감지'}
            </span>
            <span style={styles.listCount}>{filtered.length}건</span>
          </div>

          <div style={styles.listContent}>
            {loading ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyText}>로딩 중...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyText}>감지된 위험이 없습니다</span>
              </div>
            ) : (
              filtered.map(record => {
                const empName = employeeNames[record.employee] ?? `직원 #${record.employee}`;
                const site = siteLookup[record.employee] ?? null;
                return (
                  <button
                    key={record.id}
                    type="button"
                    style={styles.alertRow}
                    onClick={() => navigate(`/employee/${record.employee}`, { state: { siteName: site } })}>
                    <div style={styles.alertIconWrap}>
                      <span style={styles.alertIcon}>⚠️</span>
                    </div>
                    <div style={styles.alertBody}>
                      <div style={styles.alertTopLine}>
                        <span style={styles.alertLabel}>위험 감지</span>
                        <span style={styles.alertCamTag}>
                          {record.camera_type === 'FULL' ? 'Full Cam' : 'Body Cam'}
                        </span>
                      </div>
                      <div style={styles.alertEmployeeRow}>
                        <div style={styles.alertAvatar}>
                          {empName[0]}
                        </div>
                        <span style={styles.alertEmpName}>{empName}</span>
                        {site && <span style={styles.alertSite}>{site}</span>}
                      </div>
                    </div>
                    <span style={styles.alertTime}>{timeAgo(record.created_at)}</span>
                    <span style={styles.alertChevron}>›</span>
                  </button>
                );
              })
            )}
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

  // Sidebar (same as other screens)
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
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingLeft: 4, paddingRight: 4, background: 'none', border: 'none', cursor: 'pointer',
  },
  logoText: { fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, color: '#1F2024' },
  sidebarIcons: { display: 'flex', flexDirection: 'row', gap: 12, paddingLeft: 4, paddingRight: 4 },
  sidebarIconBtn: {
    width: 36, height: 36, borderRadius: '50%', backgroundColor: '#F5F5F5',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    border: 'none', cursor: 'pointer', fontSize: 16, padding: 0,
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -6, width: 16, height: 16, borderRadius: '50%',
    backgroundColor: '#ED3241', display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 700 },
  sidebarSearch: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', height: 36,
    border: '1px solid #E8E9EB', borderRadius: 8, paddingLeft: 10, paddingRight: 10,
    gap: 8, boxSizing: 'border-box',
  },
  sidebarSearchInput: {
    flex: 1, fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#1F2024',
    border: 'none', outline: 'none', padding: 0, height: '100%', backgroundColor: 'transparent',
  },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: 4 },
  sidebarNavItem: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: '10px 8px', borderRadius: 8, background: 'none', border: 'none',
    cursor: 'pointer', width: '100%', textAlign: 'left',
  },
  sidebarNavItemActive: { backgroundColor: '#EAF2FF' },
  sidebarNavLabel: { fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#71727A' },
  sidebarNavLabelActive: { color: '#006FFD', fontWeight: 600 },
  logoutBtn: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#71727A',
    padding: '8px 16px', borderRadius: 8, background: 'none', border: '1px solid #E8E9EB', cursor: 'pointer',
  },

  // Main
  main: {
    flex: 1, paddingTop: 24, paddingLeft: 32, paddingRight: 32,
    display: 'flex', flexDirection: 'column', overflow: 'auto',
  },
  header: {
    marginBottom: 24, display: 'flex', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 28, color: '#1F2024', margin: 0,
  },

  // Hero Section
  heroRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
    marginBottom: 28,
  },
  heroCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: '24px 28px',
    border: '2px solid #E8E9EB',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'left',
    transition: 'border-color 0.2s',
  },
  heroCardActive: {
    borderColor: '#006FFD',
    boxShadow: '0 4px 20px rgba(0,111,253,0.12)',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F6FF 100%)',
  },
  heroImgWrap: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  heroImg: {
    width: 80,
    height: 80,
    objectFit: 'contain',
  },
  heroTextArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  heroLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 800,
    fontSize: 24,
    color: '#1F2024',
  },
  heroSublabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#8F9098',
  },
  heroBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: '4px 12px',
    minWidth: 20,
    textAlign: 'center',
  },

  // List Section
  listSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E8E9EB',
    overflow: 'hidden',
    marginBottom: 32,
  },
  listHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #E8E9EB',
  },
  listTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#1F2024',
  },
  listCount: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#71727A',
  },
  listContent: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 360px)',
  },

  // Alert Row
  alertRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: '16px 24px',
    borderBottom: '1px solid #F0F1F3',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#F0F1F3',
    width: '100%',
    textAlign: 'left',
  },
  alertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  alertTopLine: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#DC2626',
  },
  alertCamTag: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 10,
    color: '#006FFD',
    backgroundColor: '#EAF2FF',
    padding: '2px 8px',
    borderRadius: 4,
  },
  alertEmployeeRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: '#006FFD',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  alertEmpName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#1F2024',
  },
  alertSite: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#8F9098',
  },
  alertTime: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#8F9098',
    flexShrink: 0,
  },
  alertChevron: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 20,
    color: '#C5C6CC',
    flexShrink: 0,
  },

  // Empty
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px 0',
  },
  emptyText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#8F9098',
  },
};
