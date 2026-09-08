import type { TrainerAssignmentRecord } from '../lib/trainerAssignmentUtils';

export type ScheduleAssignment = TrainerAssignmentRecord & {
  id: string;
};

type ScheduleAssignmentPayload = Omit<ScheduleAssignment, 'id'>;

const SCHEDULE_ASSIGNMENTS_API_URL = 'http://localhost:3001/scheduleAssignments';

const assertResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
};

export const getScheduleAssignments = async (): Promise<ScheduleAssignment[]> => {
  const response = await fetch(SCHEDULE_ASSIGNMENTS_API_URL);
  await assertResponse(response);

  return response.json() as Promise<ScheduleAssignment[]>;
};

export const createScheduleAssignment = async (
  assignment: ScheduleAssignment,
): Promise<ScheduleAssignment> => {
  const response = await fetch(SCHEDULE_ASSIGNMENTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });

  await assertResponse(response);

  return response.json() as Promise<ScheduleAssignment>;
};

export const updateScheduleAssignment = async (
  assignmentId: string,
  assignment: ScheduleAssignmentPayload,
): Promise<ScheduleAssignment> => {
  const response = await fetch(`${SCHEDULE_ASSIGNMENTS_API_URL}/${encodeURIComponent(assignmentId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });

  await assertResponse(response);

  return response.json() as Promise<ScheduleAssignment>;
};

export const deleteScheduleAssignment = async (assignmentId: string) => {
  const response = await fetch(`${SCHEDULE_ASSIGNMENTS_API_URL}/${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE',
  });

  if (response.status === 404) {
    return;
  }

  await assertResponse(response);
};
