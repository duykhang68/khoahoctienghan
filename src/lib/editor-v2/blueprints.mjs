import {SERIES_BLUEPRINTS} from './blueprints-data.mjs';
import {newBlock} from './model.mjs';
export {SERIES_BLUEPRINTS};
const headings={2:'heading',3:'subheading',4:'detailheading'};
const plain=s=>s.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/^\*([^*]+)\*$/,'$1');
export function blueprintParts(id){
 const template=SERIES_BLUEPRINTS.find(t=>t.id===id);
 if(!template)return [];
 return template.markdown.trim().split(/\n\s*\n/).map(chunk=>{
  const heading=/^(#{2,4}) (.+)$/.exec(chunk);
  if(heading)return {kind:headings[heading[1].length],text:heading[2]};
  const lines=chunk.split('\n');
  if(lines.every(line=>/^- /.test(line)))return {kind:'bullet',guide:lines.map(l=>plain(l.slice(2))).join('\n')};
  if(lines.every(line=>/^\d+\. /.test(line)))return {kind:'ordered',guide:lines.map(l=>plain(l.replace(/^\d+\. /,''))).join('\n')};
  if(chunk.startsWith('**CẢNH BÁO SPOILER'))return {kind:'note',tone:'warning',guide:plain(chunk)};
  if(chunk.startsWith('*Lưu ý biên tập:'))return {kind:'note',tone:'tip',guide:plain(chunk)};
  return {kind:'paragraph',guide:plain(chunk)};
 });
}
export function instantiateBlueprint(id){return blueprintParts(id).map(part=>({...newBlock(part.kind),...part}))}
