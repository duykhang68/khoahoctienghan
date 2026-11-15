import {clean,equal} from './contracts.mjs';
import {slugify} from '../../editor-v2/core/metadata.mjs';
/** @typedef {Readonly<{row:number,id:string,title:string,group:string,topic:string}>} SheetRow */
export function checkHeaders(row){
 const expected=['content id_vn','blog title','blog main content','group','topic'];
 if(!expected.every((name,i)=>equal(row?.[i],name)))throw Error('Tab VN đã đổi cấu trúc cột A–E. Dừng nhập để tránh lấy nhầm nội dung.');
}
export function listRows(ab,de,start=2){
 return (ab||[]).flatMap((cells,i)=>{
  const title=clean(cells?.[1]);if(!title)return [];
  return [{row:start+i,id:clean(cells?.[0]),title,group:clean(de?.[i]?.[0]),topic:clean(de?.[i]?.[1])}];
 });
}
export function rowDraft(selected,row,topics,kind,category){
 const [id,title,body,group,topic]=row||[];
 if(clean(id)||clean(selected.id))throw Error('Bài đã có Content ID. Không gửi bài trùng.');
 if(!equal(id,selected.id)||clean(title)!==selected.title||clean(group)!==selected.group||clean(topic)!==selected.topic)throw Error('Dòng nguồn đã thay đổi. Tải lại danh sách trước khi gửi.');
 if(!['knowledge','tech'].includes(kind)||kind==='knowledge'&&!topics.some(t=>t.id===category))throw Error('Chọn nơi xuất bản và chuyên mục hợp lệ.');
 const content=String(body??'').replace(/\r\n?/g,'\n');
 if(!content.trim()||content.length>200000)throw Error('Nội dung cột C trống hoặc vượt giới hạn 200.000 ký tự.');
 if(!selected.title||selected.title.length>180||!slugify(selected.title)||/[\u0000-\u001f\u007f]/u.test(selected.title))throw Error('Tiêu đề không hợp lệ hoặc dài hơn 180 ký tự.');
 // Preserve source wording and line breaks, without interpreting HTML/Markdown as executable markup.
 const paragraphs=content.split('\n').filter(line=>line.trim());
 if(paragraphs.length>250||paragraphs.some(line=>line.length>50000))throw Error('Nội dung vượt giới hạn khối của Editor V2; cần chia bài trước khi gửi.');
 const blocks=paragraphs.map((text,i)=>({id:'sheet-vn-'+i,kind:'paragraph',text,marks:[]}));
 return {kind,category:kind==='knowledge'?category:'',title:selected.title,summary:paragraphs[0].trim().slice(0,500),labels:'',series:{enabled:false},blocks};
}

export function assertPreviewRow(item,row){
 if(String(row[1]??'').trim()!==item.title||String(row[0]??'').trim()!==item.id||String(row[3]??'').trim()!==item.group||String(row[4]??'').trim()!==item.topic)throw Error('Dòng nguồn đã thay đổi. Tải lại danh sách.');
 if(!String(row[2]??'').trim())throw Error('Bài chưa có blog main content.');
}
export function assertUnchangedRow(fresh,reviewed){if(JSON.stringify(fresh)!==JSON.stringify(reviewed))throw Error('Nội dung nguồn đã đổi. Đóng và mở lại bài để kiểm tra trước khi gửi.');}
export function validRowNumber(row){return Number.isInteger(row)&&row>=2&&row<=20000;}
export function rowKey(r){return JSON.stringify([r.row,r.title,r.group,r.topic]);}
export function rowState(r,submitted){return r.id?'marked':submitted.has(rowKey(r))?'sent':'pending';}
export function publisherPage(rows,submitted,query,filter,page){
 const state=r=>rowState(r,submitted);
 const matches=rows.filter(r=>r.title.toLocaleLowerCase('vi').includes(query)&&(!filter||state(r)===filter));
 const totals={pending:0,sent:0,marked:0};for(const r of rows)totals[state(r)]++;
 const pages=Math.max(1,Math.ceil(matches.length/10));return {matches,totals,pages,page:Math.min(page,pages)};
}
