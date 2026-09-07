export type Trainer = {
  id: string;
  firstName: string;
  lastName: string;
};

type TrainerPayload = Pick<Trainer, 'firstName' | 'lastName'>;

const TRAINERS_API_URL = 'http://localhost:3001/trainers';

const assertResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
};

export const getTrainers = async (): Promise<Trainer[]> => {
  const response = await fetch(TRAINERS_API_URL);
  await assertResponse(response);

  return response.json() as Promise<Trainer[]>;
};

export const createTrainer = async (trainer: TrainerPayload): Promise<Trainer> => {
  const response = await fetch(TRAINERS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: `trainer-${Date.now()}`,
      ...trainer,
    }),
  });

  await assertResponse(response);

  return response.json() as Promise<Trainer>;
};

export const deleteTrainer = async (trainerId: string) => {
  const response = await fetch(`${TRAINERS_API_URL}/${trainerId}`, {
    method: 'DELETE',
  });

  await assertResponse(response);
};
