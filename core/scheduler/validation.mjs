import {metadata,slugify} from '../../src/lib/editor-v2/core/metadata.mjs';
import {validateCopy,vietnamTime} from '../../src/lib/editor-v2/core/draft-policy.mjs';
export const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
export const digestId=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const err=(code,status=400)=>Object.assign(Error(code),{code,httpStatus:status});
const numeric=x=>/^[1-9][0-9]*$/.test(String(x||''));
const validKeyEncoding=value=>typeof value==='string'&&value.length>=512&&value.length<=16000&&value.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(value);
export const schedulerConfigured=env=>Boolean(env?.SCHEDULE_DB&&env.SCHEDULER_ENABLED==='true'&&numeric(env.SCHEDULER_APP_ID)&&numeric(env.SCHEDULER_INSTALLATION_ID)&&numeric(env.SCHEDULER_APP_BOT_ID)&&/^[a-z0-9-]+\[bot\]$/.test(env.SCHEDULER_APP_BOT_LOGIN||'')&&validKeyEncoding(env.SCHEDULER_APP_PKCS8_B64));

export function scheduleDue(input,now){
 if(input?.consent!==true)throw err('CONSENT_REQUIRED');
 let due;try{due=vietnamTime(input.dueLocal)}catch{throw err('INVALID_DATE')}
 if(due<=now||due>now+366*86400000)throw err('INVALID_DATE');
 return due;
}
export function scheduleDraft(input,topics){
 const draft=validateCopy(input.draft),slug=slugify(draft.title);
 if(!slug||['index','editorv2'].includes(slug)||draft.title.trim().length>180||draft.summary.length>500||(draft.kind==='knowledge'&&!topics.includes(draft.category)))throw Error('Invalid metadata');
 metadata(draft);return draft;
}
export function schedulePayload(draft){const bytes=new TextEncoder().encode(JSON.stringify({version:1,draft}));if(bytes.length>8000000)throw err('INVALID_DRAFT');return bytes;}
export function scheduleRoute(draft){return (draft.kind==='tech'?'techblog':draft.category)+'/'+slugify(draft.title)+'/';}
