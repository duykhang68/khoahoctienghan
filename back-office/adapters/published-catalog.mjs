// Snapshot counts are based on the published Pages SHA, not a mutable main checkout.
export async function dashboardSnapshot(fetcher=fetch){
 const {sha,rows}=await librarySnapshot(fetcher);
 return {sha,tech:rows.filter(row=>row.kind==='tech').length,knowledge:rows.filter(row=>row.kind==='knowledge').length};
}
// Read published metadata from fixed repository and exact Pages release; no private credentials.
// Published catalog and SHA are one atomic public artifact. No unauthenticated GitHub API fan-out.
export async function librarySnapshot(fetcher=fetch){
 const res=await fetcher('https://duykhang68.github.io/khoahoctienghan/release-sha.json',{redirect:'manual',headers:{Accept:'application/json','User-Agent':'Korean-Backoffice-Library','Cache-Control':'no-cache'},signal:AbortSignal.timeout(12000)});
 if(res.status!==200)throw Error('RELEASE_HTTP_'+res.status);
 const release=await res.json(),sha=release?.sha,rows=release?.library;
 if(typeof sha!=='string'||!/^[a-f0-9]{40}$/.test(sha)||release.libraryVersion!==1||!Array.isArray(rows))throw Error('RELEASE_CATALOG_INVALID');
 const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/,seen=new Set();
 for(const row of rows){
  if(!row||typeof row.slug!=='string'||!slug.test(row.slug)||typeof row.category!=='string'||!slug.test(row.category)||typeof row.title!=='string'||!row.title.trim()||typeof row.summary!=='string'||typeof row.date!=='string')throw Error('RELEASE_ROW_INVALID');
  if(row.kind==='tech'){if(row.category!=='techblog'||row.path!=='src/data/techblog/posts.json')throw Error('RELEASE_ROW_INVALID');}
  else if(row.kind==='knowledge'){if(row.category==='techblog'||row.slug==='index'||!['md','mdx'].some(ext=>row.path==='src/content/docs/'+row.category+'/'+row.slug+'.'+ext))throw Error('RELEASE_ROW_INVALID');}
  else throw Error('RELEASE_ROW_INVALID');
  const key=row.category+'/'+row.slug;if(seen.has(key))throw Error('RELEASE_ROW_DUPLICATE');seen.add(key);
 }
 return {sha,rows};
}

const categoryLabels={"ngon-ngu":"Ngôn ngữ Hàn Quốc","lich-su":"Lịch sử Hàn Quốc","van-hoa":"Văn hóa và xã hội","am-thuc":"Ẩm thực","dia-ly-du-lich":"Địa lý và du lịch","kinh-te-cong-nghe":"Kinh tế và công nghệ","giao-duc-du-hoc":"Giáo dục và du học","hallyu":"Giải trí và Hallyu","doi-song":"Đời sống tại Hàn Quốc","the-che":"Chính trị và thể chế"};
export async function categorySnapshot(fetcher=fetch){
 const get=async url=>{const res=await fetcher(url,{redirect:'manual',headers:{'User-Agent':'Korean-Backoffice-Categories','Cache-Control':'no-cache'},signal:AbortSignal.timeout(12000)});if(res.status!==200)throw Error('upstream');return res.json();};
 const release=await get('https://duykhang68.github.io/khoahoctienghan/release-sha.json');
 const sha=release?.sha;if(typeof sha!=='string'||! /^[a-f0-9]{40}$/.test(sha))throw Error('invalid release');
 const order=await get('https://raw.githubusercontent.com/duykhang68/khoahoctienghan/'+sha+'/src/data/knowledge-navigation.json');
 const ids=Object.keys(categoryLabels);
 if(!Array.isArray(order)||order.length!==ids.length||new Set(order).size!==ids.length||!order.every(id=>typeof id==='string'&&Object.hasOwn(categoryLabels,id)))throw Error('invalid permutation');
 return {sha,rows:order.map(id=>({id,title:categoryLabels[id]}))};
}

