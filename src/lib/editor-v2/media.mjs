// Shared canonical media contract, used by both workspaces and FIFO.
export const mediaLimits=Object.freeze({dimension:1600,bytes:1500000,sourceBytes:30000000,sourcePixels:25000000});
export const webpPrefix='data:image/webp;base64,';
export const mediaTypes=['image/png','image/jpeg','image/webp','image/gif'];
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
export function scaledDimensions(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>mediaLimits.sourcePixels)throw Error('Ảnh vượt giới hạn 25 triệu pixel.');
 const ratio=Math.min(1,mediaLimits.dimension/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
export async function optimizeMedia(file,{white=false}={}){
 if(!mediaTypes.includes(file.type)||file.size<1||file.size>mediaLimits.sourceBytes)throw Error('Chỉ nhận PNG, JPEG, WebP hoặc GIF tối đa 30 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  const {width,height}=scaledDimensions(bitmap.width,bitmap.height);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không thể tạo ảnh.');
  if(white){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}ctx.drawImage(bitmap,0,0,width,height);
  for(const quality of (white?[.9,.75,.58]:[.82,.7,.58,.45])){
   const src=canvas.toDataURL('image/webp',quality);
   try{webpBytes(src);return {src,width,height};}catch{}
  }
  throw Error('Không thể tối ưu WebP dưới hoặc bằng 1,5 MB.');
 }finally{bitmap.close();}
}
export function mediaInfo(block){
 const bytes=block.src?webpBytes(block.src).length:0;
 return {bytes,width:block.width||0,height:block.height||0,ready:bytes>0&&typeof block.alt==='string'&&!!block.alt.trim()};
}
