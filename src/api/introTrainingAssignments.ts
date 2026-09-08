export type IntroTrainingAssignment = {
  id: string;
  date: string;
  time: string;
  trainerId: string | null;
  trainerName: string;
};

type IntroTrainingAssignmentPayload = Omit<IntroTrainingAssignment, 'id'>;

import {
  deleteCollectionItem,
  loadCollection,
  replaceCollectionItem,
  upsertCollectionItem,
} from '../lib/browserStorage';

const INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY =
  'fedoseevsky-schedule-manager:introTrainingAssignments';

export const getIntroTrainingAssignments = async (): Promise<IntroTrainingAssignment[]> => {
  return loadCollection<IntroTrainingAssignment>(INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY);
};

export const createIntroTrainingAssignment = async (
  assignment: IntroTrainingAssignment,
): Promise<IntroTrainingAssignment> => {
  upsertCollectionItem<IntroTrainingAssignment>(
    INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY,
    assignment,
  );

  return assignment;
};

export const updateIntroTrainingAssignment = async (
  assignmentId: string,
  assignment: IntroTrainingAssignmentPayload,
): Promise<IntroTrainingAssignment> => {
  return replaceCollectionItem<IntroTrainingAssignment>(
    INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY,
    assignmentId,
    assignment,
  );
};

export const deleteIntroTrainingAssignment = async (assignmentId: string) => {
  deleteCollectionItem(INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY, assignmentId);
};
