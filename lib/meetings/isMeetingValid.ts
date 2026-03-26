import type { MeetingStatus } from '@/lib/db/models/Meeting';

export function isMeetingValidForJoin(params: {
  isActive: boolean;
  status: MeetingStatus;
  expiresAt?: Date | null;
  maxSessions?: number | null;
  sessionCount: number;
}): boolean {
  if (!params.isActive || params.status === 'completed') {
    return false;
  }
  if (params.expiresAt && new Date(params.expiresAt) < new Date()) {
    return false;
  }
  if (
    params.maxSessions != null &&
    params.sessionCount >= params.maxSessions
  ) {
    return false;
  }
  return true;
}
