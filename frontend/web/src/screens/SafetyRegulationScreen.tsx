import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Types ──

type RiskLevel = '높음' | '보통' | '낮음';

type CheckItem = {
  label: string;
  checked: boolean;
};

type RegulationCard = {
  id: number;
  status: 'danger' | 'warning' | 'default' | 'done';
  title: string;
  riskLevel: RiskLevel;
  legislation: string;
  dueLabel: string;
  dueOverdue: boolean;
  tags: string[];
  progress: [number, number];
  progressColor: string;
  description?: string;
  checklist: CheckItem[];
};

type WorkerGroup = {
  id: number;
  name: string;
  members: { name: string; color: string }[];
  regulationIds: number[];
};

// ── Data ──

const regulations: RegulationCard[] = [
  {
    id: 1,
    status: 'danger',
    title: '사다리식 통로 구조 점검',
    riskLevel: '높음',
    legislation: '산업안전보건기준 제24조',
    dueLabel: '2일 초과',
    dueOverdue: true,
    tags: ['구조점검', '제24조'],
    progress: [2, 5],
    progressColor: '#006FFD',
    checklist: [
      { label: '사다리 발판 간격 규정 확인 (30cm 이내)', checked: true },
      { label: '사다리 기울기 적정성 점검 (75도)', checked: true },
      { label: '미끄럼 방지 장치 설치 여부', checked: false },
      { label: '사다리 상단 고정 상태 확인', checked: false },
      { label: '통로 폭 규정 준수 여부 (60cm 이상)', checked: false },
    ],
  },
  {
    id: 2,
    status: 'warning',
    title: '이동식 사다리 넘어짐 방지 조치',
    riskLevel: '높음',
    legislation: '산업안전보건기준 제24조 6항',
    dueLabel: '내일 마감',
    dueOverdue: true,
    tags: ['넘어짐방지', '제24조'],
    progress: [1, 2],
    progressColor: '#006FFD',
    checklist: [
      { label: '아웃트리거 설치 및 고정 확인', checked: true },
      { label: '바닥면 수평 상태 확인', checked: false },
    ],
  },
  {
    id: 3,
    status: 'warning',
    title: '발붙임 사다리(A형) 작업높이별 안전조치',
    riskLevel: '보통',
    legislation: '이동식사다리 안전작업지침',
    dueLabel: '3일 남음',
    dueOverdue: false,
    tags: ['발붙임사다리', '안전대'],
    progress: [2, 4],
    progressColor: '#006FFD',
    checklist: [
      { label: '2m 이상 작업 시 안전대 착용 확인', checked: true },
      { label: '사다리 벌림 각도 확인 (1/4 이하)', checked: true },
      { label: '상부 작업 시 헬멧 착용 확인', checked: false },
      { label: '작업 도구 낙하 방지 조치', checked: false },
    ],
  },
  {
    id: 4,
    status: 'default',
    title: '추락 방지용 비계 설치 확인',
    riskLevel: '보통',
    legislation: '산업안전보건기준 제42조',
    dueLabel: '5일 남음',
    dueOverdue: false,
    tags: ['추락방지', '비계', '제42조'],
    progress: [0, 2],
    progressColor: '#8F9098',
    description: '추락 위험 장소에서 비계 조립 등 작업발판 설치 여부 확인',
    checklist: [
      { label: '비계 설치 여부 확인', checked: false },
      { label: '작업발판 안전 상태 점검', checked: false },
    ],
  },
  {
    id: 5,
    status: 'default',
    title: '접이식 사다리 철물 고정 점검',
    riskLevel: '낮음',
    legislation: '산업안전보건기준 제24조 10항',
    dueLabel: '6일 남음',
    dueOverdue: false,
    tags: ['접이식', '철물고정'],
    progress: [0, 2],
    progressColor: '#8F9098',
    checklist: [
      { label: '힌지 부위 볼트 조임 상태 확인', checked: false },
      { label: '잠금 장치 정상 작동 확인', checked: false },
    ],
  },
  {
    id: 6,
    status: 'default',
    title: '안전대 부착설비 설치 확인',
    riskLevel: '높음',
    legislation: '산업안전보건기준 제44조',
    dueLabel: '2일 남음',
    dueOverdue: false,
    tags: ['안전대', '제44조'],
    progress: [0, 3],
    progressColor: '#8F9098',
    checklist: [
      { label: '안전대 부착설비 설치 위치 적정성 확인', checked: false },
      { label: '부착설비 내하중 시험 확인', checked: false },
      { label: '안전대 연결 고리 상태 점검', checked: false },
    ],
  },
  {
    id: 7,
    status: 'done',
    title: '경작업 대상 작업 분류 및 게시',
    riskLevel: '낮음',
    legislation: '이동식사다리 안전작업지침',
    dueLabel: '4일 초과',
    dueOverdue: true,
    tags: ['경작업', '게시'],
    progress: [3, 3],
    progressColor: '#22A06B',
    checklist: [
      { label: '경작업 대상 작업 목록 작성', checked: true },
      { label: '작업 분류 기준표 게시', checked: true },
      { label: '작업자 교육 실시 확인', checked: true },
    ],
  },
];

const workerGroups: WorkerGroup[] = [
  {
    id: 1,
    name: '사다리 작업 1조',
    members: [
      { name: '똑띠', color: '#006FFD' },
      { name: 'TTokTTi', color: '#E87C5D' },
    ],
    regulationIds: [1, 2],
  },
  {
    id: 2,
    name: '사다리 작업 2조',
    members: [
      { name: '우수연', color: '#22A06B' },
      { name: '원인영', color: '#8F9098' },
    ],
    regulationIds: [3, 4],
  },
  {
    id: 3,
    name: '사다리 작업 3조',
    members: [
      { name: '이민호', color: '#7B61FF' },
      { name: '송영민', color: '#E85DBF' },
    ],
    regulationIds: [5, 6],
  },
  {
    id: 4,
    name: '사다리 작업 4조',
    members: [
      { name: '이재성', color: '#FF8A00' },
      { name: '임정원', color: '#00B8D9' },
    ],
    regulationIds: [7],
  },
];

const regulationMap = new Map(regulations.map(r => [r.id, r]));

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '안전 규정 확인', icon: '🛡️', path: '/safety' },
  { label: '근로자 위험도', icon: '👤', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

type TabItem = { label: string; badge?: string };

const tabItems: TabItem[] = [
  { label: 'Overview' },
  { label: 'Tasks', badge: '7' },
  { label: 'Documents', badge: '2' },
  { label: 'Team', badge: '99+' },
  { label: 'Reports' },
  { label: 'Admin' },
];

// ── Helper ──

const riskColors: Record<RiskLevel, { bg: string; text: string }> = {
  '높음': { bg: '#FFEAEA', text: '#D32F2F' },
  '보통': { bg: '#E8F0FE', text: '#1565C0' },
  '낮음': { bg: '#E8F5E9', text: '#2E7D32' },
};

const statusIcons: Record<string, { emoji: string; bg: string }> = {
  danger: { emoji: '⚠️', bg: '#D32F2F' },
  warning: { emoji: 'ℹ️', bg: '#1565C0' },
  default: { emoji: '○', bg: 'transparent' },
  done: { emoji: '✔️', bg: '#22A06B' },
};

// ── Main Component ──

export default function SafetyRegulationScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Tasks');
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(1);
  const [expandedRegId, setExpandedRegId] = useState<number | null>(null);

  // Replace 송영민 in 3조 with the logged-in user's name
  const groups = useMemo(() => {
    if (!user) return workerGroups;
    return workerGroups.map(g => {
      if (g.id !== 3) return g;
      return {
        ...g,
        members: g.members.map((m, i) =>
          i === 1 ? { ...m, name: user.userName } : m
        ),
      };
    });
  }, [user]);
  const [checkStates, setCheckStates] = useState<Record<number, boolean[]>>(() => {
    const init: Record<number, boolean[]> = {};
    regulations.forEach(r => {
      init[r.id] = r.checklist.map(c => c.checked);
    });
    return init;
  });

  const toggleGroupExpand = (id: number) => {
    setExpandedGroupId(prev => (prev === id ? null : id));
    setExpandedRegId(null);
  };

  const toggleRegExpand = (id: number) => {
    setExpandedRegId(prev => (prev === id ? null : id));
  };

  const toggleCheck = (cardId: number, checkIdx: number) => {
    setCheckStates(prev => {
      const arr = [...prev[cardId]];
      arr[checkIdx] = !arr[checkIdx];
      return { ...prev, [cardId]: arr };
    });
  };

  const getProgress = (cardId: number): [number, number] => {
    const checks = checkStates[cardId];
    if (!checks) return [0, 0];
    const done = checks.filter(Boolean).length;
    return [done, checks.length];
  };

  const getGroupProgress = (group: WorkerGroup): [number, number] => {
    let totalDone = 0;
    let totalAll = 0;
    group.regulationIds.forEach(rid => {
      const [d, t] = getProgress(rid);
      totalDone += d;
      totalAll += t;
    });
    return [totalDone, totalAll];
  };

  const getGroupStatus = (group: WorkerGroup): { label: string; color: string; bg: string } => {
    const [done, total] = getGroupProgress(group);
    if (total > 0 && done === total) return { label: '완료', color: '#22A06B', bg: '#E8F5E9' };
    if (done > 0) return { label: '진행중', color: '#1565C0', bg: '#E8F0FE' };
    return { label: '미시작', color: '#71727A', bg: '#F0F1F3' };
  };

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
          <input style={styles.sidebarSearchInput} type="text" placeholder="Search for..." />
        </div>

        <nav style={styles.sidebarNav}>
          {sidebarItems.map(item => {
            const isActive = item.label === '안전 규정 확인';
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
          <h1 style={styles.headerTitle}>안전 규정 확인</h1>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          <div style={styles.tabs}>
            {tabItems.map(tab => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  type="button"
                  style={{ ...styles.tab, ...(isActive ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab(tab.label)}>
                  <span style={{ ...styles.tabLabel, ...(isActive ? styles.tabLabelActive : {}) }}>
                    {tab.label}
                  </span>
                  {tab.badge && (
                    <span style={{ ...styles.tabBadge, ...(isActive ? styles.tabBadgeActive : {}) }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
            <button type="button" style={styles.tab}>
              <span style={styles.tabLabel}>•••</span>
            </button>
          </div>
          <div style={styles.headerSearch}>
            <span style={{ fontSize: 14, color: '#8F9098' }}>🔍</span>
            <input style={styles.headerSearchInput} type="text" placeholder="Search" />
          </div>
        </div>

        {/* Worker Group Cards */}
        <div style={styles.cardList}>
          {groups.map(group => {
            const isGroupExpanded = expandedGroupId === group.id;
            const [groupDone, groupTotal] = getGroupProgress(group);
            const groupPct = groupTotal > 0 ? (groupDone / groupTotal) * 100 : 0;
            const groupStatus = getGroupStatus(group);
            const groupRegs = group.regulationIds.map(rid => regulationMap.get(rid)!).filter(Boolean);

            return (
              <div key={group.id} style={styles.groupCard}>
                {/* Group Header */}
                <button
                  type="button"
                  style={styles.groupHeaderBtn}
                  onClick={() => toggleGroupExpand(group.id)}>
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
                    <div key={member.name} style={styles.groupMember}>
                      <span style={{ ...styles.memberAvatar, backgroundColor: member.color }}>
                        {member.name[0]}{member.name[member.name.length - 1]}
                      </span>
                      <span style={styles.memberName}>{member.name}</span>
                    </div>
                  ))}
                </div>

                {/* Group Progress */}
                <div style={styles.groupProgressRow}>
                  <div style={styles.progressBarBg}>
                    <div style={{
                      ...styles.progressBarFill,
                      width: `${groupPct}%`,
                      backgroundColor: groupDone === groupTotal && groupTotal > 0 ? '#22A06B' : '#006FFD',
                    }} />
                  </div>
                  <span style={{
                    ...styles.progressText,
                    color: groupDone === groupTotal && groupTotal > 0 ? '#22A06B' : '#71727A',
                  }}>
                    {groupDone}/{groupTotal}
                  </span>
                </div>

                {/* Expanded: Regulation Cards */}
                {isGroupExpanded && (
                  <div style={styles.groupRegulations}>
                    {groupRegs.map(card => {
                      const isRegExpanded = expandedRegId === card.id;
                      const risk = riskColors[card.riskLevel];
                      const statusIcon = statusIcons[card.status];
                      const [done, total] = getProgress(card.id);
                      const progressPct = total > 0 ? (done / total) * 100 : 0;
                      const checks = checkStates[card.id] || [];

                      return (
                        <div key={card.id} style={styles.regulationCard}>
                          {/* Regulation Header */}
                          <button
                            type="button"
                            style={styles.cardHeaderBtn}
                            onClick={() => toggleRegExpand(card.id)}>
                            <div style={{
                              ...styles.statusIcon,
                              backgroundColor: statusIcon.bg !== 'transparent' ? statusIcon.bg : undefined,
                              border: statusIcon.bg === 'transparent' ? '2px solid #C5C6CC' : 'none',
                            }}>
                              {card.status === 'default' ? (
                                <span style={{ fontSize: 14, color: '#C5C6CC' }}>○</span>
                              ) : (
                                <span style={{ fontSize: 14 }}>{statusIcon.emoji}</span>
                              )}
                            </div>

                            <div style={styles.cardTitleArea}>
                              <div style={styles.cardTitleRow}>
                                <span style={styles.cardTitle}>{card.title}</span>
                                <span style={{
                                  ...styles.riskBadge,
                                  backgroundColor: risk.bg,
                                  color: risk.text,
                                }}>
                                  {card.riskLevel}
                                </span>
                              </div>
                              <span style={styles.cardLegislation}>{card.legislation}</span>
                            </div>

                            <span style={styles.expandArrow}>{isRegExpanded ? '▲' : '▼'}</span>
                          </button>

                          {/* Meta Row */}
                          <div style={styles.metaRow}>
                            <span style={styles.metaDivider}>📅</span>
                            <span style={{ ...styles.dueLabel, color: card.dueOverdue ? '#D32F2F' : '#71727A' }}>
                              {card.dueLabel}
                            </span>
                            {card.tags.map(tag => (
                              <span key={tag} style={styles.tag}>{tag}</span>
                            ))}
                          </div>

                          {/* Progress Bar */}
                          <div style={styles.progressSection}>
                            <div style={styles.progressBarBg}>
                              <div style={{
                                ...styles.progressBarFill,
                                width: `${progressPct}%`,
                                backgroundColor: done === total && total > 0 ? '#22A06B' : card.progressColor,
                              }} />
                            </div>
                            <span style={{
                              ...styles.progressText,
                              color: done === total && total > 0 ? '#22A06B' : '#71727A',
                            }}>
                              {done}/{total}
                            </span>
                          </div>

                          {/* Expanded: Checklist */}
                          {isRegExpanded && (
                            <div style={styles.expandedContent}>
                              {card.description && (
                                <p style={styles.description}>{card.description}</p>
                              )}
                              <div style={styles.checklistSection}>
                                <span style={styles.checklistTitle}>체크리스트</span>
                                {card.checklist.map((item, idx) => (
                                  <label key={idx} style={styles.checkItem}>
                                    <input
                                      type="checkbox"
                                      checked={checks[idx] || false}
                                      onChange={() => toggleCheck(card.id, idx)}
                                      style={styles.checkInput}
                                    />
                                    <span style={{
                                      ...styles.checkLabel,
                                      textDecoration: checks[idx] ? 'line-through' : 'none',
                                      color: checks[idx] ? '#8F9098' : '#1F2024',
                                    }}>
                                      {item.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 28,
    color: '#1F2024',
    margin: 0,
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
    borderBottom: '2px solid transparent',
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
  memberName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#1F2024',
  },
  groupProgressRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Regulations inside group
  groupRegulations: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    borderTop: '1px solid #E8E9EB',
    marginTop: 4,
    paddingTop: 16,
  },

  // Regulation Card
  regulationCard: {
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #E8E9EB',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardHeaderBtn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
    width: '100%',
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardTitleArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardTitleRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 15,
    color: '#1F2024',
  },
  riskBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '2px 10px',
    borderRadius: 4,
    flexShrink: 0,
  },
  cardLegislation: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#71727A',
  },
  expandArrow: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    color: '#8F9098',
    marginTop: 6,
    flexShrink: 0,
  },

  // Meta Row
  metaRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 42,
    flexWrap: 'wrap',
  },
  metaDivider: {
    fontSize: 14,
  },
  dueLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
  },
  tag: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#006FFD',
    backgroundColor: '#EAF2FF',
    padding: '3px 10px',
    borderRadius: 4,
  },

  // Progress
  progressSection: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 42,
  },
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

  // Expanded Content
  expandedContent: {
    paddingLeft: 42,
    paddingTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderTop: '1px solid #E8E9EB',
    marginTop: 4,
  },
  description: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#71727A',
    lineHeight: '20px',
    margin: 0,
    paddingTop: 8,
  },
  checklistSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 4,
  },
  checklistTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#1F2024',
  },
  checkItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  checkInput: {
    width: 18,
    height: 18,
    accentColor: '#006FFD',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
  },
};
