import {reply,redirect,page,htmlHeaders} from '../http.mjs';
import {open,getCookie,sessionName} from '../auth/session.mjs';
import {courseWriteChanged,courseEscape} from '../course/common.mjs';
import {curriculumState} from '../repositories/course.mjs';
import {driveId,driveBase,driveGet,courseDriveToken,courseDriveList,courseDriveFile} from '../adapters/google-drive.mjs';

async function lessonMedia(req,env,courseId,lessonId,streamId){
 const db=env.COURSE_DB;if(!db)return reply('Chưa cấu hình COURSE_DB',503);
 const base='/admin/courses/'+courseId+'/lessons/'+lessonId+'/media/';
 try{
 const state=await curriculumState(db,courseId);if(!state||!state.chapters.some(c=>c.lessons.some(l=>l.id===lessonId)))return reply('Không tìm thấy bài học',404);
 if(streamId){
  if(req.method!=='GET')return reply('Method not allowed',405);
  const attached=await db.prepare('SELECT file_id FROM course_lesson_media WHERE course_id=? AND lesson_id=? AND file_id=?').bind(courseId,lessonId,streamId).first();if(!attached)return reply('Not found',404);
  const range=req.headers.get('Range');if(range&&!/^bytes=(?:\d{1,15}-\d{0,15}|-\d{1,15})$/.test(range))return reply('Invalid range',416);
  const token=await courseDriveToken(env);const file=await courseDriveFile(env,token,streamId);if(!file)return reply('Not found',404);
  const result=await driveGet(token,driveBase+'/'+streamId+'?alt=media',range?{Range:range}:{});
  if(![200,206].includes(result.status)){await result.body?.cancel();return reply('Không phát được media',result.status===416?416:502);}
  const extra={'Content-Type':file.mimeType,'Accept-Ranges':'bytes','Content-Disposition':'inline'};
  for(const h of ['Content-Length','Content-Range']){const value=result.headers.get(h);if(value)extra[h]=value;}
  return reply(result.body,result.status,extra);
 }
 if(req.method==='POST'){
  if(req.headers.get('Origin')!==new URL(req.url).origin||req.headers.get('Content-Type')?.split(';')[0]!=='application/x-www-form-urlencoded')return reply('Forbidden',403);
  if(state.status!=='draft')return reply('Chỉ chỉnh sửa bản nháp',409);
  const reader=req.body?.getReader();if(!reader)return reply('Invalid request',400);let size=0,body='';const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return reply('Payload too large',413);}body+=decoder.decode(value,{stream:true});}const form=new URLSearchParams(body+decoder.decode());if([...form.keys()].length!==2||form.getAll('action').length!==1||form.getAll('file').length!==1)return reply('Invalid request',400);const id=form.get('file'),action=form.get('action');if(!driveId.test(id||'')||!['attach','detach'].includes(action))return reply('Invalid request',400);
  const session=await open(getCookie(req,sessionName),env,'session');if(!session)return reply('Forbidden',403);
  const guard="EXISTS(SELECT 1 FROM courses c JOIN course_curricula k ON k.course_id=c.id, json_each(k.structure) ch, json_each(ch.value,'$.lessons') l WHERE c.id=? AND c.status='draft' AND json_extract(l.value,'$.id')=?)";
  if(action==='attach'){
   const token=await courseDriveToken(env),file=await courseDriveFile(env,token,id);if(!file)return reply('File không hợp lệ hoặc ngoài thư mục cho phép',400);
   const result=await db.prepare("INSERT INTO course_lesson_media(course_id,lesson_id,file_id,linked_at,linked_by) SELECT ?,?,?,?,? WHERE "+guard+" AND (SELECT COUNT(*) FROM course_lesson_media WHERE course_id=? AND lesson_id=?)<30 ON CONFLICT DO NOTHING").bind(courseId,lessonId,id,Date.now(),session.sub,courseId,lessonId,courseId,lessonId).run();if(!courseWriteChanged(result))return reply('Đã gắn, vượt giới hạn hoặc bản nháp đã thay đổi',409);
  }else{const result=await db.prepare("DELETE FROM course_lesson_media WHERE course_id=? AND lesson_id=? AND file_id=? AND "+guard).bind(courseId,lessonId,id,courseId,lessonId).run();if(!courseWriteChanged(result))return reply('Liên kết đã thay đổi',409);}
  return redirect(base);
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return reply('Method not allowed',405);
 const token=await courseDriveToken(env),listing=await courseDriveList(env,token);
 const links=await db.prepare('SELECT file_id FROM course_lesson_media WHERE course_id=? AND lesson_id=? ORDER BY linked_at,file_id').bind(courseId,lessonId).all();
 const linked=new Set(links.results.map(x=>x.file_id)),esc=courseEscape;
 const action=(id,kind,label)=>state.status==='draft'?'<form method="post" action="'+base+'"><input type="hidden" name="file" value="'+esc(id)+'"><input type="hidden" name="action" value="'+kind+'"><button>'+label+'</button></form>':'';
 const cards=listing.rows.map(f=>'<article class="dm-card"><strong>'+esc(f.name)+'</strong><p>'+esc(f.mimeType)+' · '+(Number(f.size)/1000000).toFixed(1)+' MB</p>'+(linked.has(f.id)?'<'+(f.mimeType.startsWith('video/')?'video':'audio')+' controls preload="none" src="'+base+'stream/'+esc(f.id)+'/"></'+(f.mimeType.startsWith('video/')?'video':'audio')+'>'+action(f.id,'detach','Bỏ liên kết'):action(f.id,'attach','Gắn vào bài học'))+'</article>').join('');
 const missing=[...linked].filter(id=>!listing.rows.some(f=>f.id===id)).map(id=>'<p>Media ngoài danh sách hiện tại hoặc không còn truy cập được.'+action(id,'detach','Bỏ liên kết')+'</p>').join('');
 const html='<style>main{max-width:1050px}.dm-card{padding:16px;background:#f0eafa;border-radius:12px;margin:12px 0;overflow-wrap:anywhere}.dm-card video,.dm-card audio{display:block;width:100%;max-height:480px;margin:12px 0}.dm-card button{min-height:44px}</style><nav><a href="/admin/courses/'+courseId+'/lessons/'+lessonId+'/">Soạn bài</a></nav><p>P2.5 · VIDEO & AUDIO MANAGEMENT</p><h1>Thư viện Google Drive</h1><p>Drive API: Đã kết nối · Chỉ đọc · '+listing.rows.length+' file hỗ trợ.</p><p>Tải file trực tiếp lên thư mục Google Drive, sau đó tải lại trang và gắn vào bài học. Không xóa file gốc khi bỏ liên kết.</p><p><a href="https://drive.google.com/drive/folders/'+esc(env.COURSE_MEDIA_FOLDER_ID)+'" target="_blank" rel="noopener noreferrer">Mở thư mục Drive</a></p>'+(listing.truncated?'<p>Danh sách giới hạn 500 mục; chỉ hiển thị thư mục gốc.</p>':'')+(cards||'<p>Chưa có video/audio hợp lệ trong thư mục gốc.</p>')+missing;
 return reply(req.method==='HEAD'?null:page(html),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; media-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
 }catch{return reply('Không kết nối được Drive hoặc cơ sở dữ liệu. Kiểm tra cấu hình và quyền truy cập.',503);}
}


export {lessonMedia};
