// Shared canonical media contract, used by both workspaces and FIFO.
export const mediaLimits=Object.freeze({dimension:1600,bytes:1500000,sourceBytes:30000000,sourcePixels:25000000});
export const webpPrefix='data:image/webp;base64,';
export function webpBytes(src){
 if(typeof src!=='string'||src.length>webpPrefix.length+4*Math.ceil(mediaLimits.bytes/3)||!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(src))throw Error('Ảnh cần WebP dưới hoặc bằng 1,5 MB.');
 const bytes=Uint8Array.from(atob(src.slice(webpPrefix.length)),c=>c.charCodeAt(0));
 if(bytes.length>mediaLimits.bytes||String.fromCharCode(...bytes.slice(0,4))!=='RIFF'||String.fromCharCode(...bytes.slice(8,12))!=='WEBP')throw Error('Ảnh không phải WebP.');
 return bytes;
}
export function validateMedia(block,{requireAlt=true}={}){
 if(![block.width,block.height].every(n=>Number.isInteger(n)&&n>0&&n<=mediaLimits.dimension))throw Error('Ảnh phải có kích thước hợp lệ, tối đa 1600 px.');
 if(requireAlt&&(typeof block.alt!=='string'||!block.alt.trim()||block.alt.length>500||/[\u0000-\u001f\u007f]/u.test(block.alt)))throw Error('Ảnh cần mô tả alt hợp lệ.');
 return webpBytes(block.src);
}
