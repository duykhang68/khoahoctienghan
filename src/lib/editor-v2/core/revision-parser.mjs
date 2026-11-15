import {requireValue} from './contracts.mjs';
import {createBlock} from './blocks.mjs';
export const equal=(a,b)=>{const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;return JSON.stringify(sort(a))===JSON.stringify(sort(b))};
const textRuns=nodes=>{const runs=[];for(const n of nodes||[]){if(n.type==='hardBreak')runs.push({text:'\n',marks:[]});else{requireValue(n.type==='text'&&typeof n.text==='string'&&(n.marks||[]).every(m=>['bold','italic','underline','strike'].includes(m.type)&&Object.keys(m).length===1),'Khối có định dạng chưa hỗ trợ.');runs.push({text:n.text,marks:(n.marks||[]).map(m=>m.type)});}}return runs};
const plain=nodes=>{const runs=textRuns(nodes);requireValue(runs.every(r=>!r.marks.length),'Khối có định dạng chưa hỗ trợ.');return runs.map(r=>r.text).join('')};
export function parseRevisionBlocks(doc,ids){
 requireValue(doc?.type==='doc'&&Array.isArray(doc.content),'Thiếu tài liệu Studio.');
 requireValue(Array.isArray(ids)&&ids.length===doc.content.length,'Thiếu ID khối.');
 let cursor=0;
 const newBlock=kind=>createBlock(kind,ids[cursor++]);
const textBlock=(kind,text)=>({...newBlock(kind),text});
const rich=(kind,nodes)=>{const runs=textRuns(nodes);return {...textBlock(kind,runs.map(r=>r.text).join('')),runs}};
 const blocks=doc.content.map(n=>{
  if(n.type==='paragraph')return rich('paragraph',n.content);
  if(n.type==='heading'){const kind={2:'heading',3:'subheading',4:'detailheading'}[n.attrs?.level];requireValue(kind,'Cấp tiêu đề chưa hỗ trợ.');return textBlock(kind,plain(n.content))}
  if(n.type==='codeBlock')return textBlock('code',plain(n.content));
  if(n.type==='horizontalRule')return newBlock('divider');
  if(n.type==='blockquote'||n.type==='hdNote'){requireValue(n.content?.length===1&&n.content[0].type==='paragraph','Khối trích dẫn phức tạp chưa hỗ trợ.');const b=rich(n.type==='blockquote'?'quote':'note',n.content[0].content);if(n.type==='hdNote')b.tone=n.attrs?.kind;return b}
  if(n.type==='bulletList'||n.type==='orderedList'){const runs=[];for(const [i,item] of (n.content||[]).entries()){requireValue(item.type==='listItem'&&item.content?.length===1&&item.content[0].type==='paragraph','Danh sách lồng chưa hỗ trợ.');if(i)runs.push({text:'\n',marks:[]});runs.push(...textRuns(item.content[0].content));}return {...textBlock(n.type==='bulletList'?'bullet':'ordered',runs.map(x=>x.text).join('')),runs}}
  if(n.type==='table'){const rows=n.content.map(row=>row.content.map(cell=>{requireValue(cell.content?.length===1&&cell.content[0].type==='paragraph','Ô bảng phức tạp chưa hỗ trợ.');return plain(cell.content[0].content)}));return {...newBlock('table'),rows}}
  throw Error('Bài có khối hình ảnh hoặc minh họa chưa hỗ trợ nhập an toàn. Dùng Quản lý bài để giữ nguyên nội dung.');
 });
 return blocks;
}
export function frontField(s,key){const f=s.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);requireValue(f,'Metadata không hỗ trợ.');const m=f[1].match(new RegExp('^'+key+':[ \\t]*(.*)$','m'));if(!m)return '';const v=m[1].trim();requireValue(!/^[>|]/.test(v),'Metadata nhiều dòng chưa hỗ trợ.');if(v.startsWith('"'))return JSON.parse(v);if(v.startsWith("'")&&v.endsWith("'"))return v.slice(1,-1).replace(/''/g,"'");return v}
export function setFront(s,key,value){frontField(s,key);const f=s.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/),rule=new RegExp('^'+key+':[ \\t]*.*$','m');return s.replace(f[0],()=>f[0].replace(f[1],()=>rule.test(f[1])?f[1].replace(rule,()=>key+': '+JSON.stringify(value)):f[1]+'\n'+key+': '+JSON.stringify(value)))}
