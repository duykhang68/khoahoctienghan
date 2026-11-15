import {validateMedia} from '../../src/lib/editor-v2/media.mjs';
import {enc} from '../encoding.mjs';
import {courseLevels} from './common.mjs';

export {courseSlug,validateCourseInput} from '../course-management/core.mjs';
const curriculumId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function validateCurriculum(value){
 if(!Array.isArray(value)||value.length>100)throw Error('INVALID_CURRICULUM');
 const ids=new Set();let count=0;
 const node=x=>{if(!x||typeof x.id!=='string'||!curriculumId.test(x.id)||ids.has(x.id)||typeof x.title!=='string'||!x.title.trim()||x.title.trim().length>200)throw Error('INVALID_CURRICULUM');ids.add(x.id);return {id:x.id,title:x.title.trim()};};
 return value.map(ch=>{const c=node(ch);if(!Array.isArray(ch.lessons)||(count+=ch.lessons.length)>500)throw Error('INVALID_CURRICULUM');return {...c,lessons:ch.lessons.map(node)};});
}
const lessonBudget=1500000;
const lessonTextKinds=['paragraph','heading','subheading','note','quote','bullet','ordered'];
export function validateLessonBlocks(value){
 if(!Array.isArray(value)||value.length>100)throw Error('INVALID_LESSON');
 const seen=new Set();
 const blocks=value.map(b=>{
  if(!b||typeof b.id!=='string'||!curriculumId.test(b.id)||seen.has(b.id))throw Error('INVALID_LESSON');seen.add(b.id);
  if(b.kind==='image'){
   const image={id:b.id,kind:b.kind,src:b.src,width:b.width,height:b.height,alt:typeof b.alt==='string'?b.alt.trim():''};
   validateMedia(image);return image;
  }
  if(b.kind==='divider')return {id:b.id,kind:b.kind};
  if(!lessonTextKinds.includes(b.kind)||typeof b.text!=='string'||b.text.length>20000||!b.text.trim())throw Error('INVALID_LESSON');
  return {id:b.id,kind:b.kind,text:b.text};
 });
 if(enc.encode(JSON.stringify(blocks)).length>lessonBudget)throw Error('LESSON_TOO_LARGE');
 return blocks;
}
const quizBudget=262144;
export function validateQuizQuestions(value){
 if(!Array.isArray(value)||value.length>100)throw Error('INVALID_QUIZ');
 const seen=new Set();
 const clean=value.map(q=>{
  if(!q||typeof q.id!=='string'||!curriculumId.test(q.id)||seen.has(q.id)||!['single','boolean'].includes(q.kind))throw Error('INVALID_QUIZ');
  seen.add(q.id);
  const field=(v,max,required=true)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error('INVALID_QUIZ');return v.trim();};
  const prompt=field(q.prompt,2000),explanation=field(q.explanation,2000,false);
  if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6||(q.kind==='boolean'&&q.options.length!==2))throw Error('INVALID_QUIZ');
  const options=q.options.map(v=>field(v,500));
  if(new Set(options).size!==options.length||!Number.isInteger(q.correct)||q.correct<0||q.correct>=options.length)throw Error('INVALID_QUIZ');
  if(q.kind==='boolean'&&(options[0]!=='Đúng'||options[1]!=='Sai'))throw Error('INVALID_QUIZ');
  return {id:q.id,kind:q.kind,prompt,options,correct:q.correct,explanation};
 });
 if(enc.encode(JSON.stringify(clean)).length>quizBudget)throw Error('QUIZ_TOO_LARGE');
 return clean;
}
// P2.8: explicit private editorial approval; never create public content.
export function releaseChecks(row){
 return [
  ['Mô tả khóa học',row.description_length>0],
  ['Có chương và bài học',row.chapters>0&&row.lessons>0],
  ['Mỗi chương có bài học',row.empty_chapters===0],
  ['Mỗi bài có nội dung đã lưu',row.lessons>0&&row.missing_lessons===0],
  ['Media có phiên bản bất biến',row.media_links===0]
 ];
}

export {curriculumId,lessonBudget,quizBudget};
