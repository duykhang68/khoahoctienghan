import {reply,redirect,page,htmlHeaders} from '../http.mjs';
import {random} from '../auth/session.mjs';
import {curriculumId,courseSlug} from '../course/validation.mjs';
import {courseOverview,courseWorkspace,courseList,curriculumState,lessonState,quizState,releaseState} from '../repositories/course.mjs';
import {courseMutation,saveCurriculum,saveLesson,saveQuiz,approveRelease} from '../services/course.mjs';
import {lessonMedia} from '../services/course-media.mjs';
import {courseDashboard,courseManager} from '../views/course-dashboard.mjs';
import {curriculumPage} from '../views/curriculum.mjs';
import {lessonPage} from '../views/lesson.mjs';
import {quizPage} from '../views/quiz.mjs';
import {releasePage,coursePreviewPage} from '../views/course-release.mjs';

// These three stages mirror the original ordering around scheduler and method gates.
export async function routeCourseDetail(req,env,url){
 const mediaMatch=url.pathname.match(/^\/admin\/courses\/([0-9a-f-]{36})\/lessons\/([0-9a-f-]{36})\/media\/(?:stream\/([A-Za-z0-9_-]{10,150})\/)?$/);
 if(mediaMatch){const [,courseId,lessonId,streamId]=mediaMatch;if(!curriculumId.test(courseId)||!curriculumId.test(lessonId)||url.search)return reply('Invalid request',400);return lessonMedia(req,env,courseId,lessonId,streamId);}
 const quizMatch=url.pathname.match(/^\/admin\/courses\/([0-9a-f-]{36})\/lessons\/([0-9a-f-]{36})\/quiz\/$/);
 if(quizMatch){
  const [,courseId,lessonId]=quizMatch;if(!curriculumId.test(courseId)||!curriculumId.test(lessonId)||url.search)return reply('Invalid request',400);
  if(req.method==='POST')return saveQuiz(req,env,courseId,lessonId);
  if(req.method!=='GET'&&req.method!=='HEAD')return reply('Method not allowed',405);
  if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
  try{const state=await quizState(env.COURSE_DB,courseId,lessonId);if(!state)return reply('Không tìm thấy bài học',404);const nonce=random();return reply(req.method==='HEAD'?null:page(quizPage(state,nonce)),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}catch{return reply('Không tải được quiz',503);}
 }
 const publishingMatch=url.pathname.match(/^\/admin\/courses\/([0-9a-f-]{36})\/publishing\/$/);
 if(publishingMatch){
  const id=publishingMatch[1];if(!curriculumId.test(id)||url.search)return reply('Invalid request',400);
  if(!['GET','HEAD','POST'].includes(req.method))return reply('Method not allowed',405);
  if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
  if(req.method==='POST')return approveRelease(req,env,id);
  try{const state=await releaseState(env.COURSE_DB,id);if(!state)return reply('Không tìm thấy khóa học',404);return reply(req.method==='HEAD'?null:page(releasePage(state)),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}catch{return reply('Chưa thể tải thông tin phát hành',503);}
 }
 const previewMatch=url.pathname.match(/^\/admin\/courses\/([0-9a-f-]{36})\/preview\/(?:([0-9a-f-]{36})\/)?$/);
 if(previewMatch){
  const [,id,lessonId]=previewMatch;if(!curriculumId.test(id)||(lessonId&&!curriculumId.test(lessonId))||url.search)return reply('Invalid request',400);
  if(req.method!=='GET'&&req.method!=='HEAD')return reply('Method not allowed',405);
  if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
  try{const curr=await curriculumState(env.COURSE_DB,id);if(!curr)return reply('Không tìm thấy khóa học',404);
   const entries=curr.chapters.flatMap(c=>c.lessons),selected=lessonId?entries.find(l=>l.id===lessonId):entries[0];
   if(lessonId&&!selected)return reply('Không tìm thấy bài học',404);
   const state=selected?await lessonState(env.COURSE_DB,id,selected.id):null;if(selected&&!state)return reply('Dữ liệu đã thay đổi. Tải lại trang.',409);
   return reply(req.method==='HEAD'?null:page(coursePreviewPage(curr,selected,state?.blocks??[])),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});
  }catch{return reply('Không tải được bản xem trước',503);}
 }
 const lessonMatch=url.pathname.match(/^\/admin\/courses\/([0-9a-f-]{36})\/lessons\/([0-9a-f-]{36})\/$/);
 if(lessonMatch){
  const [,courseId,lessonId]=lessonMatch;if(!curriculumId.test(courseId)||!curriculumId.test(lessonId))return reply('Not found',404);
  if(url.search){if((req.method==='GET'||req.method==='HEAD')&&[...url.searchParams].every(([k,v])=>['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].includes(k)&&v.length<=256))return redirect(url.pathname);return reply('Invalid request',400);}
  if(req.method==='POST')return saveLesson(req,env,courseId,lessonId);
  if(req.method!=='GET'&&req.method!=='HEAD')return reply('Method not allowed',405);
  if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
  try{const state=await lessonState(env.COURSE_DB,courseId,lessonId);if(!state)return reply('Không tìm thấy bài học',404);const nonce=random();return reply(req.method==='HEAD'?null:page(lessonPage(state,nonce)),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'self' 'nonce-"+nonce+"'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}catch{return reply('Không tải được bài học',503);}
 }
 const curriculumMatch=url.pathname.match(/^\/admin\/courses\/([0-9a-f-]{36})\/curriculum\/$/);
 if(curriculumMatch){
  const id=curriculumMatch[1];if(!curriculumId.test(id))return reply('Not found',404);
  if(url.search){if((req.method==='GET'||req.method==='HEAD')&&[...url.searchParams].every(([k,v])=>['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].includes(k)&&v.length<=256))return redirect(url.pathname);return reply('Invalid request',400);}
  if(req.method==='POST')return saveCurriculum(req,env,id);
  if(req.method!=='GET'&&req.method!=='HEAD')return reply('Method not allowed',405);
  if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
  try{const state=await curriculumState(env.COURSE_DB,id);if(!state)return reply('Không tìm thấy khóa học',404);const nonce=random();return reply(req.method==='HEAD'?null:page(curriculumPage(state,nonce)),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}catch{return reply('Không tải được giáo trình',503);}
 }
 return null;
}

export async function routeCourseBeforeReadGate(req,env,url){
 // Tracking metadata must not change read-only course navigation. Reject every other parameter; never normalize writes.
 if((req.method==='GET'||req.method==='HEAD')&&['/admin/courses/','/admin/courses/manage/'].includes(url.pathname)&&url.search){
  const permitted=new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content']);
  if([...url.searchParams].every(([key,value])=>permitted.has(key)&&value.length<=256))return redirect(url.pathname);
 }
 if(url.pathname==='/admin/courses/manage/'&&req.method==='POST'){if(url.search)return reply('Invalid request',400);return courseMutation(req,env);}
 return null;
}

export async function routeCourseRead(req,env,url){
 if(url.pathname==='/admin/courses/manage/'){if(url.search)return reply('Invalid request',400);if(!env.COURSE_DB)return reply('Chưa cấu hình cơ sở dữ liệu khóa học',503);try{const nonce=random();const script='const form=document.getElementById("course-create"),title=form.elements.namedItem("title"),slug=form.elements.namedItem("slug");const makeSlug='+courseSlug.toString()+';let manual=false;title.addEventListener("input",()=>{if(!manual)slug.value=makeSlug(title.value)});slug.addEventListener("input",()=>{manual=slug.value!=="";if(!manual)slug.value=makeSlug(title.value)});';return reply(req.method==='HEAD'?null:page(courseManager(await courseList(env.COURSE_DB))+'<script nonce="'+nonce+'">'+script+'</script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}catch{return reply('Không tải được danh sách khóa học',503);}}
 if(url.pathname==='/admin/courses/'){if(url.search)return reply('Invalid request',400);const data=await courseOverview(env),workspace=data.status==='ready'?await courseWorkspace(env):{status:'unavailable',rows:[]},nonce=random();return reply(req.method==='HEAD'?null:page(courseDashboard(data,workspace,nonce)),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});}
 return null;
}
