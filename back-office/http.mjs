const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const reply=(body,status=200,extra={})=>new Response(body,{status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8',...extra}});
const css='body{margin:0;background:#f8fafc;color:#17233c;font:16px/1.6 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:3rem 1rem}header,article{background:white;border:1px solid #e2e8f0;border-radius:18px;padding:2rem}header{background:linear-gradient(120deg,#e0e7ff,#ccfbf1)}h1{font-size:clamp(2rem,5vw,3rem);margin:.2rem 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1rem}small{color:#475569}button{padding:.6rem 1rem;background:#4338ca;color:white;border:0;border-radius:8px;cursor:pointer}';
const page=(body)=>'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Back Office | Tri thức Hàn Quốc</title><style>'+css+'</style><main>'+body+'</main></html>';
const htmlHeaders={'Content-Type':'text/html; charset=utf-8'};
const redirect=(path,cookies=[])=>{const res=reply(null,303,{Location:path});for(const c of cookies)res.headers.append('Set-Cookie',c);return res;};

export {reply,page,htmlHeaders,redirect};
