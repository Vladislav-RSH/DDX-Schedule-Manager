import type { TrainerAssignmentRecord } from '../lib/trainerAssignmentUtils';
import {
  deleteCollectionItem,
  loadCollection,
  replaceCollectionItem,
  upsertCollectionItem,
} from '../lib/browserStorage';

export type ScheduleAssignment = TrainerAssignmentRecord & {
  id: string;
};

type ScheduleAssignmentPayload = Omit<ScheduleAssignment, 'id'>;

const SCHEDULE_ASSIGNMENTS_STORAGE_KEY = 'fedoseevsky-schedule-manager:scheduleAssignments';

export const getScheduleAssignments = async (): Promise<ScheduleAssignment[]> => {
  return loadCollection<ScheduleAssignment>(SCHEDULE_ASSIGNMENTS_STORAGE_KEY);
};

export const createScheduleAssignment = async (
  assignment: ScheduleAssignment,
): Promise<ScheduleAssignment> => {
  upsertCollectionItem<ScheduleAssignment>(SCHEDULE_ASSIGNMENTS_STORAGE_KEY, assignment);

  return assignment;
};

export const updateScheduleAssignment = async (
  assignmentId: string,
  assignment: ScheduleAssignmentPayload,
): Promise<ScheduleAssignment> => {
  return replaceCollectionItem<ScheduleAssignment>(
    SCHEDULE_ASSIGNMENTS_STORAGE_KEY,
    assignmentId,
    assignment,
  );
};

export const deleteScheduleAssignment = async (assignmentId: string) => {
  deleteCollectionItem(SCHEDULE_ASSIGNMENTS_STORAGE_KEY, assignmentId);
};
