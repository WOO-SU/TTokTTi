import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import managerImg from '../assets/manager.jpg';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type PhotoEntry = {
  photo_id: number;
  employee_id: number;
  image_path: string;
  created_at: string;
};

type RiskHighlight = {
  start: string;
  end: string;
  count: number;
  top_types: { risk_type_name: string; count: number }[];
  evidence_samples: {
    videolog_id: number;
    time: string;
    risk_type_name: string;
    camera_type: string;
    evidence_video: string | null;
    source: string;
    status: string | null;
  }[];
  reason: string;
};

type ActionItems = {
  immediate: string[];
  preventive: string[];
  follow_up: string[];
};

type ReportData = {
  report_title: string;
  worksession_summary: Record<string, unknown>;
  video_summary: Record<string, unknown>;
  risk_highlights: RiskHighlight[];
  risk_statistics: Record<string, unknown>;
  compliance_summary: Record<string, unknown>;
  before_after_summary: {
    before_photos: string[];
    after_photos: string[];
  };
  action_items: ActionItems;
  generated_at: string;
};

type ReportVersion = {
  report_id: number;
  report_version: number;
  created_at: string;
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

type WorkSessionTeam = {
  id: number;
  siteName: string;
  startTime: string;
  workStatus: '작업 전' | '작업 중' | '작업 끝';
  members: { id: number; name: string }[];
};

// ── Sidebar data ──

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
  { label: '알림 로그 확인', icon: '🔔', path: '/alert-logs' },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  '작업 전': { bg: '#FFF4E5', text: '#FF9800' },
  '작업 중': { bg: '#E8F5E9', text: '#4CAF50' },
  '작업 끝': { bg: '#E3F2FD', text: '#2196F3' },
};

const STATUS_MAP: Record<string, '작업 전' | '작업 중' | '작업 끝'> = {
  READY: '작업 전',
  IN_PROGRESS: '작업 중',
  DONE: '작업 끝',
};

// ── Helpers ──

function formatSessionTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function convertSession(session: WorkSessionCard): WorkSessionTeam {
  return {
    id: session.id,
    siteName: session.name,
    startTime: formatSessionTime(session.starts_at),
    workStatus: STATUS_MAP[session.status] ?? '작업 전',
    members: (session.workers_detail ?? []).map(w => ({ id: w.employee_id, name: w.name })),
  };
}

async function resolvePhotoUrl(blobName: string): Promise<string | null> {
  try {
    const res = await apiFetch(`/risk/media/sas?blob_name=${encodeURIComponent(blobName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

// ── Main Component ──

export default function ReportScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const unreadCount = useUnreadAlertCount();
  const [activeSidebar, setActiveSidebar] = useState('보고서 작성');
  const isProfileActive = location.pathname === '/profile';

  // Worksession teams (from API)
  const [teams, setTeams] = useState<WorkSessionTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Team selection
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null;

  // Photos (before / after)
  const [beforePhotos, setBeforePhotos] = useState<{ path: string; url: string | null }[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<{ path: string; url: string | null }[]>([]);

  // Report state
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportVersion, setReportVersion] = useState<number | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch worksession teams
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/worksession/admin/today/');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            setTeams(json.map(convertSession));
          }
        }
      } catch { /* ignore */ }
      setTeamsLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Fetch latest report for selected team
  const fetchLatestReport = useCallback(async (wsId: number) => {
    setLoading(true);
    setError(null);
    setReport(null);
    setBeforePhotos([]);
    setAfterPhotos([]);
    try {
      const res = await apiFetch(`/report/${wsId}/latest`);
      if (!res.ok) {
        if (res.status === 404) {
          setReport(null);
          setReportVersion(null);
        } else {
          setError('보고서를 불러오는 중 오류가 발생했습니다.');
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.status === 'NOT_FOUND') {
        setReport(null);
        setReportVersion(null);
      } else {
        setReport(data.report);
        setReportVersion(data.report_version);

        // Extract photos from input_package
        const pkg = data.input_package;
        if (pkg?.photos) {
          const bPhotos = (pkg.photos.before ?? []).map((p: PhotoEntry) => ({ path: p.image_path, url: null as string | null }));
          const aPhotos = (pkg.photos.after ?? []).map((p: PhotoEntry) => ({ path: p.image_path, url: null as string | null }));
          setBeforePhotos(bPhotos);
          setAfterPhotos(aPhotos);

          // Resolve SAS URLs in background
          for (let i = 0; i < bPhotos.length; i++) {
            resolvePhotoUrl(bPhotos[i].path).then(url => {
              setBeforePhotos(prev => prev.map((p, idx) => idx === i ? { ...p, url } : p));
            });
          }
          for (let i = 0; i < aPhotos.length; i++) {
            resolvePhotoUrl(aPhotos[i].path).then(url => {
              setAfterPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, url } : p));
            });
          }
        }
      }
    } catch {
      setError('보고서를 불러오는 중 오류가 발생했습니다.');
    }
    setLoading(false);
  }, []);

  // Fetch versions
  const fetchVersions = useCallback(async (wsId: number) => {
    try {
      const res = await apiFetch(`/report/${wsId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  // When team selection changes
  useEffect(() => {
    if (selectedTeamId) {
      fetchLatestReport(selectedTeamId);
      fetchVersions(selectedTeamId);
    } else {
      setReport(null);
      setReportVersion(null);
      setVersions([]);
      setBeforePhotos([]);
      setAfterPhotos([]);
    }
  }, [selectedTeamId, fetchLatestReport, fetchVersions]);

  // Generate report
  const handleGenerate = async () => {
    if (!selectedTeam) return;
    setGenerating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        worksession_id: selectedTeam.id,
      };
      const res = await apiFetch('/report/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail ?? '보고서 생성에 실패했습니다.');
        setGenerating(false);
        return;
      }
      const data = await res.json();
      setReport(data.report);
      setReportVersion(data.report_version);

      // Refresh photos from input package
      const pkg = data.input_package;
      if (pkg?.photos) {
        const bPhotos = (pkg.photos.before ?? []).map((p: PhotoEntry) => ({ path: p.image_path, url: null as string | null }));
        const aPhotos = (pkg.photos.after ?? []).map((p: PhotoEntry) => ({ path: p.image_path, url: null as string | null }));
        setBeforePhotos(bPhotos);
        setAfterPhotos(aPhotos);
        for (let i = 0; i < bPhotos.length; i++) {
          resolvePhotoUrl(bPhotos[i].path).then(url => {
            setBeforePhotos(prev => prev.map((p, idx) => idx === i ? { ...p, url } : p));
          });
        }
        for (let i = 0; i < aPhotos.length; i++) {
          resolvePhotoUrl(aPhotos[i].path).then(url => {
            setAfterPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, url } : p));
          });
        }
      }

      fetchVersions(selectedTeam.id);
    } catch {
      setError('보고서 생성 중 오류가 발생했습니다.');
    }
    setGenerating(false);
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
          <button type="button" style={{ ...styles.sidebarIconBtn, ...(isProfileActive ? { backgroundColor: '#006FFD', boxShadow: '0 2px 8px rgba(0,111,253,0.3)' } : {}) }} onClick={() => navigate('/profile')}>👤</button>
          <button type="button" style={styles.sidebarIconBtn}>⚙️</button>
          <button type="button" style={{ ...styles.sidebarIconBtn, position: 'relative' as const }}>
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
            const isActive = activeSidebar === item.label;
            return (
              <button
                key={item.label}
                type="button"
                style={{ ...styles.sidebarNavItem, ...(isActive ? styles.sidebarNavItemActive : {}) }}
                onClick={() => { setActiveSidebar(item.label); navigate(item.path); }}
              >
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
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>보고서 작성</h1>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Team list + Report area */}
        <div style={styles.contentRow}>
          {/* Team List Panel */}
          <div style={styles.teamPanel}>
            <h3 style={styles.panelTitle}>팀별 작업 세션</h3>
            <div style={styles.teamList}>
              {teamsLoading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8F9098' }}>로딩 중...</span>
                </div>
              ) : teams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8F9098' }}>오늘 예정된 작업이 없습니다.</span>
                </div>
              ) : (
                teams.map(team => {
                  const isSelected = selectedTeamId === team.id;
                  const sc = statusColors[team.workStatus] ?? statusColors['작업 전'];
                  return (
                    <button
                      key={team.id}
                      type="button"
                      style={{ ...styles.teamCard, ...(isSelected ? styles.teamCardSelected : {}) }}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <div style={styles.teamCardHeader}>
                        <span style={styles.teamCardName}>{team.siteName}</span>
                        <span style={{ ...styles.statusBadge, backgroundColor: sc.bg, color: sc.text }}>
                          {team.workStatus}
                        </span>
                      </div>
                      <div style={styles.teamCardMeta}>
                        <span style={styles.teamCardTime}>{team.startTime}</span>
                        <span style={styles.teamCardMembers}>
                          {team.members.length > 0 ? team.members.map(m => m.name).join(', ') : '작업자 미지정'}
                        </span>
                      </div>
                      {versions.length > 0 && isSelected && (
                        <div style={styles.versionInfo}>
                          v{versions[0].report_version} | {versions.length}개 버전
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Report Detail Panel */}
          <div style={styles.reportPanel}>
            {!selectedTeam && (
              <div style={styles.emptyState}>
                <span style={{ fontSize: 48 }}>📋</span>
                <p style={styles.emptyText}>왼쪽에서 팀을 선택하세요</p>
              </div>
            )}

            {selectedTeam && loading && (
              <div style={styles.emptyState}>
                <div style={styles.spinner} />
                <p style={styles.emptyText}>불러오는 중...</p>
              </div>
            )}

            {selectedTeam && !loading && (
              <>
                {/* ── Before / After Photos Section ── */}
                <div style={styles.photoSection}>
                  <h3 style={styles.sectionTitle}>작업 전후 사진</h3>
                  <div style={styles.photoRow}>
                    {/* Before */}
                    <div style={styles.photoColumn}>
                      <div style={styles.photoLabel}>
                        <span style={styles.photoLabelIcon}>📷</span>
                        작업 전
                      </div>
                      <div style={styles.photoSlot}>
                        {beforePhotos.length > 0 ? (
                          beforePhotos.map((p, idx) => (
                            <div key={idx} style={styles.photoThumb}>
                              {p.url ? (
                                <img src={p.url} alt={`작업 전 ${idx + 1}`} style={styles.photoImg} />
                              ) : (
                                <div style={styles.photoPlaceholder}>
                                  <span style={{ fontSize: 24 }}>🖼️</span>
                                  <span style={styles.photoPlaceholderText}>{p.path.split('/').pop()}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={styles.photoPlaceholder}>
                            <span style={{ fontSize: 32 }}>📷</span>
                            <span style={styles.photoPlaceholderText}>사진 없음</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* After */}
                    <div style={styles.photoColumn}>
                      <div style={styles.photoLabel}>
                        <span style={styles.photoLabelIcon}>📸</span>
                        작업 후
                      </div>
                      <div style={styles.photoSlot}>
                        {afterPhotos.length > 0 ? (
                          afterPhotos.map((p, idx) => (
                            <div key={idx} style={styles.photoThumb}>
                              {p.url ? (
                                <img src={p.url} alt={`작업 후 ${idx + 1}`} style={styles.photoImg} />
                              ) : (
                                <div style={styles.photoPlaceholder}>
                                  <span style={{ fontSize: 24 }}>🖼️</span>
                                  <span style={styles.photoPlaceholderText}>{p.path.split('/').pop()}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={styles.photoPlaceholder}>
                            <span style={{ fontSize: 32 }}>📸</span>
                            <span style={styles.photoPlaceholderText}>사진 없음</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Generate Button ── */}
                <div style={styles.generateRow}>
                  <button
                    type="button"
                    style={{ ...styles.generateBtn, ...(generating ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? '보고서 생성 중...' : '보고서 생성'}
                  </button>
                  {reportVersion && (
                    <span style={styles.versionBadge}>v{reportVersion}</span>
                  )}
                </div>

                {error && <div style={styles.errorBanner}>{error}</div>}

                {/* ── Report Display ── */}
                {report && (
                  <div style={styles.reportContent}>
                    {/* Report Title */}
                    <h2 style={styles.reportTitle}>{report.report_title}</h2>
                    <p style={styles.reportTimestamp}>
                      생성 시각: {report.generated_at ? new Date(report.generated_at).toLocaleString('ko-KR') : '-'}
                    </p>

                    {/* 1. 작업 개요 (worksession_summary) */}
                    <ReportSection title="작업 개요" icon="📌">
                      <JsonBlock data={report.worksession_summary} />
                    </ReportSection>

                    {/* 2. 영상 기반 작업 흐름 (video_summary) */}
                    <ReportSection title="영상 기반 작업 흐름" icon="🎥">
                      <JsonBlock data={report.video_summary} />
                    </ReportSection>

                    {/* 3. 위험 하이라이트 (risk_highlights) */}
                    <ReportSection title="위험 하이라이트" icon="⚠️">
                      {report.risk_highlights.length === 0 ? (
                        <p style={styles.noData}>위험 하이라이트 구간이 없습니다.</p>
                      ) : (
                        report.risk_highlights.map((h, i) => (
                          <div key={i} style={styles.highlightCard}>
                            <div style={styles.highlightHeader}>
                              <span style={styles.highlightTime}>{h.start} ~ {h.end}</span>
                              <span style={styles.highlightCount}>{h.count}건</span>
                            </div>
                            <div style={styles.highlightTypes}>
                              {h.top_types.map((t, ti) => (
                                <span key={ti} style={styles.typeBadge}>{t.risk_type_name} ({t.count})</span>
                              ))}
                            </div>
                            {h.evidence_samples.length > 0 && (
                              <div style={styles.evidenceList}>
                                {h.evidence_samples.map((ev, ei) => (
                                  <div key={ei} style={styles.evidenceItem}>
                                    <span style={styles.evidenceType}>{ev.risk_type_name}</span>
                                    <span style={styles.evidenceCamera}>{ev.camera_type}</span>
                                    <span style={styles.evidenceStatus}>{ev.status ?? ev.source}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p style={styles.highlightReason}>{h.reason}</p>
                          </div>
                        ))
                      )}
                    </ReportSection>

                    {/* 4. 위험요소 통계 (risk_statistics) */}
                    <ReportSection title="위험요소 통계" icon="📊">
                      <RiskStatisticsView data={report.risk_statistics} />
                    </ReportSection>

                    {/* 5. 준수 결과 요약 (compliance_summary) */}
                    <ReportSection title="준수 결과 요약" icon="✅">
                      <ComplianceSummary data={report.compliance_summary} />
                    </ReportSection>

                    {/* 6. 조치사항 (action_items) */}
                    <ReportSection title="조치사항" icon="📝">
                      <ActionItemsView items={report.action_items} />
                    </ReportSection>
                  </div>
                )}

                {!report && !error && (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: 48 }}>📄</span>
                    <p style={styles.emptyText}>아직 생성된 보고서가 없습니다.</p>
                    <p style={{ ...styles.emptyText, fontSize: 13 }}>
                      위의 버튼을 눌러 AI 보고서를 생성하세요.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ──

function ReportSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionHeading}>
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
    return <p style={styles.noData}>데이터 없음</p>;
  }

  if (typeof data === 'string') {
    return <p style={styles.jsonText}>{data}</p>;
  }

  if (Array.isArray(data)) {
    return (
      <ul style={styles.jsonList}>
        {data.map((item, i) => (
          <li key={i} style={styles.jsonListItem}>
            {typeof item === 'object' ? <JsonBlock data={item} /> : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  const obj = data as Record<string, unknown>;
  return (
    <div style={styles.jsonTable}>
      {Object.entries(obj).map(([key, val]) => (
        <div key={key} style={styles.jsonRow}>
          <span style={styles.jsonKey}>{key}</span>
          <span style={styles.jsonValue}>
            {val === null || val === undefined
              ? '-'
              : typeof val === 'object'
                ? <JsonBlock data={val} />
                : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RiskStatisticsView({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <p style={styles.noData}>데이터 없음</p>;
  }

  const total = (data.total as number) ?? 0;
  const byType = (data.by_type as { risk_type_name: string; count: number }[]) ?? [];
  const byCamera = (data.by_camera as Record<string, number>) ?? {};
  const manual = (data.manual_actions as Record<string, number>) ?? {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={styles.statTotal}>총 위험 이벤트: <strong>{total}건</strong></div>

      {byType.length > 0 && (
        <div>
          <div style={styles.statSubLabel}>유형별</div>
          <div style={styles.statBarGroup}>
            {byType.map((t, i) => {
              const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
              return (
                <div key={i} style={styles.statBarRow}>
                  <span style={styles.statBarName}>{t.risk_type_name}</span>
                  <div style={styles.statBarTrack}>
                    <div style={{ ...styles.statBarFill, width: `${pct}%` }} />
                  </div>
                  <span style={styles.statBarCount}>{t.count}건</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24 }}>
        {Object.keys(byCamera).length > 0 && (
          <div>
            <div style={styles.statSubLabel}>카메라별</div>
            {Object.entries(byCamera).map(([cam, cnt]) => (
              <div key={cam} style={styles.statKV}>
                <span style={styles.statKVKey}>{cam}</span>
                <span style={styles.statKVVal}>{cnt}건</span>
              </div>
            ))}
          </div>
        )}
        {Object.keys(manual).length > 0 && (manual.PENDING > 0 || manual.APPROVED > 0 || manual.REJECTED > 0) && (
          <div>
            <div style={styles.statSubLabel}>수동 조치</div>
            {manual.PENDING > 0 && <div style={styles.statKV}><span style={styles.statKVKey}>대기</span><span style={styles.statKVVal}>{manual.PENDING}건</span></div>}
            {manual.APPROVED > 0 && <div style={styles.statKV}><span style={styles.statKVKey}>승인</span><span style={styles.statKVVal}>{manual.APPROVED}건</span></div>}
            {manual.REJECTED > 0 && <div style={styles.statKV}><span style={styles.statKVKey}>반려</span><span style={styles.statKVVal}>{manual.REJECTED}건</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

function ComplianceSummary({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <p style={styles.noData}>데이터 없음</p>;
  }

  const categories = ['helmet', 'vest', 'shoes'];
  const labels: Record<string, string> = { helmet: '안전모', vest: '조끼', shoes: '안전화' };
  const stats = (data.stats ?? data) as Record<string, { total?: number; complied?: number; not_complied?: number }>;

  return (
    <div style={styles.complianceGrid}>
      {categories.map(cat => {
        const s = stats[cat];
        if (!s) return null;
        const total = s.total ?? 0;
        const complied = s.complied ?? 0;
        const rate = total > 0 ? Math.round((complied / total) * 100) : 0;
        return (
          <div key={cat} style={styles.complianceCard}>
            <div style={styles.complianceLabel}>{labels[cat] ?? cat}</div>
            <div style={styles.complianceRate}>{rate}%</div>
            <div style={styles.complianceBar}>
              <div style={{ ...styles.complianceBarFill, width: `${rate}%` }} />
            </div>
            <div style={styles.complianceDetail}>
              {complied}/{total} 준수
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionItemsView({ items }: { items: ActionItems }) {
  if (!items) return <p style={styles.noData}>데이터 없음</p>;

  const hasAny = items.immediate?.length || items.preventive?.length || items.follow_up?.length;
  if (!hasAny) return <p style={styles.noData}>조치사항 없음</p>;

  const paragraphs: string[] = [];

  if (items.immediate?.length) {
    const joined = items.immediate.join('. ');
    paragraphs.push(
      `금일 작업 중 확인된 사항에 대해 즉시 조치가 필요한 내용은 다음과 같다. ${joined}.`
    );
  }

  if (items.preventive?.length) {
    const joined = items.preventive.join('. ');
    paragraphs.push(
      `향후 동일 유형의 사고를 예방하기 위한 조치사항으로는 ${joined} 등이 있다.`
    );
  }

  if (items.follow_up?.length) {
    const joined = items.follow_up.join('. ');
    paragraphs.push(
      `추적 관리가 필요한 항목은 다음과 같다. ${joined}.`
    );
  }

  return (
    <div style={styles.actionProse}>
      {paragraphs.map((p, i) => (
        <p key={i} style={styles.actionParagraph}>{p}</p>
      ))}
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
    textAlign: 'left' as const,
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
    marginBottom: 20,
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

  // Content layout
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    flex: 1,
    minHeight: 0,
  },

  // Team panel
  teamPanel: {
    width: 280,
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
  },
  panelTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#1F2024',
    margin: 0,
  },
  teamList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  teamCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    background: '#FFFFFF',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s',
  },
  teamCardSelected: {
    borderColor: '#006FFD',
    backgroundColor: '#F5F9FF',
  },
  teamCardHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamCardName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
  },
  statusBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 10,
  },
  teamCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  teamCardTime: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#8F9098',
  },
  teamCardMembers: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
  },
  versionInfo: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 11,
    color: '#006FFD',
    marginTop: 2,
  },

  // Report panel
  reportPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    overflowY: 'auto',
  },

  // Photo section
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 20,
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
  },
  sectionTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#1F2024',
    margin: 0,
  },
  photoRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
  },
  photoColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  photoLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  photoLabelIcon: {
    fontSize: 16,
  },
  photoSlot: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  photoThumb: {
    width: 180,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid #E8E9EB',
    backgroundColor: '#F5F5F5',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  photoPlaceholder: {
    width: 180,
    height: 140,
    borderRadius: 10,
    border: '2px dashed #D4D6DD',
    backgroundColor: '#FAFBFC',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 11,
    color: '#8F9098',
    textAlign: 'center' as const,
    maxWidth: 140,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  // Generate
  generateRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  generateBtn: {
    padding: '12px 28px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#006FFD',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 15,
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  versionBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#006FFD',
    backgroundColor: '#EAF2FF',
    padding: '4px 12px',
    borderRadius: 8,
  },

  // Error
  errorBanner: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    color: '#ED3241',
    backgroundColor: '#FFF0F1',
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #FFCDD2',
  },

  // Empty
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 12,
    minHeight: 300,
  },
  emptyText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 15,
    color: '#8F9098',
    margin: 0,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #E8E9EB',
    borderTopColor: '#006FFD',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Report content
  reportContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  reportTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 22,
    color: '#1F2024',
    margin: 0,
  },
  reportTimestamp: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#8F9098',
    margin: 0,
    marginTop: -16,
  },

  // Sections
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 20,
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    border: '1px solid #E8E9EB',
  },
  sectionHeading: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#1F2024',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  noData: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#8F9098',
    margin: 0,
  },

  // JSON display
  jsonText: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#1F2024',
    margin: 0,
    lineHeight: 1.6,
  },
  jsonList: {
    margin: 0,
    paddingLeft: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  jsonListItem: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#1F2024',
    lineHeight: 1.5,
  },
  jsonTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  jsonRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  jsonKey: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#71727A',
    minWidth: 120,
    flexShrink: 0,
  },
  jsonValue: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    color: '#1F2024',
    lineHeight: 1.5,
    flex: 1,
  },

  // Highlights
  highlightCard: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  highlightHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highlightTime: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
  },
  highlightCount: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#ED3241',
    backgroundColor: '#FFF0F1',
    padding: '2px 8px',
    borderRadius: 8,
  },
  highlightTypes: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  typeBadge: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#FF9800',
    backgroundColor: '#FFF4E5',
    padding: '2px 8px',
    borderRadius: 6,
  },
  evidenceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingLeft: 8,
  },
  evidenceItem: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  evidenceType: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    color: '#1F2024',
  },
  evidenceCamera: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 11,
    color: '#71727A',
    backgroundColor: '#F5F5F5',
    padding: '1px 6px',
    borderRadius: 4,
  },
  evidenceStatus: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 11,
    color: '#8F9098',
  },
  highlightReason: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
    margin: 0,
    fontStyle: 'italic',
  },

  // Compliance
  complianceGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
  },
  complianceCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    border: '1px solid #E8E9EB',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
  },
  complianceLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#1F2024',
  },
  complianceRate: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 28,
    color: '#006FFD',
  },
  complianceBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E8E9EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  complianceBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  complianceDetail: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    color: '#71727A',
  },

  // Risk statistics
  statTotal: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 15,
    color: '#1F2024',
  },
  statSubLabel: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#71727A',
    marginBottom: 8,
  },
  statBarGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statBarRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statBarName: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#1F2024',
    minWidth: 120,
    flexShrink: 0,
  },
  statBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E9EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 4,
  },
  statBarCount: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#71727A',
    minWidth: 36,
    textAlign: 'right' as const,
  },
  statKV: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 2,
  },
  statKVKey: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: '#71727A',
    minWidth: 48,
  },
  statKVVal: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#1F2024',
  },

  // Action items (prose)
  actionProse: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  actionParagraph: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: '#1F2024',
    lineHeight: 1.8,
    margin: 0,
    textAlign: 'justify' as const,
  },
};
