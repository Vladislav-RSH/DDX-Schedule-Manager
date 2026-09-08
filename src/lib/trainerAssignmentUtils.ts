import type { Trainer } from '../api/trainers';

export type TrainerOption = {
  trainer: Trainer;
  label: string;
  searchLabel: string;
};

export type TrainerAssignmentRecord = {
  trainerId: string | null;
  trainerName: string;
  date: string;
  time: string;
};

export type TrainerAssignmentMap = Record<string, TrainerAssignmentRecord>;

export const getTrainerName = (trainer: Trainer) =>
  [trainer.lastName, trainer.firstName].filter(Boolean).join(' ') || 'Без имени';

export const getTrainerShortName = (trainer: Trainer) =>
  trainer.lastName.trim() || getTrainerName(trainer);

export const getTrainerShortNameFromLabel = (label: string) =>
  label.trim().split(/\s+/)[0] || label;

export const normalizeValue = (value: string) => value.trim().toLocaleLowerCase('ru-RU');

export const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const buildTrainerOptions = (trainers: Trainer[]): TrainerOption[] =>
  trainers
    .map((trainer) => {
      const label = getTrainerName(trainer);

      return {
        trainer,
        label,
        searchLabel: normalizeValue([label, trainer.firstName, trainer.lastName].join(' ')),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'ru-RU'));

export const getAssignmentDisplayValue = (
  assignment: Pick<TrainerAssignmentRecord, 'trainerId' | 'trainerName'> | null,
  trainerOptions: TrainerOption[],
) => {
  if (!assignment) {
    return '';
  }

  const matchedTrainer = trainerOptions.find((option) => option.trainer.id === assignment.trainerId);

  if (matchedTrainer) {
    return getTrainerShortName(matchedTrainer.trainer);
  }

  return getTrainerShortNameFromLabel(assignment.trainerName);
};

const isTrainerAssignmentRecord = (value: unknown): value is TrainerAssignmentRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as TrainerAssignmentRecord;

  return (
    (typeof candidate.trainerId === 'string' || candidate.trainerId === null) &&
    typeof candidate.trainerName === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.time === 'string'
  );
};

export const loadStoredAssignments = (storageKey: string): TrainerAssignmentMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return Object.entries(parsed).reduce<TrainerAssignmentMap>((accumulator, [key, value]) => {
      if (isTrainerAssignmentRecord(value)) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

export const saveStoredAssignments = (storageKey: string, assignments: TrainerAssignmentMap) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(assignments));
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
};
