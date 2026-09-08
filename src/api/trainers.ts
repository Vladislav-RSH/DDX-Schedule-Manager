import {
  createCollectionId,
  deleteCollectionItem,
  loadCollection,
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
    deleteCollectionItem(TRAINERS_STORAGE_KEY, trainerId);
    return;
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
