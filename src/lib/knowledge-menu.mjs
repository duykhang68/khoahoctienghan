import assert from 'node:assert/strict';
export const validInternal=link=>typeof link==='string'&&/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/.test(link)&&!link.startsWith('/khoahoctienghan/');
export function validateMenu(menu,routes){
 assert(Array.isArray(menu)&&menu.length>0&&menu.length<=80,'Menu phải có 1–80 mục');
 const targets=new Set();
 function visit(entries,depth){
  for(const e of entries){
   assert(e&&typeof e.label==='string'&&e.label.trim()&&e.label.length<=120,'Tên menu không hợp lệ');
   if(Object.hasOwn(e,'items')){
    assert(depth===0&&Array.isArray(e.items)&&e.items.length>0&&e.items.length<=100&&!Object.hasOwn(e,'link'),'Nhóm menu cần danh sách liên kết');
    assert(Object.keys(e).every(k=>['label','items'].includes(k)),'Thuộc tính nhóm không hợp lệ');
    visit(e.items,1);continue;
   }
   assert(Object.keys(e).every(k=>['label','link'].includes(k))&&validInternal(e.link),'URL nội bộ phải bắt đầu và kết thúc bằng /, không chứa base dự án');
   if(routes)assert(routes.has(e.link),'Không tìm thấy trang: '+e.link);
   targets.add(e.link);
  }
 }
 visit(menu,0);
 assert(targets.has('/')&&targets.has('/techblog/'),'Phải giữ lối về trang chủ và Tech Blog');
 return menu;
}
export function routesFromPaths(paths,posts=[]){
 const routes=new Set(['/techblog/']);
 for(const p of paths)if(/^src\/content\/docs\/.+\.mdx?$/.test(p)){
  const slug=p.slice('src/content/docs/'.length).replace(/\.mdx?$/,'').replace(/(^|\/)index$/,'$1').replace(/\/$/,'');
  routes.add(slug?'/'+slug+'/':'/');
 }
 for(const p of posts)if(typeof p.slug==='string'&&/^[a-z0-9-]+$/.test(p.slug))routes.add('/techblog/'+p.slug+'/');
 return routes;
}
