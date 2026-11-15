export const courseLevels=Object.freeze(['beginner','intermediate','advanced','all']);

/** @typedef {Readonly<{title:string,description:string,slug:string,level:string}>} CourseInput */
export function validateCourseInput(input){
 const title=typeof input.title==='string'?input.title.trim():'',description=typeof input.description==='string'?input.description.trim():'',slug=typeof input.slug==='string'?input.slug.trim():'',level=input.level;
 if(!title||title.length>200||description.length>4000||slug.length>100||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!courseLevels.includes(level))throw Error('INVALID_COURSE');
 return {title,description,slug,level};
}
