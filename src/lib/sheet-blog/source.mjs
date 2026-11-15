// Digest is an effect; row identity and comparisons are pure.
import {sourceSpreadsheet,validateSheetSource,fingerprintInput,validateReviewedSource} from './core/source-policy.mjs';
export {sourceSpreadsheet,validateSheetSource} from './core/source-policy.mjs';
export async function rowFingerprint(row){
 const snapshot=fingerprintInput(row);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot)))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function sheetSource(rowNumber,row){
 return validateSheetSource({spreadsheet:sourceSpreadsheet,tab:'VN',sheetId:0,row:rowNumber,fingerprint:await rowFingerprint(row)});
}

// The reviewed source is immutable; do not silently submit a newly changed row.
export async function verifyReviewedSource(reviewed,rowNumber,fresh){
 const expected=validateSheetSource(reviewed),actual=await sheetSource(rowNumber,fresh);
 return validateReviewedSource(expected,actual,fresh);
}
