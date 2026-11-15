import assert from 'node:assert/strict';
export function webpDimensions(bytes){
 assert(Buffer.isBuffer(bytes)&&bytes.length>=20&&bytes.length<=1_500_000&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'&&bytes.readUInt32LE(4)+8===bytes.length,'Invalid WebP');
 let frame=null,canvas=null;
 for(let i=12;i<bytes.length;){assert(i+8<=bytes.length,'Invalid WebP chunk');const kind=bytes.toString('ascii',i,i+4),size=bytes.readUInt32LE(i+4),start=i+8,end=start+size;assert(end+(size%2)<=bytes.length,'Truncated WebP');assert(!['ANIM','ANMF'].includes(kind),'Animated WebP not supported');
  if(kind==='VP8X'){assert(size===10&&!(bytes[start]&2),'Invalid VP8X');canvas=[1+bytes.readUIntLE(start+4,3),1+bytes.readUIntLE(start+7,3)]}
  if(kind==='VP8 '){assert(!frame&&size>=10&&bytes[start+3]===157&&bytes[start+4]===1&&bytes[start+5]===42,'Invalid VP8 frame');frame=[bytes.readUInt16LE(start+6)&0x3fff,bytes.readUInt16LE(start+8)&0x3fff]}
  if(kind==='VP8L'){assert(!frame&&size>=5&&bytes[start]===47,'Invalid VP8L frame');const bits=bytes.readUInt32LE(start+1);frame=[(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1]}
  i=end+(size%2);
 }
 assert(frame&&frame.every(n=>n>=1&&n<=1600)&&(!canvas||canvas.every((n,i)=>n===frame[i])),'Invalid image dimensions');return frame;
}
