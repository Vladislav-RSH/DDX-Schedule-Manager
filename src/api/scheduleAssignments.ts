import type { TrainerAssignmentRecord } from '../lib/trainerAssignmentUtils';
import {
  deleteCollectionItem,
  loadCollection,
  replaceCollectionItem,
  upsertCollectionItem,
} from '../lib/browserStorage';
import { supabase } from '../lib/supabaseClient';

export type ScheduleAssignment = TrainerAssignmentRecord & {
  id: string;
};

type ScheduleAssignmentPayload = Omit<ScheduleAssignment, 'id'>;

type ScheduleAssignmentRow = {
  id: string;
  trainer_id: string | null;
  trainer_name: string | null;
  date: string;
  time: string;
};

type AssignmentChange =
  | {
      type: 'upsert';
      assignment: ScheduleAssignment;
    }
  | {
      type: 'delete';
      assignmentId: string;
    };

const SCHEDULE_ASSIGNMENTS_STORAGE_KEY = 'fedoseevsky-schedule-manager:scheduleAssignments';

const mapRowToAssignment = (row: ScheduleAssignmentRow): ScheduleAssignment => ({
  id: row.id,
  trainerId: row.trainer_id,
  trainerName: row.trainer_name ?? '',
  date: row.date,
  time: row.time,
});

export const getScheduleAssignments = async (): Promise<ScheduleAssignment[]> => {
  if (!supabase) {
    return loadCollection<ScheduleAssignment>(SCHEDULE_ASSIGNMENTS_STORAGE_KEY);
  }

  const { data, error } = await supabase
    .from('schedule_assignments')
    .select('id, trainer_id, trainer_name, date, time')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRowToAssignment);
};

export const createScheduleAssignment = async (
  assignment: ScheduleAssignment,
): Promise<ScheduleAssignment> => {
  if (!supabase) {
    upsertCollectionItem<ScheduleAssignment>(SCHEDULE_ASSIGNMENTS_STORAGE_KEY, assignment);
    return assignment;
  }

  const { error } = await supabase.from('schedule_assignments').upsert(
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

export const updateScheduleAssignment = async (
  assignmentId: string,
  assignment: ScheduleAssignmentPayload,
): Promise<ScheduleAssignment> => {
  if (!supabase) {
    return replaceCollectionItem<ScheduleAssignment>(
      SCHEDULE_ASSIGNMENTS_STORAGE_KEY,
      assignmentId,
      assignment,
    );
  }

  const nextAssignment: ScheduleAssignment = { id: assignmentId, ...assignment };

  const { error } = await supabase.from('schedule_assignments').upsert(
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

export const deleteScheduleAssignment = async (assignmentId: string) => {
  if (!supabase) {
    deleteCollectionItem(SCHEDULE_ASSIGNMENTS_STORAGE_KEY, assignmentId);
    return;
  }

  const { error } = await supabase.from('schedule_assignments').delete().eq('id', assignmentId);

  if (error) {
    throw error;
  }
};

export const subscribeToScheduleAssignments = (onChange: (change: AssignmentChange) => void) => {
  const client = supabase;

  if (!client) {
    return () => {};
  }

  const channel = client
    .channel('public:schedule_assignments')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'schedule_assignments' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const assignmentId = (payload.old as { id?: string } | null)?.id;

          if (assignmentId) {
            onChange({ type: 'delete', assignmentId });
          }

          return;
        }

        const row = payload.new as ScheduleAssignmentRow | null;

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
