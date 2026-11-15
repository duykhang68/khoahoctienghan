// Row identity only; no credential or network dependency.
import {sheetId as sourceSpreadsheet} from './contracts.mjs';
export {sourceSpreadsheet};
const text=v=>String(v??'').replace(/\r\n?/g,'\n');
export function fingerprintInput(row){return [text(row?.[1]).trim(),text(row?.[2]),text(row?.[3]).trim(),text(row?.[4]).trim()];}
export function validateSheetSource(source){
 if(!source||source.spreadsheet!==sourceSpreadsheet||source.tab!=='VN'||source.sheetId!==0||!Number.isInteger(source.row)||source.row<2||source.row>20000||!/^[a-f0-9]{64}$/.test(source.fingerprint||''))throw Error('Invalid Google Sheet source');
 return {spreadsheet:source.spreadsheet,tab:'VN',sheetId:0,row:source.row,fingerprint:source.fingerprint};
}

export function validateReviewedSource(expected,actual,fresh){
 if(expected.row!==actual.row||expected.fingerprint!==actual.fingerprint||String(fresh?.[0]??'').trim())throw Error('Nội dung nguồn hoặc Content ID đã đổi. Đóng và mở lại bài để kiểm tra trước khi gửi.');
 return actual;
}
