/**
 * Provider Quality Service
 *
 * Manages provider quality scores, routing, and learning
 */

export { detectTaskType, getTaskTypeConfidence } from "./task-detector";
export {
  detectFeedback,
  isCorrection,
  isApproval,
  type FeedbackType,
  type FeedbackResult,
} from "./feedback-detector";
export {
  loadQualityData,
  saveQualityData,
  getProviderQuality,
  updateProviderQuality,
  calculateOverallScore,
} from "./persistence";
export {
  updateQualityScore,
  getTaskScore,
  getOverallScore,
  recordApproval,
  recordCorrection,
  recordRejection,
  recordAuditResult,
  type Outcome,
  type ScoreUpdate,
} from "./score-manager";
export {
  determineRoute,
  shouldAudit,
  getRoutingExplanation,
  type RoutingContext,
} from "./router";
