import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,readdirSync} from 'node:fs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
function library(){
 const posts=JSON.parse(readFileSync(resolve(root,'src/data/techblog/posts.json'),'utf8')).map(p=>({kind:'tech',title:p.title,summary:p.summary,route:'techblog/'+p.slug+'/',sections:p.sections}));
 const folder=resolve(root,'src/content/docs');
 const knowledge=readdirSync(folder,{recursive:true}).filter(p=>/\.mdx?$/.test(p)).map(path=>{const body=readFileSync(resolve(folder,path),'utf8');const title=/^title:\s*(.+)$/m.exec(body)?.[1]?.replace(/^["']|["']$/g,'')||path;const route=path.replace(/\.mdx?$/,'').replace(/(^|\/)index$/,'$1').replace(/\/$/,'');return {kind:'knowledge',title,route:route?route+'/':'',body:body.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/,'')};});
 return [...posts,...knowledge];
}
export default defineConfig({server:{host:'127.0.0.1',port:4317,strictPort:true,fs:{allow:[root]}},plugins:[{name:'checkout-library',configureServer(server){server.middlewares.use('/api/library',(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');if(req.method!=='GET'||req.headers.host!=='127.0.0.1:4317'||(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:4317')){res.statusCode=403;return res.end('{}')}try{res.end(JSON.stringify(library()))}catch{res.statusCode=500;res.end(JSON.stringify({error:'Không đọc được nội dung checkout'}))}})}}]});
