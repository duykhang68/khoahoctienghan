import {reply,redirect} from '../http.mjs';
import {open,getCookie,sessionName} from '../auth/session.mjs';
import {courseWriteChanged} from '../course/common.mjs';
import {courseSlug,validateCourseInput,validateCurriculum,validateLessonBlocks,validateQuizQuestions,lessonBudget,quizBudget,releaseChecks} from '../course/validation.mjs';
import {curriculumState,lessonState,quizState,releaseState} from '../repositories/course.mjs';

async function courseMutation(req,env){
 const url=new URL(req.url);
 if(req.headers.get('Origin')!==url.origin||req.headers.get('Content-Type')?.split(';')[0]!=='application/x-www-form-urlencoded')return reply('Forbidden',403);
 if(!env.COURSE_DB)return reply('Chưa cấu hình cơ sở dữ liệu khóa học',503);
 let input;try{const reader=req.body?.getReader();if(!reader)return reply('Invalid request',400);let size=0,body='';const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return reply('Payload too large',413);}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();const params=new URLSearchParams(body);if(new Set(params.keys()).size!==[...params.keys()].length)return reply('Invalid request',400);input=Object.fromEntries(params);}catch{return reply('Invalid request',400);}
 const db=env.COURSE_DB, action=input.action, timestamp=Date.now(), session=await open(getCookie(req,sessionName),env,'session');
 if(!session)return reply('Forbidden',403);
 try{
  if(action==='create'){
   const c=validateCourseInput({...input,slug:input.slug||courseSlug(input.title)}),id=crypto.randomUUID();
   const result=await db.prepare("INSERT INTO courses(id,slug,title,description,level,status,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,'draft',1,?,?,?) ON CONFLICT(slug) DO NOTHING").bind(id,c.slug,c.title,c.description,c.level,timestamp,timestamp,session.sub).run();
   if(!courseWriteChanged(result))return reply('Đường dẫn đã tồn tại',409);
  }else if(action==='edit'||action==='archive'){
   if(!/^[0-9a-f-]{36}$/.test(input.id||'')||!/^\d{1,10}$/.test(input.version||'')||Number(input.version)<1)return reply('Invalid request',400);
   const version=Number(input.version);
   let statement;
   if(action==='edit'){const c=validateCourseInput(input);statement=db.prepare("UPDATE courses SET title=?,description=?,level=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND slug=? AND version=? AND status='draft'").bind(c.title,c.description,c.level,timestamp,session.sub,input.id,c.slug,version);}
   else{if(input.confirm!=='yes')return reply('Cần xác nhận lưu trữ',400);statement=db.prepare("UPDATE courses SET status='archived',version=version+1,updated_at=?,updated_by=? WHERE id=? AND version=? AND status='draft'").bind(timestamp,session.sub,input.id,version);}
   const result=await statement.run();if(!courseWriteChanged(result))return reply('Dữ liệu đã thay đổi. Quay lại và tải lại trang.',409);
  }else return reply('Invalid request',400);
  return redirect('/admin/courses/manage/');
 }catch(e){return e?.message==='INVALID_COURSE'?reply('Thông tin khóa học không hợp lệ',400):reply('Không lưu được khóa học',503);}
}

async function saveCurriculum(req,env,id){
 const url=new URL(req.url);
 if(req.headers.get('Origin')!==url.origin||req.headers.get('Content-Type')?.split(';')[0]!=='application/json')return reply('Forbidden',403);
 if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
 let input;try{const reader=req.body?.getReader();if(!reader)return reply('Invalid request',400);let size=0,body='';const dec=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();return reply('Payload too large',413);}body+=dec.decode(value,{stream:true});}input=JSON.parse(body+dec.decode());if(!input||!Number.isSafeInteger(input.version)||input.version<0||input.version>=2147483647)throw Error('INVALID_CURRICULUM');input.chapters=validateCurriculum(input.chapters);}catch{return reply('Giáo trình không hợp lệ',400);}
 const db=env.COURSE_DB;try{
  const current=await curriculumState(db,id);if(!current)return reply('Không tìm thấy khóa học',404);
  if(current.status!=='draft'||current.version!==input.version)return reply('Dữ liệu đã thay đổi hoặc khóa học không còn là bản nháp. Tải lại trang.',409);
  const oldCh=new Set(current.chapters.map(c=>c.id)),oldLessons=new Set(current.chapters.flatMap(c=>c.lessons.map(l=>l.id)));
  const newCh=new Set(input.chapters.map(c=>c.id)),newLessons=new Set(input.chapters.flatMap(c=>c.lessons.map(l=>l.id)));
  if([...oldCh].some(x=>!newCh.has(x))||[...oldLessons].some(x=>!newLessons.has(x)))return reply('Không thể xóa chương hoặc bài đã lưu ở giai đoạn này.',400);
  const session=await open(getCookie(req,sessionName),env,'session');if(!session)return reply('Forbidden',403);
  const structure=JSON.stringify(input.chapters),stamp=Date.now();
  const statement=input.version===0?db.prepare("INSERT INTO course_curricula(course_id,version,structure,updated_at,updated_by) SELECT ?,1,?,?,? WHERE EXISTS(SELECT 1 FROM courses WHERE id=? AND status='draft') ON CONFLICT(course_id) DO NOTHING").bind(id,structure,stamp,session.sub,id):db.prepare("UPDATE course_curricula SET version=version+1,structure=?,updated_at=?,updated_by=? WHERE course_id=? AND version=? AND EXISTS(SELECT 1 FROM courses WHERE id=? AND status='draft')").bind(structure,stamp,session.sub,id,input.version,id);
  const result=await statement.run();if(!courseWriteChanged(result))return reply('Dữ liệu đã thay đổi. Tải lại trang.',409);
  return reply(JSON.stringify({version:input.version+1}),200,{'Content-Type':'application/json; charset=utf-8'});
 }catch{return reply('Không lưu được giáo trình',503);}
}
async function saveLesson(req,env,courseId,lessonId){
 const u=new URL(req.url);if(req.headers.get('Origin')!==u.origin||req.headers.get('Content-Type')?.split(';')[0]!=='application/json')return reply('Forbidden',403);
 if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
 let input;try{const reader=req.body?.getReader();if(!reader)return reply('Invalid request',400);let size=0,body='';const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>lessonBudget+4096){await reader.cancel();return reply('Bài học vượt giới hạn dung lượng',413);}body+=decoder.decode(value,{stream:true});}input=JSON.parse(body+decoder.decode());if(!input||!Number.isSafeInteger(input.version)||input.version<0||input.version>=2147483647)throw Error('INVALID_LESSON');input.blocks=validateLessonBlocks(input.blocks);}catch(e){return reply(e?.message==='LESSON_TOO_LARGE'?'Bài học vượt giới hạn dung lượng':'Nội dung hoặc ảnh không hợp lệ',e?.message==='LESSON_TOO_LARGE'?413:400);}
 try{
  const db=env.COURSE_DB,current=await lessonState(db,courseId,lessonId);if(!current)return reply('Không tìm thấy bài học',404);
  if(current.status!=='draft'||current.version!==input.version)return reply('Bản nháp đã thay đổi. Tải lại trang.',409);
  const session=await open(getCookie(req,sessionName),env,'session');if(!session)return reply('Forbidden',403);
  const doc=JSON.stringify(input.blocks),stamp=Date.now();
  const guard="EXISTS(SELECT 1 FROM courses c JOIN course_curricula k ON k.course_id=c.id, json_each(k.structure) ch, json_each(ch.value,'$.lessons') l WHERE c.id=? AND c.status='draft' AND json_extract(l.value,'$.id')=?)";
  const stmt=input.version===0?db.prepare("INSERT INTO course_lesson_documents(course_id,lesson_id,version,document,updated_at,updated_by) SELECT ?,?,1,?,?,? WHERE "+guard+" ON CONFLICT(course_id,lesson_id) DO NOTHING").bind(courseId,lessonId,doc,stamp,session.sub,courseId,lessonId):db.prepare("UPDATE course_lesson_documents SET version=version+1,document=?,updated_at=?,updated_by=? WHERE course_id=? AND lesson_id=? AND version=? AND "+guard).bind(doc,stamp,session.sub,courseId,lessonId,input.version,courseId,lessonId);
  if(!courseWriteChanged(await stmt.run()))return reply('Dữ liệu đã thay đổi. Tải lại trang.',409);
  return reply(JSON.stringify({version:input.version+1}),200,{'Content-Type':'application/json; charset=utf-8'});
 }catch{return reply('Không lưu được bài học',503);}
}
async function saveQuiz(req,env,courseId,lessonId){
 const u=new URL(req.url);if(req.headers.get('Origin')!==u.origin||req.headers.get('Content-Type')?.split(';')[0]!=='application/json')return reply('Forbidden',403);
 if(!env.COURSE_DB)return reply('Chưa cấu hình COURSE_DB',503);
 let input;try{const reader=req.body?.getReader();if(!reader)return reply('Invalid request',400);let size=0,body='';const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>quizBudget+4096){await reader.cancel();return reply('Bài học vượt giới hạn dung lượng',413);}body+=decoder.decode(value,{stream:true});}input=JSON.parse(body+decoder.decode());if(!input||!Number.isSafeInteger(input.version)||input.version<0||input.version>=2147483647)throw Error('INVALID_QUIZ');input.questions=validateQuizQuestions(input.questions);}catch(e){return reply(e?.message==='QUIZ_TOO_LARGE'?'Bài học vượt giới hạn dung lượng':'Nội dung hoặc ảnh không hợp lệ',e?.message==='QUIZ_TOO_LARGE'?413:400);}
 try{
  const db=env.COURSE_DB,current=await quizState(db,courseId,lessonId);if(!current)return reply('Không tìm thấy bài học',404);
  if(current.status!=='draft'||current.version!==input.version)return reply('Bản nháp đã thay đổi. Tải lại trang.',409);
  const session=await open(getCookie(req,sessionName),env,'session');if(!session)return reply('Forbidden',403);
  const doc=JSON.stringify(input.questions),stamp=Date.now();
  const guard="EXISTS(SELECT 1 FROM courses c JOIN course_curricula k ON k.course_id=c.id, json_each(k.structure) ch, json_each(ch.value,'$.lessons') l WHERE c.id=? AND c.status='draft' AND json_extract(l.value,'$.id')=?)";
  const stmt=input.version===0?db.prepare("INSERT INTO course_lesson_quizzes(course_id,lesson_id,version,document,updated_at,updated_by) SELECT ?,?,1,?,?,? WHERE "+guard+" ON CONFLICT(course_id,lesson_id) DO NOTHING").bind(courseId,lessonId,doc,stamp,session.sub,courseId,lessonId):db.prepare("UPDATE course_lesson_quizzes SET version=version+1,document=?,updated_at=?,updated_by=? WHERE course_id=? AND lesson_id=? AND version=? AND "+guard).bind(doc,stamp,session.sub,courseId,lessonId,input.version,courseId,lessonId);
  if(!courseWriteChanged(await stmt.run()))return reply('Dữ liệu đã thay đổi. Tải lại trang.',409);
  return reply(JSON.stringify({version:input.version+1}),200,{'Content-Type':'application/json; charset=utf-8'});
 }catch{return reply('Không lưu được bài học',503);}
}
async function approveRelease(req,env,id){
 if(req.headers.get('Origin')!==new URL(req.url).origin||req.headers.get('Content-Type')?.split(';')[0]!=='application/x-www-form-urlencoded')return reply('Forbidden',403);
 const session=await open(getCookie(req,sessionName),env,'session');if(!session)return reply('Forbidden',403);
 let input;try{const reader=req.body?.getReader();if(!reader)return reply('Invalid request',400);let size=0,body='';const dec=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return reply('Payload too large',413);}body+=dec.decode(value,{stream:true});}input=new URLSearchParams(body+dec.decode());if([...input.keys()].length!==3||new Set(input.keys()).size!==3||input.get('confirm')!=='yes')return reply('Invalid request',400);}catch{return reply('Invalid request',400);}
 const version=Number(input.get('version')),revision=Number(input.get('revision'));
 if(!Number.isSafeInteger(version)||version<1||!Number.isSafeInteger(revision)||revision<1)return reply('Invalid request',400);
 try{const db=env.COURSE_DB,state=await releaseState(db,id);if(!state)return reply('Không tìm thấy khóa học',404);
 if(state.row.status!=='draft'||state.release||state.row.version!==version||state.row.revision!==revision||!releaseChecks(state.row).every(x=>x[1]))return reply('Chưa sẵn sàng hoặc bản nháp đã thay đổi. Tải lại trang.',409);
 const result=await db.prepare("UPDATE courses SET status='ready',version=version+1,updated_at=?,updated_by=? WHERE id=? AND status='draft' AND version=? AND EXISTS(SELECT 1 FROM course_release_readiness v WHERE v.id=courses.id AND v.revision=? AND v.chapters>0 AND v.lessons>0 AND v.empty_chapters=0 AND v.missing_lessons=0 AND v.media_links=0 AND v.description_length>0)").bind(Date.now(),session.sub,id,version,revision).run();
 if(!courseWriteChanged(result))return reply('Bản nháp đã thay đổi. Tải lại trang.',409);
 return redirect('/admin/courses/'+id+'/publishing/');
 }catch{return reply('Không thể phê duyệt khóa học',503);}
}


export {courseMutation,saveCurriculum,saveLesson,saveQuiz,approveRelease};
