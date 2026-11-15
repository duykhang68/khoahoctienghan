import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {documentProjection,imageReferences,assertImageEvidence} from '../../core/editorial/document-schema.mjs';
import {webpDimensions} from '../../core/editorial/webp.mjs';
export {mediaPattern,slugPattern,documentText} from '../../core/editorial/document-schema.mjs';
export {webpDimensions} from '../../core/editorial/webp.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function normalizeDocument(input,{assets=null}={}){
 const projection=documentProjection(input,{allowEmbedded:Boolean(assets)});
 let step=projection.next();
 while(!step.done){
  const encoded=step.value.source.slice('data:image/webp;base64,'.length);
  assert(encoded.length<=2_000_000,'WebP too large');
  const bytes=Buffer.from(encoded,'base64');
  assert(bytes.toString('base64')===encoded,'Invalid image encoding');
  const [width,height]=webpDimensions(bytes),src='/media/studio/'+hash(bytes)+'.webp';
  assets.set('public'+src,bytes);step=projection.next({src,width,height});
 }
 return step.value;
}
export function assertImageFiles(doc,lookup){
 for(const attrs of imageReferences(doc)){
  const bytes=lookup('public'+attrs.src),[w,h]=webpDimensions(bytes);
  // Match original failure ordering: check dimensions before hashing.
  assert(w===attrs.width&&h===attrs.height,'Image dimensions mismatch');
  assertImageEvidence(attrs,w,h,hash(bytes));
 }
}
