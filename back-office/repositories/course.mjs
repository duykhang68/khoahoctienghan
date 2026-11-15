import {courseLevels} from '../course/common.mjs';
import {curriculumId,validateCurriculum,validateLessonBlocks,validateQuizQuestions} from '../course/validation.mjs';

// P2.1: read-only course overview. Missing storage is not an empty catalogue.
export async function courseOverview(env){
 if(!env.COURSE_DB||typeof env.COURSE_DB.prepare!=='function')return {status:'unconfigured'};
 try{
  const row=await env.COURSE_DB.prepare("SELECT COUNT(*) AS total, COUNT(CASE WHEN status='draft' THEN 1 END) AS drafts, COUNT(CASE WHEN status='ready' THEN 1 END) AS ready, COUNT(CASE WHEN status='archived' THEN 1 END) AS archived FROM courses").first();
  if(!row||!['total','drafts','ready','archived'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0)||row.total!==row.drafts+row.ready+row.archived)throw Error('invalid counts');
  return {status:'ready',total:row.total,drafts:row.drafts,ready:row.ready,archived:row.archived};
 }catch{return {status:'unavailable'};}
}
// Bounded, read-only workspace: no course content or media credentials are returned to the browser.
async function courseWorkspace(env){
 try{
  const rows=(await env.COURSE_DB.prepare("SELECT c.id,c.title,c.slug,c.level,c.status,c.updated_at,k.structure, (SELECT count(*) FROM json_each(k.structure) ch,json_each(ch.value,'$.lessons') l JOIN course_lesson_documents d ON d.course_id=c.id AND d.lesson_id=json_extract(l.value,'$.id') WHERE json_array_length(d.document)>0) AS authored, (SELECT count(*) FROM json_each(k.structure) ch,json_each(ch.value,'$.lessons') l JOIN course_lesson_quizzes q ON q.course_id=c.id AND q.lesson_id=json_extract(l.value,'$.id') WHERE json_array_length(q.document)>0) AS quizzes, (SELECT count(*) FROM course_lesson_media m WHERE m.course_id=c.id) AS media FROM courses c LEFT JOIN course_curricula k ON k.course_id=c.id ORDER BY c.updated_at DESC,c.id LIMIT 24").all()).results;
  if(!Array.isArray(rows)||rows.length>24)throw Error('invalid workspace');
  return {status:'ready',rows:rows.map(c=>{
   if(!curriculumId.test(c.id)||!['draft','ready','archived'].includes(c.status)||!courseLevels.includes(c.level)||!['authored','quizzes','media'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0))throw Error('invalid row');
   const chapters=c.structure==null?[]:validateCurriculum(JSON.parse(c.structure)),lessons=chapters.flatMap(ch=>ch.lessons);
   if(c.authored>lessons.length||c.quizzes>lessons.length)throw Error('invalid lesson counts');
   return {...c,structure:undefined,chapters:chapters.length,lessons:lessons.length,lessonItems:lessons.slice(0,8)};
  })};
 }catch{return {status:'unavailable',rows:[]};}
}
async function curriculumState(db,id){
 const row=await db.prepare("SELECT c.id,c.title,c.status,k.version,k.structure FROM courses c LEFT JOIN course_curricula k ON k.course_id=c.id WHERE c.id=?").bind(id).first();
 if(!row)return null;
 return {id:row.id,title:row.title,status:row.status,version:row.version??0,chapters:row.structure==null?[]:validateCurriculum(JSON.parse(row.structure))};
}
async function lessonState(db,courseId,lessonId){
 const curr=await curriculumState(db,courseId);if(!curr)return null;
 const lesson=curr.chapters.flatMap(c=>c.lessons).find(l=>l.id===lessonId);if(!lesson)return null;
 const row=await db.prepare('SELECT version,document FROM course_lesson_documents WHERE course_id=? AND lesson_id=?').bind(courseId,lessonId).first();
 return {courseId,lessonId,title:lesson.title,courseTitle:curr.title,status:curr.status,version:row?.version??0,blocks:row?validateLessonBlocks(JSON.parse(row.document)):[]};
}
async function quizState(db,courseId,lessonId){
 const curr=await curriculumState(db,courseId);if(!curr)return null;
 const lesson=curr.chapters.flatMap(c=>c.lessons).find(l=>l.id===lessonId);if(!lesson)return null;
 const row=await db.prepare('SELECT version,document FROM course_lesson_quizzes WHERE course_id=? AND lesson_id=?').bind(courseId,lessonId).first();
 return {courseId,lessonId,title:lesson.title,courseTitle:curr.title,status:curr.status,version:row?.version??0,questions:row?validateQuizQuestions(JSON.parse(row.document)):[]};
}
async function releaseState(db,id){
 const row=await db.prepare('SELECT v.*,c.title FROM course_release_readiness v JOIN courses c ON c.id=v.id WHERE v.id=?').bind(id).first();
 if(!row)return null;
 const release=await db.prepare('SELECT version,revision,approved_at FROM course_releases WHERE course_id=?').bind(id).first();
 return {row,release};
}

export {courseWorkspace,curriculumState,lessonState,quizState,releaseState};
