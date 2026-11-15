import {curriculumId} from './ids.mjs';
/** @typedef {Readonly<{id:string,title:string}>} LessonRef */
/** @typedef {Readonly<{id:string,title:string,lessons:readonly LessonRef[]}>} Chapter */
/** @typedef {Readonly<{status:string,version:number,chapters:readonly Chapter[]}>} CurriculumSnapshot */

export function validateCurriculum(value){
 if(!Array.isArray(value)||value.length>100)throw Error('INVALID_CURRICULUM');
 const ids=new Set();let count=0;
 const node=x=>{if(!x||typeof x.id!=='string'||!curriculumId.test(x.id)||ids.has(x.id)||typeof x.title!=='string'||!x.title.trim()||x.title.trim().length>200)throw Error('INVALID_CURRICULUM');ids.add(x.id);return {id:x.id,title:x.title.trim()};};
 return value.map(ch=>{const c=node(ch);if(!Array.isArray(ch.lessons)||(count+=ch.lessons.length)>500)throw Error('INVALID_CURRICULUM');return {...c,lessons:ch.lessons.map(node)};});
}

/** @param {CurriculumSnapshot|null} current @param {Readonly<{version:number,chapters:readonly Chapter[]}>} input */
export function planCurriculumUpdate(current,input){
 if(!current)return {kind:'not-found'};
 if(current.status!=='draft'||current.version!==input.version)return {kind:'conflict'};
 const oldCh=new Set(current.chapters.map(c=>c.id)),oldLessons=new Set(current.chapters.flatMap(c=>c.lessons.map(l=>l.id)));
 const newCh=new Set(input.chapters.map(c=>c.id)),newLessons=new Set(input.chapters.flatMap(c=>c.lessons.map(l=>l.id)));
 if([...oldCh].some(x=>!newCh.has(x))||[...oldLessons].some(x=>!newLessons.has(x)))return {kind:'persisted-deletion'};
 return {kind:'write',expectedVersion:input.version,nextVersion:input.version+1};
}
