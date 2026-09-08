import {
  createCollectionId,
  deleteCollectionItem,
  loadCollection,
  saveCollection,
  upsertCollectionItem,
} from '../lib/browserStorage';
import { supabase } from '../lib/supabaseClient';

export type Trainer = {
  id: string;
  firstName: string;
  lastName: string;
};

type TrainerPayload = Pick<Trainer, 'firstName' | 'lastName'>;

type TrainerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type TrainerChange =
  | {
      type: 'upsert';
      trainer: Trainer;
    }
  | {
      type: 'delete';
      trainerId: string;
    };

const TRAINERS_STORAGE_KEY = 'fedoseevsky-schedule-manager:trainers';
const SCHEDULE_ASSIGNMENTS_STORAGE_KEY = 'fedoseevsky-schedule-manager:scheduleAssignments';
const SMART_START_ASSIGNMENTS_STORAGE_KEY = 'fedoseevsky-schedule-manager:smartStartAssignments';
const INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY =
  'fedoseevsky-schedule-manager:introTrainingAssignments';

type TrainerAssignmentRecord = {
  id: string;
  trainerId: string | null;
  trainerName: string;
  date: string;
  time: string;
};

const mapRowToTrainer = (row: TrainerRow): Trainer => ({
  id: row.id,
  firstName: row.first_name ?? '',
  lastName: row.last_name ?? '',
});

export const sortTrainers = (trainers: Trainer[]) =>
  [...trainers].sort((left, right) => {
    const lastNameComparison = left.lastName.localeCompare(right.lastName, 'ru-RU');

    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }

    return left.firstName.localeCompare(right.firstName, 'ru-RU');
  });

export const getTrainers = async (): Promise<Trainer[]> => {
  if (!supabase) {
    return sortTrainers(loadCollection<Trainer>(TRAINERS_STORAGE_KEY));
  }

  const { data, error } = await supabase
    .from('trainers')
    .select('id, first_name, last_name')
    .order('last_name', { ascending: true, nullsFirst: false })
    .order('first_name', { ascending: true, nullsFirst: false });

  if (error) {
    throw error;
  }

  return sortTrainers((data ?? []).map(mapRowToTrainer));
};

export const createTrainer = async (trainer: TrainerPayload): Promise<Trainer> => {
  const nextTrainer: Trainer = {
    id: createCollectionId('trainer'),
    ...trainer,
  };

  if (!supabase) {
    upsertCollectionItem<Trainer>(TRAINERS_STORAGE_KEY, nextTrainer);
    return nextTrainer;
  }

  const { error } = await supabase.from('trainers').insert({
    id: nextTrainer.id,
    first_name: nextTrainer.firstName,
    last_name: nextTrainer.lastName,
  });

  if (error) {
    throw error;
  }

  return nextTrainer;
};

export const deleteTrainer = async (trainerId: string) => {
  if (!supabase) {
    const clearAssignments = (storageKey: string) => {
      const assignments = loadCollection<TrainerAssignmentRecord>(storageKey);
      const nextAssignments = assignments.filter((assignment) => assignment.trainerId !== trainerId);

      saveCollection(storageKey, nextAssignments);
    };

    clearAssignments(SCHEDULE_ASSIGNMENTS_STORAGE_KEY);
    clearAssignments(SMART_START_ASSIGNMENTS_STORAGE_KEY);
    clearAssignments(INTRO_TRAINING_ASSIGNMENTS_STORAGE_KEY);
    deleteCollectionItem(TRAINERS_STORAGE_KEY, trainerId);
    return;
  }

  const [scheduleResult, smartStartResult, introResult] = await Promise.all([
    supabase.from('schedule_assignments').delete().eq('trainer_id', trainerId),
    supabase.from('smart_start_assignments').delete().eq('trainer_id', trainerId),
    supabase.from('intro_training_assignments').delete().eq('trainer_id', trainerId),
  ]);

  const assignmentError = scheduleResult.error ?? smartStartResult.error ?? introResult.error;

  if (assignmentError) {
    throw assignmentError;
  }

  const { error } = await supabase.from('trainers').delete().eq('id', trainerId);

  if (error) {
    throw error;
  }
};

export const subscribeToTrainers = (onChange: (change: TrainerChange) => void) => {
  const client = supabase;

  if (!client) {
    return () => {};
  }

  const channel = client
    .channel('public:trainers')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trainers' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const trainerId = (payload.old as { id?: string } | null)?.id;

          if (trainerId) {
            onChange({ type: 'delete', trainerId });
          }

          return;
        }

        const row = payload.new as TrainerRow | null;

        if (!row) {
          return;
        }

        onChange({ type: 'upsert', trainer: mapRowToTrainer(row) });
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
};
