// Contract Constants & PTB Functions
export {
  PACKAGE_ID,
  DOCUMENT_LIBRARY_ID,
  ACHIEVEMENT_MINTER_ID,
  CLOCK_ID,
  createStudentProfile,
  uploadDocument,
  voteDocument,
  addAchievementToProfile,
  updateMonthlyLeaderboard,
  mintMonthlyAchievement,
  mintUploaderAchievement,
  mintPopularDocumentAchievement,
} from "./contracts";

export type {
  Document,
  StudentProfile,
  LeaderboardEntry,
  AchievementNFT,
} from "./contracts";

// React Hooks
export {
  useCreateStudentProfile,
  useUploadDocument,
  useVoteDocument,
  useAddAchievementToProfile,
  useMintMonthlyAchievement,
  useMintUploaderAchievement,
  useMintPopularDocumentAchievement,
  useStudentProfile,
  useLibraryStats,
  useDocuments,
  useAchievements,
} from "./hooks";
