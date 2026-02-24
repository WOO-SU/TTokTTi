import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import managerImg from '../assets/manager.jpg';
import workerImg from '../assets/safety-character.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type EquipmentCategory = 'HELMET' | 'VEST' | 'SHOES';

type EquipmentItem = {
  category: EquipmentCategory;
  label: string;
  icon: string;
};

type WorkerDetail = {
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
  workers_detail: WorkerDetail[];
  risk_assessment: string;
  report: boolean;
};

// compliance key: "wsId-employeeId-category"
type ComplianceMap = Record<string, boolean>;

// ── Data ──

const equipmentItems: EquipmentItem[] = [
  { category: 'HELMET', label: '안전모 착용', icon: '⛑️' },
  { category: 'VEST', label: '안전조끼 착용', icon: '🦺' },
  { category: 'SHOES', label: '안전장갑 착용', icon: '🧤' },
];

const MEMBER_COLORS = ['#FFB800', '#E87C5D', '#22A06B', '#8F9098', '#7B61FF', '#E85DBF', '#FF6B35', '#9B59B6'];

function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

function complianceKey(wsId: number, empId: number, cat: string): string {
  return `${wsId}-${empId}-${cat}`;
}

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
  { label: '알림 로그 확인', icon: '🔔', path: '/alert-logs' },
];

const POLL_INTERVAL = 15_000;

// ── Helpers ──

function getGroupCategoryProgress(
  compliance: ComplianceMap,
  ws: WorkSessionCard,
): { done: number; total: number } {
  const workers = ws.workers_detail ?? [];
  let done = 0;
  for (const eq of equipmentItems) {
    const allComplied = workers.length > 0 && workers.every(
      m => compliance[complianceKey(ws.id, m.employee_id, eq.category)] === true,
    );
    if (allComplied) done++;
  }
  return { done, total: equipmentItems.length };
}

function getGroupOverallStatus(
  compliance: ComplianceMap,
  ws: WorkSessionCard,
): { label: string; color: string; bg: string } {
  const { done, total } = getGroupCategoryProgress(compliance, ws);
  if (done === total && total > 0) return { label: '완료', color: '#22A06B', bg: '#E8F5E9' };
  if (done > 0) return { label: '진행중', color: '#1565C0', bg: '#E8F0FE' };
  const workers = ws.workers_detail ?? [];
  const anyChecked = workers.some(m =>
    equipmentItems.some(eq => compliance[complianceKey(ws.id, m.employee_id, eq.category)] === true),
  );
  if (anyChecked) return { label: '진행중', color: '#1565C0', bg: '#E8F0FE' };
  return { label: '미시작', color: '#71727A', bg: '#F0F1F3' };
}

// ── Main Component ──

export default function SafetyRegulationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isProfileActive = location.pathname === '/profile';
  const unreadCount = useUnreadAlertCount();

  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
  const [workSessions, setWorkSessions] = useState<WorkSessionCard[]>([]);
  const [compliance, setCompliance] = useState<ComplianceMap>({});
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchComplianceData = useCallback(async (sessions: WorkSessionCard[]) => {
    if (sessions.length === 0) return;
    try {
      const wsIds = sessions.map(ws => ws.id);
      const res = await apiFetch('/check/admin/', {
        method: 'POST',
        body: JSON.stringify({ worksession_ids: wsIds }),
      });
      if (res.ok) {
        const json = await res.json();
        const worksessions = json.worksessions ?? [];
        setCompliance(prev => {
          const next = { ...prev };
          for (const ws of worksessions) {
            for (const wc of ws.workers ?? []) {
              for (const eq of equipmentItems) {
                const key = complianceKey(ws.worksession_id, wc.worker.id, eq.category);
                const val = wc.checks?.[eq.category];
                next[key] = val === true;
              }
            }
          }
          return next;
        });
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
          setExpandedGroupId(prev => prev ?? (json.length > 0 ? (json[0] as WorkSessionCard).id : null));
          await fetchComplianceData(json as WorkSessionCard[]);
        }
      }
    } catch { /* ignore */ }
  }, [fetchComplianceData]);

  useEffect(() => {
    fetchWorkSessions().finally(() => setLoading(false));
    pollingRef.current = setInterval(fetchWorkSessions, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchWorkSessions]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleGroup = (id: number) => {
    setExpandedGroupId(prev => (prev === id ? null : id));
    setExpandedEquipment(null);
  };

  const toggleEquipment = (key: string) => {
    setExpandedEquipment(prev => (prev === key ? null : key));
  };

  const toggleCompliance = (key: string) => {
    setCompliance(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={styles.container}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={managerImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: '50%' }} />
          <span style={styles.logoText}>TTokTTi</span>
        </button>

        <div style={styles.sidebarIcons}>
          <button type="button" style={{ ...styles.sidebarIconBtn, ...(isProfileActive ? { backgroundColor: '#FFB800', boxShadow: '0 2px 8px rgba(255,184,0,0.3)' } : {}) }} onClick={() => navigate('/profile')}>👤</button>
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
            const isActive = item.label === '안전 장비 점검';
            return (
              <button
                key={item.label}
                type="button"
                style={{ ...styles.sidebarNavItem, ...(isActive ? styles.sidebarNavItemActive : {}) }}
                onClick={() => navigate(item.path)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ ...styles.sidebarNavLabel, ...(isActive ? styles.sidebarNavLabelActive : {}) }}>
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
          <h1 style={styles.headerTitle}>안전 장비 점검</h1>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Summary */}
        <div style={styles.summaryRow}>
          {workSessions.map(ws => {
            const { done, total } = getGroupCategoryProgress(compliance, ws);
            const status = getGroupOverallStatus(compliance, ws);
            return (
              <div key={ws.id} style={styles.summaryCard}>
                <div style={styles.summarySiteInfo}>
                  <span style={styles.summaryLabel}>{ws.name}</span>
                  <span style={{
                    ...styles.summarySiteBadge,
                    backgroundColor: status.bg,
                    color: status.color,
                  }}>
                    {status.label}
                  </span>
                </div>
                <span style={{
                  ...styles.summaryCount,
                  color: done === total && total > 0 ? '#22A06B' : '#FFB800',
                }}>
                  {done}/{total}
                </span>
              </div>
            );
          })}
        </div>

        {/* Worker Group Cards */}
        <div style={styles.cardList}>
          {loading ? (
            <div style={styles.loadingWrap}>
              <span style={styles.loadingText}>로딩 중...</span>
            </div>
          ) : workSessions.length === 0 ? (
            <div style={styles.loadingWrap}>
              <span style={styles.loadingText}>오늘 예정된 작업 현장이 없습니다.</span>
            </div>
          ) : (
            workSessions.map(ws => {
              const isGroupExpanded = expandedGroupId === ws.id;
              const groupStatus = getGroupOverallStatus(compliance, ws);
              const workers = ws.workers_detail ?? [];

              const { done: groupDone, total: totalChecks } = getGroupCategoryProgress(compliance, ws);
              const groupPct = totalChecks > 0 ? (groupDone / totalChecks) * 100 : 0;

              return (
                <div key={ws.id} style={styles.groupCard}>
                  {/* Group Header */}
                  <button type="button" style={styles.groupHeaderBtn} onClick={() => toggleGroup(ws.id)}>
                    <div style={styles.groupHeaderLeft}>
                      <span style={styles.groupName}>{ws.name}</span>
                      <span style={{
                        ...styles.groupStatusBadge,
                        backgroundColor: groupStatus.bg,
                        color: groupStatus.color,
                      }}>
                        {groupStatus.label}
                      </span>
                    </div>
                    <span style={styles.expandArrow}>{isGroupExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Group Members */}
                  <div style={styles.groupMembersRow}>
                    {workers.map((member, idx) => (
                      <button
                        key={member.employee_id}
                        type="button"
                        style={styles.groupMember}
                        onClick={() => navigate(`/employee/${member.employee_id}`, { state: { siteName: ws.name } })}>
                        <img
                          src={workerImg}
                          alt={member.name}
                          style={styles.memberAvatar}
                        />
                        <span style={styles.memberNameLink}>{member.name}</span>
                      </button>
                    ))}
                    {workers.length === 0 && (
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8F9098' }}>작업자 미지정</span>
                    )}
                  </div>

                  {/* Group Progress */}
                  <div style={styles.groupProgressRow}>
                    <div style={styles.progressBarBg}>
                      <div style={{
                        ...styles.progressBarFill,
                        width: `${groupPct}%`,
                        backgroundColor: groupDone === totalChecks && totalChecks > 0 ? '#22A06B' : '#FFB800',
                      }} />
                    </div>
                    <span style={{
                      ...styles.progressText,
                      color: groupDone === totalChecks && totalChecks > 0 ? '#22A06B' : '#71727A',
                    }}>
                      {groupDone}/{totalChecks}
                    </span>
                  </div>

                  {/* Expanded: Equipment Items */}
                  {isGroupExpanded && (
                    <div style={styles.groupEquipments}>
                      {equipmentItems.map(eq => {
                        const eqKey = `${ws.id}-${eq.category}`;
                        const isEqExpanded = expandedEquipment === eqKey;
                        let done = 0;
                        workers.forEach(m => {
                          if (compliance[complianceKey(ws.id, m.employee_id, eq.category)] === true) done++;
                        });
                        const total = workers.length;
                        const allDone = done === total && total > 0;
                        const pct = total > 0 ? (done / total) * 100 : 0;

                        return (
                          <div key={eq.category} style={styles.equipmentCard}>
                            {/* Equipment Header */}
                            <button type="button" style={styles.equipmentHeaderBtn} onClick={() => toggleEquipment(eqKey)}>
                              <div style={styles.equipmentHeaderLeft}>
                                <span style={{ fontSize: 20 }}>{eq.icon}</span>
                                <span style={styles.equipmentLabel}>{eq.label}</span>
                                <span style={{
                                  ...styles.equipmentBadge,
                                  backgroundColor: allDone ? '#E8F5E9' : '#FFF8E1',
                                  color: allDone ? '#22A06B' : '#FFB800',
                                }}>
                                  {done}/{total}
                                </span>
                              </div>
                              <span style={styles.expandArrowSmall}>{isEqExpanded ? '▲' : '▼'}</span>
                            </button>

                            {/* Equipment Progress Bar */}
                            <div style={styles.equipmentProgressRow}>
                              <div style={styles.progressBarBg}>
                                <div style={{
                                  ...styles.progressBarFill,
                                  width: `${pct}%`,
                                  backgroundColor: allDone ? '#22A06B' : '#FFB800',
                                }} />
                              </div>
                            </div>

                            {/* Expanded: Per-member checklist */}
                            {isEqExpanded && (
                              <div style={styles.memberStatusList}>
                                {workers.map((member, idx) => {
                                  const key = complianceKey(ws.id, member.employee_id, eq.category);
                                  const isChecked = compliance[key] === true;
                                  return (
                                    <div key={member.employee_id} style={styles.memberStatusRow}>
                                      <div style={styles.memberStatusLeft}>
                                        <img
                                          src={workerImg}
                                          alt={member.name}
                                          style={styles.memberAvatarSmall}
                                        />
                                        <span style={styles.memberStatusName}>{member.name}</span>
                                      </div>
                                      <div style={styles.memberStatusRight}>
                                        <span style={{
                                          fontFamily: 'Inter, sans-serif',
                                          fontSize: 11,
                                          color: isChecked ? '#22A06B' : '#DC2626',
                                          fontWeight: 600,
                                        }}>
                                          {isChecked ? '확인됨' : '미확인'}
                                        </span>
                                        <button
                                          type="button"
                                          style={{
                                            ...styles.checkbox,
                                            backgroundColor: isChecked ? '#FFB800' : '#FFFFFF',
                                            borderColor: isChecked ? '#FFB800' : '#C5C6CC',
                                          }}
                                          onClick={() => toggleCompliance(key)}
                                        >
                                          {isChecked && (
                                            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                                              <path d="M1.5 5L5.5 9L12.5 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
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

  // Summary Row
  summaryRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8E9EB',
    borderRadius: 12,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summarySiteInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
  },
  summaryLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
  },
  summarySiteBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '2px 10px',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  summaryCount: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 18,
  },

  // Loading
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingTop: 60,
  },
  loadingText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 16,
    color: '#8F9098',
  },

  // Card List
  cardList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    paddingBottom: 40,
  },

  // Worker Group Card
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  groupHeaderBtn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    width: '100%',
  },
  groupHeaderLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#1F2024',
  },
  groupStatusBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    padding: '3px 12px',
    borderRadius: 6,
  },
  groupMembersRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  groupMember: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    objectFit: 'contain' as const,
    backgroundColor: '#F0F1F3',
    flexShrink: 0,
  },
  memberNameLink: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#FFB800',
  },
  groupProgressRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandArrow: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    color: '#8F9098',
    flexShrink: 0,
  },

  // Equipment section inside group
  groupEquipments: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    borderTop: '1px solid #E8E9EB',
    marginTop: 4,
    paddingTop: 16,
  },

  // Equipment Card
  equipmentCard: {
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #E8E9EB',
    padding: '14px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  equipmentHeaderBtn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    width: '100%',
  },
  equipmentHeaderLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  equipmentLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 15,
    color: '#1F2024',
  },
  equipmentBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    padding: '2px 10px',
    borderRadius: 4,
  },
  expandArrowSmall: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    color: '#8F9098',
    flexShrink: 0,
  },
  equipmentProgressRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Progress bar
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E8E9EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    minWidth: 30,
    textAlign: 'right',
  },

  // Member status list (expanded equipment)
  memberStatusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    borderTop: '1px solid #E8E9EB',
    marginTop: 4,
    paddingTop: 8,
  },
  memberStatusRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 4px',
    borderBottom: '1px solid #F0F1F3',
  },
  memberStatusLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    objectFit: 'contain' as const,
    backgroundColor: '#F0F1F3',
    flexShrink: 0,
  },
  memberStatusName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#1F2024',
  },
  memberStatusRight: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1.5px solid',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    cursor: 'pointer',
    background: 'none',
    padding: 0,
    transition: 'background-color 0.15s, border-color 0.15s',
  },
};
