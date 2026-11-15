// Compatibility facade: policy modules are pure and independently testable.
export {ciName,releaseName,checkName} from '../core/engineering/constants.mjs';
export {classify,canRetry,migrateSidebar} from '../core/engineering/failure-policy.mjs';
export {nativePolicyReady,latestRun} from '../core/engineering/ci-policy.mjs';
export {trustedPR,branchSyncDecision,dependabotSyncEligible} from '../core/engineering/branch-policy.mjs';
export {sensitiveFile,mergeReviewRequired} from '../core/engineering/merge-policy.mjs';
