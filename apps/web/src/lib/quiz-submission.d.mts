import type { QuizQuestion, QuizSubmitRequest, QuizSubmitResponse } from "./quiz-types";

export class QuizSubmissionError extends Error {
  status: number | null;
  constructor(message: string, status?: number | null);
}

export function parseQuizSubmission(input: unknown): QuizSubmitRequest;
export function createQuizSubmissionId(cryptoSource?: Partial<Pick<Crypto, "randomUUID" | "getRandomValues">>): string;
export function prepareQuizSubmission(
  pending: Readonly<QuizSubmitRequest> | null,
  input: Omit<QuizSubmitRequest, "submission_id">,
  createId?: () => string,
): Readonly<QuizSubmitRequest>;
export function quizProgress(
  question: QuizQuestion | null,
  totalQuestions: number,
  complete?: boolean,
): { questionNumber: number; answeredQuestions: number };
export function submissionFailureAction(error: unknown): "edit" | "restart" | "retry";
export function readQuizSubmissionResponse(response: Response): Promise<QuizSubmitResponse>;
