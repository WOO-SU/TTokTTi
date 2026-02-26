import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import managerImg from '../assets/manager.jpg';

// ── Types ──

type WorkSessionCard = {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string | null;
  status: 'READY' | 'IN_PROGRESS' | 'DONE';
  workers_detail?: { employee_id: number; name: string; equipment_check: boolean }[];
  risk_assessment: string;
  report: boolean;
};

type RiskReport = {
  id: number;
  scene_summary: any;
  hazards: any;
  overall: any;
  generated_at: string;
};

type EquipmentCheck = {
  worker: { id: number; name: string };
  checks: { HELMET: boolean | null; VEST: boolean | null; SHOES: boolean | null };
};

type AutoLog = {
  id: number;
  risk_type: string | null;
  video_path: string | null;
  created_at: string;
};

type PhotoItem = {
  id: number;
  type: string;
  image: string | null;
};

type SummaryData = {
  worksession: { id: number; name: string };
  risk_report: RiskReport | null;
  equipment_checks: EquipmentCheck[];
  auto_logs: AutoLog[];
  photos: PhotoItem[];
};

const riskGradeColor: Record<string, { bg: string; text: string }> = {
  Critical: { bg: '#FFEAEA', text: '#D32F2F' },
  High: { bg: '#FFEAEA', text: '#D32F2F' },
  Medium: { bg: '#FFF4E5', text: '#E8900C' },
  Low: { bg: '#E7F4E8', text: '#298A3E' },
};

const riskGradeLabel: Record<string, string> = {
  Critical: '심각',
  High: '높음',
  Medium: '중간',
  Low: '낮음',
};

const HAZARD_LABEL: Record<string, string> = {
  FALL: '추락',
  DROPPING: '낙하·비래',
  ELECTRIC: '감전',
  PINCH: '끼임',
  ERGO: '인체공학',
  LADDER: '사다리',
  FIRE: '화재',
  COLLAPSE: '붕괴',
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

// ── Helpers ──

const statusTextMap: Record<string, string> = {
  READY: '작업 전',
  IN_PROGRESS: '작업 중',
  DONE: '작업 끝',
};

const workStatusColors: Record<string, { bg: string; text: string }> = {
  READY: { bg: '#F0F1F3', text: '#71727A' },
  IN_PROGRESS: { bg: '#E7F4E8', text: '#298A3E' },
  DONE: { bg: '#FFF8E1', text: '#FFB800' },
};

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function formatSessionTime(isoStr: string): string {
  if (!isoStr) return '시간 미정';
  try {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '시간 오류';
  }
}

const PHOTO_LABEL: Record<string, string> = {
  BEFORE: '작업 전',
  AFTER: '작업 후',
};

// ── Main Component ──

export default function WorkSessionDetailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id ?? 1);

  const card: WorkSessionCard | undefined = (location.state as any)?.card;
  const siteName = card?.name ?? `작업 현장 #${sessionId}`;
  const cardStatus = card?.status ?? 'READY';
  const workers = card?.workers_detail ?? [];

  const [activeTab, setActiveTab] = useState<TabKey>('risk');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch(`/worksession/summary/${sessionId}/`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json);

        // Fetch SAS URLs for photos
        if (json.photos && json.photos.length > 0) {
          const urlMap: Record<number, string> = {};
          await Promise.all(
            json.photos.map(async (p: PhotoItem) => {
              if (p.image) {
                try {
                  const sRes = await apiFetch('/user/storage/sas/download/', {
                    method: 'POST',
                    body: JSON.stringify({ blob_name: p.image }),
                  });
                  if (sRes.ok) {
                    const sJson = await sRes.json();
                    urlMap[p.id] = sJson.download_url;
                  }
                } catch (err) {
                  console.error(`Failed to fetch SAS for photo ${p.id}:`, err);
                }
              }
            })
          );
          setPhotoUrls(urlMap);
        }
      } else {
        const text = await res.text();
        console.error('[WorkSessionDetail] API error:', res.status, text);
        setError(`API 오류 (${res.status})`);
      }
    } catch (e) {
      console.error('[WorkSessionDetail] fetch error:', e);
      setError('네트워크 오류');
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const sc = workStatusColors[cardStatus] ?? workStatusColors.READY;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <button type="button" style={styles.sidebarLogo} onClick={() => navigate('/home')}>
          <img src={managerImg} alt="TTokTTi" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: '50%' }} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" style={styles.backBtn} onClick={() => navigate('/home')}>
              ← 홈으로
            </button>
            <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
          <div style={styles.headerInfo}>
            <h1 style={styles.headerTitle}>{siteName}</h1>
            <div style={styles.headerMeta}>
              {card && (
                <>
                  <span style={styles.headerMetaText}>⏰ 작업 시작 {formatSessionTime(card.starts_at)}</span>
                  <span style={styles.headerMetaText}>·</span>
                  {workers.map((m, i) => (
                    <React.Fragment key={m.employee_id}>
                      {i > 0 && <span style={styles.headerMetaText}>, </span>}
                      <button
                        type="button"
                        style={styles.memberBtn}
                        onClick={() => navigate(`/employee/${m.employee_id}`, { state: { siteName } })}>
                        {m.name}
                      </button>
                    </React.Fragment>
                  ))}
                </>
              )}
              <span style={{ ...styles.statusBadge, backgroundColor: sc.bg, color: sc.text }}>
                {statusTextMap[cardStatus] ?? '작업 전'}
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
          {loading ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyText}>데이터를 불러오는 중...</span>
            </div>
          ) : error ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <span style={styles.emptyText}>{error}</span>
            </div>
          ) : (
            <>
              {/* ── 위험성 평가 결과 ── */}
              {activeTab === 'risk' && (
                <div style={styles.section}>
                  <span style={styles.sectionTitle}>위험성 평가 결과</span>
                  {!summary?.risk_report ? (
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: 32 }}>✅</span>
                      <span style={styles.emptyText}>위험성 평가 결과 없음</span>
                    </div>
                  ) : (
                    <div style={styles.riskList}>
                      {/* ── 종합 평가 카드 ── */}
                      {summary.risk_report.overall && (() => {
                        const o = summary.risk_report!.overall;
                        const grade = o.overall_grade ?? 'Low';
                        const gc = riskGradeColor[grade] ?? riskGradeColor.Low;
                        return (
                          <div style={{ ...styles.overallCard, borderLeft: `4px solid ${gc.text}` }}>
                            <div style={styles.overallHeader}>
                              <span style={styles.overallTitle}>종합 평가</span>
                              <span style={{ ...styles.riskLevelBadge, backgroundColor: gc.bg, color: gc.text }}>
                                {riskGradeLabel[grade] ?? grade}
                              </span>
                            </div>
                            <div style={styles.overallBody}>
                              <div style={styles.overallMetric}>
                                <span style={styles.overallMetricLabel}>위험 점수</span>
                                <span style={{ ...styles.overallMetricValue, color: gc.text }}>{o.overall_max_R != null ? o.overall_max_R : '-'}</span>
                              </div>
                              <div style={styles.overallMetric}>
                                <span style={styles.overallMetricLabel}>작업 허가</span>
                                <span style={styles.overallMetricValue}>{typeof o.work_permission === 'boolean' ? (o.work_permission ? '작업 가능' : '조치 전 작업 금지') : (o.work_permission ?? '-')}</span>
                              </div>
                            </div>
                            {Array.isArray(o.urgent_fix_before_work) && o.urgent_fix_before_work.length > 0 && (
                              <div style={styles.urgentBox}>
                                <span style={styles.urgentTitle}>⚠️ 작업 전 필수 조치</span>
                                <ul style={styles.urgentList}>
                                  {o.urgent_fix_before_work.map((item: string, i: number) => (
                                    <li key={i} style={styles.urgentItem}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── 현장 요약 ── */}
                      {summary.risk_report.scene_summary && (() => {
                        const s = summary.risk_report!.scene_summary;
                        return (
                          <div style={styles.sceneCard}>
                            <span style={styles.sceneCardTitle}>🏗️ 현장 환경</span>
                            <div style={styles.sceneGrid}>
                              {s.work_environment && (
                                <div style={styles.sceneItem}>
                                  <span style={styles.sceneLabel}>작업 환경</span>
                                  <span style={styles.sceneValue}>{s.work_environment}</span>
                                </div>
                              )}
                              {s.work_height_or_location && (
                                <div style={styles.sceneItem}>
                                  <span style={styles.sceneLabel}>작업 위치/높이</span>
                                  <span style={styles.sceneValue}>{s.work_height_or_location}</span>
                                </div>
                              )}
                            </div>
                            {Array.isArray(s.observed_safety_facilities) && s.observed_safety_facilities.length > 0 && (
                              <div style={styles.sceneItem}>
                                <span style={styles.sceneLabel}>확인된 안전 시설</span>
                                <div style={styles.tagRow}>
                                  {s.observed_safety_facilities.map((f: string, i: number) => (
                                    <span key={i} style={styles.tagGreen}>{f}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(s.needs_verification) && s.needs_verification.length > 0 && (
                              <div style={styles.sceneItem}>
                                <span style={styles.sceneLabel}>확인 필요 항목</span>
                                <div style={styles.tagRow}>
                                  {s.needs_verification.map((v: string, i: number) => (
                                    <span key={i} style={styles.tagOrange}>{v}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── 위험 요소 목록 ── */}
                      {Array.isArray(summary.risk_report.hazards) && summary.risk_report.hazards.length > 0 && (
                        <>
                          <span style={{ ...styles.sectionTitle, fontSize: 15, marginTop: 8 }}>위험 요소 상세</span>
                          {summary.risk_report.hazards.map((h: any, i: number) => {
                            const grade = h.risk_grade ?? 'Low';
                            const gc = riskGradeColor[grade] ?? riskGradeColor.Low;
                            const residualGrade = h.residual_risk_grade ?? 'Low';
                            const rgc = riskGradeColor[residualGrade] ?? riskGradeColor.Low;
                            return (
                              <div key={i} style={{ ...styles.hazardCard, borderLeft: `4px solid ${gc.text}` }}>
                                <div style={styles.hazardHeader}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ ...styles.riskLevelBadge, backgroundColor: gc.bg, color: gc.text }}>
                                      {riskGradeLabel[grade] ?? grade}
                                    </span>
                                    <span style={styles.hazardTitle}>
                                      {HAZARD_LABEL[h.id] ?? h.id} — {h.title}
                                    </span>
                                  </div>
                                  <span style={styles.hazardScore}>R = {h.risk_R_1_25 ?? '-'}</span>
                                </div>
                                <div style={styles.hazardBody}>
                                  {h.evidence_from_image && (
                                    <div style={styles.hazardRow}>
                                      <span style={styles.hazardLabel}>이미지 근거</span>
                                      <span style={styles.hazardValue}>{h.evidence_from_image}</span>
                                    </div>
                                  )}
                                  {h.expected_accident && (
                                    <div style={styles.hazardRow}>
                                      <span style={styles.hazardLabel}>예상 사고</span>
                                      <span style={styles.hazardValue}>{h.expected_accident}</span>
                                    </div>
                                  )}
                                  <div style={styles.hazardRow}>
                                    <span style={styles.hazardLabel}>위험도 (L×S)</span>
                                    <span style={styles.hazardValue}>
                                      {h.likelihood_L_1_5 && h.severity_S_1_5
                                        ? `${h.likelihood_L_1_5} × ${h.severity_S_1_5} = ${h.likelihood_L_1_5 * h.severity_S_1_5}`
                                        : h.risk_R_1_25 != null
                                          ? `R = ${h.risk_R_1_25}`
                                          : '-'}
                                    </span>
                                  </div>
                                  {Array.isArray(h.mitigations_before_work) && h.mitigations_before_work.length > 0 && (
                                    <div style={styles.hazardRow}>
                                      <span style={styles.hazardLabel}>개선 대책</span>
                                      <ul style={styles.mitigationList}>
                                        {h.mitigations_before_work.map((m: string, j: number) => (
                                          <li key={j} style={styles.mitigationItem}>{m}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div style={styles.hazardRow}>
                                    <span style={styles.hazardLabel}>잔여 위험도</span>
                                    <span style={styles.hazardValue}>
                                      {h.residual_likelihood_L_1_5 && h.residual_severity_S_1_5
                                        ? `${h.residual_likelihood_L_1_5} × ${h.residual_severity_S_1_5} = ${h.residual_likelihood_L_1_5 * h.residual_severity_S_1_5}`
                                        : h.residual_risk_R_1_25 != null
                                          ? `R = ${h.residual_risk_R_1_25}`
                                          : '-'}
                                      <span style={{ ...styles.riskLevelBadge, backgroundColor: rgc.bg, color: rgc.text, marginLeft: 8, fontSize: 10 }}>
                                        {riskGradeLabel[residualGrade] ?? residualGrade}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── 장비 점검 결과 ── */}
              {activeTab === 'equipment' && (
                <div style={styles.section}>
                  <span style={styles.sectionTitle}>장비 점검 결과</span>
                  {(!summary?.equipment_checks || summary.equipment_checks.length === 0) ? (
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: 32 }}>✅</span>
                      <span style={styles.emptyText}>장비 점검 정보 없음</span>
                    </div>
                  ) : (
                    <div style={styles.equipTable}>
                      <div style={styles.equipHeaderRow}>
                        <span style={{ ...styles.equipCell, ...styles.equipHeaderCell }}>작업자</span>
                        <span style={{ ...styles.equipCell, ...styles.equipHeaderCell, justifyContent: 'center' }}>⛑️ 안전모</span>
                        <span style={{ ...styles.equipCell, ...styles.equipHeaderCell, justifyContent: 'center' }}>🦺 안전조끼</span>
                        <span style={{ ...styles.equipCell, ...styles.equipHeaderCell, justifyContent: 'center' }}>🧤 안전장갑</span>
                      </div>
                      {summary.equipment_checks.map((ec, i) => (
                        <div key={ec.worker.id} style={{ ...styles.equipRow, backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                          <span style={{ ...styles.equipCell, fontWeight: 600, color: '#1F2024' }}>{ec.worker.name}</span>
                          <span style={{ ...styles.equipCell, justifyContent: 'center' }}><CheckBadge ok={ec.checks.HELMET === true} /></span>
                          <span style={{ ...styles.equipCell, justifyContent: 'center' }}><CheckBadge ok={ec.checks.VEST === true} /></span>
                          <span style={{ ...styles.equipCell, justifyContent: 'center' }}><CheckBadge ok={ec.checks.SHOES === true} /></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── 위험 감지 로그 ── */}
              {activeTab === 'logs' && (
                <div style={styles.section}>
                  <span style={styles.sectionTitle}>위험 감지 로그</span>
                  {(!summary?.auto_logs || summary.auto_logs.length === 0) ? (
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: 32 }}>✅</span>
                      <span style={styles.emptyText}>감지된 위험 없음</span>
                    </div>
                  ) : (
                    <div style={styles.logList}>
                      {summary.auto_logs.map(log => (
                        <div key={log.id} style={styles.logCard}>
                          <div style={styles.logCardHeader}>
                            <span style={styles.logTime}>{formatTime(log.created_at)}</span>
                            <span style={styles.logTypeBadge}>{log.risk_type ?? '위험 감지'}</span>
                          </div>
                          {log.video_path ? (
                            <video
                              src={log.video_path}
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
                  {(!summary?.photos || summary.photos.length === 0) ? (
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={styles.emptyText}>사진 없음</span>
                    </div>
                  ) : (
                    <div style={styles.photoGrid}>
                      {summary.photos.map(photo => {
                        const label = PHOTO_LABEL[photo.type] ?? photo.type;
                        return (
                          <div key={photo.id} style={styles.photoCard}>
                            <span style={styles.photoLabel}>{label}</span>
                            {photoUrls[photo.id] ? (
                              <img src={photoUrls[photo.id]} alt={label} style={styles.photoImg} />
                            ) : (
                              <div style={styles.photoPlaceholder}>
                                <span style={{ fontSize: 32 }}>📷</span>
                                <span style={styles.photoPlaceholderText}>
                                  {photo.image ? '사진 불러오는 중...' : '사진 없음'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
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
    color: '#FFB800',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    alignSelf: 'flex-start',
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
    color: '#FFB800',
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
    color: '#FFB800',
    fontWeight: 700,
    borderBottom: '2px solid #FFB800',
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
    gap: 14,
  },
  riskLevelBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 6,
  },

  // Overall card
  overallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  overallHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#1F2024',
  },
  overallBody: {
    display: 'flex',
    flexDirection: 'row',
    gap: 32,
  },
  overallMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  overallMetricLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#8F9098',
  },
  overallMetricValue: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 15,
    color: '#1F2024',
  },
  urgentBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  urgentTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#D32F2F',
  },
  urgentList: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  urgentItem: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#71727A',
  },

  // Scene card
  sceneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  sceneCardTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 15,
    color: '#1F2024',
  },
  sceneGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 32,
    flexWrap: 'wrap',
  },
  sceneItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sceneLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#8F9098',
  },
  sceneValue: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#1F2024',
  },
  tagRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagGreen: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    color: '#298A3E',
    backgroundColor: '#E7F4E8',
    padding: '3px 10px',
    borderRadius: 6,
  },
  tagOrange: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    color: '#E8900C',
    backgroundColor: '#FFF4E5',
    padding: '3px 10px',
    borderRadius: 6,
  },

  // Hazard card
  hazardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
    padding: '18px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  hazardHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  hazardTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#1F2024',
  },
  hazardScore: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#71727A',
    flexShrink: 0,
  },
  hazardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  hazardRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  hazardLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#8F9098',
    minWidth: 90,
    flexShrink: 0,
    paddingTop: 2,
  },
  hazardValue: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#1F2024',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  mitigationList: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  mitigationItem: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#1F2024',
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
