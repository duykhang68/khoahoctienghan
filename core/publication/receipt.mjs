export const verifiedReceipt=s=>s.phase==='VERIFIED'&&s.closed===true&&Number.isSafeInteger(s.pr)&&s.pr>0&&/^(?:techblog|ngon-ngu|lich-su|van-hoa|am-thuc|dia-ly-du-lich|kinh-te-cong-nghe|giao-duc-du-hoc|hallyu|doi-song|the-che)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(s.route||'')&&/^[a-f0-9]{40}$/.test(s.merge||'')&&/^[a-f0-9]{40}$/.test(s.verified||'');

export function sheetReceiptDecision(state,hasSource,hasCredentials){
 if(!hasSource)return {kind:'return',value:null};
 if(!verifiedReceipt(state))return {kind:'return',value:{status:'BLOCKED',attempts:0,code:'PRODUCTION_NOT_VERIFIED'}};
 if(state.sheetSync?.status==='SYNCED'||state.sheetSync?.status==='BLOCKED')return {kind:'return',value:state.sheetSync};
 if(state.sheetSync?.attempts>=3)return {kind:'return',value:{status:'BLOCKED',attempts:3,code:'SHEET_RETRY_LIMIT'}};
 if(!hasCredentials)return {kind:'return',value:{status:'WAITING_CONFIG',attempts:0,code:'GOOGLE_SETUP_REQUIRED'}};
 return {kind:'write',attempts:(state.sheetSync?.attempts||0)+1};
}
export function sheetFailureReceipt(known,retryable,code,attempts){return {status:known&&retryable&&attempts<3?'PENDING':'BLOCKED',attempts,code:known?code:'SHEET_VALIDATION'};}
