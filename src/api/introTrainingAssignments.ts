export type IntroTrainingAssignment = {
  id: string;
  date: string;
  time: string;
  trainerId: string | null;
  trainerName: string;
};

type IntroTrainingAssignmentPayload = Omit<IntroTrainingAssignment, 'id'>;

const INTRO_TRAINING_ASSIGNMENTS_API_URL = 'http://localhost:3001/introTrainingAssignments';

const assertResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
};

export const getIntroTrainingAssignments = async (): Promise<IntroTrainingAssignment[]> => {
  const response = await fetch(INTRO_TRAINING_ASSIGNMENTS_API_URL);
  await assertResponse(response);

  return response.json() as Promise<IntroTrainingAssignment[]>;
};

export const createIntroTrainingAssignment = async (
  assignment: IntroTrainingAssignment,
): Promise<IntroTrainingAssignment> => {
  const response = await fetch(INTRO_TRAINING_ASSIGNMENTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });

  await assertResponse(response);

  return response.json() as Promise<IntroTrainingAssignment>;
};

export const updateIntroTrainingAssignment = async (
  assignmentId: string,
  assignment: IntroTrainingAssignmentPayload,
): Promise<IntroTrainingAssignment> => {
  const response = await fetch(
    `${INTRO_TRAINING_ASSIGNMENTS_API_URL}/${encodeURIComponent(assignmentId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignment),
    },
  );

  await assertResponse(response);

  return response.json() as Promise<IntroTrainingAssignment>;
};

export const deleteIntroTrainingAssignment = async (assignmentId: string) => {
  const response = await fetch(
    `${INTRO_TRAINING_ASSIGNMENTS_API_URL}/${encodeURIComponent(assignmentId)}`,
    {
      method: 'DELETE',
    },
  );

  if (response.status === 404) {
    return;
  }

  await assertResponse(response);
};
