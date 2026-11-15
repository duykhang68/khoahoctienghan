import assert from 'node:assert/strict';
const container=new Set(['doc','paragraph','heading','blockquote','bulletList','orderedList','listItem','codeBlock','hdNote','articleDetails','articleSummary','articleDetailsContent','articleFigure','articleCaption','table','tableRow','tableHeader','tableCell']);
const leaves=new Set(['text','hardBreak','horizontalRule','image']);
export const mediaPattern=/^\/media\/studio\/[a-f0-9]{64}\.webp$/;
export const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeText=(v,n)=>typeof v==='string'&&v.length<=n;
function url(value){assert(safeText(value,2048),'Invalid link');const u=new URL(value);assert(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password,'Unsafe link');return u.href}
export function* documentProjection(input,{allowEmbedded=false}={}){
 let count=0,textLength=0;
 function* node(n,depth=0){
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
   if(typeof src==='string'&&src.startsWith('data:image/webp;base64,')&&allowEmbedded){
    const resolved=yield {kind:'embedded-webp',source:src};({src,width,height}=resolved);
   }
   assert(mediaPattern.test(src)&&Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=1600&&height<=1600,'Invalid repository image');out.attrs={src,alt:a.alt,width,height};
  }
  if(container.has(n.type)){assert(n.content===undefined||Array.isArray(n.content),'Invalid children');out.content=[];for(const child of (n.content||[]))out.content.push(yield* node(child,depth+1))}
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
 return yield* node(input);
}
export function documentText(n){return n.type==='text'?n.text:n.content?.map(documentText).join(' ')||''}

export function* imageReferences(doc){
 const stack=[doc];while(stack.length){const n=stack.pop();if(n.type==='image')yield n.attrs;stack.push(...(n.content||[]));}
}
export function assertImageEvidence(attrs,width,height,digest){
 assert(width===attrs.width&&height===attrs.height,'Image dimensions mismatch');
 assert(digest===attrs.src.slice(-69,-5),'Image hash mismatch');
}
