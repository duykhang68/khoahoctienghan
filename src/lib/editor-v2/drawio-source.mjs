// Source is archived as opaque text outside public/; never execute or render it as markup.
export const blankDrawio='<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
export function validateDrawioSource(value){
 if(typeof value!=='string'||new TextEncoder().encode(value).length>300000)throw Error('File draw.io tối đa 300 KB.');
 const xml=value.trim().replace(/^\uFEFF/,'').replace(/^<\?xml\s+[^?]*\?>\s*/,'');
 if(/<!DOCTYPE|<!ENTITY|<\?/i.test(xml)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(xml)||!(/^(?:<mxfile(?:\s[^>]*|)>[\s\S]*<\/mxfile>|<mxGraphModel(?:\s[^>]*|)>[\s\S]*<\/mxGraphModel>)$/.test(xml)))throw Error('Chỉ hỗ trợ XML draw.io hợp lệ, không có DTD hoặc entity ngoài.');
 return xml;
}
export async function drawioPath(imageHash,xml){
 const bytes=new TextEncoder().encode(validateDrawioSource(xml));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(!/^[a-f0-9]{64}$/.test(imageHash))throw Error('Invalid image digest');
 return {path:'diagrams/editor-v2/'+imageHash+'-'+hash+'.drawio',binary:btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''))};
}
