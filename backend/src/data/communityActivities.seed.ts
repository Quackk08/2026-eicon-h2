import type { CommunityActivity } from "@renew/shared";

/**
 * Reviewed Community Steps only — small, structured, low-pressure shared
 * actions, not an open social feed. socialLoad mirrors the same 0-4 scale
 * used elsewhere: 0-1 = "being present together" without conversation,
 * up to 3-4 = taking on a role or organizing.
 */
export const communityActivitySeeds: CommunityActivity[] = [
  {
    id: "community-silent-cofocus-online",
    title: "대화 없는 온라인 공동 집중 25분",
    domain: "study_school",
    startsAt: null,
    isOnline: true,
    location: null,
    durationMinutes: 25,
    socialLoad: 1,
    maxParticipants: 12,
    requiredItems: null
  },
  {
    id: "community-library-silent-study",
    title: "도서관 Silent Study",
    domain: "study_school",
    startsAt: null,
    isOnline: false,
    location: "Riverside Quiet Library",
    durationMinutes: 40,
    socialLoad: 1,
    maxParticipants: 8,
    requiredItems: "노트나 책 한 권"
  },
  {
    id: "community-short-park-walk",
    title: "동네 짧은 산책 (10분)",
    domain: "movement_health",
    startsAt: null,
    isOnline: false,
    location: "Downtown Green Park",
    durationMinutes: 10,
    socialLoad: 2,
    maxParticipants: 6,
    requiredItems: null
  },
  {
    id: "community-cafe-parallel-study",
    title: "카페에서 각자 공부하기",
    domain: "study_school",
    startsAt: null,
    isOnline: false,
    location: "Maple Street Cafe",
    durationMinutes: 30,
    socialLoad: 2,
    maxParticipants: 6,
    requiredItems: "음료 값"
  },
  {
    id: "community-weekly-planning",
    title: "일요일 저녁 주간 계획 함께 작성하기",
    domain: "daily_independence",
    startsAt: null,
    isOnline: true,
    location: null,
    durationMinutes: 20,
    socialLoad: 2,
    maxParticipants: 10,
    requiredItems: null
  },
  {
    id: "community-studio-dropin",
    title: "그림/공예 드롭인 스튜디오 모임",
    domain: "creativity",
    startsAt: null,
    isOnline: false,
    location: "Arts District Community Studio",
    durationMinutes: 45,
    socialLoad: 3,
    maxParticipants: 8,
    requiredItems: null
  }
];
