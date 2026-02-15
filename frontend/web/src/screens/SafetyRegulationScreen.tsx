import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type EquipmentTarget = '안전모' | '안전조끼' | '안전장갑';

type EquipmentItem = {
  target: EquipmentTarget;
  label: string;
  icon: string;
};

type ComplianceRecord = {
  id: number;
  employee: number;
  is_complied: boolean;
  target: string;
  original_image: string | null;
  detected_image: string | null;
  is_updated: boolean;
  created_at: string;
};

type WorkerGroup = {
  id: number;
  name: string;
  members: { employeeId: number; name: string; color: string }[];
};

// ── Data ──

const equipmentItems: EquipmentItem[] = [
  { target: '안전모', label: '안전모 착용', icon: '⛑️' },
  { target: '안전조끼', label: '안전조끼 착용', icon: '🦺' },
  { target: '안전장갑', label: '안전장갑 착용', icon: '🧤' },
];

const workerGroups: WorkerGroup[] = [
  {
    id: 1,
    name: '봉천동 작업현장1',
    members: [
      { employeeId: 2, name: '송영민', color: '#006FFD' },
      { employeeId: 3, name: '임정원', color: '#E87C5D' },
    ],
  },
  {
    id: 2,
    name: '신림동 작업현장2',
    members: [
      { employeeId: 4, name: '김태호', color: '#22A06B' },
      { employeeId: 5, name: '박지수', color: '#8F9098' },
    ],
  },
  {
    id: 3,
    name: '관악구 작업현장3',
    members: [
      { employeeId: 6, name: '이준혁', color: '#7B61FF' },
      { employeeId: 7, name: '최서연', color: '#E85DBF' },
    ],
  },
];

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

const POLL_INTERVAL = 15_000;

// ── Helpers ──

function getStatusInfo(records: ComplianceRecord[], employeeId: number, target: EquipmentTarget): { label: string; color: string; bg: string } {
  const match = records.find(r => r.employee === employeeId && r.target === target);
  if (!match) return { label: '미확인', color: '#71727A', bg: '#F0F1F3' };
  if (!match.is_updated) return { label: '검사중', color: '#E37D00', bg: '#FFF3E0' };
  if (match.is_complied) return { label: '준수', color: '#22A06B', bg: '#E8F5E9' };
  return { label: '미준수', color: '#D32F2F', bg: '#FFEAEA' };
}

function getEquipmentGroupStatus(records: ComplianceRecord[], members: WorkerGroup['members'], target: EquipmentTarget): { done: number; total: number } {
  let done = 0;
  members.forEach(m => {
    const match = records.find(r => r.employee === m.employeeId && r.target === target);
    if (match?.is_updated && match.is_complied) done++;
  });
  return { done, total: members.length };
}

function getGroupOverallStatus(records: ComplianceRecord[], members: WorkerGroup['members']): { label: string; color: string; bg: string } {
  const total = members.length * equipmentItems.length;
  let complied = 0;
  let checked = 0;
  members.forEach(m => {
    equipmentItems.forEach(eq => {
      const match = records.find(r => r.employee === m.employeeId && r.target === eq.target);
      if (match?.is_updated) {
        checked++;
        if (match.is_complied) complied++;
      }
    });
  });
  if (checked === total && complied === total) return { label: '완료', color: '#22A06B', bg: '#E8F5E9' };
  if (checked > 0) return { label: '진행중', color: '#1565C0', bg: '#E8F0FE' };
  return { label: '미시작', color: '#71727A', bg: '#F0F1F3' };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

// ── Main Component ──

export default function SafetyRegulationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isProfileActive = location.pathname === '/profile';
  const unreadCount = useUnreadAlertCount();

  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(1);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await apiFetch('/api/check/update/?all=true');
      if (res.ok) {
        const data = await res.json();
        const list: ComplianceRecord[] = data.data ?? data.results ?? data ?? [];
        if (Array.isArray(list)) setRecords(list);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRecords();
    pollingRef.current = setInterval(fetchRecords, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchRecords]);

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

        {/* Summary Badges */}
        <div style={styles.summaryRow}>
          {equipmentItems.map(eq => {
            const allMembers = workerGroups.flatMap(g => g.members);
            const { done, total } = getEquipmentGroupStatus(records, allMembers, eq.target);
            return (
              <div key={eq.target} style={styles.summaryCard}>
                <span style={{ fontSize: 24 }}>{eq.icon}</span>
                <span style={styles.summaryLabel}>{eq.label}</span>
                <span style={{
                  ...styles.summaryCount,
                  color: done === total && total > 0 ? '#22A06B' : '#006FFD',
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
          ) : (
            workerGroups.map(group => {
              const isGroupExpanded = expandedGroupId === group.id;
              const groupStatus = getGroupOverallStatus(records, group.members);

              // Group progress
              const totalChecks = group.members.length * equipmentItems.length;
              let groupDone = 0;
              group.members.forEach(m => {
                equipmentItems.forEach(eq => {
                  const match = records.find(r => r.employee === m.employeeId && r.target === eq.target);
                  if (match?.is_updated && match.is_complied) groupDone++;
                });
              });
              const groupPct = totalChecks > 0 ? (groupDone / totalChecks) * 100 : 0;

              return (
                <div key={group.id} style={styles.groupCard}>
                  {/* Group Header */}
                  <button type="button" style={styles.groupHeaderBtn} onClick={() => toggleGroup(group.id)}>
                    <div style={styles.groupHeaderLeft}>
                      <span style={styles.groupName}>{group.name}</span>
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
                    {group.members.map(member => (
                      <button
                        key={member.employeeId}
                        type="button"
                        style={styles.groupMember}
                        onClick={() => navigate(`/employee/${member.employeeId}`, { state: { siteName: group.name } })}>
                        <span style={{ ...styles.memberAvatar, backgroundColor: member.color }}>
                          {member.name[0]}{member.name[member.name.length - 1]}
                        </span>
                        <span style={styles.memberNameLink}>{member.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Group Progress */}
                  <div style={styles.groupProgressRow}>
                    <div style={styles.progressBarBg}>
                      <div style={{
                        ...styles.progressBarFill,
                        width: `${groupPct}%`,
                        backgroundColor: groupDone === totalChecks && totalChecks > 0 ? '#22A06B' : '#006FFD',
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
                        const eqKey = `${group.id}-${eq.target}`;
                        const isEqExpanded = expandedEquipment === eqKey;
                        const { done, total } = getEquipmentGroupStatus(records, group.members, eq.target);
                        const allDone = done === total && total > 0;
                        const pct = total > 0 ? (done / total) * 100 : 0;

                        return (
                          <div key={eq.target} style={styles.equipmentCard}>
                            {/* Equipment Header */}
                            <button type="button" style={styles.equipmentHeaderBtn} onClick={() => toggleEquipment(eqKey)}>
                              <div style={styles.equipmentHeaderLeft}>
                                <span style={{ fontSize: 20 }}>{eq.icon}</span>
                                <span style={styles.equipmentLabel}>{eq.label}</span>
                                <span style={{
                                  ...styles.equipmentBadge,
                                  backgroundColor: allDone ? '#E8F5E9' : '#EAF2FF',
                                  color: allDone ? '#22A06B' : '#006FFD',
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
                                  backgroundColor: allDone ? '#22A06B' : '#006FFD',
                                }} />
                              </div>
                            </div>

                            {/* Expanded: Per-member status */}
                            {isEqExpanded && (
                              <div style={styles.memberStatusList}>
                                {group.members.map(member => {
                                  const status = getStatusInfo(records, member.employeeId, eq.target);
                                  const matchRecord = records.find(r => r.employee === member.employeeId && r.target === eq.target);
                                  return (
                                    <div key={member.employeeId} style={styles.memberStatusRow}>
                                      <div style={styles.memberStatusLeft}>
                                        <span style={{ ...styles.memberAvatarSmall, backgroundColor: member.color }}>
                                          {member.name[0]}{member.name[member.name.length - 1]}
                                        </span>
                                        <span style={styles.memberStatusName}>{member.name}</span>
                                      </div>
                                      <div style={styles.memberStatusRight}>
                                        {matchRecord && (
                                          <span style={styles.memberStatusTime}>{timeAgo(matchRecord.created_at)}</span>
                                        )}
                                        <span style={{
                                          ...styles.statusBadge,
                                          backgroundColor: status.bg,
                                          color: status.color,
                                        }}>
                                          {status.label}
                                        </span>
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
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8E9EB',
    borderRadius: 12,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
    flex: 1,
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  memberNameLink: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 700,
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
  memberStatusTime: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#8F9098',
  },
  statusBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '3px 12px',
    borderRadius: 6,
    minWidth: 48,
    textAlign: 'center',
  },
};
