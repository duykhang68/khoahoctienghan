// Compatibility facade; callers can import a focused core module directly.
export {courseSlug} from '../../core/course/slug.mjs';
export {validateCourseInput} from '../../core/course/validation.mjs';
export {curriculumId} from '../../core/course/ids.mjs';
export {validateCurriculum} from '../../core/course/curriculum.mjs';
export {lessonBudget,validateLessonBlocks} from '../../core/course/lesson.mjs';
export {quizBudget,validateQuizQuestions} from '../../core/course/quiz.mjs';
export {releaseChecks} from '../../core/course/release.mjs';
