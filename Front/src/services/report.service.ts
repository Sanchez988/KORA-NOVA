import api, { apiErrorDisplayMessage } from './api';

export const REPORT_CONFIRM_MESSAGE = 'Tu reporte fue recibido. Lo revisaremos pronto';

/** Valores enviados al backend (coinciden con `report.controller.ts`). */
export type ReportReasonValue =
  | 'INAPPROPRIATE_CONTENT'
  | 'HARASSMENT'
  | 'IMPERSONATION'
  | 'UNDERAGE'
  | 'OTHER';

export const REPORT_REASON_OPTIONS: { value: ReportReasonValue; label: string }[] = [
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenido inapropiado' },
  { value: 'HARASSMENT', label: 'Acoso' },
  { value: 'IMPERSONATION', label: 'Perfil falso' },
  { value: 'UNDERAGE', label: 'Menor de edad' },
  { value: 'OTHER', label: 'Otro' },
];

export async function createReport(payload: {
  reportedUserId: string;
  reason: ReportReasonValue;
  description?: string;
}): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/reports', payload);
  return data;
}

export async function getReportStatus(reportedUserId: string): Promise<{ hasReported: boolean }> {
  const { data } = await api.get<{ hasReported: boolean }>(`/reports/status/${reportedUserId}`);
  return data;
}

export async function revokeReportToUser(
  reportedUserId: string
): Promise<{ message: string; removedCount?: number }> {
  const { data } = await api.delete<{ message: string; removedCount?: number }>(
    `/reports/to/${reportedUserId}`
  );
  return data;
}

export type ReportTargetRow = { reportedUserId: string; name: string };

export async function getMyReportTargets(): Promise<{ targets: ReportTargetRow[] }> {
  const { data } = await api.get<{ targets: ReportTargetRow[] }>('/reports/my-targets');
  return data;
}

export function reportErrorMessage(error: unknown): string {
  return apiErrorDisplayMessage(error);
}
