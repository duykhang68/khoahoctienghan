import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const MEDIA_INDEX='src/data/editor-images.json';
export const mediaPath=p=>typeof p==='string'&&/^public\/media\/editor\/[a-f0-9]{64}\.webp$/.test(p);
export const mediaURL=p=>typeof p==='string'&&/^\/media\/editor\/[a-f0-9]{64}\.webp$/.test(p);
export function validateMedia(path,encoded){
 assert(mediaPath(path)&&typeof encoded==='string'&&encoded.length<=2_000_000,'Invalid WebP path or size');
 const bytes=Buffer.from(encoded,'base64');
 assert(bytes.toString('base64')===encoded&&bytes.length>=20&&bytes.length<=1_500_000,'Invalid WebP encoding/size');
 assert(createHash('sha256').update(bytes).digest('hex')===path.slice(-69,-5),'WebP hash mismatch');
 assert(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'&&bytes.readUInt32LE(4)+8===bytes.length,'Invalid WebP header');
 let dimensions=null,canvas=null;
 for(let i=12;i<bytes.length;){
  assert(i+8<=bytes.length,'Truncated WebP chunk');
  const tag=bytes.toString('ascii',i,i+4),size=bytes.readUInt32LE(i+4),start=i+8,end=start+size;
  assert(end+(size%2)<=bytes.length,'Truncated WebP payload');
  if(tag==='VP8X'){assert(size===10&&!(bytes[start]&2),'Animated WebP is unsupported');canvas=[1+bytes.readUIntLE(start+4,3),1+bytes.readUIntLE(start+7,3)]}
  if(tag==='VP8 '){assert(!dimensions&&size>=10&&bytes[start+3]===157&&bytes[start+4]===1&&bytes[start+5]===42,'Invalid VP8 frame');dimensions=[bytes.readUInt16LE(start+6)&0x3fff,bytes.readUInt16LE(start+8)&0x3fff]}
  if(tag==='VP8L'){assert(!dimensions&&size>=5&&bytes[start]===47,'Invalid VP8L frame');const bits=bytes.readUInt32LE(start+1);dimensions=[(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1]}
  assert(tag!=='ANIM'&&tag!=='ANMF','Animated WebP is unsupported');
  i=end+(size%2);
 }
 assert(dimensions&&dimensions.every(n=>Number.isInteger(n)&&n>=1&&n<=1600)&&(!canvas||canvas.every((n,i)=>n===dimensions[i])),'Invalid WebP dimensions');
 return {width:dimensions[0],height:dimensions[1]};
}
export function validateMediaIndex(index,posts,routes,lookup){
 assert(index&&typeof index==='object'&&!Array.isArray(index),'Invalid Knowledge image index');
 const used=new Set();
 function image(image,cover=false){
  assert(image&&mediaURL(image.src)&&typeof image.alt==='string'&&image.alt.trim()&&image.alt.length<=500&&typeof image.caption==='string'&&image.caption.length<=1000,'Invalid image metadata');
  const path='public'+image.src,actual=lookup(path);
  assert(actual&&actual.width===image.width&&actual.height===image.height,'Missing image or mismatched dimensions: '+image.src);
  if(cover)assert(image.width===1600&&image.height===900,'Cover must be 1600 × 900');
  used.add(path);
 }
 for(const [route,record] of Object.entries(index)){
  assert(routes.has('/'+(route?route+'/':''))&&record&&typeof record==='object'&&Array.isArray(record.images),'Unknown Knowledge image route');
  if(record.cover){assert(route,'Home has no article cover');image(record.cover,true)}
  record.images.forEach(x=>image(x));
 }
 for(const post of posts){
  if(mediaURL(post.cover)){const actual=lookup('public'+post.cover);image({src:post.cover,alt:post.coverAlt,caption:post.coverCaption??'',width:actual?.width,height:actual?.height},true)}
  for(const section of post.sections)if(section.images!==undefined){assert(Array.isArray(section.images),'Invalid section image list');section.images.forEach(x=>image(x))}
 }
 return used;
}
