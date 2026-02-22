import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type EquipmentCategory = 'HELMET' | 'VEST' | 'SHOES';

type EquipmentItem = {
  category: EquipmentCategory;
  label: string;
  icon: string;
};

type ComplianceRecord = {
  id: number;
  employee: number;
  worksession: number;
  category: string;
  is_complied: boolean | null;
  original_image: string | null;
  detected_image: string | null;
  created_at: string;
  updated_at: string;
};

type WorkerGroup = {
  id: number;
  name: string;
  members: { employeeId: number; name: string; color: string }[];
};

// ── Data ──

const equipmentItems: EquipmentItem[] = [
  { category: 'HELMET', label: '안전모 착용', icon: '⛑️' },
  { category: 'VEST', label: '안전조끼 착용', icon: '🦺' },
  { category: 'SHOES', label: '안전장갑 착용', icon: '🧤' },
];

const workerGroups: WorkerGroup[] = [
  {
    id: 1,
    name: '봉천동 작업공간',
    members: [
      { employeeId: 1, name: '송영민', color: '#006FFD' },
      { employeeId: 2, name: '임정원', color: '#E87C5D' },
    ],
  },
  {
    id: 2,
    name: '신대방동 작업공간',
    members: [
      { employeeId: 3, name: '김태호', color: '#22A06B' },
      { employeeId: 4, name: '박지수', color: '#8F9098' },
    ],
  },
  {
    id: 3,
    name: '신림동 작업공간',
    members: [
      { employeeId: 5, name: '이준혁', color: '#7B61FF' },
      { employeeId: 6, name: '최서연', color: '#E85DBF' },
    ],
  },
  {
    id: 4,
    name: '보라매동 작업공간',
    members: [
      { employeeId: 7, name: '우수연', color: '#FF6B35' },
      { employeeId: 8, name: '원인영', color: '#9B59B6' },
    ],
  },
];

// Mock compliance data matching WorkSessionDetailScreen's mockEquipmentResults
const mockComplianceRecords: ComplianceRecord[] = (() => {
  const mockEquip: Record<number, { employeeId: number; helmet: boolean; vest: boolean; gloves: boolean }[]> = {
    1: [
      { employeeId: 1, helmet: true, vest: true, gloves: true },
      { employeeId: 2, helmet: true, vest: false, gloves: false },
    ],
    2: [
      { employeeId: 3, helmet: true, vest: true, gloves: true },
      { employeeId: 4, helmet: true, vest: true, gloves: true },
    ],
    3: [
      { employeeId: 5, helmet: false, vest: false, gloves: false },
      { employeeId: 6, helmet: false, vest: false, gloves: false },
    ],
    4: [
      { employeeId: 7, helmet: true, vest: true, gloves: true },
      { employeeId: 8, helmet: true, vest: true, gloves: true },
    ],
  };
  const records: ComplianceRecord[] = [];
  let id = 1;
  const now = new Date().toISOString();
  for (const [wsId, members] of Object.entries(mockEquip)) {
    for (const m of members) {
      const mapping: [EquipmentCategory, boolean][] = [
        ['HELMET', m.helmet],
        ['VEST', m.vest],
        ['SHOES', m.gloves],
      ];
      for (const [cat, complied] of mapping) {
        records.push({
          id: id++,
          employee: m.employeeId,
          worksession: Number(wsId),
          category: cat,
          is_complied: complied,
          original_image: null,
          detected_image: null,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }
  return records;
})();

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

const POLL_INTERVAL = 15_000;

// ── Helpers ──

// How many equipment categories (out of 3) have ALL members in a group compliant
function getGroupCategoryProgress(records: ComplianceRecord[], group: WorkerGroup): { done: number; total: number } {
  let done = 0;
  equipmentItems.forEach(eq => {
    const allComplied = group.members.every(m => {
      const match = records.find(r => r.employee === m.employeeId && r.worksession === group.id && r.category === eq.category);
      return match?.is_complied === true;
    });
    if (allComplied) done++;
  });
  return { done, total: equipmentItems.length };
}

function getGroupOverallStatus(records: ComplianceRecord[], group: WorkerGroup): { label: string; color: string; bg: string } {
  const { done, total } = getGroupCategoryProgress(records, group);
  if (done === total) return { label: '완료', color: '#22A06B', bg: '#E8F5E9' };
  if (done > 0) return { label: '진행중', color: '#1565C0', bg: '#E8F0FE' };
  let anyStarted = false;
  group.members.forEach(m => {
    equipmentItems.forEach(eq => {
      if (records.find(r => r.employee === m.employeeId && r.worksession === group.id && r.category === eq.category)) anyStarted = true;
    });
  });
  if (anyStarted) return { label: '진행중', color: '#1565C0', bg: '#E8F0FE' };
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
      // Fetch today's work sessions to get compliance data
      const res = await apiFetch('/worksession/today/');
      if (res.ok) {
        const json = await res.json();
        const sessions: { id: number }[] = json.data ?? [];
        // Fetch compliance records for each session via check/pass
        // Since the backend doesn't have a list endpoint, use mock data as baseline
        // and overlay any real data when available
        const apiRecords: ComplianceRecord[] = [];
        for (const session of sessions) {
          try {
            const passRes = await apiFetch(`/check/pass/?worksession_id=${session.id}`);
            if (passRes.ok) {
              const passData = await passRes.json();
              // If we got real pass data, it means the session has compliance records
              if (passData.ok && passData.passed !== undefined) {
                // Mark records from this session as real
                const group = workerGroups.find(g => g.id === session.id);
                if (group) {
                  for (const member of group.members) {
                    for (const eq of equipmentItems) {
                      apiRecords.push({
                        id: apiRecords.length + 1,
                        employee: member.employeeId,
                        worksession: session.id,
                        category: eq.category,
                        is_complied: passData.passed,
                        original_image: null,
                        detected_image: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                    }
                  }
                }
              }
            }
          } catch { /* ignore individual session errors */ }
        }
        if (apiRecords.length > 0) {
          setRecords(apiRecords);
          return;
        }
      }
    } catch { /* ignore */ }
    // Fallback to mock data consistent with WorkSessionDetailScreen
    setRecords(mockComplianceRecords);
  }, []);

  useEffect(() => {
    fetchRecords().finally(() => setLoading(false));
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

        {/* Summary — 작업공간 */}
        <div style={styles.summaryRow}>
          {workerGroups.map(group => {
            const { done, total } = getGroupCategoryProgress(records, group);
            const status = getGroupOverallStatus(records, group);
            return (
              <div key={group.id} style={styles.summaryCard}>
                <div style={styles.summarySiteInfo}>
                  <span style={styles.summaryLabel}>{group.name}</span>
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
              const groupStatus = getGroupOverallStatus(records, group);

              // Group progress: count categories (out of 3) where ALL members comply
              const { done: groupDone, total: totalChecks } = getGroupCategoryProgress(records, group);
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
                        const eqKey = `${group.id}-${eq.category}`;
                        const isEqExpanded = expandedEquipment === eqKey;
                        // Count members compliant for this equipment type
                        let done = 0;
                        group.members.forEach(m => {
                          const match = records.find(r => r.employee === m.employeeId && r.worksession === group.id && r.category === eq.category);
                          if (match?.is_complied === true) done++;
                        });
                        const total = group.members.length;
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

                            {/* Expanded: Per-member checklist */}
                            {isEqExpanded && (
                              <div style={styles.memberStatusList}>
                                {group.members.map(member => {
                                  const matchRecord = records.find(r => r.employee === member.employeeId && r.worksession === group.id && r.category === eq.category);
                                  const isChecked = matchRecord?.is_complied === true;
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
                                        {/* Checkbox — read-only */}
                                        <div style={{
                                          ...styles.checkbox,
                                          backgroundColor: isChecked ? '#006FFD' : '#FFFFFF',
                                          borderColor: isChecked ? '#006FFD' : '#C5C6CC',
                                        }}>
                                          {isChecked && (
                                            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                                              <path d="M1.5 5L5.5 9L12.5 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          )}
                                        </div>
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
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1.5px solid',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  checkboxPendingDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#E37D00',
  },
};
