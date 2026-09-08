import type { TrainerAssignmentRecord } from '../lib/trainerAssignmentUtils';
import {
  deleteCollectionItem,
  loadCollection,
  replaceCollectionItem,
  upsertCollectionItem,
} from '../lib/browserStorage';

export type SmartStartAssignment = TrainerAssignmentRecord & {
  id: string;
};

type SmartStartAssignmentPayload = Omit<SmartStartAssignment, 'id'>;

const SMART_START_ASSIGNMENTS_STORAGE_KEY = 'fedoseevsky-schedule-manager:smartStartAssignments';

export const getSmartStartAssignments = async (): Promise<SmartStartAssignment[]> => {
  return loadCollection<SmartStartAssignment>(SMART_START_ASSIGNMENTS_STORAGE_KEY);
};

export const createSmartStartAssignment = async (
  assignment: SmartStartAssignment,
): Promise<SmartStartAssignment> => {
  upsertCollectionItem<SmartStartAssignment>(SMART_START_ASSIGNMENTS_STORAGE_KEY, assignment);

  return assignment;
};

export const updateSmartStartAssignment = async (
  assignmentId: string,
  assignment: SmartStartAssignmentPayload,
): Promise<SmartStartAssignment> => {
  return replaceCollectionItem<SmartStartAssignment>(
    SMART_START_ASSIGNMENTS_STORAGE_KEY,
    assignmentId,
    assignment,
  );
};

export const deleteSmartStartAssignment = async (assignmentId: string) => {
  deleteCollectionItem(SMART_START_ASSIGNMENTS_STORAGE_KEY, assignmentId);
};
