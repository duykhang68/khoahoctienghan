export function courseSlug(title){
 return String(title??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100).replace(/-+$/g,'');
}
