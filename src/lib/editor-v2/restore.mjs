import {kinds,newBlock,inlineRuns} from './model.mjs';
import {validateMedia} from './media.mjs';
export function mountRestore(root){
 const input=root.querySelector('[data-restore]'),status=root.querySelector('[data-restore-status]');
 const str=(v,max)=>typeof v==='string'&&v.length<=max;
 input.addEventListener('change',async()=>{
  try{
   const file=input.files?.[0];if(!file)return;
   if(file.size>8_000_000)throw Error('Bản sao vượt 8 MB.');
   const d=JSON.parse(await file.text());
   if(!['tech','knowledge'].includes(d?.kind)||!str(d.title,180)||!str(d.summary??'',500)||!str(d.labels??'',5000)||!Array.isArray(d.blocks)||d.blocks.length>250)throw Error('Bản sao Editor V2 không hợp lệ.');
   const categories=[...root.querySelector('[data-field="category"]').options].map(o=>o.value);
   if(!categories.includes(d.category))throw Error('Chuyên mục không hợp lệ.');
   const series=d.series||{},blocks=d.blocks.map(b=>{
    if(!kinds.includes(b?.kind)||!str(b.text??'',50000))throw Error('Khối nội dung không hợp lệ.');
    const n=newBlock(b.kind);n.text=b.text??'';n.marks=Array.isArray(b.marks)?b.marks.filter(m=>['bold','italic','underline','strike'].includes(m)):[];if(b.runs!==undefined){n.runs=inlineRuns({...n,runs:b.runs});n.marks=[];}
    for(const [k,max] of [['guide',50000],['tone',40],['language',100],['alt',500],['caption',500],['drawioXml',300000]])if(b[k]!==undefined){if(!str(b[k],max))throw Error('Thuộc tính khối không hợp lệ.');n[k]=b[k];}
    if(b.kind==='table'){if(!Array.isArray(b.rows)||b.rows.length<2||b.rows.length>20||!Array.isArray(b.rows[0])||b.rows[0].length<2||b.rows[0].length>8||!b.rows.every(r=>Array.isArray(r)&&r.length===b.rows[0].length&&r.every(v=>str(v,2000))))throw Error('Bảng không hợp lệ.');n.rows=b.rows;}
    if(['image','diagram'].includes(b.kind)&&b.src){validateMedia(b,{requireAlt:false});n.src=b.src;n.width=b.width;n.height=b.height;}
    return n;
   });
   const out={kind:d.kind,title:d.title,summary:d.summary??'',category:d.category,labels:d.labels??'',series:{enabled:series.enabled===true,name:String(series.name??'').slice(0,180),part:String(series.part??1).slice(0,4),total_parts:String(series.total_parts??1).slice(0,4),target_date:String(series.target_date??'').slice(0,10)},blocks};
   if(!confirm('Thay bản nháp '+d.kind+' trong Back Office bằng bản sao này? Hãy lưu bản hiện tại trước nếu cần.'))return;
   if(!root.dispatchEvent(new CustomEvent('editor-import',{detail:out,cancelable:true})))throw Error('Editor đang bận hoặc chưa lưu được bản nháp.');
   status.textContent='Đã nhập bản nháp.';
  }catch(e){status.textContent='Không nhập được: '+String(e.message||'Lỗi dữ liệu');}finally{input.value='';}
 });
}
