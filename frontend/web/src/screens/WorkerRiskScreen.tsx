import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import managerImg from '../assets/manager.jpg';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type RiskImage = {
  id: number;
  blob_name: string;
  created_at: string;
  url?: string | null;
};

type Hazard = {
  id: string;
  title: string;
  risk_grade: string;
  risk_R_1_25: number;
  expected_accident: string;
  evidence_from_image: string;
  mitigations_before_work: string[];
  residual_risk_grade: string;
  residual_risk_R_1_25: number;
};

type SceneSummary = {
  work_environment: string;
  work_height_or_location: string;
  observed_safety_facilities: string[];
  needs_verification: string[];
};

type OverallSummary = {
  overall_grade: string;
  overall_max_R: number;
  work_permission: boolean | string;
  urgent_fix_before_work: string[];
};

type RiskReportData = {
  scene_summary: SceneSummary;
  hazards: Hazard[];
  overall: OverallSummary;
  version: string | number;
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

type PhotoItem = {
  id: number;
  type: string;
  image: string | null;
};

type WorkspaceRisk = {
  id: number;
  siteName: string;
  startTime: string;
  workStatus: '작업 전' | '작업 중' | '작업 끝';
  members: { id: number; name: string }[];
  assessmentId: number | null;
  status: string | null;
  images: RiskImage[];
  photos: PhotoItem[];
  photoUrls: Record<number, string>;
  riskReport: RiskReportData | null;
  generatedAt: string | null;
  error?: string | null;
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

const workStatusColors: Record<string, { bg: string; text: string }> = {
  '작업 전': { bg: '#F0F1F3', text: '#71727A' },
  '작업 중': { bg: '#E7F4E8', text: '#298A3E' },
  '작업 끝': { bg: '#FFF8E1', text: '#FFB800' },
};

const STATUS_MAP: Record<string, '작업 전' | '작업 중' | '작업 끝'> = {
  READY: '작업 전',
  IN_PROGRESS: '작업 중',
  DONE: '작업 끝',
};

// ── Helpers ──

function formatSessionTime(isoStr: string): string {
  if (!isoStr) return "시간 미정";
  try {
    const d = new Date(isoStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return "시간 오류";
  }
}

function convertSession(session: WorkSessionCard): WorkspaceRisk {
  return {
    id: session.id,
    siteName: session.name || "이름 없는 작업장",
    startTime: formatSessionTime(session.starts_at),
    workStatus: STATUS_MAP[session.status] ?? '작업 전',
    members: (session.workers_detail ?? []).map(w => ({ id: w.employee_id || 0, name: w.name || "알수없음" })),
    assessmentId: null,
    status: null,
    images: [],
    photos: [],
    photoUrls: {},
    riskReport: null,
    generatedAt: null,
  };
}

async function resolvePhotoUrl(blobName: string): Promise<string | null> {
  try {
    const effectiveName = blobName.includes('/') ? blobName : `assessment/${blobName}`;
    const res = await apiFetch('/user/storage/sas/download/', {
      method: 'POST',
      body: JSON.stringify({ blob_name: effectiveName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.download_url ?? data.url ?? null;
  } catch {
    return null;
  }
}

// ── Sub Components ──

function RiskReportView({ report, generatedAt }: { report: RiskReportData; generatedAt: string | null }) {
  const { scene_summary, hazards, overall } = report;

  return (
    <div style={styles.assessmentContainer}>
      {/* 보고서 타이틀 및 타임스탬프 */}
      <div style={styles.assessmentHeader}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: '#1F2024' }}>
          위험성 평가 리포트
        </span>
        {generatedAt && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8F9098' }}>
            생성일: {new Date(generatedAt).toLocaleString('ko-KR')}
          </span>
        )}
      </div>

      {/* 종합 결과 (Overall) */}
      {overall && (
        <div style={styles.reportSection}>
          <h4 style={styles.reportSectionTitle}>종합 판정</h4>
          <div style={styles.reportSectionBody}>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>위험 등급</span>
              <span style={{ ...styles.reportValue, color: overall.overall_grade === 'High' || overall.overall_grade === 'Critical' ? '#DC2626' : '#D97706', fontWeight: 700 }}>
                {overall.overall_grade} (R: {overall.overall_max_R})
              </span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>작업 허가</span>
              <span style={{ ...styles.reportValue, color: overall.work_permission === '조치 전 작업 금지' || overall.work_permission === false ? '#DC2626' : '#059669', fontWeight: 700 }}>
                {typeof overall.work_permission === 'boolean' 
                  ? (overall.work_permission ? '작업 가능' : '작업 불가')
                  : overall.work_permission}
              </span>
            </div>
            {(overall.urgent_fix_before_work ?? []).length > 0 && (
              <div style={styles.reportRow}>
                <span style={{ ...styles.reportLabel, color: '#DC2626' }}>긴급 조치</span>
                <ul style={styles.mitigationList}>
                  {overall.urgent_fix_before_work.map((item, i) => (
                    <li key={i} style={{ ...styles.mitigationItem, color: '#DC2626', fontWeight: 600 }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 현장 요약 (Scene Summary) */}
      {scene_summary && (
        <div style={styles.reportSection}>
          <h4 style={styles.reportSectionTitle}>현장 상황 요약</h4>
          <div style={styles.reportSectionBody}>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>작업 환경</span>
              <span style={styles.reportValue}>{scene_summary.work_environment}</span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>높이/위치</span>
              <span style={styles.reportValue}>{scene_summary.work_height_or_location}</span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>확인된 설비</span>
              <span style={styles.reportValue}>{(scene_summary.observed_safety_facilities ?? []).join(', ') || '없음'}</span>
            </div>
            <div style={styles.reportRow}>
              <span style={{ ...styles.reportLabel, color: '#D97706' }}>추가 점검 필요</span>
              <span style={styles.reportValue}>{(scene_summary.needs_verification ?? []).join(', ') || '없음'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 세부 위험 요소 (Hazards) */}
      {hazards && hazards.length > 0 && (
        <div style={styles.reportSection}>
          <h4 style={styles.reportSectionTitle}>세부 위험 요소 ({hazards.length}건)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px' }}>
            {hazards.map((h, i) => (
              <div key={i} style={styles.hazardCard}>
                <div style={styles.hazardBody}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#DC2626' }}>{h.title}</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#D97706' }}>
                      등급: {h.risk_grade} (R:{h.risk_R_1_25})
                    </span>
                  </div>
                  <div style={styles.reportRow}>
                    <span style={styles.reportLabel}>예상 사고</span>
                    <span style={styles.reportValue}>{h.expected_accident}</span>
                  </div>
                  <div style={styles.reportRow}>
                    <span style={styles.reportLabel}>이미지 근거</span>
                    <span style={styles.reportValue}>{h.evidence_from_image}</span>
                  </div>
                  {h.mitigations_before_work && h.mitigations_before_work.length > 0 && (
                    <div style={styles.reportRow}>
                      <span style={{ ...styles.reportLabel, color: '#059669' }}>감경 조치</span>
                      <ul style={styles.mitigationList}>
                        {h.mitigations_before_work.map((item, idx) => (
                          <li key={idx} style={styles.mitigationItem}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
  const hasAssessment = workspace.assessmentId !== null;

  return (
    <div style={styles.workspaceCard}>
      <button type="button" style={styles.workspaceCardHeader} onClick={onToggle}>
        <div style={styles.workspaceCardHeaderLeft}>
          <span style={styles.workspaceName}>{workspace.siteName}</span>
          <span style={{ ...styles.workStatusBadge, backgroundColor: sc.bg, color: sc.text }}>
            {workspace.workStatus}
          </span>
          {hasAssessment && (
            <span style={{
              ...styles.riskBadge,
              backgroundColor: '#ECFDF5',
              color: '#059669',
            }}>
              위험성 평가 완료
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
          {/* ✨ 디버깅용 에러 메시지 출력 영역 */}
          {workspace.error && (
            <div style={{ padding: 12, backgroundColor: '#FFF0F1', color: '#DC2626', borderRadius: 8, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
              ⚠️ 데이터 로드 안내: {workspace.error}
            </div>
          )}

          {/* 현장 촬영 사진 */}
          <div style={styles.photosSection}>
            <span style={styles.sectionLabel}>현장 촬영 사진</span>
            {workspace.images.length > 0 ? (
              <div style={styles.photosGrid}>
                {workspace.images.map((img, i) => (
                  <div key={i} style={styles.photoCard}>
                    <div style={styles.photoCardHeader}>
                      <span style={{ fontSize: 16 }}>📷</span>
                      <span style={styles.photoCardLabel}>현장 사진 {i + 1}</span>
                    </div>
                    {img.url ? (
                      <img src={img.url} alt={`현장 사진 ${i + 1}`} style={styles.photoImage} />
                    ) : (
                      <div style={styles.photoPlaceholder}>
                        <span style={{ fontSize: 24 }}>🖼️</span>
                        <span style={styles.photoPlaceholderText}>{img.blob_name.split('/').pop() || '사진 만료'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.noAssessment}>
                <span style={{ fontSize: 28, color: '#C5C6CC' }}>📷</span>
                <span style={styles.noAssessmentText}>등록된 현장 사진이 없습니다.</span>
              </div>
            )}
          </div>

          {/* 위험성 평가 결과 */}
          <div style={styles.riskSection}>
            <span style={styles.sectionLabel}>위험성 평가 결과</span>
            {workspace.riskReport ? (
              <RiskReportView report={workspace.riskReport} generatedAt={workspace.generatedAt} />
            ) : (
              <div style={styles.noAssessment}>
                <span style={{ fontSize: 32 }}>📋</span>
                <span style={styles.noAssessmentText}>아직 생성된 위험성 평가 보고서가 없습니다.</span>
                <span style={styles.noAssessmentHint}>현장 사진을 업로드하여 AI 분석을 요청해 주세요.</span>
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
      // 1. 오늘의 Worksession 목록 조회 (HomeScreen과 동일한 배열 추출 로직 적용)
      let rawArray: any[] = [];
      const wsRes = await apiFetch('/worksession/admin/today/');
      
      if (wsRes.ok) {
        const json = await wsRes.json();
        if (Array.isArray(json)) rawArray = json;
        else if (json && Array.isArray(json.data)) rawArray = json.data;
        else if (json && Array.isArray(json.results)) rawArray = json.results;
        else {
          const possibleArray = Object.values(json).find(Array.isArray);
          if (possibleArray) rawArray = possibleArray as any[];
        }
      }

      // 만약 권한 문제로 비어있다면, 일반 작업자용 오늘의 작업 API로 2차 시도
      if (rawArray.length === 0) {
        const res2 = await apiFetch('/worksession/today/');
        if (res2.ok) {
          const json2 = await res2.json();
          if (Array.isArray(json2)) rawArray = json2;
          else if (json2 && Array.isArray(json2.data)) rawArray = json2.data;
          else if (json2 && Array.isArray(json2.results)) rawArray = json2.results;
        }
      }

      // 2. 백엔드의 까다로운 필드명을 프론트엔드가 이해할 수 있게 매핑
      const mappedSessions: WorkSessionCard[] = rawArray.map((item: any) => ({
        id: item.id,
        name: item.name || "이름 없는 작업장",
        starts_at: item.starts_at,
        ends_at: item.ends_at || null,
        status: item.status || 'READY',
        workers_detail: item.workers_detail || item.worker_members || [],
        risk_assessment: item.risk_assessment || item.risk_assessment_status || 'PENDING',
        report: item.report !== undefined ? item.report : (item.report_status || false)
      }));

      // 3. 각 세션별로 위험성 평가 데이터 조회
      const results = await Promise.all(
        mappedSessions.map(async (session): Promise<WorkspaceRisk> => {
          const base = convertSession(session);

          try {
            // ── 1차: /risk/latest/ → COMPLETED 평가 ID ──
            let assessmentId: number | null = null;
            try {
              const latestRes = await apiFetch(`/risk/latest/${session.id}`);
              if (latestRes.ok) {
                const latestData = await latestRes.json();
                if (latestData.exists && latestData.assessment_id) {
                  assessmentId = latestData.assessment_id;
                }
              }
            } catch { /* ignore */ }

            // ── 2차: PENDING 평가 조회 + LLM 실행 (/risk/assess/) ──
            if (!assessmentId) {
              try {
                const startRes = await apiFetch(`/risk/start/${session.id}`, { method: 'POST' });
                if (startRes.ok) {
                  const startData = await startRes.json();
                  const pendingId: number | null = startData.assessment_id ?? null;
                  if (pendingId) {
                    // 이미지가 있으면 LLM 분석 실행 → COMPLETED로 전환
                    const assessRes = await apiFetch(`/risk/assess/${pendingId}`, { method: 'POST' });
                    if (assessRes.ok || assessRes.status === 201) {
                      assessmentId = pendingId;
                    }
                    // 400 (이미지 없음) 등 에러 시 assessmentId는 null 유지
                  }
                }
              } catch { /* ignore */ }
            }

            // ── 3차: /risk/admin/ → assessment 이미지 + 보고서 ──
            let assessmentImages: RiskImage[] = [];
            let riskReport: RiskReportData | null = null;
            let generatedAt: string | null = null;

            if (assessmentId) {
              try {
                const reportRes = await apiFetch(`/risk/admin/${assessmentId}`);
                if (reportRes.ok) {
                  const reportData = await reportRes.json();
                  assessmentImages = await Promise.all(
                    (reportData.images || []).map(async (img: any) => {
                      const url = await resolvePhotoUrl(img.blob_name);
                      return { ...img, url };
                    })
                  );
                  const report = reportData.report;
                  if (report) {
                    riskReport = {
                      scene_summary: report.scene_summary,
                      hazards: report.hazards ?? [],
                      overall: report.overall,
                      version: report.version ?? 'v1',
                    };
                    generatedAt = reportData.generated_at ?? null;
                  }
                }
              } catch { /* ignore */ }
            }

            // ── 4차 fallback: /worksession/summary/ → risk_report ──
            if (!riskReport) {
              try {
                const summaryRes = await apiFetch(`/worksession/summary/${session.id}/`);
                if (summaryRes.ok) {
                  const summaryData = await summaryRes.json();
                  const sr = summaryData.risk_report ?? null;
                  if (sr) {
                    riskReport = {
                      scene_summary: sr.scene_summary,
                      hazards: sr.hazards ?? [],
                      overall: sr.overall,
                      version: sr.version ?? 'v1',
                    };
                    generatedAt = sr.generated_at ?? null;
                  }
                }
              } catch { /* ignore */ }
            }

            return {
              ...base,
              assessmentId,
              status: riskReport ? 'COMPLETED' : (assessmentId ? 'PENDING' : null),
              images: assessmentImages,
              riskReport,
              generatedAt,
              error: null,
            };
          } catch (e: any) {
            return { ...base, error: `데이터 로드 오류: ${e.message}` };
          }
        })
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
      <style>{`
        button, div[role="button"] { -webkit-tap-highlight-color: transparent !important; }
        button:focus, button:active, button:focus-visible,
        div[role="button"]:focus, div[role="button"]:active, div[role="button"]:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
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
            {unreadCount > 0 && <div style={styles.notifBadge}><span style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</span></div>}
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
            <h1 style={styles.headerTitle}>위험성 평가 결과 조회</h1>
            <span style={styles.headerSub}>직원이 촬영한 현장 사진 기반 AI 위험성 평가 보고서입니다.</span>
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
            <span style={styles.loadingText}>작업 현장 및 평가 정보를 불러오는 중...</span>
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
  sidebarNavItemActive: { backgroundColor: '#FFF8E1' },
  sidebarNavLabel: { fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#71727A' },
  sidebarNavLabelActive: { color: '#FFB800', fontWeight: 600 },
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
    backgroundColor: '#FFB800', borderRadius: 12, padding: '2px 10px',
  },

  // Loading
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: '60px 0',
  },
  spinner: {
    width: 28, height: 28, border: '3px solid #E8E9EB', borderTopColor: '#FFB800',
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
    width: '100%', textAlign: 'left', outline: 'none'
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
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#FFB800',
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
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16,
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

  // Report Sections
  reportSection: {
    backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E8E9EB',
    overflow: 'hidden',
  },
  reportSectionTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#1F2024',
    margin: 0, padding: '14px 20px', backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #E8E9EB',
  },
  reportSectionBody: {
    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
  },
  reportRow: {
    display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  reportLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#71727A',
    minWidth: 100, flexShrink: 0,
  },
  reportValue: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#1F2024',
    flex: 1, lineHeight: '1.5',
  },

  // Hazard / Highlight Card
  hazardCard: {
    backgroundColor: '#FFF9F0', borderRadius: 10, border: '1px solid #FDE68A',
    overflow: 'hidden',
  },
  hazardBody: {
    padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
  },

  // Lists
  mitigationList: {
    margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4,
    flex: 1,
  },
  mitigationItem: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#3A3B40',
    lineHeight: '1.5',
  },

  // No Assessment
  noAssessment: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '32px 0', backgroundColor: '#F8F9FA', borderRadius: 12, border: '1px dashed #D4D6DD',
  },
  noAssessmentText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1F2024',
  },
  noAssessmentHint: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 12, color: '#8F9098', textAlign: 'center',
  },
};