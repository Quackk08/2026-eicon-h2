import type { ActionTemplate } from "@renew/shared";

/**
 * Reviewed Activity Ladder seed data. AI never invents entries here — it
 * can only select among them (docs/IMPLEMENTATION_PLAN.md section 7).
 */
export const actionTemplateSeeds: ActionTemplate[] = [
  // Study & School ladder
  {
    id: "study-notebook-prep",
    goalDomains: ["study_school"],
    title: "노트와 펜 하나 가방에 넣기",
    minCapacity: 0,
    maxSocialLoad: 0,
    durationRange: [1, 5],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "study-home-desk",
    goalDomains: ["study_school"],
    title: "집 책상에서 5분 공부하기",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 10],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "study-cafe-entrance",
    goalDomains: ["study_school"],
    title: "가까운 카페 입구까지 걸어갔다 오기",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 15],
    costLevel: 0,
    placeTypes: ["cafe", "library"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 3,
    safetyTags: []
  },
  {
    id: "study-cafe-short-stay",
    goalDomains: ["study_school"],
    title: "카페에서 노트를 펼치고 10분 머무르기",
    minCapacity: 2,
    maxSocialLoad: 1,
    durationRange: [10, 20],
    costLevel: 1,
    placeTypes: ["cafe", "library"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 4,
    safetyTags: []
  },
  {
    id: "study-cafe-full-session",
    goalDomains: ["study_school"],
    title: "카페나 도서관에서 20분 공부하기",
    minCapacity: 3,
    maxSocialLoad: 1,
    durationRange: [20, 40],
    costLevel: 1,
    placeTypes: ["cafe", "library"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 5,
    safetyTags: []
  },

  // Movement & outing ladder
  {
    id: "movement-window",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "창문 열고 바깥 공기 쐬기",
    minCapacity: 0,
    maxSocialLoad: 0,
    durationRange: [1, 5],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "movement-doorstep-walk",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "집 앞에서 5분 걷기",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 10],
    costLevel: 0,
    placeTypes: ["street"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "movement-park-visit",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "가까운 공원 벤치에 10분 앉아있기",
    minCapacity: 1,
    maxSocialLoad: 1,
    durationRange: [10, 20],
    costLevel: 0,
    placeTypes: ["park"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 3,
    safetyTags: []
  },
  {
    id: "movement-park-walk",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "공원에서 15분 산책하기",
    minCapacity: 2,
    maxSocialLoad: 1,
    durationRange: [15, 30],
    costLevel: 0,
    placeTypes: ["park", "trail"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 4,
    safetyTags: []
  },

  // Relationships / social ladder
  {
    id: "social-message",
    goalDomains: ["relationships"],
    title: "친구에게 짧은 메시지 보내기",
    minCapacity: 0,
    maxSocialLoad: 1,
    durationRange: [1, 5],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "social-same-space",
    goalDomains: ["relationships"],
    title: "가족과 같은 공간에서 각자 시간 보내기",
    minCapacity: 1,
    maxSocialLoad: 1,
    durationRange: [10, 30],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "social-online-cofocus",
    goalDomains: ["relationships", "study_school"],
    title: "대화 없는 온라인 공동 집중 활동 참여하기",
    minCapacity: 1,
    maxSocialLoad: 1,
    durationRange: [15, 30],
    costLevel: 0,
    placeTypes: ["online"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 3,
    safetyTags: []
  },
  {
    id: "social-short-walk-with-friend",
    goalDomains: ["relationships", "movement_health"],
    title: "친구와 짧게 산책하기",
    minCapacity: 2,
    maxSocialLoad: 2,
    durationRange: [15, 30],
    costLevel: 0,
    placeTypes: ["park", "street"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 4,
    safetyTags: []
  },

  // Daily independence / life-recovery ladder
  {
    id: "life-water",
    goalDomains: ["daily_independence", "sleep_energy"],
    title: "물 한 잔 마시기",
    minCapacity: 0,
    maxSocialLoad: 0,
    durationRange: [1, 3],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "daily-recovery",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "life-tidy-desk",
    goalDomains: ["daily_independence"],
    title: "책상 5분 정리하기",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 10],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "daily-recovery",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "life-simple-meal",
    goalDomains: ["daily_independence", "sleep_energy"],
    title: "간단한 식사 준비해서 먹기",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [10, 20],
    costLevel: 1,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "daily-recovery",
    ladderLevel: 3,
    safetyTags: []
  }
];
