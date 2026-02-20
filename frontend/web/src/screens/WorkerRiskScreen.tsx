import React, { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import logoImg from '../assets/logo.png';
import ladderImg from '../assets/ladder.png';
import envImg from '../assets/env.png';
import boxImg from '../assets/box.png';
import useUnreadAlertCount from '../hooks/useUnreadAlertCount';

// ── Types ──

type RiskCategory = 'ladder' | 'environment' | 'commbox';

type UploadedImage = {
  file: File;
  preview: string;
  blobName: string | null;
  uploading: boolean;
};

type WorkerMessage = {
  status: {
    overall_grade: string;
    work_permission: string;
  };
  alert_message: string;
  main_risks: { type: string; what_can_happen: string }[];
  action_checklist: string[];
  guide_message: string;
};

type AdminReport = {
  header: {
    overall_grade: string;
    overall_risk_score: number;
    work_permission: string;
  };
  executive_summary: {
    summary_text: string;
    key_risks: { type: string; risk_grade: string; risk_score: number }[];
  };
  work_environment: {
    environment: string;
    height_or_location: string;
    existing_safety_measures: string[];
    items_requiring_verification: string[];
  };
  risk_details: {
    risk_type: string;
    risk_id: string;
    evidence: string;
    expected_accident: string;
    risk_level: string;
    risk_score: number;
    required_actions_before_work: string[];
    residual_risk_level: string;
    residual_risk_score: number;
  }[];
  mandatory_actions_before_work: string[];
};

type AssessmentResult = {
  assessmentId: number;
  worker: {
    message: WorkerMessage;
    images: { order: number; blob_name: string }[];
  } | null;
  admin: {
    report: AdminReport;
    images: { order: number; blob_name: string }[];
  } | null;
};

type AssessPhase = 'idle' | 'uploading' | 'assessing' | 'result';

// ── Data ──

const sidebarItems = [
  { label: 'Home', icon: '🏠', path: '/home' },
  { label: '직원 관리', icon: '👥', path: '/employees' },
  { label: '안전 장비 점검', icon: '🛡️', path: '/safety' },
  { label: '위험성 평가', icon: '👷', path: '/risk' },
  { label: '보고서 작성', icon: '✏️', path: '/report' },
];

const riskCategories: { key: RiskCategory; label: string; sublabel: string; img: string; description: string }[] = [
  { key: 'ladder', label: '사다리', sublabel: 'Ladder', img: ladderImg, description: '사다리 설치 상태 및 안전성 평가' },
  { key: 'environment', label: '주변환경', sublabel: 'Environment', img: envImg, description: '작업 현장 주변 환경 상태 평가' },
  { key: 'commbox', label: '통신함 상태', sublabel: 'Comm. Box', img: boxImg, description: '통신함 설비 상태 및 안전 평가' },
];

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

// ── Helpers ──

function getGradeStyle(grade: string) {
  return GRADE_COLORS[grade] ?? GRADE_COLORS.Medium;
}

function getPermissionStyle(permission: string) {
  return PERMISSION_COLORS[permission] ?? PERMISSION_COLORS['개선조치 후 작업'];
}

// ── Main Component ──

export default function WorkerRiskScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isProfileActive = location.pathname === '/profile';
  const unreadCount = useUnreadAlertCount();

  const [selectedCategory, setSelectedCategory] = useState<RiskCategory>('ladder');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [siteLabel, setSiteLabel] = useState('사다리 설비함 작업');
  const [phase, setPhase] = useState<AssessPhase>('idle');
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdminReport, setShowAdminReport] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const siteLabelMap: Record<RiskCategory, string> = {
    ladder: '사다리 설비함 작업',
    environment: '주변환경 상태 점검',
    commbox: '통신함 상태 점검',
  };

  const handleCategorySelect = (cat: RiskCategory) => {
    setSelectedCategory(cat);
    setSiteLabel(siteLabelMap[cat]);
    if (phase === 'result') {
      setPhase('idle');
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: UploadedImage[] = Array.from(files).slice(0, 10 - images.length).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      blobName: null,
      uploading: false,
    }));
    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    const newImages: UploadedImage[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 10 - images.length)
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        blobName: null,
        uploading: false,
      }));
    setImages(prev => [...prev, ...newImages]);
  }, [images.length]);

  const removeImage = (idx: number) => {
    setImages(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const uploadImageToBlob = async (img: UploadedImage): Promise<string> => {
    const ext = img.file.name.split('.').pop() ?? 'jpg';
    const res = await apiFetch('/user/storage/sas/upload/', {
      method: 'POST',
      body: JSON.stringify({ filename: `risk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`, content_type: img.file.type }),
    });
    if (!res.ok) throw new Error('SAS URL 발급 실패');
    const data = await res.json();
    const uploadRes = await fetch(data.upload_url, {
      method: 'PUT',
      headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': img.file.type },
      body: img.file,
    });
    if (!uploadRes.ok) throw new Error('이미지 업로드 실패');
    return data.blob_name;
  };

  const fetchImageUrl = async (blobName: string): Promise<string> => {
    const res = await apiFetch(`/risk/media/sas/?blob_name=${encodeURIComponent(blobName)}`);
    if (!res.ok) return '';
    const data = await res.json();
    return data.url?.download_url ?? '';
  };

  const handleAssess = async () => {
    if (images.length === 0) {
      setError('이미지를 1개 이상 업로드해주세요.');
      return;
    }
    setError(null);
    setPhase('uploading');

    try {
      // Upload all images
      const blobNames: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setImages(prev => prev.map((img, j) => j === i ? { ...img, uploading: true } : img));
        const blobName = await uploadImageToBlob(images[i]);
        blobNames.push(blobName);
        setImages(prev => prev.map((img, j) => j === i ? { ...img, blobName, uploading: false } : img));
      }

      // Submit for assessment
      setPhase('assessing');
      const assessRes = await apiFetch('/risk/assess/', {
        method: 'POST',
        body: JSON.stringify({ blob_names: blobNames, site_label: siteLabel }),
      });
      if (!assessRes.ok) {
        const errData = await assessRes.json().catch(() => ({}));
        throw new Error(errData.error ?? '위험성 평가 요청 실패');
      }
      const assessData = await assessRes.json();
      const assessmentId = assessData.assessment_id;

      // Fetch worker recommendation + admin report in parallel
      const [workerRes, adminRes] = await Promise.all([
        apiFetch(`/risk/worker/${assessmentId}`),
        apiFetch(`/risk/admin/${assessmentId}`),
      ]);

      const workerData = workerRes.ok ? await workerRes.json() : null;
      const adminData = adminRes.ok ? await adminRes.json() : null;

      // Fetch SAS URLs for result images
      const resultImages = workerData?.images ?? adminData?.images ?? [];
      const urls: Record<string, string> = {};
      await Promise.all(
        resultImages.map(async (img: { blob_name: string }) => {
          const url = await fetchImageUrl(img.blob_name);
          if (url) urls[img.blob_name] = url;
        }),
      );
      setImageUrls(urls);

      setResult({
        assessmentId,
        worker: workerData ? { message: workerData.message, images: workerData.images } : null,
        admin: adminData ? { report: adminData.report, images: adminData.images } : null,
      });
      setPhase('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(msg);
      setPhase('idle');
    }
  };

  const handleReset = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setResult(null);
    setPhase('idle');
    setError(null);
    setShowAdminReport(false);
    setImageUrls({});
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const workerMsg = result?.worker?.message ?? null;
  const adminRpt = result?.admin?.report ?? null;

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
          <h1 style={styles.headerTitle}>위험성 평가</h1>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Risk Category Cards */}
        <div style={styles.categoryRow}>
          {riskCategories.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                style={{ ...styles.categoryCard, ...(isActive ? styles.categoryCardActive : {}) }}
                onClick={() => handleCategorySelect(cat.key)}
              >
                <div style={styles.categoryIconWrap}>
                  <img src={cat.img} alt={cat.sublabel} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                </div>
                <div style={styles.categoryTextArea}>
                  <span style={{ ...styles.categoryLabel, ...(isActive ? { color: '#006FFD' } : {}) }}>{cat.label}</span>
                  <span style={styles.categorySublabel}>{cat.sublabel}</span>
                  <span style={styles.categoryDesc}>{cat.description}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Assessment Section */}
        {phase !== 'result' ? (
          <div style={styles.assessSection}>
            {/* Site Label */}
            <div style={styles.fieldRow}>
              <label style={styles.fieldLabel}>현장 라벨</label>
              <input
                style={styles.fieldInput}
                type="text"
                value={siteLabel}
                onChange={e => setSiteLabel(e.target.value)}
                placeholder="작업 현장명을 입력하세요"
              />
            </div>

            {/* Image Upload */}
            <div style={styles.fieldRow}>
              <label style={styles.fieldLabel}>현장 이미지 (최대 10장)</label>
              <div
                style={styles.dropZone}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <span style={{ fontSize: 32, marginBottom: 8 }}>📷</span>
                <span style={styles.dropZoneText}>클릭 또는 드래그하여 이미지 업로드</span>
                <span style={styles.dropZoneHint}>JPG, PNG 파일 지원 (최대 10장)</span>
              </div>
            </div>

            {/* Image Previews */}
            {images.length > 0 && (
              <div style={styles.imageGrid}>
                {images.map((img, idx) => (
                  <div key={idx} style={styles.imageThumbWrap}>
                    <img src={img.preview} alt={`upload-${idx}`} style={styles.imageThumb} />
                    {img.uploading && (
                      <div style={styles.imageOverlay}>
                        <span style={styles.imageOverlayText}>업로드 중...</span>
                      </div>
                    )}
                    {phase === 'idle' && (
                      <button type="button" style={styles.imageRemoveBtn} onClick={() => removeImage(idx)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && <div style={styles.errorBox}>{error}</div>}

            {/* Assess Button */}
            <button
              type="button"
              style={{
                ...styles.assessBtn,
                ...(phase !== 'idle' ? styles.assessBtnDisabled : {}),
              }}
              disabled={phase !== 'idle'}
              onClick={handleAssess}
            >
              {phase === 'uploading' ? '이미지 업로드 중...' : phase === 'assessing' ? 'AI 위험성 분석 중...' : '위험성 평가 시작'}
            </button>

            {phase === 'assessing' && (
              <div style={styles.assessingHint}>
                <div style={styles.spinner} />
                <span>AI가 현장 이미지를 분석하고 있습니다. 잠시만 기다려주세요...</span>
              </div>
            )}
          </div>
        ) : (
          /* Result Section */
          <div style={styles.resultSection}>
            {/* Worker Recommendation */}
            {workerMsg && (
              <>
                {/* Status Banner */}
                <div style={{ ...styles.statusBanner, backgroundColor: getGradeStyle(workerMsg.status.overall_grade).bg, borderColor: getGradeStyle(workerMsg.status.overall_grade).border }}>
                  <div style={styles.statusLeft}>
                    <span style={styles.statusLabel}>위험 등급</span>
                    <span style={{ ...styles.statusGrade, color: getGradeStyle(workerMsg.status.overall_grade).text }}>{workerMsg.status.overall_grade}</span>
                  </div>
                  <div style={{ ...styles.permissionBadge, ...getPermissionStyle(workerMsg.status.work_permission) }}>
                    {workerMsg.status.work_permission}
                  </div>
                </div>

                {/* Alert Message */}
                <div style={styles.alertCard}>
                  <div style={styles.alertCardHeader}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <span style={styles.alertCardTitle}>경고 메시지</span>
                  </div>
                  <p style={styles.alertCardText}>{workerMsg.alert_message}</p>
                </div>

                {/* Main Risks */}
                <div style={styles.risksCard}>
                  <div style={styles.risksCardHeader}>
                    <span style={{ fontSize: 18 }}>🔍</span>
                    <span style={styles.risksCardTitle}>주요 위험 요소</span>
                  </div>
                  <div style={styles.risksList}>
                    {workerMsg.main_risks.map((risk, i) => (
                      <div key={i} style={styles.riskItem}>
                        <div style={styles.riskBullet}>{i + 1}</div>
                        <div style={styles.riskContent}>
                          <span style={styles.riskType}>{risk.type}</span>
                          <span style={styles.riskDesc}>{risk.what_can_happen}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Checklist */}
                <div style={styles.checklistCard}>
                  <div style={styles.checklistHeader}>
                    <span style={{ fontSize: 18 }}>✅</span>
                    <span style={styles.checklistTitle}>작업 전 조치사항</span>
                  </div>
                  <div style={styles.checklistItems}>
                    {workerMsg.action_checklist.map((action, i) => (
                      <div key={i} style={styles.checklistItem}>
                        <span style={styles.checkMark}>☐</span>
                        <span style={styles.checkText}>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Guide Message */}
                <div style={styles.guideCard}>
                  <span style={styles.guideTitle}>안내 메시지</span>
                  <p style={styles.guideText}>{workerMsg.guide_message}</p>
                </div>

                {/* Uploaded Images */}
                {Object.keys(imageUrls).length > 0 && (
                  <div style={styles.resultImagesSection}>
                    <span style={styles.resultImagesTitle}>평가 이미지</span>
                    <div style={styles.resultImageGrid}>
                      {Object.entries(imageUrls).map(([blobName, url]) => (
                        <img key={blobName} src={url} alt={blobName} style={styles.resultImage} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Admin Report Toggle */}
            {adminRpt && (
              <>
                <button
                  type="button"
                  style={styles.adminToggleBtn}
                  onClick={() => setShowAdminReport(prev => !prev)}
                >
                  {showAdminReport ? '관리자 보고서 닫기' : '관리자 보고서 보기'}
                  <span style={{ marginLeft: 8 }}>{showAdminReport ? '▲' : '▼'}</span>
                </button>

                {showAdminReport && (
                  <div style={styles.adminReportWrap}>
                    {/* Admin Header */}
                    <div style={styles.adminHeaderRow}>
                      <div>
                        <span style={styles.adminSectionLabel}>종합 위험 점수</span>
                        <span style={{ ...styles.adminScore, color: getGradeStyle(adminRpt.header.overall_grade).text }}>{adminRpt.header.overall_risk_score} / 25</span>
                      </div>
                      <div style={{ ...styles.adminGradeBadge, backgroundColor: getGradeStyle(adminRpt.header.overall_grade).bg, color: getGradeStyle(adminRpt.header.overall_grade).text, borderColor: getGradeStyle(adminRpt.header.overall_grade).border }}>
                        {adminRpt.header.overall_grade}
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div style={styles.adminCard}>
                      <span style={styles.adminCardTitle}>종합 평가</span>
                      <p style={styles.adminCardText}>{adminRpt.executive_summary.summary_text}</p>
                      <div style={styles.keyRisksRow}>
                        {adminRpt.executive_summary.key_risks.map((kr, i) => (
                          <div key={i} style={{ ...styles.keyRiskChip, backgroundColor: getGradeStyle(kr.risk_grade).bg, color: getGradeStyle(kr.risk_grade).text }}>
                            {kr.type} (R={kr.risk_score})
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Work Environment */}
                    <div style={styles.adminCard}>
                      <span style={styles.adminCardTitle}>작업 환경</span>
                      <div style={styles.envRow}>
                        <span style={styles.envLabel}>환경:</span>
                        <span style={styles.envValue}>{adminRpt.work_environment.environment}</span>
                      </div>
                      <div style={styles.envRow}>
                        <span style={styles.envLabel}>높이/위치:</span>
                        <span style={styles.envValue}>{adminRpt.work_environment.height_or_location}</span>
                      </div>
                      {adminRpt.work_environment.existing_safety_measures.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <span style={styles.envSubLabel}>기존 안전 조치</span>
                          {adminRpt.work_environment.existing_safety_measures.map((m, i) => (
                            <span key={i} style={styles.envTag}>{m}</span>
                          ))}
                        </div>
                      )}
                      {adminRpt.work_environment.items_requiring_verification.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <span style={styles.envSubLabel}>확인 필요 항목</span>
                          {adminRpt.work_environment.items_requiring_verification.map((v, i) => (
                            <span key={i} style={{ ...styles.envTag, backgroundColor: '#FFF7ED', color: '#D97706' }}>{v}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Risk Details */}
                    <div style={styles.adminCard}>
                      <span style={styles.adminCardTitle}>위험 상세 분석</span>
                      {adminRpt.risk_details.map((rd, i) => (
                        <div key={i} style={styles.riskDetailItem}>
                          <div style={styles.riskDetailHeader}>
                            <span style={styles.riskDetailType}>{rd.risk_type}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ ...styles.riskDetailScore, color: getGradeStyle(rd.risk_level).text }}>R={rd.risk_score}</span>
                              <span style={{ ...styles.riskDetailGrade, backgroundColor: getGradeStyle(rd.risk_level).bg, color: getGradeStyle(rd.risk_level).text }}>{rd.risk_level}</span>
                            </div>
                          </div>
                          <p style={styles.riskDetailEvidence}>{rd.evidence}</p>
                          <p style={styles.riskDetailAccident}>예상 사고: {rd.expected_accident}</p>
                          {rd.required_actions_before_work.length > 0 && (
                            <div style={styles.riskDetailActions}>
                              <span style={styles.riskDetailActionsLabel}>작업 전 필수 조치:</span>
                              {rd.required_actions_before_work.map((a, j) => (
                                <span key={j} style={styles.riskDetailAction}>• {a}</span>
                              ))}
                            </div>
                          )}
                          <div style={styles.residualRow}>
                            <span style={styles.residualLabel}>잔존 위험:</span>
                            <span style={{ ...styles.residualValue, color: getGradeStyle(rd.residual_risk_level).text }}>
                              {rd.residual_risk_level} (R={rd.residual_risk_score})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mandatory Actions */}
                    {adminRpt.mandatory_actions_before_work.length > 0 && (
                      <div style={{ ...styles.adminCard, backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
                        <span style={{ ...styles.adminCardTitle, color: '#DC2626' }}>작업 전 필수 조치사항</span>
                        {adminRpt.mandatory_actions_before_work.map((a, i) => (
                          <div key={i} style={styles.mandatoryAction}>
                            <span style={styles.mandatoryBullet}>{i + 1}</span>
                            <span style={styles.mandatoryText}>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div style={styles.resultActions}>
              <button type="button" style={styles.resetBtn} onClick={handleReset}>
                새 평가 시작
              </button>
            </div>
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

  // Category Cards
  categoryRow: {
    display: 'flex', flexDirection: 'row', gap: 16, marginBottom: 28,
  },
  categoryCard: {
    flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: '20px 24px',
    border: '2px solid #E8E9EB', cursor: 'pointer', textAlign: 'left',
    transition: 'border-color 0.2s',
  },
  categoryCardActive: {
    borderColor: '#006FFD', boxShadow: '0 4px 20px rgba(0,111,253,0.12)',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F6FF 100%)',
  },
  categoryIconWrap: {
    width: 72, height: 72, borderRadius: 16, backgroundColor: '#F5F7FA',
    display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  categoryTextArea: { display: 'flex', flexDirection: 'column', gap: 2 },
  categoryLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 18, color: '#1F2024',
  },
  categorySublabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: '#8F9098',
  },
  categoryDesc: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 12, color: '#A0A1A7', marginTop: 4,
  },

  // Assessment Section
  assessSection: {
    backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E8E9EB',
    padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
  },
  fieldRow: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1F2024',
  },
  fieldInput: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 14, color: '#1F2024',
    padding: '10px 14px', borderRadius: 8, border: '1px solid #E8E9EB',
    outline: 'none', backgroundColor: '#F8F9FA',
  },
  dropZone: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px 20px', borderRadius: 12, border: '2px dashed #C5C6CC',
    backgroundColor: '#FAFBFC', cursor: 'pointer', transition: 'border-color 0.2s',
  },
  dropZoneText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1F2024',
  },
  dropZoneHint: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 12, color: '#8F9098', marginTop: 4,
  },
  imageGrid: {
    display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  imageThumbWrap: {
    position: 'relative', width: 100, height: 100, borderRadius: 10, overflow: 'hidden',
    border: '1px solid #E8E9EB',
  },
  imageThumb: { width: '100%', height: '100%', objectFit: 'cover' },
  imageOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
  imageOverlayText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11, color: '#FFFFFF',
  },
  imageRemoveBtn: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFFFFF', border: 'none',
    cursor: 'pointer', fontSize: 11, display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: 0,
  },
  errorBox: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#DC2626',
    backgroundColor: '#FEF2F2', padding: '10px 16px', borderRadius: 8,
  },
  assessBtn: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: '#FFFFFF',
    backgroundColor: '#006FFD', padding: '14px 28px', borderRadius: 10,
    border: 'none', cursor: 'pointer', alignSelf: 'flex-start',
    transition: 'background-color 0.2s',
  },
  assessBtnDisabled: {
    backgroundColor: '#A0C4FF', cursor: 'not-allowed',
  },
  assessingHint: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#71727A',
  },
  spinner: {
    width: 20, height: 20, border: '3px solid #E8E9EB', borderTopColor: '#006FFD',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },

  // Result Section
  resultSection: {
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  statusBanner: {
    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: '24px 28px', borderRadius: 16, border: '2px solid',
  },
  statusLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  statusLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#71727A',
  },
  statusGrade: {
    fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 36,
  },
  permissionBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
    padding: '10px 20px', borderRadius: 10,
  },

  // Alert Card
  alertCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E9EB',
    padding: 24,
  },
  alertCardHeader: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  alertCardTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, color: '#1F2024',
  },
  alertCardText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 14, color: '#3A3B40',
    lineHeight: '1.6', margin: 0,
  },

  // Risks Card
  risksCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E9EB',
    padding: 24,
  },
  risksCardHeader: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  risksCardTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, color: '#1F2024',
  },
  risksList: { display: 'flex', flexDirection: 'column', gap: 14 },
  riskItem: {
    display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  riskBullet: {
    width: 28, height: 28, borderRadius: '50%', backgroundColor: '#006FFD',
    color: '#FFFFFF', display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, flexShrink: 0,
  },
  riskContent: { display: 'flex', flexDirection: 'column', gap: 4 },
  riskType: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#1F2024',
  },
  riskDesc: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#71727A', lineHeight: '1.5',
  },

  // Checklist Card
  checklistCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E9EB',
    padding: 24,
  },
  checklistHeader: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  checklistTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, color: '#1F2024',
  },
  checklistItems: { display: 'flex', flexDirection: 'column', gap: 10 },
  checklistItem: {
    display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: '10px 14px', backgroundColor: '#F8F9FA', borderRadius: 8,
  },
  checkMark: {
    fontFamily: 'Inter, sans-serif', fontSize: 16, color: '#006FFD', flexShrink: 0,
  },
  checkText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#1F2024', lineHeight: '1.5',
  },

  // Guide Card
  guideCard: {
    backgroundColor: '#F0F6FF', borderRadius: 14, border: '1px solid #C5DEFF',
    padding: 24,
  },
  guideTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#006FFD',
  },
  guideText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#3A3B40',
    lineHeight: '1.6', margin: '8px 0 0 0',
  },

  // Result Images
  resultImagesSection: {
    backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E9EB',
    padding: 24,
  },
  resultImagesTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#1F2024',
    marginBottom: 12, display: 'block',
  },
  resultImageGrid: {
    display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  resultImage: {
    width: 160, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid #E8E9EB',
  },

  // Admin Report Toggle
  adminToggleBtn: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#006FFD',
    backgroundColor: '#FFFFFF', padding: '12px 20px', borderRadius: 10,
    border: '1px solid #006FFD', cursor: 'pointer', alignSelf: 'flex-start',
    display: 'flex', alignItems: 'center',
  },

  // Admin Report
  adminReportWrap: {
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  adminHeaderRow: {
    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E9EB', padding: 24,
  },
  adminSectionLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#71727A', display: 'block',
  },
  adminScore: {
    fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 32, display: 'block', marginTop: 4,
  },
  adminGradeBadge: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16,
    padding: '8px 20px', borderRadius: 10, border: '1px solid',
  },
  adminCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E9EB', padding: 24,
  },
  adminCardTitle: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: '#1F2024',
    display: 'block', marginBottom: 12,
  },
  adminCardText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#3A3B40',
    lineHeight: '1.6', margin: 0,
  },
  keyRisksRow: {
    display: 'flex', flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap',
  },
  keyRiskChip: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12,
    padding: '6px 14px', borderRadius: 8,
  },

  // Work Environment
  envRow: {
    display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 6,
  },
  envLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#71727A', minWidth: 80,
  },
  envValue: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#1F2024',
  },
  envSubLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#71727A',
    display: 'block', marginBottom: 6,
  },
  envTag: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 11, color: '#059669',
    backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: 6,
    display: 'inline-block', marginRight: 6, marginBottom: 4,
  },

  // Risk Details
  riskDetailItem: {
    padding: '16px 0', borderBottom: '1px solid #F0F1F3',
  },
  riskDetailHeader: {
    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  riskDetailType: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#1F2024',
  },
  riskDetailScore: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
  },
  riskDetailGrade: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11,
    padding: '3px 10px', borderRadius: 6,
  },
  riskDetailEvidence: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, color: '#3A3B40',
    lineHeight: '1.5', margin: '0 0 6px 0',
  },
  riskDetailAccident: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: '#DC2626',
    margin: '0 0 8px 0',
  },
  riskDetailActions: {
    display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8,
  },
  riskDetailActionsLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#71727A',
  },
  riskDetailAction: {
    fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 12, color: '#3A3B40',
    paddingLeft: 8,
  },
  residualRow: {
    display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  residualLabel: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: '#8F9098',
  },
  residualValue: {
    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12,
  },

  // Mandatory Actions
  mandatoryAction: {
    display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8,
  },
  mandatoryBullet: {
    width: 24, height: 24, borderRadius: '50%', backgroundColor: '#DC2626',
    color: '#FFFFFF', display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12, flexShrink: 0,
  },
  mandatoryText: {
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, color: '#1F2024', lineHeight: '1.5',
  },

  // Result Actions
  resultActions: {
    display: 'flex', flexDirection: 'row', gap: 12, marginTop: 8,
  },
  resetBtn: {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#FFFFFF',
    backgroundColor: '#006FFD', padding: '12px 28px', borderRadius: 10,
    border: 'none', cursor: 'pointer',
  },
};
