import {sheetId} from './core/contracts.mjs';
import {checkHeaders,listRows,validRowNumber} from './core/sheet-rows.mjs';
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
 async function read(row){if(!validRowNumber(row))throw Error('Dòng nguồn không hợp lệ.');return (await values('A'+row+':E'+row,'đọc bài đã chọn'))[0]||[]}
 return {list,read};
}
