// Local request/session decisions use explicit headers and time.
export const origin='http://localhost:5173',host='localhost:5173',cookie='kb_editor_session';
const localAddress=a=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(a);
export function allowedLocalRequest(remoteAddress,headers){return localAddress(remoteAddress)&&headers.host===host&&(!headers.origin||headers.origin===origin);}
export function validNonce(headers,nonce){return headers.origin===origin&&headers['x-editor-nonce']===nonce;}
export function sessionId(header){return String(header||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1)||'';}
export function activeSession(value,now){return Boolean(value&&value.expires>now);}
export function expiredSessionIds(sessions,now){return [...sessions].filter(([,s])=>s.expires<=now).map(([key])=>key);}
export function createSession(owner,now){return {owner,expires:now+12*60*60*1000};}
export function driveClientConfig(driveClient){const clientId=/^[\w-]+\.apps\.googleusercontent\.com$/.test(driveClient)?driveClient:'';return {clientId,configured:!!clientId,source:'local'};}
