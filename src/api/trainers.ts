export type Trainer = {
  id: string;
  firstName: string;
  lastName: string;
};

type TrainerPayload = Pick<Trainer, 'firstName' | 'lastName'>;

import {
  createCollectionId,
  deleteCollectionItem,
  loadCollection,
  upsertCollectionItem,
} from '../lib/browserStorage';

const TRAINERS_STORAGE_KEY = 'fedoseevsky-schedule-manager:trainers';

export const getTrainers = async (): Promise<Trainer[]> => {
  return loadCollection<Trainer>(TRAINERS_STORAGE_KEY);
};

export const createTrainer = async (trainer: TrainerPayload): Promise<Trainer> => {
  const nextTrainer: Trainer = {
    id: createCollectionId('trainer'),
    ...trainer,
  };

  upsertCollectionItem<Trainer>(TRAINERS_STORAGE_KEY, nextTrainer);

  return nextTrainer;
};

export const deleteTrainer = async (trainerId: string) => {
  deleteCollectionItem(TRAINERS_STORAGE_KEY, trainerId);
};
