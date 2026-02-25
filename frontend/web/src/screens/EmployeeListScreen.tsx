import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import managerImg from '../assets/manager.jpg';
import workerImg from '../assets/safety-character.png';
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
  is_active: boolean;
};

type RegisterForm = {
  username: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  birth_date: string;
  sex: 'M' | 'F';
};

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
  { label: '알림 로그 확인', icon: '🔔', path: '/alert-logs' },
];

const emptyForm: RegisterForm = {
  username: '',
  password: '',
  name: '',
  phone: '',
  address: '',
  birth_date: '',
  sex: 'M',
};

export default function EmployeeListScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const unreadCount = useUnreadAlertCount();
  const [employees, setEmployees] = useState<EmployeeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState<RegisterForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isActive = location.pathname === '/employees';

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiFetch('/user/');
      if (res.ok) {
        const data: EmployeeInfo[] = await res.json();
        setEmployees(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`"${name}" 직원을 삭제하시겠습니까?`)) return;
    try {
      const res = await apiFetch(`/user/${id}/`, { method: 'DELETE' });
      if (res.ok) {
        setEmployees(prev => prev.filter(e => e.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleRegister = async () => {
    if (!form.username || !form.password || !form.name) {
      setError('아이디, 비밀번호, 이름은 필수입니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { ...form };
      if (!body.birth_date) delete body.birth_date;
      if (!body.phone) delete body.phone;
      if (!body.address) delete body.address;

      const res = await apiFetch('/user/', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowRegister(false);
        setForm({ ...emptyForm });
        setLoading(true);
        fetchEmployees();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.username?.[0] ?? data?.detail ?? '등록에 실패했습니다.');
      }
    } catch {
      setError('등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatSex = (sex: 'M' | 'F') => (sex === 'M' ? '남성' : '여성');

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    const [y, m, day] = d.slice(0, 10).split('-');
    return `${y}.${m}.${day}`;
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={managerImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: '50%' }} />
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
            const itemActive = isActive
              ? item.path === '/employees'
              : false;
            return (
              <button
                key={item.label}
                type="button"
                style={{
                  ...styles.sidebarNavItem,
                  ...(itemActive ? styles.sidebarNavItemActive : {}),
                }}
                onClick={() => navigate(item.path)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{
                  ...styles.sidebarNavLabel,
                  ...(itemActive ? styles.sidebarNavLabelActive : {}),
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
          <h1 style={styles.headerTitle}>직원 관리</h1>
          <div style={styles.headerRight}>
            <button type="button" style={styles.registerBtn} onClick={() => { setShowRegister(true); setError(''); }}>
              + 직원 등록
            </button>
            <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingWrap}>
            <span style={styles.loadingText}>로딩 중...</span>
          </div>
        ) : employees.length === 0 ? (
          <div style={styles.loadingWrap}>
            <span style={styles.loadingText}>등록된 직원이 없습니다.</span>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>사진</th>
                  <th style={styles.th}>이름</th>
                  <th style={styles.th}>아이디</th>
                  <th style={styles.th}>연락처</th>
                  <th style={styles.th}>성별</th>
                  <th style={styles.th}>생년월일</th>
                  <th style={styles.th}>주소</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    style={styles.tr}
                    onClick={() => navigate(`/employee/${emp.id}`)}
                  >
                    <td style={styles.td}>
                      <div style={styles.tableAvatar}>
                        <img
                          src={emp.username.startsWith('manager') ? managerImg : workerImg}
                          alt=""
                          style={styles.tableAvatarImg}
                        />
                      </div>
                    </td>
                    <td style={styles.tdName}>{emp.name}</td>
                    <td style={styles.td}>{emp.username}</td>
                    <td style={styles.td}>{emp.phone ?? '-'}</td>
                    <td style={styles.td}>{formatSex(emp.sex)}</td>
                    <td style={styles.td}>{formatDate(emp.birth_date)}</td>
                    <td style={styles.td}>{emp.address ?? '-'}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button
                        type="button"
                        style={styles.deleteBtn}
                        onClick={e => { e.stopPropagation(); handleDelete(emp.id, emp.name); }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Register Modal */}
      {showRegister && (
        <div style={styles.modalBackdrop} onClick={() => setShowRegister(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>직원 등록</h2>

            {error && <div style={styles.errorMsg}>{error}</div>}

            <div style={styles.fieldRow}>
              <div style={styles.fieldHalf}>
                <label style={styles.fieldLabel}>아이디 *</label>
                <input
                  style={styles.fieldInput}
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="아이디"
                />
              </div>
              <div style={styles.fieldHalf}>
                <label style={styles.fieldLabel}>비밀번호 *</label>
                <input
                  type="password"
                  style={styles.fieldInput}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="비밀번호"
                />
              </div>
            </div>

            <div style={styles.fieldRow}>
              <div style={styles.fieldHalf}>
                <label style={styles.fieldLabel}>이름 *</label>
                <input
                  style={styles.fieldInput}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="이름"
                />
              </div>
              <div style={styles.fieldHalf}>
                <label style={styles.fieldLabel}>성별</label>
                <select
                  style={styles.fieldSelect}
                  value={form.sex}
                  onChange={e => setForm(f => ({ ...f, sex: e.target.value as 'M' | 'F' }))}>
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </div>
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.fieldLabel}>전화번호</label>
              <input
                style={styles.fieldInput}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.fieldLabel}>주소</label>
              <input
                style={styles.fieldInput}
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="주소"
              />
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.fieldLabel}>생년월일</label>
              <input
                type="date"
                style={styles.fieldInput}
                value={form.birth_date}
                onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
              />
            </div>

            <div style={styles.modalBtnRow}>
              <button type="button" style={styles.cancelBtn} onClick={() => setShowRegister(false)}>
                취소
              </button>
              <button type="button" style={styles.saveBtn} onClick={handleRegister} disabled={saving}>
                {saving ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
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
    backgroundColor: '#FFF8E1',
  },
  sidebarNavLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#71727A',
  },
  sidebarNavLabelActive: {
    color: '#FFB800',
    fontWeight: 600,
  },

  // Header
  header: {
    marginBottom: 24,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 28,
    color: '#1F2024',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  registerBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#FFB800',
    padding: '10px 24px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
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

  // Table
  tableWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E8E9EB',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Inter, sans-serif',
  },
  th: {
    fontWeight: 600,
    fontSize: 13,
    color: '#71727A',
    padding: '14px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #E8E9EB',
    backgroundColor: '#FAFAFA',
    whiteSpace: 'nowrap',
  },
  tr: {
    cursor: 'pointer',
    borderBottom: '1px solid #F0F1F3',
  },
  td: {
    fontSize: 14,
    color: '#1F2024',
    padding: '12px 16px',
    whiteSpace: 'nowrap',
  },
  tdName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1F2024',
    padding: '12px 16px',
    whiteSpace: 'nowrap',
  },
  tableAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#F0F1F3',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  tableAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  deleteBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#ED3241',
    background: 'none',
    border: '1px solid #ED3241',
    borderRadius: 6,
    padding: '4px 12px',
    cursor: 'pointer',
  },

  // Modal
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: '32px',
    width: 480,
    maxHeight: '90vh',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 20,
    color: '#1F2024',
    margin: 0,
  },
  errorMsg: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#ED3241',
    backgroundColor: '#FFF0F1',
    padding: '10px 14px',
    borderRadius: 8,
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
    cursor: 'pointer',
  },
  modalBtnRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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
  saveBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#FFB800',
    padding: '12px 28px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
  },
};
