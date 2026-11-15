// Public row identity only. Never include Google credentials in a submission.
export const sourceSpreadsheet='1VjRyBhkVTkTg5G8ZoLXTkEio-YbWYU5G5dLgfGjN1j4';
const text=v=>String(v??'').replace(/\r\n?/g,'\n');
export async function rowFingerprint(row){
 const snapshot=[text(row?.[1]).trim(),text(row?.[2]),text(row?.[3]).trim(),text(row?.[4]).trim()];
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot)))),b=>b.toString(16).padStart(2,'0')).join('');
}
export function validateSheetSource(source){
 if(!source||source.spreadsheet!==sourceSpreadsheet||source.tab!=='VN'||source.sheetId!==0||!Number.isInteger(source.row)||source.row<2||source.row>20000||!/^[a-f0-9]{64}$/.test(source.fingerprint||''))throw Error('Invalid Google Sheet source');
 return {spreadsheet:source.spreadsheet,tab:'VN',sheetId:0,row:source.row,fingerprint:source.fingerprint};
}
export async function sheetSource(rowNumber,row){
 return validateSheetSource({spreadsheet:sourceSpreadsheet,tab:'VN',sheetId:0,row:rowNumber,fingerprint:await rowFingerprint(row)});
}

// The reviewed source is immutable; do not silently submit a newly changed row.
export async function verifyReviewedSource(reviewed,rowNumber,fresh){
 const expected=validateSheetSource(reviewed),actual=await sheetSource(rowNumber,fresh);
 if(expected.row!==actual.row||expected.fingerprint!==actual.fingerprint||String(fresh?.[0]??'').trim())throw Error('Nội dung nguồn hoặc Content ID đã đổi. Đóng và mở lại bài để kiểm tra trước khi gửi.');
 return actual;
}
