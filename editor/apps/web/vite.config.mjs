import {defineConfig} from 'vite';
import {createDraftPR} from './studio-github.mjs';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,readdirSync} from 'node:fs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const nonce=randomBytes(24).toString('hex');let publishing=false;
function library(){
 const posts=JSON.parse(readFileSync(resolve(root,'src/data/techblog/posts.json'),'utf8')).map(p=>({kind:'tech',title:p.title,summary:p.summary,route:'techblog/'+p.slug+'/',sections:p.sections}));
 const folder=resolve(root,'src/content/docs');
 const knowledge=readdirSync(folder,{recursive:true}).filter(p=>/\.mdx?$/.test(p)).map(path=>{const body=readFileSync(resolve(folder,path),'utf8');const title=/^title:\s*(.+)$/m.exec(body)?.[1]?.replace(/^["']|["']$/g,'')||path;const route=path.replace(/\.mdx?$/,'').replace(/(^|\/)index$/,'$1').replace(/\/$/,'');return {kind:'knowledge',title,route:route?route+'/':'',body:body.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/,'')};});
 return [...posts,...knowledge];
}
export default defineConfig({server:{host:'127.0.0.1',port:4317,strictPort:true,fs:{allow:[root]}},plugins:[{name:'checkout-library',configureServer(server){server.middlewares.use('/api/studio',async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 const allowed=req.headers.host==='127.0.0.1:4317'&&(!req.headers.origin||req.headers.origin==='http://127.0.0.1:4317');
 if(!allowed){res.statusCode=403;return res.end('{}')}
 if(req.method==='GET')return res.end(JSON.stringify({nonce}));
 if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:4317'||req.headers['x-studio-nonce']!==nonce||!/^application\/json\b/.test(req.headers['content-type']||'')||publishing){res.statusCode=403;return res.end(JSON.stringify({error:'Request not authorized'}))}
 publishing=true;
 try{let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>12_000_000)throw Error('Bản nháp quá lớn');chunks.push(chunk)}const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(payload.confirm!==true)throw Error('Cần xác nhận gửi Draft PR');res.end(JSON.stringify(await createDraftPR(payload.draft)))}catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}))}finally{publishing=false}
 });server.middlewares.use('/api/library',(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');if(req.method!=='GET'||req.headers.host!=='127.0.0.1:4317'||(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:4317')){res.statusCode=403;return res.end('{}')}try{res.end(JSON.stringify(library()))}catch{res.statusCode=500;res.end(JSON.stringify({error:'Không đọc được nội dung checkout'}))}})}}]});
