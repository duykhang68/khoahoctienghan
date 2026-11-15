import {courseLevels} from './validation.mjs';
import {curriculumId} from './ids.mjs';
import {validateCurriculum} from './curriculum.mjs';
export function calculateCourseMetrics(row){
  if(!row||!['total','drafts','ready','archived'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0)||row.total!==row.drafts+row.ready+row.archived)throw Error('invalid counts');
  return {status:'ready',total:row.total,drafts:row.drafts,ready:row.ready,archived:row.archived};
}
export function buildCourseWorkspace(rows){
  if(!Array.isArray(rows)||rows.length>24)throw Error('invalid workspace');
  return {status:'ready',rows:rows.map(c=>{
   if(!curriculumId.test(c.id)||!['draft','ready','archived'].includes(c.status)||!courseLevels.includes(c.level)||!['authored','quizzes','media'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0))throw Error('invalid row');
   const chapters=c.structure==null?[]:validateCurriculum(JSON.parse(c.structure)),lessons=chapters.flatMap(ch=>ch.lessons);
   if(c.authored>lessons.length||c.quizzes>lessons.length)throw Error('invalid lesson counts');
   return {...c,structure:undefined,chapters:chapters.length,lessons:lessons.length,lessonItems:lessons.slice(0,8)};
  })};
}
export function courseCompletionPercent(course){return course.lessons?Math.round(course.authored/course.lessons*100):0;}
