import {reply,redirect} from './http.mjs';
import {authorized,configured} from './auth/session.mjs';
import {schedulerApi} from './server-scheduler.mjs';
import {sheetsBundle} from './generated/sheets-assets.mjs';
import {routeAuth} from './routes/auth.mjs';
import {routeCourseDetail,routeCourseBeforeReadGate,routeCourseRead} from './routes/course.mjs';
import {routeEditorial} from './routes/editorial.mjs';

export async function routeRequest(req,env,verifyGoogle){
 if(!configured(env))return reply('Back Office chưa cấu hình bảo mật.',503);
 const url=new URL(req.url);if(url.origin!==env.BACKOFFICE_ORIGIN)return reply('Forbidden',403);
 const auth=await routeAuth(req,env,url,verifyGoogle);if(auth!==null)return auth;
 if(!await authorized(req,env))return req.method==='GET'&&(url.pathname==='/'||url.pathname==='/admin/'||url.pathname==='/admin/engineering/'||url.pathname==='/admin/sheets/'||url.pathname==='/admin/editor/'||url.pathname==='/admin/library/'||url.pathname==='/admin/categories/'||url.pathname==='/admin/drafts/'||url.pathname==='/admin/pipeline/'||url.pathname==='/admin/schedules/'||url.pathname==='/admin/courses/'||url.pathname==='/admin/courses/manage/'||/^\/admin\/courses\/[0-9a-f-]{36}\/(?:curriculum|lessons\/[0-9a-f-]{36})\/$/.test(url.pathname))?redirect('/auth/login'):reply('Forbidden',403);
 const detail=await routeCourseDetail(req,env,url);if(detail!==null)return detail;
 if(url.pathname==='/admin/api/schedules/'){const result=await schedulerApi(req,env,sheetsBundle.topics);return reply(JSON.stringify(result.body),result.status,{'Content-Type':'application/json; charset=utf-8'});}
 const mutation=await routeCourseBeforeReadGate(req,env,url);if(mutation!==null)return mutation;
 if(req.method!=='GET'&&req.method!=='HEAD')return reply('Method not allowed',405);
 const read=await routeCourseRead(req,env,url);if(read!==null)return read;
 return routeEditorial(req,env,url);
}
