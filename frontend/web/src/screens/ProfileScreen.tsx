import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

type UserProfile = {
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
  { label: 'Home', icon: '\u{1F3E0}', path: '/home' },
  { label: '\uC9C1\uC6D0 \uAD00\uB9AC', icon: '\u{1F465}', path: '/employees' },
  { label: '\uC548\uC804 \uC7A5\uBE44 \uC810\uAC80', icon: '\u{1F6E1}\uFE0F', path: '/safety' },
  { label: '\uC704\uD5D8\uC131 \uD3C9\uAC00', icon: '\u{1F477}', path: '/risk' },
  { label: '\uBCF4\uACE0\uC11C \uC791\uC131', icon: '\u270F\uFE0F', path: '/report' },
  { label: '\uC54C\uB9BC \uB85C\uADF8 \uD655\uC778', icon: '\uD83D\uDD14', path: '/alert-logs' },
];

export default function ProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const unreadCount = useUnreadAlertCount();
  const [activeSidebar, setActiveSidebar] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    birth_date: '',
    sex: 'M' as 'M' | 'F',
  });

  useEffect(() => {
    if (!user?.userId) return;
    (async () => {
      try {
        const res = await apiFetch(`/user/user/${user.userId}/`);
        if (res.ok) {
          const data: UserProfile = await res.json();
          setProfile(data);
          setForm({
            name: data.name ?? '',
            phone: data.phone ?? '',
            address: data.address ?? '',
            birth_date: data.birth_date ? data.birth_date.slice(0, 10) : '',
            sex: data.sex ?? 'M',
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.userId]);

  const handleSave = async () => {
    if (!user?.userId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (body.birth_date === '') delete body.birth_date;
      else body.birth_date = `${body.birth_date}T00:00:00Z`;

      const res = await apiFetch(`/user/user/${user.userId}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setProfile(data);
        setIsEditing(false);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isProfileActive = location.pathname === '/profile';

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={logoImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={styles.logoText}>TTokTTi</span>
        </button>

        <div style={styles.sidebarIcons}>
          <button
            type="button"
            style={{
              ...styles.sidebarIconBtn,
              ...(isProfileActive ? styles.sidebarIconBtnActive : {}),
            }}
            onClick={() => navigate('/profile')}>
            {'\u{1F464}'}
          </button>
          <button type="button" style={styles.sidebarIconBtn}>{'\u2699\uFE0F'}</button>
          <button type="button" style={{ ...styles.sidebarIconBtn, position: 'relative' }}>
            {'\u{1F514}'}
            {unreadCount > 0 && (
              <div style={styles.notifBadge}>
                <span style={styles.notifBadgeText}>{unreadCount > 99 ? '99' : unreadCount}</span>
              </div>
            )}
          </button>
        </div>

        <div style={styles.sidebarSearch}>
          <span style={{ fontSize: 14, color: '#8F9098' }}>{'\u{1F50D}'}</span>
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
          <h1 style={styles.headerTitle}>{'\uD504\uB85C\uD544'}</h1>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {loading ? (
          <div style={styles.loadingWrap}>
            <span style={styles.loadingText}>{'\uB85C\uB529 \uC911...'}</span>
          </div>
        ) : (
          <div style={styles.content}>
            {/* Profile Header Card */}
            <div style={styles.card}>
              <span style={styles.usernameLabel}>{profile?.username ?? user?.userName}</span>
              <div style={styles.avatarRow}>
                <div style={styles.avatarCircle}>
                  {profile?.photo ? (
                    <img src={profile.photo} alt="avatar" style={styles.avatarImg} />
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C5C6CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div style={styles.avatarActions}>
                  <button type="button" style={styles.uploadBtn}>{'\uC0AC\uC9C4 \uC62C\uB9AC\uAE30'}</button>
                  <button type="button" style={styles.removeBtn}>{'\uC9C0\uC6B0\uAE30'}</button>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div style={styles.card}>
              <span style={styles.sectionTitle}>{'\uAC1C\uC778 \uC815\uBCF4'}</span>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.fieldLabel}>{'\uC774\uB984'}</label>
                  <input
                    style={styles.fieldInput}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    disabled={!isEditing}
                    placeholder={'\uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694'}
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.fieldLabel}>{'\uC131\uBCC4'}</label>
                  <select
                    style={styles.fieldSelect}
                    value={form.sex}
                    onChange={e => setForm(f => ({ ...f, sex: e.target.value as 'M' | 'F' }))}
                    disabled={!isEditing}>
                    <option value="M">{'\uB0A8\uC131'}</option>
                    <option value="F">{'\uC5EC\uC131'}</option>
                  </select>
                </div>
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.fieldLabel}>{'\uC804\uD654\uBC88\uD638'}</label>
                <input
                  style={styles.fieldInput}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="010-0000-0000"
                />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.fieldLabel}>{'\uC8FC\uC18C'}</label>
                <input
                  style={styles.fieldInput}
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  disabled={!isEditing}
                  placeholder={'\uC8FC\uC18C\uB97C \uC785\uB825\uD558\uC138\uC694'}
                />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.fieldLabel}>{'\uC0DD\uB144\uC6D4\uC77C'}</label>
                <input
                  type="date"
                  style={styles.fieldInput}
                  value={form.birth_date}
                  onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>

              <div style={styles.btnRow}>
                {isEditing ? (
                  <>
                    <button type="button" style={styles.cancelBtn} onClick={() => {
                      setIsEditing(false);
                      if (profile) {
                        setForm({
                          name: profile.name ?? '',
                          phone: profile.phone ?? '',
                          address: profile.address ?? '',
                          birth_date: profile.birth_date ? profile.birth_date.slice(0, 10) : '',
                          sex: profile.sex ?? 'M',
                        });
                      }
                    }}>
                    {'\uCDE8\uC18C'}
                    </button>
                    <button type="button" style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                      {saving ? '\uC800\uC7A5 \uC911...' : '\uC800\uC7A5\uD558\uAE30'}
                    </button>
                  </>
                ) : (
                  <button type="button" style={styles.editBtn} onClick={() => setIsEditing(true)}>
                    {'\uD504\uB85C\uD544 \uC218\uC815\uD558\uAE30'}
                  </button>
                )}
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
  sidebarIconBtnActive: {
    backgroundColor: '#006FFD',
    boxShadow: '0 2px 8px rgba(0,111,253,0.3)',
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
    alignItems: 'center',
    overflow: 'auto',
  },
  header: {
    marginBottom: 24,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 680,
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
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: '28px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    border: '1px solid #E8E9EB',
  },

  // Profile header card
  usernameLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#1F2024',
  },
  avatarRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
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
    objectFit: 'cover',
  },
  avatarActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-start',
  },
  uploadBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
    padding: '8px 20px',
    borderRadius: 8,
    background: 'none',
    border: '1.5px solid #006FFD',
    cursor: 'pointer',
  },
  removeBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#8F9098',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
  },

  // Info card
  sectionTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#1F2024',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
  },
  fieldHalf: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#1F2024',
  },
  fieldInput: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#1F2024',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    backgroundColor: '#F8F9FA',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  fieldSelect: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#1F2024',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    backgroundColor: '#F8F9FA',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    appearance: 'none',
    cursor: 'pointer',
  },

  // Buttons
  btnRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  editBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#006FFD',
    padding: '12px 28px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
  },
  saveBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#006FFD',
    padding: '12px 28px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
  },
  cancelBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#71727A',
    backgroundColor: 'transparent',
    padding: '12px 28px',
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    cursor: 'pointer',
  },
};