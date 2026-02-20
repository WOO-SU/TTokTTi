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

// ── Mock Data ──

const emptyPhotos: WorkspacePhotos = { workspace: null, ladder: null, commbox: null };

const mockExampleReport1: AdminReport = {
  scene_summary: {
    work_environment: '주택가 골목 내 전신주 인근 사다리 설비함 작업. 도로 폭 약 4m, 차량 통행 있음.',
    work_height_or_location: '지상 약 3.5m 높이 전신주 설비함',
    observed_safety_facilities: ['안전모 착용 확인', '안전대 부착 설비 설치됨', '사다리 하단 미끄럼 방지 패드 장착'],
    needs_verification: ['안전대 체결 상태 확인 필요', '작업 반경 내 차량 통제 여부 확인'],
  },
  hazards: [
    {
      id: 'FALL',
      title: '추락 위험',
      evidence_from_image: '작업자가 약 3.5m 높이 사다리 위에서 설비함 작업 중이며, 안전대 체결 상태가 이미지상 불명확함.',
      expected_accident: '사다리에서 추락 시 골절, 두부 외상 등 중상 가능',
      likelihood_L_1_5: 3,
      severity_S_1_5: 5,
      risk_R_1_25: 15,
      risk_grade: 'High',
      mitigations_before_work: ['안전대 체결 상태 재확인', '사다리 상단 고정 보강', '하부 보조 작업자 배치'],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 5,
      residual_risk_R_1_25: 5,
      residual_risk_grade: 'Medium',
    },
    {
      id: 'DROPPING',
      title: '낙하물 위험',
      evidence_from_image: '설비함 개방 상태에서 공구 및 부품이 사다리 위에 놓여 있음. 하부 통행인 보호 조치 미흡.',
      expected_accident: '공구 낙하 시 하부 통행인 또는 작업자 두부 타격 위험',
      likelihood_L_1_5: 3,
      severity_S_1_5: 4,
      risk_R_1_25: 12,
      risk_grade: 'High',
      mitigations_before_work: ['공구 낙하 방지 줄 사용', '하부 출입 통제 구역 설정', '안전모 착용 재확인'],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 4,
      residual_risk_R_1_25: 4,
      residual_risk_grade: 'Low',
    },
    {
      id: 'ELECTRIC',
      title: '감전 위험',
      evidence_from_image: '설비함 내부 배선 노출 상태이며, 절연 장갑 착용 여부 이미지상 불명확.',
      expected_accident: '활선 접촉 시 감전 사고, 심정지 가능',
      likelihood_L_1_5: 2,
      severity_S_1_5: 5,
      risk_R_1_25: 10,
      risk_grade: 'High',
      mitigations_before_work: ['절연 장갑 및 절연 공구 사용 확인', '활선 여부 검전기로 확인', '접지 상태 점검'],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 5,
      residual_risk_R_1_25: 5,
      residual_risk_grade: 'Medium',
    },
    {
      id: 'PINCH',
      title: '협착/끼임 위험',
      evidence_from_image: '설비함 도어 개폐 시 손가락 끼임 가능 구간이 보이며, 보호 장갑 미착용 상태.',
      expected_accident: '설비함 도어에 의한 손가락 협착, 절단 위험',
      likelihood_L_1_5: 2,
      severity_S_1_5: 3,
      risk_R_1_25: 6,
      risk_grade: 'Medium',
      mitigations_before_work: ['작업용 보호 장갑 착용', '도어 고정 장치 사용'],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 3,
      residual_risk_R_1_25: 3,
      residual_risk_grade: 'Low',
    },
    {
      id: 'ERGO',
      title: '근골격계 위험',
      evidence_from_image: '작업자가 사다리 위에서 팔을 위로 뻗은 상태로 장시간 작업 중. 부자연스러운 자세 유지.',
      expected_accident: '어깨/허리 근골격계 질환, 피로 누적에 의한 추락 위험 증가',
      likelihood_L_1_5: 3,
      severity_S_1_5: 2,
      risk_R_1_25: 6,
      risk_grade: 'Medium',
      mitigations_before_work: ['30분 간격 휴식 시행', '작업 높이에 맞는 발판 조정'],
      residual_likelihood_L_1_5: 2,
      residual_severity_S_1_5: 2,
      residual_risk_R_1_25: 4,
      residual_risk_grade: 'Low',
    },
  ],
  overall: {
    overall_max_R: 15,
    overall_grade: 'High',
    work_permission: '개선조치 후 작업',
    urgent_fix_before_work: [
      '안전대 체결 상태 재확인 후 작업 시작',
      '공구 낙하 방지 줄 부착 및 하부 통제 구역 설정',
      '절연 장갑 착용 및 활선 여부 검전기 확인',
    ],
  },
};

const mockExampleReport2: AdminReport = {
  scene_summary: {
    work_environment: '도로변 전신주 인근. 도로 공사로 인한 진동 및 분진 발생. 안전 울타리 일부 훼손 상태.',
    work_height_or_location: '지상 약 4m 높이 전신주 설비함',
    observed_safety_facilities: ['안전모 착용', '작업 표지판 설치'],
    needs_verification: ['안전 울타리 보수 필요', '분진 마스크 착용 여부 확인', '사다리 설치 각도 재확인'],
  },
  hazards: [
    {
      id: 'FALL',
      title: '추락 위험',
      evidence_from_image: '사다리 설치 각도가 약 80도로 기준(75도)보다 급함. 상단 고정부 볼트 이완 확인됨.',
      expected_accident: '사다리 미끄러짐에 의한 추락, 중상 또는 사망 가능',
      likelihood_L_1_5: 4,
      severity_S_1_5: 5,
      risk_R_1_25: 20,
      risk_grade: 'Critical',
      mitigations_before_work: ['사다리 설치 각도 75도로 재조정', '상단 고정 볼트 체결', '안전대 부착 설비 확인 후 체결'],
      residual_likelihood_L_1_5: 2,
      residual_severity_S_1_5: 5,
      residual_risk_R_1_25: 10,
      residual_risk_grade: 'High',
    },
    {
      id: 'DROPPING',
      title: '낙하물 위험',
      evidence_from_image: '설비함 상부에 고정되지 않은 자재가 놓여 있으며, 하부 통행 통제 미실시.',
      expected_accident: '자재 낙하에 의한 보행자 또는 작업자 부상',
      likelihood_L_1_5: 3,
      severity_S_1_5: 4,
      risk_R_1_25: 12,
      risk_grade: 'High',
      mitigations_before_work: ['자재 고정 또는 제거', '하부 출입 금지 구역 설정', '낙하물 방지망 설치'],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 4,
      residual_risk_R_1_25: 4,
      residual_risk_grade: 'Low',
    },
    {
      id: 'ELECTRIC',
      title: '감전 위험',
      evidence_from_image: '설비함 내 배선 피복 벗겨진 부분 확인. 우천 시 누전 위험 높음.',
      expected_accident: '피복 손상 배선 접촉 시 감전, 심정지 가능',
      likelihood_L_1_5: 3,
      severity_S_1_5: 5,
      risk_R_1_25: 15,
      risk_grade: 'High',
      mitigations_before_work: ['손상 배선 절연 테이프 보수', '절연 장갑 필수 착용', '검전기로 활선 확인'],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 5,
      residual_risk_R_1_25: 5,
      residual_risk_grade: 'Medium',
    },
    {
      id: 'PINCH',
      title: '협착/끼임 위험',
      evidence_from_image: '통신함 도어 경첩 부식 진행 중. 예기치 않은 도어 닫힘 가능.',
      expected_accident: '부식 경첩에 의한 도어 급닫힘, 손가락 협착',
      likelihood_L_1_5: 3,
      severity_S_1_5: 3,
      risk_R_1_25: 9,
      risk_grade: 'Medium',
      mitigations_before_work: ['경첩 윤활제 도포', '도어 고정 스토퍼 사용', '보호 장갑 착용'],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 3,
      residual_risk_R_1_25: 3,
      residual_risk_grade: 'Low',
    },
    {
      id: 'ERGO',
      title: '근골격계 위험',
      evidence_from_image: '작업자가 좁은 공간에서 상체를 비튼 채 작업 중. 분진 환경으로 호흡기 부담 가중.',
      expected_accident: '허리/목 근골격계 질환, 호흡기 관련 건강 악화',
      likelihood_L_1_5: 3,
      severity_S_1_5: 2,
      risk_R_1_25: 6,
      risk_grade: 'Medium',
      mitigations_before_work: ['분진 마스크 착용', '20분 간격 자세 변경 및 휴식'],
      residual_likelihood_L_1_5: 2,
      residual_severity_S_1_5: 2,
      residual_risk_R_1_25: 4,
      residual_risk_grade: 'Low',
    },
  ],
  overall: {
    overall_max_R: 20,
    overall_grade: 'Critical',
    work_permission: '조치 전 작업 금지',
    urgent_fix_before_work: [
      '사다리 설치 각도 75도로 재조정 및 상단 볼트 체결',
      '손상 배선 절연 보수 및 활선 여부 검전기 확인',
      '하부 출입 통제 구역 설정 및 낙하물 방지망 설치',
      '안전 울타리 보수 완료 후 작업 개시',
    ],
  },
};

const mockExampleReport3: AdminReport = {
  scene_summary: {
    work_environment: '아파트 단지 내 통신 설비함 작업. 주변 정리 양호, 충분한 작업 공간 확보.',
    work_height_or_location: '지상 약 2m 높이 벽면 설비함',
    observed_safety_facilities: ['안전모 착용', '안전대 체결 확인', '사다리 미끄럼 방지 패드 정상', '작업 표지판 설치'],
    needs_verification: [],
  },
  hazards: [
    {
      id: 'FALL',
      title: '추락 위험',
      evidence_from_image: '작업 높이 약 2m로 비교적 낮음. 사다리 상태 양호하고 안전대 체결 확인됨.',
      expected_accident: '사다리 미끄러짐에 의한 경미한 부상 가능',
      likelihood_L_1_5: 1,
      severity_S_1_5: 3,
      risk_R_1_25: 3,
      risk_grade: 'Low',
      mitigations_before_work: [],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 3,
      residual_risk_R_1_25: 3,
      residual_risk_grade: 'Low',
    },
    {
      id: 'DROPPING',
      title: '낙하물 위험',
      evidence_from_image: '공구함 정리 상태 양호. 공구 벨트 착용 확인.',
      expected_accident: '소형 공구 낙하에 의한 경미한 부상',
      likelihood_L_1_5: 1,
      severity_S_1_5: 2,
      risk_R_1_25: 2,
      risk_grade: 'Low',
      mitigations_before_work: [],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 2,
      residual_risk_R_1_25: 2,
      residual_risk_grade: 'Low',
    },
    {
      id: 'ELECTRIC',
      title: '감전 위험',
      evidence_from_image: '배선 피복 상태 양호. 절연 장갑 착용 확인됨.',
      expected_accident: '예기치 않은 통전 시 감전 가능',
      likelihood_L_1_5: 1,
      severity_S_1_5: 4,
      risk_R_1_25: 4,
      risk_grade: 'Low',
      mitigations_before_work: [],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 4,
      residual_risk_R_1_25: 4,
      residual_risk_grade: 'Low',
    },
    {
      id: 'PINCH',
      title: '협착/끼임 위험',
      evidence_from_image: '설비함 도어 상태 양호. 경첩 및 잠금 장치 정상 작동.',
      expected_accident: '도어 개폐 시 손가락 경미한 끼임',
      likelihood_L_1_5: 1,
      severity_S_1_5: 2,
      risk_R_1_25: 2,
      risk_grade: 'Low',
      mitigations_before_work: [],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 2,
      residual_risk_R_1_25: 2,
      residual_risk_grade: 'Low',
    },
    {
      id: 'ERGO',
      title: '근골격계 위험',
      evidence_from_image: '작업 높이가 적절하여 자연스러운 자세 유지 가능.',
      expected_accident: '장시간 작업 시 경미한 피로',
      likelihood_L_1_5: 1,
      severity_S_1_5: 1,
      risk_R_1_25: 1,
      risk_grade: 'Low',
      mitigations_before_work: [],
      residual_likelihood_L_1_5: 1,
      residual_severity_S_1_5: 1,
      residual_risk_R_1_25: 1,
      residual_risk_grade: 'Low',
    },
  ],
  overall: {
    overall_max_R: 4,
    overall_grade: 'Low',
    work_permission: '작업 가능',
    urgent_fix_before_work: [],
  },
};

const mockWorkspaces: WorkspaceRisk[] = [
  {
    id: 1,
    siteName: '봉천동 작업공간',
    startTime: '08:30',
    workStatus: '작업 전',
    members: [{ id: 1, name: '송영민' }, { id: 2, name: '임정원' }],
    assessmentId: null,
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
    adminReport: null,
  },
  {
    id: 2,
    siteName: '신대방동 작업공간',
    startTime: '08:30',
    workStatus: '작업 중',
    members: [{ id: 3, name: '김태호' }, { id: 4, name: '박지수' }],
    assessmentId: 101,
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
    adminReport: mockExampleReport1,
  },
  {
    id: 3,
    siteName: '신림동 작업공간',
    startTime: '08:50',
    workStatus: '작업 중',
    members: [{ id: 5, name: '이준혁' }, { id: 6, name: '최서연' }],
    assessmentId: 102,
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
    adminReport: mockExampleReport2,
  },
  {
    id: 4,
    siteName: '보라매동 작업공간',
    startTime: '09:10',
    workStatus: '작업 끝',
    members: [{ id: 7, name: '우수연' }, { id: 8, name: '원인영' }],
    assessmentId: 103,
    photos: { ...emptyPhotos },
    photoUrls: { ...emptyPhotos },
    adminReport: mockExampleReport3,
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

  // Build flowing passage following generate_admin_report template
  const topHazards = [...hazards]
    .sort((a, b) => b.risk_R_1_25 - a.risk_R_1_25)
    .slice(0, 2);

  const significantHazards = hazards.filter(h => h.risk_R_1_25 >= 5);
  const allActions = hazards.flatMap(h => h.mitigations_before_work);

  // Executive summary sentence (matches services.py executive_summary.summary_text)
  const summaryLine =
    `위험성 평가 결과 '${overall.overall_grade}' 수준이며 작업 상태는 '${overall.work_permission}'입니다.`;

  // Work environment paragraph
  const envParagraph =
    `본 작업 현장은 ${scene.work_environment} ` +
    `작업 위치는 ${scene.work_height_or_location}입니다.` +
    (scene.observed_safety_facilities.length > 0
      ? ` 현장에서 ${scene.observed_safety_facilities.join(', ')} 등의 안전 시설이 확인되었습니다.`
      : '') +
    (scene.needs_verification.length > 0
      ? ` 다만, ${scene.needs_verification.join(', ')} 등은 추가 확인이 필요합니다.`
      : '');

  // Risk details paragraph — top hazards woven into prose
  const riskLines = topHazards.map(h =>
    `${h.title}(${h.risk_grade})의 경우, ` +
    `${h.evidence_from_image} ` +
    `이로 인해 ${h.expected_accident}의 가능성이 있습니다.`
  );
  const riskParagraph = significantHazards.length > 0
    ? `주요 위험 요소로는 ${topHazards.map(h => h.title).join('과 ')}이(가) 식별되었습니다. ` +
      riskLines.join(' ')
    : '현장에서 식별된 위험 요소는 모두 낮은 수준(Low)으로, 기본 안전 수칙을 준수하면 작업이 가능합니다.';

  // Mitigations paragraph
  const mitigationParagraph = allActions.length > 0
    ? `작업 전 필요한 조치사항으로는 ${allActions.slice(0, 5).join(', ')} 등이 있습니다.` +
      (overall.urgent_fix_before_work.length > 0
        ? ` 특히 긴급 조치가 필요한 사항은 다음과 같습니다: ${overall.urgent_fix_before_work.join('; ')}.`
        : '')
    : '현재 별도의 사전 조치사항 없이 작업이 가능합니다.';

  // Residual risk sentence
  const residualHigh = hazards.filter(h => h.residual_risk_R_1_25 >= 5);
  const residualParagraph = residualHigh.length > 0
    ? `조치 이후에도 ${residualHigh.map(h => `${h.title}(잔여 위험: ${h.residual_risk_grade})`).join(', ')}은(는) 주의가 필요합니다.`
    : '제시된 조치사항을 이행하면 모든 위험 요소가 낮은 수준으로 관리됩니다.';

  return (
    <div style={styles.assessmentContainer}>
      {/* Header badge bar */}
      <div style={styles.assessmentHeader}>
        <span style={{ ...styles.overallGradeBadge, backgroundColor: gs.bg, color: gs.text, borderColor: gs.border }}>
          {overall.overall_grade}
        </span>
        <span style={{ ...styles.permissionBadgeLarge, backgroundColor: ps.bg, color: ps.text }}>
          {overall.work_permission}
        </span>
      </div>

      {/* Integrated passage */}
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

  const [workspaces, setWorkspaces] = useState<WorkspaceRisk[]>(mockWorkspaces);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch real risk assessments from API and merge with mock worksession data
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await Promise.all(
        mockWorkspaces.map(async (ws): Promise<WorkspaceRisk> => {
          // If mock already has an adminReport, use it as-is (for demo/preview)
          if (ws.adminReport) return ws;

          try {
            const latestRes = await apiFetch(`/risk/latest/${ws.id}`);
            if (!latestRes.ok) return ws;
            const latestData = await latestRes.json();
            if (!latestData.exists) return ws;

            const assessmentId = latestData.assessment_id;
            const reportRes = await apiFetch(`/risk/admin/${assessmentId}`);
            if (!reportRes.ok) return { ...ws, assessmentId };
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

            return { ...ws, assessmentId, photos, photoUrls, adminReport };
          } catch {
            return ws;
          }
        }),
      );
      setWorkspaces(updated);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

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
