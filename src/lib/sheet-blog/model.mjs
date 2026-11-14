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
export function recommendDestination(row,topics){
 const topic=topics.find(t=>equal(t.title,row.topic)||equal(t.id,row.topic));
 if(equal(row.group,'Tri thức Hàn Quốc')&&topic)return {kind:'knowledge',category:topic.id};
 if(['Tech Blog','Engineering Blog','Engineering'].some(s=>equal(row.group,s)))return {kind:'tech',category:''};
 return {kind:'',category:topic?.id||''};
}
export function sheetsClient(token,fetcher=fetch){
 const values=async(range,stage)=>{
  const response=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+sheetId+'/values/'+encodeURIComponent("'VN'!"+range),{headers:{Authorization:'Bearer '+token},redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(response.status===401)throw Error('Phiên Google đã hết hạn. Ngắt Google và kết nối lại.');
  if(response.status===403)throw Error('Google từ chối truy cập. Kiểm tra quyền tài khoản và Google Sheets API.');
  if(!response.ok){
   let reason='';try{const result=await response.json();const code=result?.error?.status;if(typeof code==='string'&&/^[A-Z_]{1,40}$/.test(code))reason=' · '+code}catch{}
   throw Error('Google Sheets HTTP '+response.status+reason+' · '+stage+'. Kiểm tra tab VN và nhấn Tải lại.');
  }
  const result=await response.json();
  if(result.values!==undefined&&!Array.isArray(result.values))throw Error('Dữ liệu Google Sheet không hợp lệ · '+stage);
  return result.values||[];
 };
 async function list(){
  // Read only requested columns, without a metadata field mask or batchGet.
  // Open-ended A1 ranges stop at the last populated row in the values API.
  checkHeaders((await values('A1:E1','đọc tiêu đề cột'))[0]);
  const ab=await values('A2:B','đọc danh sách tiêu đề');
  if(ab.length>19999)throw Error('Tab VN vượt giới hạn 20.000 dòng.');
  if(!ab.length)return [];
  const de=await values('D2:E','đọc Group và Topic');
  return listRows(ab,de,2);
 }
 async function read(row){if(!Number.isInteger(row)||row<2||row>20000)throw Error('Dòng nguồn không hợp lệ.');return (await values('A'+row+':E'+row,'đọc bài đã chọn'))[0]||[]}
 return {list,read};
}
