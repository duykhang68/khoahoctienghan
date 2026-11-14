import {inlineRuns,inlineMarks,mergeRuns,toggleInline} from './model.mjs';
const markTags={bold:'strong',italic:'em',underline:'u',strike:'s'};
export function paintRuns(host,runs){host.replaceChildren();for(const part of runs){let child=document.createTextNode(part.text);for(const mark of part.marks){const el=document.createElement(markTags[mark]);el.append(child);child=el;}host.append(child);}}
function readRuns(host){
 const parts=[];const push=(text,marks)=>{if(text)parts.push({text,marks})};
 function visit(node,marks){if(node.nodeType===3){push(node.nodeValue||'',marks);return;}if(node.nodeType!==1)return;
  const tag=node.tagName.toLowerCase();if(tag==='br'){push('\n',marks);return;}
  const active=[...marks];for(const [m,t] of Object.entries(markTags))if(tag===t||tag===(m==='bold'?'b':m==='italic'?'i':m==='strike'?'strike':t))active.push(m);
  const block=tag==='div'||tag==='p';if(block&&parts.length&&!parts.at(-1).text.endsWith('\n'))push('\n',marks);
  for(const child of node.childNodes)visit(child,active);
 }
 for(const child of host.childNodes)visit(child,[]);return mergeRuns(parts);
}
function currentRange(host){const s=getSelection();if(!s?.rangeCount)return null;const r=s.getRangeAt(0);return host.contains(r.startContainer)&&host.contains(r.endContainer)?r:null;}
function offsets(host,r){const before=document.createRange();before.selectNodeContents(host);before.setEnd(r.startContainer,r.startOffset);return [before.toString().length,before.toString().length+r.toString().length];}
function selectOffsets(host,start,end){host.focus();const walk=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);const nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);if(!nodes.length)return;
 const locate=x=>{let n=0;for(const node of nodes){if(x<=n+node.length)return [node,x-n];n+=node.length;}return [nodes.at(-1),nodes.at(-1).length];};
 const a=locate(start),z=locate(end),range=document.createRange();range.setStart(...a);range.setEnd(...z);const s=getSelection();s.removeAllRanges();s.addRange(range);
}
export function mountRich(host,toolbar,block,onChange,onError){
 host.contentEditable='true';host.setAttribute('role','textbox');host.setAttribute('aria-multiline','true');host.spellcheck=true;
 let runs=inlineRuns(block),remembered=null,composing=false;paintRuns(host,runs);
 const persist=next=>{runs=next;block.runs=next;block.text=next.map(p=>p.text).join('');block.marks=[];onChange();};
 const sync=()=>{const next=readRuns(host),text=next.map(p=>p.text).join('');if(text.length>50000||next.length>2000){paintRuns(host,runs);onError('Khối vượt giới hạn nội dung hoặc định dạng.');return;}persist(next);};
 const capture=()=>{const range=currentRange(host);if(range)remembered=offsets(host,range);};
 function apply(mark){if(composing)return;capture();const [start,end]=remembered||[0,0];if(start===end){host.focus();onError('Bôi đen phần chữ cần định dạng trước.');return;}try{const next=toggleInline(runs,start,end,mark);paintRuns(host,next);persist(next);selectOffsets(host,start,end);remembered=[start,end];}catch(e){onError(e.message);}}
 function insertPlain(text){const range=currentRange(host);if(!range)return;const [start,end]=offsets(host,range);const normalized=text.replace(/\r\n?/g,'\n');if(block.text.length-(end-start)+normalized.length>50000){onError('Khối tối đa 50.000 ký tự.');return;}range.deleteContents();const node=document.createTextNode(normalized);range.insertNode(node);range.setStartAfter(node);range.collapse(true);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);sync();capture();}
 for(const event of ['keyup','pointerup','blur','select'])host.addEventListener(event,capture);
 host.addEventListener('compositionstart',()=>{composing=true});host.addEventListener('compositionend',()=>{composing=false;sync();capture()});
 host.addEventListener('input',()=>{if(!composing){sync();capture()}});
 host.addEventListener('beforeinput',e=>{if(!composing&&['insertParagraph','insertLineBreak'].includes(e.inputType)){e.preventDefault();insertPlain('\n');}});
 host.addEventListener('paste',e=>{e.preventDefault();insertPlain(e.clipboardData?.getData('text/plain')||'')});
 host.addEventListener('drop',e=>e.preventDefault());
 host.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey){const mark={b:'bold',i:'italic',u:'underline'}[e.key.toLowerCase()];if(mark){e.preventDefault();apply(mark)}}});
 for(const mark of inlineMarks){const control=document.createElement('button');control.type='button';control.textContent={bold:'B',italic:'I',underline:'U',strike:'S'}[mark];control.dataset.mark=mark;control.setAttribute('aria-label','Định dạng '+mark+' '+host.getAttribute('aria-label'));control.addEventListener('pointerdown',e=>e.preventDefault());control.addEventListener('click',()=>apply(mark));toolbar.append(control);}
}
