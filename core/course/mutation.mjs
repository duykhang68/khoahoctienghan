import {courseSlug} from './slug.mjs';
import {validateCourseInput} from './validation.mjs';

/** @param {Readonly<Record<string,string>>} input */
export function planCourseMutation(input){
 const action=input.action;
 if(action==='create')return {kind:'create',course:validateCourseInput({...input,slug:input.slug||courseSlug(input.title)})};
 if(action==='edit'||action==='archive'){
  if(!/^[0-9a-f-]{36}$/.test(input.id||'')||!/^\d{1,10}$/.test(input.version||'')||Number(input.version)<1)return {kind:'invalid'};
  const version=Number(input.version);
  if(action==='edit')return {kind:'edit',id:input.id,version,course:validateCourseInput(input)};
  if(input.confirm!=='yes')return {kind:'confirmation-required'};
  return {kind:'archive',id:input.id,version};
 }
 return {kind:'invalid'};
}
