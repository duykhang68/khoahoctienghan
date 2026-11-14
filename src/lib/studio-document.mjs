import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const container=new Set(['doc','paragraph','heading','blockquote','bulletList','orderedList','listItem','codeBlock','hdNote','articleDetails','articleSummary','articleDetailsContent','articleFigure','articleCaption','table','tableRow','tableHeader','tableCell']);
const leaves=new Set(['text','hardBreak','horizontalRule','image']);
export const mediaPattern=/^\/media\/studio\/[a-f0-9]{64}\.webp$/;
export const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeText=(v,n)=>typeof v==='string'&&v.length<=n;
function url(value){assert(safeText(value,2048),'Invalid link');const u=new URL(value);assert(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password,'Unsafe link');return u.href}
export function webpDimensions(bytes){
 assert(Buffer.isBuffer(bytes)&&bytes.length>=20&&bytes.length<=1_500_000&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'&&bytes.readUInt32LE(4)+8===bytes.length,'Invalid WebP');
 let frame=null,canvas=null;
 for(let i=12;i<bytes.length;){assert(i+8<=bytes.length,'Invalid WebP chunk');const kind=bytes.toString('ascii',i,i+4),size=bytes.readUInt32LE(i+4),start=i+8,end=start+size;assert(end+(size%2)<=bytes.length,'Truncated WebP');assert(!['ANIM','ANMF'].includes(kind),'Animated WebP not supported');
  if(kind==='VP8X'){assert(size===10&&!(bytes[start]&2),'Invalid VP8X');canvas=[1+bytes.readUIntLE(start+4,3),1+bytes.readUIntLE(start+7,3)]}
  if(kind==='VP8 '){assert(!frame&&size>=10&&bytes[start+3]===157&&bytes[start+4]===1&&bytes[start+5]===42,'Invalid VP8 frame');frame=[bytes.readUInt16LE(start+6)&0x3fff,bytes.readUInt16LE(start+8)&0x3fff]}
  if(kind==='VP8L'){assert(!frame&&size>=5&&bytes[start]===47,'Invalid VP8L frame');const bits=bytes.readUInt32LE(start+1);frame=[(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1]}
  i=end+(size%2);
 }
 assert(frame&&frame.every(n=>n>=1&&n<=1600)&&(!canvas||canvas.every((n,i)=>n===frame[i])),'Invalid image dimensions');return frame;
}
export function normalizeDocument(input,{assets=null}={}){
 let count=0,textLength=0;
 function node(n,depth=0){
  assert(n&&typeof n==='object'&&depth<=24&&++count<=5000,'Invalid or oversized document');
  assert(container.has(n.type)||leaves.has(n.type),'Unsupported content node: '+n.type);
  assert(depth===0?n.type==='doc':n.type!=='doc','Invalid root');
  const out={type:n.type},a=n.attrs||{};
  if(n.type==='text'){assert(safeText(n.text,80_000)&&n.text.length,'Invalid text');textLength+=n.text.length;assert(textLength<=200_000,'Document too long');out.text=n.text;
   if(n.marks?.length){assert(Array.isArray(n.marks)&&n.marks.length<=8,'Too many marks');out.marks=n.marks.map(m=>{assert(['bold','italic','underline','strike','code','link'].includes(m.type),'Unsupported mark');return m.type==='link'?{type:'link',attrs:{href:url(m.attrs?.href)}}:{type:m.type}})}
  }
  if(n.type==='heading'){assert([2,3,4].includes(a.level),'Invalid heading');out.attrs={level:a.level}}
  if(n.type==='orderedList'){assert(Number.isInteger(a.start??1)&&(a.start??1)>=1&&(a.start??1)<=10000,'Invalid list start');out.attrs={start:a.start??1}}
  if(n.type==='hdNote'){assert(['info','tip','warning'].includes(a.kind),'Invalid note');out.attrs={kind:a.kind}}
  if(n.type==='tableHeader'||n.type==='tableCell'){assert((a.colspan??1)===1&&(a.rowspan??1)===1,'Merged table cells not supported');}
  if(n.type==='image'){
   assert(safeText(a.alt,500)&&a.alt.trim(),'Image needs alt text');let src=a.src,width=a.width,height=a.height;
   if(typeof src==='string'&&src.startsWith('data:image/webp;base64,')&&assets){const encoded=src.slice('data:image/webp;base64,'.length);assert(encoded.length<=2_000_000,'WebP too large');const bytes=Buffer.from(encoded,'base64');assert(bytes.toString('base64')===encoded,'Invalid image encoding');[width,height]=webpDimensions(bytes);src='/media/studio/'+createHash('sha256').update(bytes).digest('hex')+'.webp';assets.set('public'+src,bytes);}
   assert(mediaPattern.test(src)&&Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=1600&&height<=1600,'Invalid repository image');out.attrs={src,alt:a.alt,width,height};
  }
  if(container.has(n.type)){assert(n.content===undefined||Array.isArray(n.content),'Invalid children');out.content=(n.content||[]).map(child=>node(child,depth+1))}
  else assert(!n.content?.length,'Leaf cannot have children');
  const childTypes=out.content?.map(c=>c.type)||[];
  if(n.type==='table')assert(childTypes.length&&childTypes.every(t=>t==='tableRow')&&out.content.every(row=>row.content.length===out.content[0].content.length),'Invalid table');
  if(n.type==='tableRow')assert(childTypes.length&&childTypes.every(t=>['tableCell','tableHeader'].includes(t)),'Invalid row');
  if(n.type==='articleFigure')assert(childTypes.length>=1&&childTypes.length<=2&&childTypes[0]==='image'&&(childTypes.length===1||childTypes[1]==='articleCaption'),'Invalid figure');
  if(n.type==='articleDetails')assert(childTypes.join(',')==='articleSummary,articleDetailsContent','Invalid details');
  if(n.type==='orderedList'||n.type==='bulletList')assert(childTypes.every(t=>t==='listItem'),'Invalid list');
  if(['paragraph','heading','articleCaption','articleSummary'].includes(n.type))assert(childTypes.every(t=>['text','hardBreak'].includes(t)),'Invalid inline content');
  if(n.type==='codeBlock')assert(childTypes.every(t=>t==='text'),'Invalid code');
  return out;
 }
 return node(input);
}
export function documentText(n){return n.type==='text'?n.text:n.content?.map(documentText).join(' ')||''}
export function assertImageFiles(doc,lookup){
 const stack=[doc];while(stack.length){const n=stack.pop();if(n.type==='image'){const bytes=lookup('public'+n.attrs.src);const [w,h]=webpDimensions(bytes);assert(w===n.attrs.width&&h===n.attrs.height,'Image dimensions mismatch');assert(createHash('sha256').update(bytes).digest('hex')===n.attrs.src.slice(-69,-5),'Image hash mismatch')}stack.push(...(n.content||[]))}
}
