import type {
  Assignment,
  AssignmentResult,
  FinalIntent,
} from "./editorial-types";
import type { Role } from "./types";
export function editorialRoute(
  method: string,
  parts: string[],
): { path: string; roles: Role[] } | null;
export function finalIntent(
  existing: FinalIntent | null,
  revision: number,
  key: string,
): FinalIntent;
export function isAssignmentReceipt(
  value: unknown,
  attemptId: string,
  assignmentId: string,
): value is AssignmentResult;
export function sameEditorialOrigin(
  origin: string | null,
  host: string | null,
  protocol: string,
): boolean;
export function assignmentAvailability(
  assignment: Pick<
    Assignment,
    "is_closed" | "opens_at" | "due_at" | "attempt_state"
  >,
  at?: number,
): "open" | "scheduled" | "expired" | "closed" | "submitted";
