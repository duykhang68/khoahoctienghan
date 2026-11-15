import test from 'node:test';
import assert from 'node:assert/strict';
import {courseSlug} from '../core/course/slug.mjs';
import {planCourseMutation} from '../core/course/mutation.mjs';
import {validateCurriculum,planCurriculumUpdate} from '../core/course/curriculum.mjs';
import {validateLessonBlocks,planLessonUpdate} from '../core/course/lesson.mjs';
import {validateQuizQuestions,planQuizUpdate} from '../core/course/quiz.mjs';
import {eligibleCourseMedia} from '../core/course/media.mjs';
import {evaluateReleaseReadiness} from '../core/course/release.mjs';
import {courseWriteChanged} from '../core/course/write-result.mjs';
import {calculateCourseMetrics,buildCourseWorkspace,courseCompletionPercent} from '../core/course/dashboard-selectors.mjs';
import {buildCoursePreviewModel} from '../core/course/preview-model.mjs';
import {isAllowedEmail,isCurrentSessionPayload} from '../core/auth/authorization.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const id=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000000';
const chapters=freeze([{id:id(1),title:'Chương',lessons:[{id:id(2),title:'Bài học'}]}]);
const current=freeze({status:'draft',version:2,chapters});
test('R3 course mutation plans are deterministic and do not mutate frozen input',()=>{
 const input=freeze({action:'create',title:'  Tiếng Hàn  ',description:'',slug:'',level:'beginner'});
 const plan=planCourseMutation(input);
 assert.deepEqual(plan,{kind:'create',course:{title:'Tiếng Hàn',description:'',slug:'tieng-han',level:'beginner'}});
 assert.deepEqual(planCourseMutation(input),plan);
 assert.equal(courseSlug('Đọc'), 'doc');
 assert.equal(planCourseMutation(freeze({action:'edit',id:id(1),version:'0'})).kind,'invalid');
 assert.equal(planCourseMutation(freeze({action:'archive',id:id(1),version:'2'})).kind,'confirmation-required');
 assert.deepEqual(planCourseMutation(freeze({action:'archive',id:id(1),version:'2',confirm:'yes'})),{kind:'archive',id:id(1),version:2});
 assert.throws(()=>planCourseMutation(freeze({...input,level:'invalid'})),/INVALID_COURSE/);
});
test('R3 curriculum preserves persisted IDs and optimistic version',()=>{
 assert.deepEqual(validateCurriculum(chapters),chapters);
 assert.deepEqual(planCurriculumUpdate(current,freeze({version:2,chapters})),{kind:'write',expectedVersion:2,nextVersion:3});
 assert.equal(planCurriculumUpdate(current,freeze({version:1,chapters})).kind,'conflict');
 assert.equal(planCurriculumUpdate(null,freeze({version:2,chapters})).kind,'not-found');
 assert.equal(planCurriculumUpdate(current,freeze({version:2,chapters:[]})).kind,'persisted-deletion');
 assert.throws(()=>validateCurriculum(freeze([{...chapters[0],lessons:[...chapters[0].lessons,...chapters[0].lessons]}])),/INVALID_CURRICULUM/);
});
test('R3 lesson and quiz plans share draft-version rule; validation is pure',()=>{
 const blocks=freeze([{id:id(3),kind:'paragraph',text:'안녕하세요'}]);
 const quiz=freeze([{id:id(4),kind:'boolean',prompt:'Câu hỏi',options:['Đúng','Sai'],correct:0,explanation:''}]);
 assert.deepEqual(validateLessonBlocks(blocks),blocks);
 assert.deepEqual(validateQuizQuestions(quiz),quiz);
 for(const plan of [planLessonUpdate,planQuizUpdate]){
  const input=freeze({version:2});
  assert.deepEqual(plan(current,input),{kind:'write',expectedVersion:2,nextVersion:3});
  assert.equal(plan(freeze({...current,status:'ready'}),input).kind,'conflict');
  assert.equal(plan(null,input).kind,'not-found');
 }
 assert.throws(()=>validateLessonBlocks(freeze([{id:id(3),kind:'image',width:0,height:1600,alt:'x',src:'invalid'}])));
 assert.throws(()=>validateQuizQuestions(freeze([{...quiz[0],correct:2}])),/INVALID_QUIZ/);
});
test('R3 release and media policies fail closed; D1 result must confirm a write',()=>{
 const row={status:'draft',version:2,revision:3,description_length:1,chapters:1,lessons:1,empty_chapters:0,missing_lessons:0,media_links:0};
 assert.deepEqual(evaluateReleaseReadiness(freeze({row,release:null}),2,3),{kind:'write',expectedVersion:2,expectedRevision:3});
 assert.equal(evaluateReleaseReadiness(freeze({row:{...row,media_links:1},release:null}),2,3).kind,'conflict');
 assert.equal(evaluateReleaseReadiness(freeze({row,release:{version:1}}),2,3).kind,'conflict');
 assert.equal(evaluateReleaseReadiness(freeze({row,release:null}),2,2).kind,'conflict');
 assert.equal(courseWriteChanged(freeze({success:true,meta:{changes:1}})),true);
 for(const result of [null,{}, {success:true,meta:{changes:0}},{success:false,meta:{changes:1}},{meta:{changes:'1'}}])assert.equal(courseWriteChanged(freeze(result)),false);
 const folder='folder_123456',file=freeze({id:'file_12345678',mimeType:'video/mp4',trashed:false,parents:[folder],capabilities:{canDownload:true},name:'Video',size:'123'});
 assert.equal(eligibleCourseMedia(file,folder),true);
 assert.equal(eligibleCourseMedia(file,'other_folder'),false);
 assert.equal(eligibleCourseMedia(freeze({...file,capabilities:{canDownload:false}}),folder),false);
});
test('R3 dashboard, preview and authorization take explicit data',()=>{
 assert.deepEqual(calculateCourseMetrics(freeze({total:3,drafts:1,ready:1,archived:1})),{status:'ready',total:3,drafts:1,ready:1,archived:1});
 assert.throws(()=>calculateCourseMetrics(freeze({total:4,drafts:1,ready:1,archived:1})),/invalid counts/);
 const rows=freeze([{id:id(1),status:'draft',level:'beginner',authored:1,quizzes:0,media:0,structure:JSON.stringify(chapters)}]);
 const workspace=buildCourseWorkspace(rows);
 assert.equal(workspace.rows[0].structure,undefined);
 assert.equal(courseCompletionPercent(workspace.rows[0]),100);
 assert.equal(buildCoursePreviewModel(current,chapters[0].lessons[0]).pos,0);
 assert.equal(isAllowedEmail('ADMIN@gmail.com',' admin@gmail.com '),true);
 assert.equal(isAllowedEmail('other@gmail.com','admin@gmail.com'),false);
 const data=freeze({kind:'session',origin:'https://example.test',exp:100});
 assert.equal(isCurrentSessionPayload(data,'session',data.origin,99),true);
 assert.equal(isCurrentSessionPayload(data,'session',data.origin,100),false);
 assert.equal(isCurrentSessionPayload(data,'session','https://other.test',99),false);
});
