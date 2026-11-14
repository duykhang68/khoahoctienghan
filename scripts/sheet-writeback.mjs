import {createSign} from 'node:crypto';
import {rowFingerprint,validateSheetSource,sourceSpreadsheet} from '../src/lib/sheet-blog/source.mjs';
import {checkHeaders} from '../src/lib/sheet-blog/model.mjs';

export class SheetSyncError extends Error{
 constructor(code,retryable=false){super(code);this.code=code;this.retryable=retryable}
}
const fail=(code,retryable=false)=>{throw new SheetSyncError(code,retryable)};
const verifiedReceipt=s=>s.phase==='VERIFIED'&&s.closed===true&&Number.isSafeInteger(s.pr)&&s.pr>0&&/^(?:techblog|ngon-ngu|lich-su|van-hoa|am-thuc|dia-ly-du-lich|kinh-te-cong-nghe|giao-duc-du-hoc|hallyu|doi-song|the-che)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(s.route||'')&&/^[a-f0-9]{40}$/.test(s.merge||'')&&/^[a-f0-9]{40}$/.test(s.verified||'');
async function jsonRequest(fetcher,url,options){
 let response;try{response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)})}catch{fail('GOOGLE_NETWORK',true)}
 if(!response.ok)fail('GOOGLE_HTTP_'+response.status,response.status===429||response.status>=500);
 try{return await response.json()}catch{fail('GOOGLE_RESPONSE')}
}
export async function serviceAccountToken(raw,fetcher=fetch,now=Math.floor(Date.now()/1000)){
 if(!raw)fail('GOOGLE_SETUP_REQUIRED');
 let key;try{key=JSON.parse(raw)}catch{fail('GOOGLE_CREDENTIAL_FORMAT')}
 if(key?.type!=='service_account'||typeof key.client_email!=='string'||!key.client_email.endsWith('.gserviceaccount.com')||typeof key.private_key!=='string')fail('GOOGLE_CREDENTIAL_FORMAT');
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const head=encode({alg:'RS256',typ:'JWT'}),claims=encode({iss:key.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 let signature;try{signature=createSign('RSA-SHA256').update(head+'.'+claims).sign(key.private_key,'base64url')}catch{fail('GOOGLE_CREDENTIAL_FORMAT')}
 const result=await jsonRequest(fetcher,'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+claims+'.'+signature}).toString()});
 if(typeof result.access_token!=='string'||!result.access_token)fail('GOOGLE_TOKEN_RESPONSE');
 return result.access_token;
}
export function sheetWriter(token,fetcher=fetch){
 const base='https://sheets.googleapis.com/v4/spreadsheets/'+sourceSpreadsheet;
 const request=(suffix,method='GET',body)=>jsonRequest(fetcher,base+suffix,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const cells=async range=>{const r=await request('/values/'+encodeURIComponent("'VN'!"+range)+'?valueRenderOption=FORMULA');if(r.values!==undefined&&!Array.isArray(r.values))fail('GOOGLE_RESPONSE');return r.values||[]};
 return {async write({state,draft}){
  // A merge alone is insufficient. Only a verified, closed FIFO receipt may write.
  if(!verifiedReceipt(state))fail('PRODUCTION_NOT_VERIFIED');
  const source=validateSheetSource(draft.sheetSource);
  try{checkHeaders((await cells('A1:E1'))[0])}catch(e){if(e instanceof SheetSyncError)throw e;fail('SHEET_HEADERS_CHANGED')}
  // Check tab ID as well as name: a renamed/replaced tab is a different source.
  const meta=await request('?fields=sheets(properties(sheetId,title))');
  if(!meta.sheets?.some(s=>s.properties?.sheetId===0&&s.properties?.title==='VN'))fail('SHEET_TAB_CHANGED');
  const titles=await cells('B2:B20000'),candidates=[];
  for(let i=0;i<titles.length;i++)if(String(titles[i]?.[0]??'').trim()===draft.title.trim())candidates.push(i+2);
  if(candidates.length>10)fail('SHEET_ROW_AMBIGUOUS');
  const matches=[];
  for(const row of candidates){const values=(await cells('A'+row+':E'+row))[0]||[];if(await rowFingerprint(values)===source.fingerprint)matches.push(row)}
  if(matches.length!==1)fail(matches.length?'SHEET_ROW_AMBIGUOUS':'SHEET_SOURCE_CHANGED');
  const row=matches[0];
  // Re-read immediately before writing; formulas and existing IDs are preserved.
  const fresh=(await cells('A'+row+':E'+row))[0]||[];
  if(await rowFingerprint(fresh)!==source.fingerprint)fail('SHEET_SOURCE_CHANGED');
  const current=String(fresh[0]??'');
  if(current===state.merge)return {row,commit:state.merge};
  if(current!=='')fail('SHEET_ID_CONFLICT');
  const range="'VN'!A"+row;
  const updated=await request('/values/'+encodeURIComponent(range)+'?valueInputOption=RAW','PUT',{range,majorDimension:'ROWS',values:[[state.merge]]});
  if(updated.updatedCells!==1)fail('SHEET_WRITE_UNCONFIRMED');
  const after=(await cells('A'+row+':E'+row))[0]||[];
  if(after[0]!==state.merge||await rowFingerprint(after)!==source.fingerprint)fail('SHEET_WRITE_UNCONFIRMED');
  return {row,commit:state.merge};
 }};
}
export async function syncSheetReceipt(state,draft,credentials,fetcher=fetch){
 if(!draft.sheetSource)return null;
 if(!verifiedReceipt(state))return {status:'BLOCKED',attempts:0,code:'PRODUCTION_NOT_VERIFIED'};
 if(state.sheetSync?.status==='SYNCED'||state.sheetSync?.status==='BLOCKED')return state.sheetSync;
 if(state.sheetSync?.attempts>=3)return {status:'BLOCKED',attempts:3,code:'SHEET_RETRY_LIMIT'};
 if(!credentials)return {status:'WAITING_CONFIG',attempts:0,code:'GOOGLE_SETUP_REQUIRED'};
 const attempts=(state.sheetSync?.attempts||0)+1;
 try{const token=await serviceAccountToken(credentials,fetcher);const result=await sheetWriter(token,fetcher).write({state,draft});return {status:'SYNCED',attempts,...result}}
 catch(e){const known=e instanceof SheetSyncError;return {status:known&&e.retryable&&attempts<3?'PENDING':'BLOCKED',attempts,code:known?e.code:'SHEET_VALIDATION'}}
}
