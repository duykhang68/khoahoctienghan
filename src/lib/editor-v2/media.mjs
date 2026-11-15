// Browser optimization shell; the shared validator below has no I/O.
import {mediaLimits,webpBytes} from './media-validation.mjs';
export {mediaLimits,webpPrefix,webpBytes,validateMedia} from './media-validation.mjs';
export const mediaTypes=['image/png','image/jpeg','image/webp','image/gif'];
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
