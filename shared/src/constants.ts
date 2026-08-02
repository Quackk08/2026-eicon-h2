export const LIFE_DOMAINS = [
  "study_school",
  "sleep_energy",
  "relationships",
  "movement_health",
  "creativity",
  "daily_independence",
  "community_participation",
  "stress_recovery"
] as const;

export const STATE_TAGS = [
  "stable",
  "low_energy",
  "high_initiation_difficulty",
  "high_social_load",
  "sleep_disrupted",
  "reduced_outing",
  "reduced_activity",
  "connection_needed",
  "support_suggested"
] as const;

export const MISSION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "partially_completed",
  "not_today",
  "cancelled"
] as const;

export const SYNC_STATUSES = [
  "pending",
  "syncing",
  "synced",
  "conflict",
  "failed"
] as const;
