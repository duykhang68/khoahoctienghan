import {runScheduler} from './server-scheduler.mjs';
import {sheetsBundle} from './generated/sheets-assets.mjs';
import {createGoogleVerifier} from './adapters/google-identity.mjs';
import {routeRequest} from './router.mjs';

// Preserve the public module exports used by existing tests and consumers.
export {authorized} from './auth/session.mjs';
export {dashboardSnapshot,librarySnapshot,categorySnapshot} from './adapters/published-catalog.mjs';
export {courseOverview} from './repositories/course.mjs';
export {courseSlug,validateCourseInput,validateCurriculum,validateLessonBlocks,validateQuizQuestions,releaseChecks} from './course/validation.mjs';
export {courseDriveToken,eligibleCourseMedia} from './adapters/google-drive.mjs';
export {coursePreviewPage} from './views/course-release.mjs';
export const verifyGoogle=createGoogleVerifier();

export default {
 async fetch(req,env){return routeRequest(req,env,verifyGoogle);},
 async scheduled(_event,env,ctx){ctx.waitUntil(runScheduler(env,sheetsBundle.topics));}
};
