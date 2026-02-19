import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type RiskGrade = 'Low' | 'Medium' | 'High' | 'Critical';

type Hazard = {
  id: string;
  title: string;
  evidence_from_image: string;
  expected_accident: string;
  likelihood_L_1_5: number;
  severity_S_1_5: number;
  risk_R_1_25: number;
  risk_grade: RiskGrade;
  mitigations_before_work: string[];
  residual_likelihood_L_1_5: number;
  residual_severity_S_1_5: number;
  residual_risk_R_1_25: number;
  residual_risk_grade: RiskGrade;
};

type AdminReport = {
  scene_summary: {
    work_environment: string;
    work_height_or_location: string;
    observed_safety_facilities: string[];
    needs_verification: string[];
  };
  hazards: Hazard[];
  overall: {
    overall_max_R: number;
    overall_grade: RiskGrade;
    work_permission: string;
    urgent_fix_before_work: string[];
  };
};

type PhotoCategory = 'workspace' | 'ladder' | 'commbox';

type WorkspacePhotos = {
  workspace: string | null; // 작업 공간
  ladder: string | null;    // 사다리
  commbox: string | null;   // 통신함
};

type WorkspaceRisk = {
  id: number;
  siteName: string;
  startTime: string;
  workStatus: '작업 전' | '작업 중' | '작업 끝';
  members: { id: number; name: string }[];
  assessmentId: number | null;
  photos: WorkspacePhotos;       // blob names
  photoUrls: WorkspacePhotos;    // resolved SAS URLs
  adminReport: AdminReport | null;
};

// ── Data ──

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

const PHOTO_LABELS: Record<PhotoCategory, string> = {
  workspace: '작업 공간',
  ladder: '사다리',
  commbox: '통신함',
};

const PHOTO_ICONS: Record<PhotoCategory, string> = {
  workspace: '🏗️',
  ladder: '🪜',
  commbox: '📦',
};

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Low: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  Medium: { bg: '#FFF7ED', text: '#D97706', border: '#FDE68A' },
  High: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  Critical: { bg: '#FEF2F2', text: '#991B1B', border: '#F87171' },
};

const PERMISSION_COLORS: Record<string, { bg: string; text: string }> = {
  '작업 가능': { bg: '#ECFDF5', text: '#059669' },
  '개선조치 후 작업': { bg: '#FFF7ED', text: '#D97706' },
  '조치 전 작업 금지': { bg: '#FEF2F2', text: '#DC2626' },
};

const workStatusColors: Record<string, { bg: string; text: string }> = {
  '작업 전': { bg: '#F0F1F3', text: '#71727A' },
  '작업 중': { bg: '#E7F4E8', text: '#298A3E' },
  '작업 끝': { bg: '#EAF2FF', text: '#006FFD' },
};

// ── Mock Data (worksession list only) ──

const emptyPhotos: WorkspacePhotos = { workspace: null, ladder: null, commbox: null };

const mockWorkspaces: Omit<WorkspaceRisk, 'assessmentId' | 'adminReport'>[] = [
  {
    id: 1,
    siteName: '봉천동 작업공간',
    startTime: '08:30',
    workStatus: '작업 전',
    members: [{ id: 1, name: '송영민' }, { id: 2, name: '임정원' }],
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
  },
  {
    id: 2,
    siteName: '신대방동 작업공간',
    startTime: '08:30',
    workStatus: '작업 중',
    members: [{ id: 3, name: '김태호' }, { id: 4, name: '박지수' }],
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
  },
  {
    id: 3,
    siteName: '신림동 작업공간',
    startTime: '08:50',
    workStatus: '작업 중',
    members: [{ id: 5, name: '이준혁' }, { id: 6, name: '최서연' }],
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
  },
  {
    id: 4,
    siteName: '보라매동 작업공간',
    startTime: '09:10',
    workStatus: '작업 끝',
    members: [{ id: 7, name: '우수연' }, { id: 8, name: '원인영' }],
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
  },
];

// ── Helpers ──

function getGradeStyle(grade: string) {
  return GRADE_COLORS[grade] ?? GRADE_COLORS.Medium;
}

function getPermissionStyle(permission: string) {
  return PERMISSION_COLORS[permission] ?? PERMISSION_COLORS['개선조치 후 작업'];
}

function fetchImageUrl(blobName: string): Promise<string> {
  return apiFetch(`/risk/media/sas/?blob_name=${encodeURIComponent(blobName)}`)
    .then(res => res.ok ? res.json() : null)
    .then(data => data?.url?.download_url ?? '')
    .catch(() => '');
}

// ── Sub Components ──

function PhotoCard({ label, icon, url }: { label: string; icon: string; url: string | null }) {
  return (
    <div style={styles.photoCard}>
      <div style={styles.photoCardHeader}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={styles.photoCardLabel}>{label}</span>
      </div>
      {url ? (
        <img src={url} alt={label} style={styles.photoImage} />
      ) : (
        <div style={styles.photoPlaceholder}>
          <span style={{ fontSize: 28, color: '#C5C6CC' }}>📷</span>
          <span style={styles.photoPlaceholderText}>사진 미등록</span>
        </div>
      )}
    </div>
  );
}

function IntegratedAssessmentView({ report }: { report: AdminReport }) {
  const overall = report.overall;
  const scene = report.scene_summary;
  const hazards = report.hazards;
  const gs = getGradeStyle(overall.overall_grade);
  const ps = getPermissionStyle(overall.work_permission);

  const topHazards = [...hazards]
    .sort((a, b) => b.risk_R_1_25 - a.risk_R_1_25)
    .slice(0, 2);

  return (
    <div style={styles.assessmentContainer}>
      {/* Header: Overall Grade + Permission */}
      <div style={styles.assessmentHeader}>
        <div style={styles.assessmentHeaderLeft}>
          <span style={{ ...styles.overallGradeBadge, backgroundColor: gs.bg, color: gs.text, borderColor: gs.border }}>
            {overall.overall_grade}
          </span>
          <span style={{ ...styles.overallScore, color: gs.text }}>
            R = {overall.overall_max_R}
          </span>
        </div>
        <span style={{ ...styles.permissionBadgeLarge, backgroundColor: ps.bg, color: ps.text }}>
          {overall.work_permission}
        </span>
      </div>

      {/* Executive Summary */}
      <div style={styles.sectionBlock}>
        <span style={styles.sectionBlockTitle}>종합 평가</span>
        <p style={styles.summaryText}>
          위험성 평가 결과 '<strong>{overall.overall_grade}</strong>' 수준이며
          작업 상태는 '<strong>{overall.work_permission}</strong>'입니다.
        </p>
        {topHazards.length > 0 && (
          <div style={styles.keyRisksWrap}>
            <span style={styles.keyRisksLabel}>주요 위험 요소:</span>
            {topHazards.map((h, i) => {
              const hgs = getGradeStyle(h.risk_grade);
              return (
                <div key={i} style={styles.keyRiskItem}>
                  <span style={{ ...styles.keyRiskBadge, backgroundColor: hgs.bg, color: hgs.text }}>
                    {h.risk_grade} (R={h.risk_R_1_25})
                  </span>
                  <span style={styles.keyRiskTitle}>{h.title}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Work Environment */}
      <div style={styles.sectionBlock}>
        <span style={styles.sectionBlockTitle}>작업 환경</span>
        <div style={styles.envGrid}>
          <div style={styles.envItem}>
            <span style={styles.envLabel}>작업 환경</span>
            <span style={styles.envValue}>{scene.work_environment}</span>
          </div>
          <div style={styles.envItem}>
            <span style={styles.envLabel}>작업 높이/위치</span>
            <span style={styles.envValue}>{scene.work_height_or_location}</span>
          </div>
        </div>
        {scene.observed_safety_facilities.length > 0 && (
          <div style={styles.listBlock}>
            <span style={styles.listBlockLabel}>확인된 안전 시설:</span>
            {scene.observed_safety_facilities.map((item, i) => (
              <div key={i} style={styles.listItem}>
                <span style={styles.listBullet}>-</span>
                <span style={styles.listText}>{item}</span>
              </div>
            ))}
          </div>
        )}
        {scene.needs_verification.length > 0 && (
          <div style={styles.listBlock}>
            <span style={styles.listBlockLabel}>확인 필요 사항:</span>
            {scene.needs_verification.map((item, i) => (
              <div key={i} style={styles.listItem}>
                <span style={{ ...styles.listBullet, color: '#D97706' }}>!</span>
                <span style={styles.listText}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Details */}
      <div style={styles.sectionBlock}>
        <span style={styles.sectionBlockTitle}>위험 요소 상세</span>
        <div style={styles.hazardList}>
          {hazards.map((h, i) => {
            const hgs = getGradeStyle(h.risk_grade);
            const rgs = getGradeStyle(h.residual_risk_grade);
            return (
              <div key={i} style={{ ...styles.hazardCard, borderLeftColor: hgs.text }}>
                <div style={styles.hazardCardHeader}>
                  <span style={styles.hazardTitle}>{h.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...styles.hazardScore, color: hgs.text }}>R={h.risk_R_1_25}</span>
                    <span style={{ ...styles.hazardGradeBadge, backgroundColor: hgs.bg, color: hgs.text }}>
                      {h.risk_grade}
                    </span>
                  </div>
                </div>
                <div style={styles.hazardBody}>
                  <div style={styles.hazardRow}>
                    <span style={styles.hazardLabel}>근거:</span>
                    <span style={styles.hazardValue}>{h.evidence_from_image}</span>
                  </div>
                  <div style={styles.hazardRow}>
                    <span style={styles.hazardLabel}>예상 사고:</span>
                    <span style={styles.hazardValue}>{h.expected_accident}</span>
                  </div>
                  {h.mitigations_before_work.length > 0 && (
                    <div style={styles.mitigationsBlock}>
                      <span style={styles.mitigationsLabel}>작업 전 필요 조치:</span>
                      {h.mitigations_before_work.map((m, j) => (
                        <div key={j} style={styles.mitigationItem}>
                          <span style={styles.mitigationBullet}>-</span>
                          <span style={styles.mitigationText}>{m}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={styles.residualRow}>
                    <span style={styles.hazardLabel}>조치 후 잔여 위험:</span>
                    <span style={{ ...styles.residualBadge, backgroundColor: rgs.bg, color: rgs.text }}>
                      {h.residual_risk_grade} (R={h.residual_risk_R_1_25})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Actions */}
      {overall.urgent_fix_before_work.length > 0 && (
        <div style={{ ...styles.sectionBlock, backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
          <span style={{ ...styles.sectionBlockTitle, color: '#DC2626' }}>작업 전 필수 조치사항</span>
          {overall.urgent_fix_before_work.map((action, i) => (
            <div key={i} style={styles.urgentActionItem}>
              <span style={styles.urgentActionNumber}>{i + 1}</span>
              <span style={styles.urgentActionText}>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceRiskCard({
  workspace,
  isExpanded,
  onToggle,
}: {
  workspace: WorkspaceRisk;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const sc = workStatusColors[workspace.workStatus] ?? workStatusColors['작업 전'];
  const report = workspace.adminReport;

  return (
    <div style={styles.workspaceCard}>
      {/* Card Header */}
      <button type="button" style={styles.workspaceCardHeader} onClick={onToggle}>
        <div style={styles.workspaceCardHeaderLeft}>
          <span style={styles.workspaceName}>{workspace.siteName}</span>
          <span style={{ ...styles.workStatusBadge, backgroundColor: sc.bg, color: sc.text }}>
            {workspace.workStatus}
          </span>
          {report && (
            <span style={{
              ...styles.riskBadge,
              backgroundColor: getPermissionStyle(report.overall.work_permission).bg,
              color: getPermissionStyle(report.overall.work_permission).text,
            }}>
              {report.overall.work_permission}
            </span>
          )}
        </div>
        <div style={styles.workspaceCardHeaderRight}>
          <div style={styles.workspaceMeta}>
            <span style={{ fontSize: 13 }}>⏰</span>
            <span style={styles.workspaceMetaText}>작업 시작 {workspace.startTime}</span>
          </div>
          <div style={styles.workspaceMembers}>
            {workspace.members.map((m, i) => (
              <React.Fragment key={m.id}>
                {i > 0 && <span style={{ color: '#8F9098', fontSize: 13 }}>, </span>}
                <span style={styles.memberName}>{m.name}</span>
              </React.Fragment>
            ))}
          </div>
          <span style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={styles.workspaceCardBody}>
          {/* Photos Section */}
          <div style={styles.photosSection}>
            <span style={styles.sectionLabel}>현장 사진 (직원 촬영)</span>
            <div style={styles.photosGrid}>
              {(['workspace', 'ladder', 'commbox'] as PhotoCategory[]).map(cat => (
                <PhotoCard
                  key={cat}
                  label={PHOTO_LABELS[cat]}
                  icon={PHOTO_ICONS[cat]}
                  url={workspace.photoUrls[cat]}
                />
              ))}
            </div>
          </div>

          {/* Risk Assessment Section */}
          <div style={styles.riskSection}>
            <span style={styles.sectionLabel}>위험성 평가 결과</span>
            {report ? (
              <IntegratedAssessmentView report={report} />
            ) : (
              <div style={styles.noAssessment}>
                <span style={{ fontSize: 32 }}>📋</span>
                <span style={styles.noAssessmentText}>아직 위험성 평가가 진행되지 않았습니다.</span>
                <span style={styles.noAssessmentHint}>직원이 현장 사진을 업로드하면 AI 기반 위험성 평가가 자동으로 수행됩니다.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function WorkerRiskScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isProfileActive = location.pathname === '/profile';
  const unreadCount = useUnreadAlertCount();

  const [workspaces, setWorkspaces] = useState<WorkspaceRisk[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAssessmentForWorkspace = useCallback(
    async (ws: typeof mockWorkspaces[number]): Promise<WorkspaceRisk> => {
      const base: WorkspaceRisk = {
        ...ws,
        assessmentId: null,
        adminReport: null,
      };

      try {
        // Check if a completed assessment exists for this worksession
        const latestRes = await apiFetch(`/risk/latest/${ws.id}`);
        if (!latestRes.ok) return base;
        const latestData = await latestRes.json();
        if (!latestData.exists) return base;

        const assessmentId = latestData.assessment_id;

        // Fetch the full admin report
        const reportRes = await apiFetch(`/risk/admin/${assessmentId}`);
        if (!reportRes.ok) return { ...base, assessmentId };
        const reportData = await reportRes.json();

        const images: { id: number; blob_name: string; created_at: string }[] = reportData.images ?? [];
        const adminReport: AdminReport = {
          scene_summary: reportData.report?.scene_summary ?? {
            work_environment: '',
            work_height_or_location: '',
            observed_safety_facilities: [],
            needs_verification: [],
          },
          hazards: reportData.report?.hazards ?? [],
          overall: reportData.report?.overall ?? {
            overall_max_R: 0,
            overall_grade: 'Low',
            work_permission: '작업 가능',
            urgent_fix_before_work: [],
          },
        };

        // Map images to the 3 photo categories by order (workspace, ladder, commbox)
        const categories: PhotoCategory[] = ['workspace', 'ladder', 'commbox'];
        const photos: WorkspacePhotos = { ...emptyPhotos };
        const photoUrls: WorkspacePhotos = { ...emptyPhotos };

        for (let i = 0; i < Math.min(images.length, categories.length); i++) {
          photos[categories[i]] = images[i].blob_name;
          photoUrls[categories[i]] = await fetchImageUrl(images[i].blob_name);
        }

        return {
          ...base,
          assessmentId,
          photos,
          photoUrls,
          adminReport,
        };
      } catch {
        return base;
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);
    Promise.all(mockWorkspaces.map(ws => fetchAssessmentForWorkspace(ws)))
      .then(resolved => setWorkspaces(resolved))
      .finally(() => setLoading(false));
  }, [fetchAssessmentForWorkspace]);

  const handleToggle = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

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
          <div>
            <h1 style={styles.headerTitle}>위험성 평가</h1>
            <span style={styles.headerSub}>직원이 촬영한 현장 사진 기반 AI 위험성 평가</span>
          </div>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Section Header */}
        <div style={styles.sectionHeader}>
          <span style={styles.sectionHeaderTitle}>오늘의 작업 현장</span>
          <span style={styles.sectionBadge}>{workspaces.length}</span>
        </div>

        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>작업 현장 정보를 불러오는 중...</span>
          </div>
        ) : (
          <div style={styles.workspaceList}>
            {workspaces.map(ws => (
              <WorkspaceRiskCard
                key={ws.id}
                workspace={ws}
                isExpanded={expandedId === ws.id}
                onToggle={() => handleToggle(ws.id)}
              />
            ))}
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
    width: 220, backgroundColor: '#FFFFFF', borderRight: '1px solid #E8E9EB',
    paddingTop: 24, paddingLeft: 16, paddingRight: 16,
    display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0,
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
    display: 'flex', flexDirection: 'column', overflow: 'auto', paddingBottom: 40,
  },
  header: {
    marginBottom: 24, display: 'flex', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 28, color: '#1F2024', margin: 0,
  },
  headerSub: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 14, color: '#71727A', marginTop: 4, display: 'block',
  },

  // Section Header
  sectionHeader: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 18, color: '#1F2024',
  },
  sectionBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12, color: '#FFFFFF',
    backgroundColor: '#006FFD', borderRadius: 12, padding: '2px 10px',
  },

  // Loading
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: '60px 0',
  },
  spinner: {
    width: 28, height: 28, border: '3px solid #E8E9EB', borderTopColor: '#006FFD',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#71727A',
  },

  // Workspace List
  workspaceList: {
    display: 'flex', flexDirection: 'column', gap: 16,
  },

  // Workspace Card
  workspaceCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E8E9EB',
    overflow: 'hidden',
  },
  workspaceCardHeader: {
    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer',
    width: '100%', textAlign: 'left',
  },
  workspaceCardHeaderLeft: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  workspaceName: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, color: '#1F2024',
  },
  workStatusBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11,
    padding: '3px 10px', borderRadius: 10, flexShrink: 0,
  },
  riskBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11,
    padding: '3px 10px', borderRadius: 10, flexShrink: 0,
  },
  workspaceCardHeaderRight: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  workspaceMeta: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  workspaceMetaText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#71727A',
  },
  workspaceMembers: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
  },
  memberName: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#006FFD',
  },
  expandArrow: {
    fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8F9098', marginLeft: 4,
  },

  // Workspace Card Body
  workspaceCardBody: {
    padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20,
    borderTop: '1px solid #F0F1F3',
  },

  // Photos Section
  photosSection: {
    display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16,
  },
  sectionLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: '#1F2024',
  },
  photosGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
  },
  photoCard: {
    backgroundColor: '#F8F9FA', borderRadius: 12, border: '1px solid #E8E9EB',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  photoCardHeader: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: '10px 14px', borderBottom: '1px solid #E8E9EB', backgroundColor: '#FFFFFF',
  },
  photoCardLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#1F2024',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  photoImage: {
    width: '100%', height: 180, objectFit: 'cover',
  },
  photoPlaceholder: {
    width: '100%', height: 180, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  photoPlaceholderText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: '#8F9098',
  },
  // Risk Section
  riskSection: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },

  // Integrated Assessment
  assessmentContainer: {
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  assessmentHeader: {
    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', backgroundColor: '#F8F9FA', borderRadius: 12, border: '1px solid #E8E9EB',
  },
  assessmentHeaderLeft: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  overallGradeBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
    padding: '6px 14px', borderRadius: 8, border: '1px solid',
  },
  overallScore: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16,
  },
  permissionBadgeLarge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
    padding: '6px 16px', borderRadius: 8,
  },

  // Section Blocks
  sectionBlock: {
    padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: 12,
    border: '1px solid #E8E9EB', display: 'flex', flexDirection: 'column', gap: 10,
  },
  sectionBlockTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#1F2024',
  },
  summaryText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#3A3B40',
    lineHeight: '1.6', margin: 0,
  },

  // Key Risks
  keyRisksWrap: {
    display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4,
  },
  keyRisksLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#71727A',
  },
  keyRiskItem: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  keyRiskBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11,
    padding: '2px 8px', borderRadius: 4,
  },
  keyRiskTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#1F2024',
  },

  // Work Environment
  envGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
  },
  envItem: {
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  envLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11, color: '#71727A', textTransform: 'uppercase' as const,
  },
  envValue: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#1F2024', lineHeight: '1.5',
  },

  // List blocks
  listBlock: {
    display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4,
  },
  listBlockLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#71727A',
  },
  listItem: {
    display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'flex-start',
  },
  listBullet: {
    fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#059669', flexShrink: 0, fontWeight: 600,
  },
  listText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#1F2024', lineHeight: '1.5',
  },

  // Hazard Cards
  hazardList: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  hazardCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E8E9EB',
    borderLeft: '4px solid #E8E9EB', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  hazardCardHeader: {
    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  hazardTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#1F2024',
  },
  hazardScore: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
  },
  hazardGradeBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11,
    padding: '3px 10px', borderRadius: 6,
  },
  hazardBody: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  hazardRow: {
    display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  hazardLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#71727A',
    flexShrink: 0, minWidth: 70,
  },
  hazardValue: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#3A3B40', lineHeight: '1.5',
  },

  // Mitigations
  mitigationsBlock: {
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '10px 14px', backgroundColor: '#F8F9FA', borderRadius: 8,
  },
  mitigationsLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#71727A', marginBottom: 2,
  },
  mitigationItem: {
    display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'flex-start',
  },
  mitigationBullet: {
    fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#006FFD', flexShrink: 0,
  },
  mitigationText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: '#1F2024', lineHeight: '1.5',
  },

  // Residual risk
  residualRow: {
    display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4,
  },
  residualBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11,
    padding: '2px 10px', borderRadius: 6,
  },

  // Urgent actions
  urgentActionItem: {
    display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  urgentActionNumber: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, color: '#DC2626',
    width: 20, height: 20, borderRadius: '50%', backgroundColor: '#FEE2E2',
    display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  urgentActionText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#1F2024', lineHeight: '1.5',
  },

  // No Assessment
  noAssessment: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '32px 0', backgroundColor: '#F8F9FA', borderRadius: 12,
  },
  noAssessmentText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1F2024',
  },
  noAssessmentHint: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 12, color: '#8F9098', textAlign: 'center',
  },
};
