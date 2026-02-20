import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.png';

// ── Types ──

type WorkSiteCard = {
  id: number;
  siteName: string;
  startTime: string;
  location: string;
  members: { id: number; name: string }[];
  workStatus: '작업 전' | '작업 중' | '작업 끝';
  equipmentCheck: { memberId: number; name: string; complied: boolean }[];
  riskAssessmentDone: boolean;
  reportDone: boolean;
  reportId?: number;
};

// ── Mock detail data keyed by session id ──

const mockRiskResults: Record<number, { item: string; level: '높음' | '중간' | '낮음'; description: string }[]> = {
  1: [
    { item: '고소 작업', level: '높음', description: '2m 이상 고소 작업 시 안전대 미착용 위험' },
    { item: '전기 설비', level: '중간', description: '노후 전기 설비 감전 위험' },
  ],
  2: [
    { item: '중장비 운행', level: '높음', description: '크레인 반경 내 작업자 충돌 위험' },
  ],
  3: [],
  4: [
    { item: '고소 작업', level: '낮음', description: '안전 장비 착용 완료, 낮은 위험도' },
    { item: '화기 작업', level: '중간', description: '용접 작업 시 화재 위험' },
  ],
};

const mockEquipmentResults: Record<number, { member: string; helmet: boolean; vest: boolean; gloves: boolean }[]> = {
  1: [
    { member: '송영민', helmet: true, vest: true, gloves: true },
    { member: '임정원', helmet: true, vest: false, gloves: false },
  ],
  2: [
    { member: '김태호', helmet: true, vest: true, gloves: true },
    { member: '박지수', helmet: true, vest: true, gloves: true },
  ],
  3: [
    { member: '이준혁', helmet: false, vest: false, gloves: false },
    { member: '최서연', helmet: false, vest: false, gloves: false },
  ],
  4: [
    { member: '우수연', helmet: true, vest: true, gloves: true },
    { member: '원인영', helmet: true, vest: true, gloves: true },
  ],
};

const mockRiskLogs: Record<number, { time: string; type: string; member: string; videoUrl: string | null }[]> = {
  1: [
    { time: '10:23:15', type: '안전모 미착용', member: '임정원', videoUrl: null },
    { time: '11:05:42', type: '작업 구역 이탈', member: '송영민', videoUrl: null },
  ],
  2: [],
  3: [],
  4: [
    { time: '09:17:08', type: '중장비 접근', member: '원인영', videoUrl: null },
  ],
};

const mockWorkPhotos: Record<number, { label: string; url: string | null }[]> = {
  1: [
    { label: '작업 전', url: null },
    { label: '작업 후', url: null },
  ],
  2: [
    { label: '작업 전', url: null },
    { label: '작업 후', url: null },
  ],
  3: [
    { label: '작업 전', url: null },
    { label: '작업 후', url: null },
  ],
  4: [
    { label: '작업 전', url: null },
    { label: '작업 후', url: null },
  ],
};

const riskLevelColor: Record<string, { bg: string; text: string }> = {
  높음: { bg: '#FFEAEA', text: '#D32F2F' },
  중간: { bg: '#FFF4E5', text: '#E8900C' },
  낮음: { bg: '#E7F4E8', text: '#298A3E' },
};

type TabKey = 'risk' | 'equipment' | 'logs' | 'photos';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'risk', label: '위험성 평가 결과', icon: '⚠️' },
  { key: 'equipment', label: '장비 점검 결과', icon: '🦺' },
  { key: 'logs', label: '위험 감지 로그', icon: '🎥' },
  { key: 'photos', label: '작업 전/후 사진', icon: '📷' },
];

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
  { label: '알림 로그 확인', icon: '🔔', path: '/alert-logs' },
];

// ── Check Icon ──

function CheckBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      borderRadius: '50%',
      backgroundColor: ok ? '#E7F4E8' : '#FFEAEA',
      color: ok ? '#298A3E' : '#D32F2F',
      fontSize: 12,
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {ok ? '✓' : '✗'}
    </span>
  );
}

// ── Main Component ──

export default function WorkSessionDetailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id ?? 1);

  const card: WorkSiteCard | undefined = (location.state as any)?.card;
  const siteName = card?.siteName ?? `작업 현장 #${sessionId}`;
  const workStatus = card?.workStatus ?? '작업 중';

  const [activeTab, setActiveTab] = useState<TabKey>('risk');

  const riskResults = mockRiskResults[sessionId] ?? [];
  const equipmentResults = mockEquipmentResults[sessionId] ?? [];
  const riskLogs = mockRiskLogs[sessionId] ?? [];
  const workPhotos = mockWorkPhotos[sessionId] ?? [];

  const workStatusColors: Record<string, { bg: string; text: string }> = {
    '작업 전': { bg: '#F0F1F3', text: '#71727A' },
    '작업 중': { bg: '#E7F4E8', text: '#298A3E' },
    '작업 끝': { bg: '#EAF2FF', text: '#006FFD' },
  };
  const sc = workStatusColors[workStatus] ?? workStatusColors['작업 전'];

  return (
    <div style={styles.container}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={logoImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={styles.logoText}>TTokTTi</span>
        </button>
        <nav style={styles.sidebarNav}>
          {sidebarItems.map(item => (
            <button
              key={item.label}
              type="button"
              style={styles.sidebarNavItem}
              onClick={() => navigate(item.path)}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={styles.sidebarNavLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <button type="button" style={styles.backBtn} onClick={() => navigate('/home')}>
            ← 홈으로
          </button>
          <div style={styles.headerInfo}>
            <h1 style={styles.headerTitle}>{siteName}</h1>
            <div style={styles.headerMeta}>
              {card && (
                <>
                  <span style={styles.headerMetaText}>⏰ 작업 시작 {card.startTime}</span>
                  <span style={styles.headerMetaText}>·</span>
                  <span style={styles.headerMetaText}>📍 {card.location}</span>
                  <span style={styles.headerMetaText}>·</span>
                  {card.members.map((m, i) => (
                    <React.Fragment key={m.id}>
                      {i > 0 && <span style={styles.headerMetaText}>, </span>}
                      <button
                        type="button"
                        style={styles.memberBtn}
                        onClick={() => navigate(`/employee/${m.id}`, { state: { siteName } })}>
                        {m.name}
                      </button>
                    </React.Fragment>
                  ))}
                </>
              )}
              <span style={{ ...styles.statusBadge, backgroundColor: sc.bg, color: sc.text }}>
                {workStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabBar}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.key ? styles.tabBtnActive : {}),
              }}
              onClick={() => setActiveTab(tab.key)}>
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={styles.tabContent}>

          {/* ── 위험성 평가 결과 ── */}
          {activeTab === 'risk' && (
            <div style={styles.section}>
              <span style={styles.sectionTitle}>위험성 평가 결과</span>
              {riskResults.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <span style={styles.emptyText}>위험 항목 없음</span>
                </div>
              ) : (
                <div style={styles.riskList}>
                  {riskResults.map((r, i) => {
                    const lc = riskLevelColor[r.level];
                    return (
                      <div key={i} style={styles.riskRow}>
                        <div style={styles.riskRowLeft}>
                          <span style={{ ...styles.riskLevelBadge, backgroundColor: lc.bg, color: lc.text }}>
                            {r.level}
                          </span>
                          <span style={styles.riskItem}>{r.item}</span>
                        </div>
                        <span style={styles.riskDesc}>{r.description}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 장비 점검 결과 ── */}
          {activeTab === 'equipment' && (
            <div style={styles.section}>
              <span style={styles.sectionTitle}>장비 점검 결과</span>
              <div style={styles.equipTable}>
                {/* Header */}
                <div style={styles.equipHeaderRow}>
                  <span style={{ ...styles.equipCell, ...styles.equipHeaderCell }}>작업자</span>
                  <span style={{ ...styles.equipCell, ...styles.equipHeaderCell, justifyContent: 'center' }}>⛑️ 안전모</span>
                  <span style={{ ...styles.equipCell, ...styles.equipHeaderCell, justifyContent: 'center' }}>🦺 안전조끼</span>
                  <span style={{ ...styles.equipCell, ...styles.equipHeaderCell, justifyContent: 'center' }}>🧤 안전장갑</span>
                </div>
                {equipmentResults.map((eq, i) => (
                  <div key={i} style={{ ...styles.equipRow, backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                    <span style={{ ...styles.equipCell, fontWeight: 600, color: '#1F2024' }}>{eq.member}</span>
                    <span style={{ ...styles.equipCell, justifyContent: 'center' }}><CheckBadge ok={eq.helmet} /></span>
                    <span style={{ ...styles.equipCell, justifyContent: 'center' }}><CheckBadge ok={eq.vest} /></span>
                    <span style={{ ...styles.equipCell, justifyContent: 'center' }}><CheckBadge ok={eq.gloves} /></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 위험 감지 로그 ── */}
          {activeTab === 'logs' && (
            <div style={styles.section}>
              <span style={styles.sectionTitle}>위험 감지 로그</span>
              {riskLogs.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <span style={styles.emptyText}>감지된 위험 없음</span>
                </div>
              ) : (
                <div style={styles.logList}>
                  {riskLogs.map((log, i) => (
                    <div key={i} style={styles.logCard}>
                      <div style={styles.logCardHeader}>
                        <span style={styles.logTime}>{log.time}</span>
                        <span style={styles.logMember}>{log.member}</span>
                        <span style={styles.logTypeBadge}>{log.type}</span>
                      </div>
                      {log.videoUrl ? (
                        <video
                          src={log.videoUrl}
                          controls
                          style={styles.logVideo}
                        />
                      ) : (
                        <div style={styles.logVideoPlaceholder}>
                          <span style={{ fontSize: 28 }}>🎥</span>
                          <span style={styles.logVideoPlaceholderText}>영상 없음</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 작업 전/후 사진 ── */}
          {activeTab === 'photos' && (
            <div style={styles.section}>
              <span style={styles.sectionTitle}>작업 전/후 사진</span>
              <div style={styles.photoGrid}>
                {workPhotos.map((photo, i) => (
                  <div key={i} style={styles.photoCard}>
                    <span style={styles.photoLabel}>{photo.label}</span>
                    {photo.url ? (
                      <img src={photo.url} alt={photo.label} style={styles.photoImg} />
                    ) : (
                      <div style={styles.photoPlaceholder}>
                        <span style={{ fontSize: 32 }}>📷</span>
                        <span style={styles.photoPlaceholderText}>사진 없음</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
    gap: 24,
    flexShrink: 0,
  },
  sidebarLogo: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  sidebarNavLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#71727A',
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
    overflowY: 'auto',
  },

  // Header
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  backBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    alignSelf: 'flex-start',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 28,
    color: '#1F2024',
    margin: 0,
  },
  headerMeta: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerMetaText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#71727A',
  },
  memberBtn: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  statusBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 10,
  },

  // Tabs
  tabBar: {
    display: 'flex',
    flexDirection: 'row',
    gap: 0,
    borderBottom: '2px solid #E8E9EB',
    marginBottom: 24,
  },
  tabBtn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#71727A',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    cursor: 'pointer',
  },
  tabBtnActive: {
    color: '#006FFD',
    fontWeight: 700,
    borderBottom: '2px solid #006FFD',
  },
  tabContent: {
    flex: 1,
  },

  // Section
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#1F2024',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '60px 0',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
  },
  emptyText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#8F9098',
  },

  // Risk list
  riskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  riskRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    padding: '14px 20px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  riskRowLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  riskLevelBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 6,
  },
  riskItem: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#1F2024',
  },
  riskDesc: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#71727A',
    flex: 1,
    textAlign: 'right',
  },

  // Equipment table
  equipTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    overflow: 'hidden',
  },
  equipHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #E8E9EB',
  },
  equipRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1px solid #F0F1F3',
  },
  equipCell: {
    flex: 1,
    padding: '12px 20px',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#71727A',
    display: 'flex',
    alignItems: 'center',
  },
  equipHeaderCell: {
    fontWeight: 700,
    color: '#1F2024',
    fontSize: 12,
  },

  // Risk logs
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    overflow: 'hidden',
  },
  logCardHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    borderBottom: '1px solid #F0F1F3',
  },
  logTime: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#8F9098',
  },
  logMember: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#1F2024',
  },
  logTypeBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    color: '#DC2626',
    backgroundColor: '#FFEAEA',
    padding: '2px 10px',
    borderRadius: 6,
  },
  logVideo: {
    width: '100%',
    maxHeight: 280,
    backgroundColor: '#000',
    objectFit: 'contain',
    display: 'block',
  },
  logVideoPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: '40px 0',
    backgroundColor: '#F8F9FA',
  },
  logVideoPlaceholderText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#8F9098',
  },

  // Photos
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  photoLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#1F2024',
    padding: '12px 16px',
    borderBottom: '1px solid #F0F1F3',
  },
  photoImg: {
    width: '100%',
    height: 220,
    objectFit: 'cover',
  },
  photoPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 220,
    backgroundColor: '#F8F9FA',
  },
  photoPlaceholderText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#8F9098',
  },
};
