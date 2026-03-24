import type { PlaceResult } from "./types.js";

export type ConversationState =
  | { step: "idle" }
  | { step: "waiting_business" }
  | { step: "confirming"; candidate: PlaceResult }
  | { step: "generating"; placeId: string }
  | { step: "done" }
  | { step: "editing"; responseId: string };

const states = new Map<number, ConversationState>();

export function getState(chatId: number): ConversationState {
  return states.get(chatId) ?? { step: "idle" };
}

export function setState(chatId: number, state: ConversationState): void {
  states.set(chatId, state);
}

export function resetState(chatId: number): void {
  states.set(chatId, { step: "idle" });
}
