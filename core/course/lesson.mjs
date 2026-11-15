import {curriculumId} from './ids.mjs';
import {validateMedia} from '../../src/lib/editor-v2/media-validation.mjs';
import {planVersionedUpdate} from './write-result.mjs';
/** @typedef {Readonly<{id:string,kind:string,text?:string,src?:string,width?:number,height?:number,alt?:string}>} LessonBlock */

export const lessonBudget=1500000;
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
 if(new TextEncoder().encode(JSON.stringify(blocks)).length>lessonBudget)throw Error('LESSON_TOO_LARGE');
 return blocks;
}

export function planLessonUpdate(current,input){return planVersionedUpdate(current,input);}
