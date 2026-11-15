import {enc,b64,unb64,json} from '../encoding.mjs';

// P0.1: isolated Worker, Google Identity Services (OIDC), no Cloudflare Access.
// Never trust an email or identity header supplied by the browser.
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const now=()=>Math.floor(Date.now()/1000);
const cookie=(name,value,age)=>name+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+age;
const getCookie=(req,name)=>req.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
const sessionName='__Host-bo_session', challengeName='__Host-bo_challenge';
const allow=(email,env)=>typeof email==='string'&&env.ADMIN_EMAILS.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
const configured=env=>typeof env?.SESSION_SECRET==='string'&&env.SESSION_SECRET.length>=43&&/^[\w.-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID||'')&&typeof env.ADMIN_EMAILS==='string'&&env.ADMIN_EMAILS.trim()&&typeof env.BACKOFFICE_ORIGIN==='string'&&/^https:\/\/[a-z0-9.-]+$/.test(env.BACKOFFICE_ORIGIN);
const key=env=>crypto.subtle.importKey('raw',enc.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
async function seal(data,env){const p=b64(enc.encode(JSON.stringify(data)));return p+'.'+b64(await crypto.subtle.sign('HMAC',await key(env),enc.encode(p)));}
async function open(value,env,kind){try{if(value.length>4096)return null;const [p,s,...extra]=value.split('.');if(!p||!s||extra.length||!await crypto.subtle.verify('HMAC',await key(env),unb64(s),enc.encode(p)))return null;const d=json(p);return d.kind===kind&&Number.isSafeInteger(d.exp)&&d.exp>now()&&d.origin===env.BACKOFFICE_ORIGIN?d:null;}catch{return null;}}
export async function authorized(req,env){if(!configured(env))return false;const s=await open(getCookie(req,sessionName),env,'session');return Boolean(s&&typeof s.sub==='string'&&s.sub&&allow(s.email,env));}

export {random,now,cookie,getCookie,sessionName,challengeName,allow,configured,seal,open};
