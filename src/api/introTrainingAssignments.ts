import type { TrainerAssignmentRecord } from '../lib/trainerAssignmentUtils';
import {
  deleteCollectionItem,
  loadCollection,
  replaceCollectionItem,
  upsertCollectionItem,
} from '../lib/browserStorage';
import { supabase } from '../lib/supabaseClient';

export type IntroTrainingAssignment = TrainerAssignmentRecord & {
  id: string;
};

type IntroTrainingAssignmentPayload = Omit<IntroTrainingAssignment, 'id'>;

type IntroTrainingAssignmentRow = {
  id: string;
  trainer_id: string | null;
  trainer_name: string | null;
  date: string;
  time: string;
};

type AssignmentChange =
  | {
      type: 'upsert';
      assignment: IntroTrainingAssignment;
    }
  | {
      type: 'delete';
      assignmentId: string;
    };

const INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY =
  'fedoseevsky-schedule-manager:introTrainingAssignments';

const mapRowToAssignment = (row: IntroTrainingAssignmentRow): IntroTrainingAssignment => ({
  id: row.id,
  trainerId: row.trainer_id,
  trainerName: row.trainer_name ?? '',
  date: row.date,
  time: row.time,
});

export const getIntroTrainingAssignments = async (): Promise<IntroTrainingAssignment[]> => {
  if (!supabase) {
    return loadCollection<IntroTrainingAssignment>(INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY);
  }

  const { data, error } = await supabase
    .from('intro_training_assignments')
    .select('id, trainer_id, trainer_name, date, time')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRowToAssignment);
};

export const createIntroTrainingAssignment = async (
  assignment: IntroTrainingAssignment,
): Promise<IntroTrainingAssignment> => {
  if (!supabase) {
    upsertCollectionItem<IntroTrainingAssignment>(INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY, assignment);
    return assignment;
  }

  const { error } = await supabase.from('intro_training_assignments').upsert(
    {
      id: assignment.id,
      trainer_id: assignment.trainerId,
      trainer_name: assignment.trainerName,
      date: assignment.date,
      time: assignment.time,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw error;
  }

  return assignment;
};

export const updateIntroTrainingAssignment = async (
  assignmentId: string,
  assignment: IntroTrainingAssignmentPayload,
): Promise<IntroTrainingAssignment> => {
  if (!supabase) {
    return replaceCollectionItem<IntroTrainingAssignment>(
      INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY,
      assignmentId,
      assignment,
    );
  }

  const nextAssignment: IntroTrainingAssignment = { id: assignmentId, ...assignment };

  const { error } = await supabase.from('intro_training_assignments').upsert(
    {
      id: nextAssignment.id,
      trainer_id: nextAssignment.trainerId,
      trainer_name: nextAssignment.trainerName,
      date: nextAssignment.date,
      time: nextAssignment.time,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw error;
  }

  return nextAssignment;
};

export const deleteIntroTrainingAssignment = async (assignmentId: string) => {
  if (!supabase) {
    deleteCollectionItem(INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY, assignmentId);
    return;
  }

  const { error } = await supabase
    .from('intro_training_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    throw error;
  }
};

export const subscribeToIntroTrainingAssignments = (onChange: (change: AssignmentChange) => void) => {
  const client = supabase;

  if (!client) {
    return () => {};
  }

  const channel = client
    .channel('public:intro_training_assignments')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'intro_training_assignments' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const assignmentId = (payload.old as { id?: string } | null)?.id;

          if (assignmentId) {
            onChange({ type: 'delete', assignmentId });
          }

          return;
        }

        const row = payload.new as IntroTrainingAssignmentRow | null;

        if (!row) {
          return;
        }

        onChange({ type: 'upsert', assignment: mapRowToAssignment(row) });
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
};
