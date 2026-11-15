import {requireValue} from './contracts.mjs';
import {inlineRuns} from './rich-text.mjs';
import {setFront} from './revision-parser.mjs';
import {docText as walk} from './document.mjs';
const json=v=>JSON.stringify(v,null,2)+'\n';
export function revisionInputs(edited,original,fixed){
  requireValue(edited.kind===original.kind&&edited.category===original.category,'Không được đổi đích bài cũ.');
  const title=edited.title.trim(),summary=edited.summary.trim();requireValue(title&&title.length<=180&&summary.length<=500&&!/[\u0000-\u001f\u007f]/.test(title+summary),'Tiêu đề hoặc mô tả không hợp lệ.');
  if(fixed){requireValue(edited.blocks.length===original.blocks.length&&edited.blocks.every((b,i)=>b.kind===original.blocks[i].kind&&b.id===original.blocks[i].id&&b.text.trim()&&b.text.length<=50000&&inlineRuns(b).every(x=>!x.marks.length)),'Bài cũ chỉ được sửa chữ trong bố cục gốc.');}
 return {title,summary};
}
export function planRevision({edited,row,state,route,fixed,title,summary,body,assets}){
  const files=[],write=(path,value)=>files.push({path,mode:'100644',type:'blob',content:value});
  if(row.kind==='tech'){
   const posts=structuredClone(state.posts),post=posts.find(x=>x.slug===row.slug);post.title=title;post.summary=summary;
   if(fixed){let i=0;for(const sec of post.sections){sec.heading=edited.blocks[i++].text;sec.paragraphs=sec.paragraphs.map(()=>edited.blocks[i++].text)}}
   else{post.studioBody=body;post.sections=[{heading:'Nội dung',paragraphs:[walk(body)]}]}
   write(row.path,json(posts));
  }else{
   const documents=structuredClone(state.documents);documents[state.id]=body;
   const suffix='](/khoahoctienghan/'+route+'/)',label=title.replace(/[\\[\]<>*_\x60{}&]/g,c=>'&#'+c.charCodeAt(0)+';');let matches=0;
   const index=state.index.split('\n').map(line=>{if(!line.trimEnd().endsWith(suffix))return line;requireValue(/^\s*-\s+\[/.test(line),'Liên kết chuyên mục không hỗ trợ.');matches++;return '- ['+label+suffix}).join('\n');
   requireValue(matches===1,'Cần đúng một liên kết chuyên mục.');
   write(row.path,setFront(setFront(state.source,'title',title),'description',summary));write(state.indexPath,index);write('src/data/studio-documents.json',json(documents));
  }
  return {files,assets};
}
