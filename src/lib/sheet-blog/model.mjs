import {slugify} from '../editor-v2/model.mjs';
export const sheetId='1VjRyBhkVTkTg5G8ZoLXTkEio-YbWYU5G5dLgfGjN1j4';
export const scope='https://www.googleapis.com/auth/spreadsheets.readonly';
const clean=v=>String(v??'').trim();
const equal=(a,b)=>clean(a).normalize('NFC').toLocaleLowerCase('vi')===clean(b).normalize('NFC').toLocaleLowerCase('vi');
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
export function recommendDestination(row,topics){
 const topic=topics.find(t=>equal(t.title,row.topic)||equal(t.id,row.topic));
 if(equal(row.group,'Tri thức Hàn Quốc')&&topic)return {kind:'knowledge',category:topic.id};
 if(['Tech Blog','Engineering Blog','Engineering'].some(s=>equal(row.group,s)))return {kind:'tech',category:''};
 return {kind:'',category:topic?.id||''};
}
export function sheetsClient(token,fetcher=fetch){
 const get=async(suffix)=>{
  const response=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+sheetId+suffix,{headers:{Authorization:'Bearer '+token},redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(response.status===401)throw Error('Phiên Google đã hết hạn. Kết nối lại.');
  if(response.status===403)throw Error('Google từ chối truy cập. Kiểm tra quyền tài khoản và Google Sheets API.');
  if(!response.ok)throw Error('Google Sheets HTTP '+response.status);
  return response.json();
 };
 const values=range=>get('/values/'+encodeURIComponent(range)+'?valueRenderOption=FORMATTED_VALUE');
 async function list(){
  checkHeaders((await values('VN!A1:E1')).values?.[0]);
  const meta=await get('?fields='+encodeURIComponent('sheets(properties(title,gridProperties(rowCount))'));
  const count=meta.sheets?.find(s=>s.properties?.title==='VN')?.properties?.gridProperties?.rowCount;
  if(!Number.isInteger(count)||count<1||count>20000)throw Error('Không xác định được phạm vi tab VN hoặc tab vượt giới hạn 20.000 dòng.');
  const rows=[];
  for(let start=2;start<=count;start+=1000){
   const end=Math.min(start+999,count);
   const params=new URLSearchParams();params.append('ranges','VN!A'+start+':B'+end);params.append('ranges','VN!D'+start+':E'+end);
   const res=await get('/values:batchGet?'+params);
   rows.push(...listRows(res.valueRanges?.[0]?.values,res.valueRanges?.[1]?.values,start));
  }
  return rows;
 }
 async function read(row){if(!Number.isInteger(row)||row<2||row>20000)throw Error('Dòng nguồn không hợp lệ.');return (await values('VN!A'+row+':E'+row)).values?.[0]||[]}
 return {list,read};
}
