/** Inclusive letter-count bounds for crossword answers after normalization. */
export const MIN_ANSWER_LENGTH = 3;
export const MAX_ANSWER_LENGTH = 15;

export const ANSWER_PATTERN = new RegExp(
  `^[A-Z]{${MIN_ANSWER_LENGTH},${MAX_ANSWER_LENGTH}}$`,
);
