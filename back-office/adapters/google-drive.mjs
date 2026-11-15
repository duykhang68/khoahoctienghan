import {b64,enc} from '../encoding.mjs';

const driveId=/^[A-Za-z0-9_-]{10,150}$/;
const driveTypes=new Set(['video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm','audio/x-wav']);
const driveBase='https://www.googleapis.com/drive/v3/files';
const googleTokenUrl='https://oauth2.googleapis.com/token';
const driveFields='id,name,mimeType,size,parents,trashed,capabilities(canDownload)';
export async function courseDriveToken(env,fetcher=fetch){
 if(!driveId.test(env.COURSE_MEDIA_FOLDER_ID||''))throw Error('DRIVE_CONFIG');
 const account=JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON||'{}');
 if(account.type!=='service_account'||typeof account.client_email!=='string'||!account.client_email.endsWith('.gserviceaccount.com')||typeof account.private_key!=='string')throw Error('DRIVE_CONFIG');
 // Parse a PKCS#8 PEM envelope structurally; the key itself comes only from the Worker secret.
 const lines=account.private_key.trim().split(/\r?\n/);
 const boundary=/^-----(BEGIN|END) ([A-Z ]+)-----$/;
 const first=boundary.exec(lines.shift()||''),last=boundary.exec(lines.pop()||'');
 if(first?.[1]!=='BEGIN'||last?.[1]!=='END'||first[2]!=='PRIVATE KEY'||last[2]!==first[2])throw Error('DRIVE_CONFIG');
 const raw=lines.join('').replace(/\s/g,'');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))throw Error('DRIVE_CONFIG');
 const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(raw),x=>x.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const stamp=Math.floor(Date.now()/1000),part=x=>b64(enc.encode(JSON.stringify(x)));
 const unsigned=part({alg:'RS256',typ:'JWT'})+'.'+part({iss:account.client_email,scope:'https://www.googleapis.com/auth/drive.readonly',aud:googleTokenUrl,iat:stamp,exp:stamp+300});
 const assertion=unsigned+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(unsigned)));
 const response=await fetcher(googleTokenUrl,{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 if(!response.ok)throw Error('DRIVE_AUTH');
 const token=(await response.json()).access_token;if(typeof token!=='string'||!token)throw Error('DRIVE_AUTH');return token;
}
async function driveGet(token,url,headers={},fetcher=fetch){return fetcher(url,{redirect:'error',headers:{...headers,Authorization:'Bearer '+token}});}
export function eligibleCourseMedia(file,folder){
 return !!file&&driveId.test(file.id||'')&&driveTypes.has(file.mimeType)&&file.trashed===false&&Array.isArray(file.parents)&&file.parents.includes(folder)&&file.capabilities?.canDownload===true&&typeof file.name==='string'&&file.name.length<=1000&&/^\d{1,15}$/.test(file.size||'')&&Number(file.size)>0;
}
async function courseDriveList(env,token){
 const folder=env.COURSE_MEDIA_FOLDER_ID;
 const check=await driveGet(token,driveBase+'/'+folder+'?fields=id,mimeType,trashed');
 if(!check.ok)throw Error('DRIVE_FOLDER');const root=await check.json();if(root.id!==folder||root.mimeType!=='application/vnd.google-apps.folder'||root.trashed!==false)throw Error('DRIVE_FOLDER');
 let page='',rows=[];
 for(let i=0;i<5;i++){const p=new URLSearchParams({q:"'"+folder+"' in parents and trashed = false and (mimeType contains 'video/' or mimeType contains 'audio/')",fields:'nextPageToken,incompleteSearch,files('+driveFields+')',pageSize:'100',orderBy:'name'});if(page)p.set('pageToken',page);const response=await driveGet(token,driveBase+'?'+p);if(!response.ok)throw Error('DRIVE_LIST');const data=await response.json();if(!Array.isArray(data.files)||data.incompleteSearch)throw Error('DRIVE_LIST');rows.push(...data.files.filter(f=>eligibleCourseMedia(f,folder)));page=data.nextPageToken;if(!page)return {rows,truncated:false};}
 return {rows,truncated:true};
}
async function courseDriveFile(env,token,id){
 if(!driveId.test(id))return null;const res=await driveGet(token,driveBase+'/'+id+'?'+new URLSearchParams({fields:driveFields}));if(!res.ok)return null;const data=await res.json();return data.id===id&&eligibleCourseMedia(data,env.COURSE_MEDIA_FOLDER_ID)?data:null;
}

export {driveId,driveBase,driveGet,courseDriveList,courseDriveFile};
