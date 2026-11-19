import {reply,redirect} from './http.mjs';
import {authorized,configured} from './auth/session.mjs';
import {schedulerApi} from './server-scheduler.mjs';
import {sheetsBundle} from './generated/sheets-assets.mjs';
import {routeAuth} from './routes/auth.mjs';
import {routeEditorial} from './routes/editorial.mjs';

export async function routeRequest(req,env,verifyGoogle){
 if(!configured(env))return reply('Back Office chưa cấu hình bảo mật.',503);
 const url=new URL(req.url);if(url.origin!==env.BACKOFFICE_ORIGIN)return reply('Forbidden',403);
 const auth=await routeAuth(req,env,url,verifyGoogle);if(auth!==null)return auth;
 if(!await authorized(req,env))return req.method==='GET'&&(url.pathname==='/'||url.pathname==='/admin/'||url.pathname==='/admin/engineering/'||url.pathname==='/admin/sheets/'||url.pathname==='/admin/editor/'||url.pathname==='/admin/library/'||url.pathname==='/admin/categories/'||url.pathname==='/admin/drafts/'||url.pathname==='/admin/pipeline/'||url.pathname==='/admin/schedules/')?redirect('/auth/login'):reply('Forbidden',403);
 if(url.pathname==='/admin/api/schedules/'){const result=await schedulerApi(req,env,sheetsBundle.topics);return reply(JSON.stringify(result.body),result.status,{'Content-Type':'application/json; charset=utf-8'});}
 if(req.method!=='GET'&&req.method!=='HEAD')return reply('Method not allowed',405);
 return routeEditorial(req,env,url);
}
