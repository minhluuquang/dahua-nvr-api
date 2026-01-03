import { DahuaClient } from "../dahua-client";

/**
 * Session store for active Dahua client sessions
 *
 * In production, consider replacing with Redis or similar
 * for horizontal scaling and persistence.
 */
const activeSessions = new Map<string, DahuaClient>();

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): DahuaClient | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Store a session
 */
export function setSession(sessionId: string, client: DahuaClient): void {
  activeSessions.set(sessionId, client);
}

/**
 * Remove a session
 */
export function deleteSession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

/**
 * Check if a session exists
 */
export function hasSession(sessionId: string): boolean {
  return activeSessions.has(sessionId);
}
