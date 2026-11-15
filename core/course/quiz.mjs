import {curriculumId} from './ids.mjs';
import {planVersionedUpdate} from './write-result.mjs';
/** @typedef {Readonly<{id:string,kind:string,prompt:string,options:readonly string[],correct:number,explanation:string}>} QuizQuestion */

export const quizBudget=262144;
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
 if(new TextEncoder().encode(JSON.stringify(clean)).length>quizBudget)throw Error('QUIZ_TOO_LARGE');
 return clean;
}

export function planQuizUpdate(current,input){return planVersionedUpdate(current,input);}
