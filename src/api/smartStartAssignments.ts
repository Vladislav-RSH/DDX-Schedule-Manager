import type { TrainerAssignmentRecord } from '../lib/trainerAssignmentUtils';
import {
  deleteCollectionItem,
  loadCollection,
  replaceCollectionItem,
  upsertCollectionItem,
} from '../lib/browserStorage';
import { supabase } from '../lib/supabaseClient';

export type SmartStartAssignment = TrainerAssignmentRecord & {
  id: string;
};

type SmartStartAssignmentPayload = Omit<SmartStartAssignment, 'id'>;

type SmartStartAssignmentRow = {
  id: string;
  trainer_id: string | null;
  trainer_name: string | null;
  date: string;
  time: string;
};

type AssignmentChange =
  | {
      type: 'upsert';
      assignment: SmartStartAssignment;
    }
  | {
      type: 'delete';
      assignmentId: string;
    };

const SMART_START_ASSIGNMENTS_STORAGE_KEY = 'fedoseevsky-schedule-manager:smartStartAssignments';

const mapRowToAssignment = (row: SmartStartAssignmentRow): SmartStartAssignment => ({
  id: row.id,
  trainerId: row.trainer_id,
  trainerName: row.trainer_name ?? '',
  date: row.date,
  time: row.time,
});

export const getSmartStartAssignments = async (): Promise<SmartStartAssignment[]> => {
  if (!supabase) {
    return loadCollection<SmartStartAssignment>(SMART_START_ASSIGNMENTS_STORAGE_KEY);
  }

  const { data, error } = await supabase
    .from('smart_start_assignments')
    .select('id, trainer_id, trainer_name, date, time')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRowToAssignment);
};

export const createSmartStartAssignment = async (
  assignment: SmartStartAssignment,
): Promise<SmartStartAssignment> => {
  if (!supabase) {
    upsertCollectionItem<SmartStartAssignment>(SMART_START_ASSIGNMENTS_STORAGE_KEY, assignment);
    return assignment;
  }

  const { error } = await supabase.from('smart_start_assignments').upsert(
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

export const updateSmartStartAssignment = async (
  assignmentId: string,
  assignment: SmartStartAssignmentPayload,
): Promise<SmartStartAssignment> => {
  if (!supabase) {
    return replaceCollectionItem<SmartStartAssignment>(
      SMART_START_ASSIGNMENTS_STORAGE_KEY,
      assignmentId,
      assignment,
    );
  }

  const nextAssignment: SmartStartAssignment = { id: assignmentId, ...assignment };

  const { error } = await supabase.from('smart_start_assignments').upsert(
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

export const deleteSmartStartAssignment = async (assignmentId: string) => {
  if (!supabase) {
    deleteCollectionItem(SMART_START_ASSIGNMENTS_STORAGE_KEY, assignmentId);
    return;
  }

  const { error } = await supabase.from('smart_start_assignments').delete().eq('id', assignmentId);

  if (error) {
    throw error;
  }
};

export const subscribeToSmartStartAssignments = (onChange: (change: AssignmentChange) => void) => {
  const client = supabase;

  if (!client) {
    return () => {};
  }

  const channel = client
    .channel('public:smart_start_assignments')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'smart_start_assignments' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const assignmentId = (payload.old as { id?: string } | null)?.id;

          if (assignmentId) {
            onChange({ type: 'delete', assignmentId });
          }

          return;
        }

        const row = payload.new as SmartStartAssignmentRow | null;

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
