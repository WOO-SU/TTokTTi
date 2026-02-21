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
  workspace: string | null;
  ladder: string | null;
  commbox: string | null;
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

type WorkspaceRisk = {
  id: number;
  siteName: string;
  startTime: string;
  workStatus: '작업 전' | '작업 중' | '작업 끝';
  members: { id: number; name: string }[];
  assessmentId: number | null;
  photos: WorkspacePhotos;
  photoUrls: WorkspacePhotos;
  adminReport: AdminReport | null;
};

// ── Data ──

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
  { label: '알림 로그 확인', icon: '🔔', path: '/alert-logs' },
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

const STATUS_MAP: Record<string, '작업 전' | '작업 중' | '작업 끝'> = {
  READY: '작업 전',
  IN_PROGRESS: '작업 중',
  DONE: '작업 끝',
};

const emptyPhotos: WorkspacePhotos = { workspace: null, ladder: null, commbox: null };

// ── Helpers ──

function getGradeStyle(grade: string) {
  return GRADE_COLORS[grade] ?? GRADE_COLORS.Medium;
}

function getPermissionStyle(permission: string) {
  return PERMISSION_COLORS[permission] ?? PERMISSION_COLORS['개선조치 후 작업'];
}

function fetchImageUrl(blobName: string): Promise<string> {
  return apiFetch(`/risk/media/sas?blob_name=${encodeURIComponent(blobName)}`)
    .then(res => res.ok ? res.json() : null)
    .then(data => data?.url?.download_url ?? '')
    .catch(() => '');
}

function formatSessionTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function convertSession(session: WorkSessionCard): WorkspaceRisk {
  return {
    id: session.id,
    siteName: session.name,
    startTime: formatSessionTime(session.starts_at),
    workStatus: STATUS_MAP[session.status] ?? '작업 전',
    members: (session.workers_detail ?? []).map(w => ({ id: w.employee_id, name: w.name })),
    assessmentId: null,
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
    adminReport: null,
  };
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

  const significantHazards = hazards.filter(h => h.risk_R_1_25 >= 5);
  const allActions = hazards.flatMap(h => h.mitigations_before_work);

  const summaryLine =
    `위험성 평가 결과 '${overall.overall_grade}' 수준이며 작업 상태는 '${overall.work_permission}'입니다.`;

  const envParagraph =
    `본 작업 현장은 ${scene.work_environment} ` +
    `작업 위치는 ${scene.work_height_or_location}입니다.` +
    (scene.observed_safety_facilities.length > 0
      ? ` 현장에서 ${scene.observed_safety_facilities.join(', ')} 등의 안전 시설이 확인되었습니다.`
      : '') +
    (scene.needs_verification.length > 0
      ? ` 다만, ${scene.needs_verification.join(', ')} 등은 추가 확인이 필요합니다.`
      : '');

  const riskLines = topHazards.map(h =>
    `${h.title}(${h.risk_grade})의 경우, ` +
    `${h.evidence_from_image} ` +
    `이로 인해 ${h.expected_accident}의 가능성이 있습니다.`
  );
  const riskParagraph = significantHazards.length > 0
    ? `주요 위험 요소로는 ${topHazards.map(h => h.title).join('과 ')}이(가) 식별되었습니다. ` +
      riskLines.join(' ')
    : '현장에서 식별된 위험 요소는 모두 낮은 수준(Low)으로, 기본 안전 수칙을 준수하면 작업이 가능합니다.';

  const mitigationParagraph = allActions.length > 0
    ? `작업 전 필요한 조치사항으로는 ${allActions.slice(0, 5).join(', ')} 등이 있습니다.` +
      (overall.urgent_fix_before_work.length > 0
        ? ` 특히 긴급 조치가 필요한 사항은 다음과 같습니다: ${overall.urgent_fix_before_work.join('; ')}.`
        : '')
    : '현재 별도의 사전 조치사항 없이 작업이 가능합니다.';

  const residualHigh = hazards.filter(h => h.residual_risk_R_1_25 >= 5);
  const residualParagraph = residualHigh.length > 0
    ? `조치 이후에도 ${residualHigh.map(h => `${h.title}(잔여 위험: ${h.residual_risk_grade})`).join(', ')}은(는) 주의가 필요합니다.`
    : '제시된 조치사항을 이행하면 모든 위험 요소가 낮은 수준으로 관리됩니다.';

  return (
    <div style={styles.assessmentContainer}>
      <div style={styles.assessmentHeader}>
        <span style={{ ...styles.overallGradeBadge, backgroundColor: gs.bg, color: gs.text, borderColor: gs.border }}>
          {overall.overall_grade}
        </span>
        <span style={{ ...styles.permissionBadgeLarge, backgroundColor: ps.bg, color: ps.text }}>
          {overall.work_permission}
        </span>
      </div>

      <div style={styles.passageBlock}>
        <p style={styles.passageParagraph}>
          <strong>{summaryLine}</strong>
        </p>
        <p style={styles.passageParagraph}>{envParagraph}</p>
        <p style={styles.passageParagraph}>{riskParagraph}</p>
        <p style={styles.passageParagraph}>{mitigationParagraph}</p>
        <p style={styles.passageParagraph}>{residualParagraph}</p>
      </div>
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
            {workspace.members.length === 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8F9098' }}>작업자 미지정</span>
            )}
          </div>
          <span style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div style={styles.workspaceCardBody}>
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch today's worksessions (same API as HomeScreen)
      const wsRes = await apiFetch('/worksession/admin/today/');
      if (!wsRes.ok) return;
      const sessions: WorkSessionCard[] = await wsRes.json();
      if (!Array.isArray(sessions)) return;

      // 2. For each session, try to fetch risk assessment & photos
      const results = await Promise.all(
        sessions.map(async (session): Promise<WorkspaceRisk> => {
          const base = convertSession(session);

          try {
            // Get latest assessment for this worksession
            const latestRes = await apiFetch(`/risk/latest/${session.id}`);
            if (!latestRes.ok) return base;
            const latestData = await latestRes.json();
            if (!latestData.exists) return base;

            const assessmentId = latestData.assessment_id;

            // Get admin report detail
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
                overall_grade: 'Low' as RiskGrade,
                work_permission: '작업 가능',
                urgent_fix_before_work: [],
              },
            };

            // Map images to the 3 photo categories by order
            const categories: PhotoCategory[] = ['workspace', 'ladder', 'commbox'];
            const photos: WorkspacePhotos = { ...emptyPhotos };
            const photoUrls: WorkspacePhotos = { ...emptyPhotos };
            for (let i = 0; i < Math.min(images.length, categories.length); i++) {
              photos[categories[i]] = images[i].blob_name;
              photoUrls[categories[i]] = await fetchImageUrl(images[i].blob_name);
            }

            return { ...base, assessmentId, photos, photoUrls, adminReport };
          } catch {
            return base;
          }
        }),
      );

      setWorkspaces(results);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

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

        <div style={styles.sectionHeader}>
          <span style={styles.sectionHeaderTitle}>오늘의 작업 현장</span>
          <span style={styles.sectionBadge}>{workspaces.length}</span>
        </div>

        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>작업 현장 정보를 불러오는 중...</span>
          </div>
        ) : workspaces.length === 0 ? (
          <div style={styles.loadingWrap}>
            <span style={styles.loadingText}>오늘 예정된 작업 현장이 없습니다.</span>
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
  overallGradeBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
    padding: '6px 14px', borderRadius: 8, border: '1px solid',
  },
  permissionBadgeLarge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
    padding: '6px 16px', borderRadius: 8,
  },

  // Passage Block
  passageBlock: {
    padding: '20px 24px', backgroundColor: '#FFFFFF', borderRadius: 12,
    border: '1px solid #E8E9EB', display: 'flex', flexDirection: 'column', gap: 0,
  },
  passageParagraph: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 14, color: '#3A3B40',
    lineHeight: '1.8', margin: '0 0 12px 0', textAlign: 'justify' as const,
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
