/** Pure policy: signature, cookie parsing and clocks stay in the shell. */
export function isAllowedEmail(email,adminEmails){
 return typeof email==='string'&&adminEmails.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
export function isCurrentSessionPayload(data,kind,origin,nowSeconds){
 return data.kind===kind&&Number.isSafeInteger(data.exp)&&data.exp>nowSeconds&&data.origin===origin;
}
