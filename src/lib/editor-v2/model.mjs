// Compatibility facade: model projection is pure; UUID and hashing remain in this shell.
import {drawioPath} from './drawio-source.mjs';
import {validateMedia} from './media-validation.mjs';
import {requireValue} from './core/contracts.mjs';
import {createBlock} from './core/blocks.mjs';
import {inspectBlock,projectTextBlock,projectMediaBlock,finishDocument} from './core/document.mjs';
import {publicationInputs,planPublication} from './core/publication-plan.mjs';
export {slugify,metadata} from './core/metadata.mjs';
export {richKinds,inlineMarks,mergeRuns,inlineRuns,toggleInline,richLines} from './core/rich-text.mjs';
export {kinds} from './core/blocks.mjs';
export const newBlock=kind=>createBlock(kind,crypto.randomUUID());
export async function buildDocument(blocks){
 requireValue(Array.isArray(blocks)&&blocks.length<=250,'Tối đa 250 khối mỗi bài.');
 const nodes=[],assets=new Map();let size=0;
 for(const b of blocks){
  const info=inspectBlock(b);size+=info.text.length;
  if(b.kind==='image'||b.kind==='diagram'){
   const bytes=validateMedia(b),encoded=b.src.split(',')[1];
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
   assets.set('public/media/studio/'+digest+'.webp',encoded);
   let source;
   if(b.kind==='diagram'){source=await drawioPath(digest,b.drawioXml);assets.set(source.path,source.binary);}
   nodes.push(projectMediaBlock(b,digest,source));
  }else{
   const {node,extraSize}=projectTextBlock(b,info);size+=extraSize;if(node)nodes.push(node);
  }
 }
 return {body:finishDocument(nodes,size),assets};
}
export async function prepareV2(draft,snapshot,topicIds,now=new Date()){
 const input=publicationInputs(draft,now),document=await buildDocument(draft.blocks);
 return planPublication(draft,snapshot,topicIds,input,document);
}
