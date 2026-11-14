// P0.1: server-side guard for an isolated Cloudflare Worker.
// Cloudflare Access must protect production and previews. Never trust request-supplied identity headers.
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow'};
const respond=(body,status=200,type='text/plain; charset=utf-8')=>new Response(body,{status,headers:{...headers,'Content-Type':type}});
export async function authorized(request,env,ctx){
  if(!env?.ACCESS_AUD || !env?.ADMIN_EMAILS || !ctx?.access || ctx.access.aud!==env.ACCESS_AUD)return false;
  try{
    const identity=await ctx.access.getIdentity();
    const email=typeof identity?.email==='string'?identity.email.trim().toLowerCase():'';
    const allowed=env.ADMIN_EMAILS.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    return Boolean(email&&allowed.includes(email));
  }catch{return false;}
}
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Back Office | Tri thức Hàn Quốc</title><style>body{margin:0;background:#f8fafc;color:#17233c;font:16px/1.6 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:2rem 1rem}header{padding:2rem;border-radius:20px;background:linear-gradient(120deg,#e0e7ff,#ccfbf1)}h1{font-size:clamp(2rem,5vw,3rem);margin:.2rem 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1rem}article{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:1.25rem}small{color:#475569}a{color:#4338ca}</style><main><header><small>P0.1 · PRIVATE BACK OFFICE</small><h1>Trung tâm quản trị</h1><p>Tri thức Hàn Quốc · Phiên quản trị đã xác thực</p><a href="/cdn-cgi/access/logout">Đăng xuất</a></header><div class="grid"><article><h2>Engineering Foundation</h2><small>Chờ chuyển dashboard vào vùng bảo vệ.</small></article><article><h2>Editorial Studio</h2><small>Chờ chuyển công cụ Google Sheets và triển khai P1.</small></article><article><h2>SEO & Analytics</h2><small>P2 · Chưa triển khai</small></article></div></main></html>`;
export default {async fetch(request,env,ctx){
  if(!await authorized(request,env,ctx))return respond('Không có quyền truy cập Back Office.',403);
  const url=new URL(request.url);
  if(request.method!=='GET'&&request.method!=='HEAD')return respond('Method not allowed',405);
  if(url.pathname!=='/'&&url.pathname!=='/admin/')return respond('Not found',404);
  return respond(request.method==='HEAD'?null:html,200,'text/html; charset=utf-8');
}};
