import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Data ──

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '안전 규정 확인', icon: '🛡️', path: '/safety' },
  { label: '근로자 위험도', icon: '👤', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

type JudgmentOption = {
  value: string;
  label: string;
  icon: string;
};

const judgmentOptions: JudgmentOption[] = [
  { value: 'pass', label: '적합', icon: '✅' },
  { value: 'conditional', label: '조건부 적합', icon: '⚠️' },
  { value: 'fail', label: '부적합', icon: '❌' },
];

// ── Main Component ──

export default function ReportScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeSidebar, setActiveSidebar] = useState('보고서 작성');

  // Form state
  const [violations, setViolations] = useState('');
  const [corrective, setCorrective] = useState('');
  const [judgment, setJudgment] = useState('');
  const [judgmentOpen, setJudgmentOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const selectedJudgment = judgmentOptions.find(o => o.value === judgment);

  return (
    <div style={styles.container}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <span style={{ fontSize: 22 }}>&#x2764;&#xFE0F;</span>
          <span style={styles.logoText}>RiskPulse</span>
        </button>

        <div style={styles.sidebarIcons}>
          <button type="button" style={styles.sidebarIconBtn}>👤</button>
          <button type="button" style={styles.sidebarIconBtn}>⚙️</button>
          <button type="button" style={{ ...styles.sidebarIconBtn, position: 'relative' }}>
            🔔
            <div style={styles.notifBadge}>
              <span style={styles.notifBadgeText}>9</span>
            </div>
          </button>
        </div>

        <div style={styles.sidebarSearch}>
          <span style={{ fontSize: 14, color: '#8F9098' }}>🔍</span>
          <input
            style={styles.sidebarSearchInput}
            type="text"
            placeholder="Search for..."
          />
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
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>보고서 작성</h1>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>

        {/* Form Card */}
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>점검 결과 및 조치사항</h2>

          {/* 위반 사항 및 위험요소 */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>🔍 위반 사항 및 위험요소</label>
            <textarea
              style={styles.textarea}
              placeholder="발견된 위반 사항이나 위험 요소를 기술하세요…"
              value={violations}
              onChange={e => setViolations(e.target.value)}
              rows={4}
            />
          </div>

          {/* 시정 조치 내용 */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>🔧 시정 조치 내용</label>
            <textarea
              style={styles.textarea}
              placeholder="취한 시정 조치 또는 계획을 기술하세요…"
              value={corrective}
              onChange={e => setCorrective(e.target.value)}
              rows={4}
            />
          </div>

          {/* 전체 판정 & 후속 점검 예정일 */}
          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>📋 전체 판정</label>
              <div style={styles.selectWrapper}>
                <button
                  type="button"
                  style={styles.selectButton}
                  onClick={() => setJudgmentOpen(!judgmentOpen)}
                >
                  <span style={styles.selectButtonText}>
                    {selectedJudgment
                      ? `${selectedJudgment.icon} ${selectedJudgment.label}`
                      : '✓ 판정을 선택하세요'}
                  </span>
                  <span style={styles.selectArrow}>▾</span>
                </button>
                {judgmentOpen && (
                  <div style={styles.dropdown}>
                    {judgmentOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        style={{
                          ...styles.dropdownItem,
                          ...(judgment === option.value ? styles.dropdownItemActive : {}),
                        }}
                        onClick={() => { setJudgment(option.value); setJudgmentOpen(false); }}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>📅 후속 점검 예정일</label>
              <input
                type="date"
                style={styles.dateInput}
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
              />
            </div>
          </div>

          {/* 비고 */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              📝 비고 <span style={styles.fieldLabelSub}>추가 참고사항</span>
            </label>
            <textarea
              style={styles.textarea}
              placeholder="추가 메모나 첨부파일 설명 등…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button type="button" style={styles.saveDraftBtn}>
            임시 저장
          </button>
          <button type="button" style={styles.submitBtn}>
            📦 본사에 보고서 전송
          </button>
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
    paddingBottom: 40,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
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

  // Tabs
  tabRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #E8E9EB',
    marginBottom: 24,
  },
  tabs: {
    display: 'flex',
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    cursor: 'pointer',
  },
  tabActive: {
    borderBottomColor: '#006FFD',
  },
  tabLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#71727A',
  },
  tabLabelActive: {
    color: '#1F2024',
    fontWeight: 600,
  },
  tabBadge: {
    backgroundColor: '#E8E9EB',
    borderRadius: 10,
    padding: '2px 6px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    color: '#71727A',
    minWidth: 20,
    textAlign: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#006FFD',
    color: '#FFFFFF',
  },
  headerSearch: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    border: '1px solid #E8E9EB',
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 10,
    gap: 8,
    width: 180,
    boxSizing: 'border-box',
  },
  headerSearchInput: {
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

  // Progress Bar
  progressBar: {
    height: 4,
    backgroundColor: '#E8E9EB',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#006FFD',
    borderRadius: 2,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 20,
    color: '#1F2024',
    margin: 0,
  },

  // Form Fields
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
  },
  fieldLabelSub: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#8F9098',
  },
  textarea: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#1F2024',
    border: '1px solid #E8E9EB',
    borderRadius: 10,
    padding: '12px 14px',
    resize: 'vertical' as const,
    outline: 'none',
    backgroundColor: '#FFFFFF',
    lineHeight: 1.5,
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
  },

  // Select / Dropdown
  selectWrapper: {
    position: 'relative',
  },
  selectButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 44,
    border: '1px solid #E8E9EB',
    borderRadius: 10,
    padding: '0 14px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  selectButtonText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#8F9098',
  },
  selectArrow: {
    fontSize: 14,
    color: '#8F9098',
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8E9EB',
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 14px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#1F2024',
    textAlign: 'left',
  },
  dropdownItemActive: {
    backgroundColor: '#EAF2FF',
  },

  // Date Input
  dateInput: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#1F2024',
    border: '1px solid #E8E9EB',
    borderRadius: 10,
    padding: '0 14px',
    height: 44,
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },

  // Action Buttons
  actionRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  saveDraftBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 15,
    color: '#1F2024',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#006FFD',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 15,
    color: '#FFFFFF',
    cursor: 'pointer',
  },
};
