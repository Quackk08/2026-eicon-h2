import { LIFE_DOMAINS, STATE_TAGS, MISSION_STATUSES } from "@renew/shared";

export type LifeDomain = (typeof LIFE_DOMAINS)[number];
export type StateTag = (typeof STATE_TAGS)[number];
export type MissionStatus = (typeof MISSION_STATUSES)[number];
