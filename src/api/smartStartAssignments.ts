import type { TrainerAssignmentRecord } from '../lib/trainerAssignmentUtils';

export type SmartStartAssignment = TrainerAssignmentRecord & {
  id: string;
};

type SmartStartAssignmentPayload = Omit<SmartStartAssignment, 'id'>;

const SMART_START_ASSIGNMENTS_API_URL = 'http://localhost:3001/smartStartAssignments';

const assertResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
};

export const getSmartStartAssignments = async (): Promise<SmartStartAssignment[]> => {
  const response = await fetch(SMART_START_ASSIGNMENTS_API_URL);
  await assertResponse(response);

  return response.json() as Promise<SmartStartAssignment[]>;
};

export const createSmartStartAssignment = async (
  assignment: SmartStartAssignment,
): Promise<SmartStartAssignment> => {
  const response = await fetch(SMART_START_ASSIGNMENTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });

  await assertResponse(response);

  return response.json() as Promise<SmartStartAssignment>;
};

export const updateSmartStartAssignment = async (
  assignmentId: string,
  assignment: SmartStartAssignmentPayload,
): Promise<SmartStartAssignment> => {
  const response = await fetch(
    `${SMART_START_ASSIGNMENTS_API_URL}/${encodeURIComponent(assignmentId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignment),
    },
  );

  await assertResponse(response);

  return response.json() as Promise<SmartStartAssignment>;
};

export const deleteSmartStartAssignment = async (assignmentId: string) => {
  const response = await fetch(
    `${SMART_START_ASSIGNMENTS_API_URL}/${encodeURIComponent(assignmentId)}`,
    {
      method: 'DELETE',
    },
  );

  if (response.status === 404) {
    return;
  }

  await assertResponse(response);
};
