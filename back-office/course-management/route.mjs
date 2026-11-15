import {validateCourseInput,courseSlug,createCourseModel} from './core.mjs';
import {courseManagementPage} from './view.mjs';
const model=createCourseModel();
// Read-only list + existing database-wide metrics; no new storage or permissions.
export async function courseManagementRoute(req,env,{reply,page,random,courseOverview}){
 let snapshot=null;try{if(env.COURSE_DB){const [counts,list]=await Promise.all([courseOverview(env),env.COURSE_DB.prepare('SELECT id,slug,title,description,level,status,version,updated_at FROM courses ORDER BY updated_at DESC,id LIMIT 100').all()]);const stats=model.statistics(counts);const value={stats,rows:list.results,loadedAt:Date.now()};if(model.snapshotOk(value))snapshot=value;}}catch{/* explicit unavailable state */}
 const json=req.headers.get('Accept')==='application/json';
 if(json)return reply(req.method==='HEAD'?null:JSON.stringify(snapshot??{error:'UNAVAILABLE'}),snapshot?200:503,{'Content-Type':'application/json; charset=utf-8','Vary':'Accept'});
 const nonce=random();return reply(req.method==='HEAD'?null:page(courseManagementPage(snapshot,nonce)),snapshot?200:503,{'Content-Type':'text/html; charset=utf-8','Vary':'Accept','Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
}

export async function courseMutation(req,env,{reply,redirect,open,getCookie,sessionName,courseWriteChanged}){
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
  if(req.headers.get('Accept')==='application/json')return reply(JSON.stringify({ok:true}),200,{'Content-Type':'application/json; charset=utf-8','Vary':'Accept'});
  return redirect('/admin/courses/manage/');
 }catch(e){return e?.message==='INVALID_COURSE'?reply('Thông tin khóa học không hợp lệ',400):reply('Không lưu được khóa học',503);}
}
