// Functional core: one set of rules for server and browser. No I/O or DOM.
export function createCourseModel(){
 const levels=Object.freeze(['beginner','intermediate','advanced','all']);
 const statuses=Object.freeze(['draft','ready','archived']);
 const labels=Object.freeze({beginner:'Sơ cấp',intermediate:'Trung cấp',advanced:'Cao cấp',all:'Mọi trình độ',draft:'Bản nháp',ready:'Sẵn sàng',archived:'Lưu trữ'});
 const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d');
 const slug=title=>normalize(title).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100).replace(/-+$/g,'');
 function errors(input){
  const e={};if(typeof input.title!=='string'||!input.title.trim()||input.title.trim().length>200)e.title='Nhập tên khóa học từ 1 đến 200 ký tự.';
  if(typeof input.slug!=='string'||input.slug.trim().length>100||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim()))e.slug='Dùng chữ thường a–z, chữ số và dấu gạch ngang; tối đa 100 ký tự.';
  if(typeof input.description==='string'&&input.description.trim().length>4000)e.description='Mô tả tối đa 4.000 ký tự.';
  if(!levels.includes(input.level))e.level='Chọn trình độ hợp lệ.';
  return e;
 }
 function validate(input){
  const data={title:typeof input.title==='string'?input.title.trim():'',description:typeof input.description==='string'?input.description.trim():'',slug:typeof input.slug==='string'?input.slug.trim():'',level:input.level};
  if(Object.keys(errors(data)).length)throw Error('INVALID_COURSE');return data;
 }
 function statistics(row){if(!row||!['total','drafts','ready','archived'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0)||row.total!==row.drafts+row.ready+row.archived)return null;return {total:row.total,drafts:row.drafts,ready:row.ready,archived:row.archived};}
 function actions(row){if(!row||!statuses.includes(row.status))return [];return row.status==='draft'?['edit','curriculum','preview','publishing','archive']:['preview','publishing'];}
 function day(ms){return Number.isSafeInteger(ms)&&ms>=0&&ms<=8640000000000000-25200000?new Date(ms+25200000).toISOString().slice(0,10):'';}
 function filter(rows,state){
  const q=normalize(state.query).trim();return rows.filter(c=>{
   const d=day(c.updated_at);return (!q||normalize(c.title+' '+c.slug+' '+c.description).includes(q))&&(!state.status||state.status==='all'||c.status===state.status)&&(!state.level||state.level==='all'||c.level===(state.level==='all-level'?'all':state.level))&&(!state.from||!!d&&d>=state.from)&&(!state.to||!!d&&d<=state.to);
  });
 }
 function sort(rows,key){const cmp=(a,b)=>a.id.localeCompare(b.id);return [...rows].sort((a,b)=>key==='title'?a.title.localeCompare(b.title,'vi')||cmp(a,b):key==='oldest'?a.updated_at-b.updated_at||cmp(a,b):b.updated_at-a.updated_at||cmp(a,b));}
 function initial(){return {query:'',status:'all',level:'all',from:'',to:'',sort:'recent',view:'table',page:1,selected:null};}
 function transition(state,patch){return {...state,...patch,...(Object.keys(patch).some(k=>['query','status','level','from','to','sort'].includes(k))?{page:1}:{})};}
 function select(rows,state,size=20){const filtered=sort(filter(rows,state),state.sort),pages=Math.max(1,Math.ceil(filtered.length/size)),page=Math.min(Math.max(1,state.page),pages);return {filtered,visible:filtered.slice((page-1)*size,page*size),pages,page};}
 function snapshotOk(s){return s&&statistics(s.stats)&&Array.isArray(s.rows)&&s.rows.length<=100&&Number.isSafeInteger(s.loadedAt)&&s.rows.every(c=>c&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(c.id)&&typeof c.title==='string'&&typeof c.slug==='string'&&typeof c.description==='string'&&levels.includes(c.level)&&statuses.includes(c.status)&&Number.isSafeInteger(c.version)&&c.version>=1&&Number.isSafeInteger(c.updated_at)&&c.updated_at>=0);}
 return Object.freeze({levels,statuses,labels,normalize,slug,errors,validate,statistics,actions,day,filter,sort,initial,transition,select,snapshotOk});
}
const model=createCourseModel();
export const courseLevels=model.levels,courseLabels=model.labels,courseSlug=model.slug,validateCourseInput=model.validate;
