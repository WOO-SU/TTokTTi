import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

type EmployeeInfo = {
  id: number;
  username: string;
  name: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  photo: string | null;
  sex: 'M' | 'F';
};

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '안전 규정 확인', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

export default function EmployeeDetailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { logout } = useAuth();
  const unreadCount = useUnreadAlertCount();
  const [activeSidebar, setActiveSidebar] = useState('');
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);

  const siteName = (location.state as { siteName?: string })?.siteName ?? null;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch(`/user/user/${id}/`);
        if (res.ok) {
          const data: EmployeeInfo = await res.json();
          setEmployee(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatBirthDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = dateStr.slice(0, 10);
    const [y, m, day] = d.split('-');
    return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    return phone;
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={logoImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={styles.logoText}>TTokTTi</span>
        </button>

        <div style={styles.sidebarIcons}>
          <button type="button" style={styles.sidebarIconBtn} onClick={() => navigate('/profile')}>👤</button>
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
                <span style={{
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

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button type="button" style={styles.backBtn} onClick={() => navigate(-1)}>
              ← 돌아가기
            </button>
            <h1 style={styles.headerTitle}>근무자 정보</h1>
          </div>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {loading ? (
          <div style={styles.loadingWrap}>
            <span style={styles.loadingText}>로딩 중...</span>
          </div>
        ) : !employee ? (
          <div style={styles.loadingWrap}>
            <span style={styles.loadingText}>근무자 정보를 찾을 수 없습니다.</span>
          </div>
        ) : (
          <div style={styles.content}>
            {/* Profile Card */}
            <div style={styles.profileCard}>
              <div style={styles.avatarCircle}>
                {employee.photo ? (
                  <img src={employee.photo} alt="avatar" style={styles.avatarImg} />
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C5C6CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <div style={styles.profileName}>{employee.name}</div>
              <div style={styles.profileUsername}>@{employee.username}</div>
            </div>

            {/* Info Card */}
            <div style={styles.infoCard}>
              <div style={styles.infoTitle}>상세 정보</div>

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>👤</div>
                <div style={styles.infoContent}>
                  <div style={styles.infoLabel}>이름</div>
                  <div style={styles.infoValue}>{employee.name}</div>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>🎂</div>
                <div style={styles.infoContent}>
                  <div style={styles.infoLabel}>생년월일</div>
                  <div style={styles.infoValue}>{formatBirthDate(employee.birth_date)}</div>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>📞</div>
                <div style={styles.infoContent}>
                  <div style={styles.infoLabel}>전화번호</div>
                  <div style={styles.infoValue}>{formatPhone(employee.phone)}</div>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>📍</div>
                <div style={styles.infoContent}>
                  <div style={styles.infoLabel}>작업구역</div>
                  <div style={styles.infoValue}>{siteName ?? employee.address ?? '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
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

  // Main
  main: {
    flex: 1,
    paddingTop: 24,
    paddingLeft: 32,
    paddingRight: 32,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  header: {
    marginBottom: 24,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  backBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#006FFD',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 28,
    color: '#1F2024',
    margin: 0,
  },

  // Loading
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  loadingText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 16,
    color: '#8F9098',
  },

  // Content
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    maxWidth: 560,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    border: '1px solid #E8E9EB',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    backgroundColor: '#F0F1F3',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  profileName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 22,
    color: '#1F2024',
  },
  profileUsername: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#8F9098',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: '28px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    border: '1px solid #E8E9EB',
  },
  infoTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#1F2024',
    marginBottom: 20,
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: '14px 0',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0F4FF',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  infoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  infoLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#8F9098',
  },
  infoValue: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 15,
    color: '#1F2024',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F1F3',
  },
};
