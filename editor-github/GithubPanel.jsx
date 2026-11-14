import React,{createContext,useContext,useEffect,useState} from 'react';
const Context=createContext(null);
const route='/api/github-editor/session';
const topics=[['ngon-ngu','Ngôn ngữ'],['lich-su','Lịch sử'],['van-hoa','Văn hóa'],['am-thuc','Ẩm thực'],['dia-ly-du-lich','Địa lý và du lịch'],['kinh-te-cong-nghe','Kinh tế và công nghệ'],['giao-duc-du-hoc','Giáo dục và du học'],['hallyu','Hallyu'],['doi-song','Đời sống'],['the-che','Thể chế']];
async function request(path,options){const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});const result=await res.json();if(!res.ok)throw Error(result.error||'GitHub API HTTP '+res.status);return result}
export function GithubProvider({children}){
 const [session,setSession]=useState(null),[working,setWorking]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;request(route).then(v=>{if(active)setSession(v)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 async function connection(method){if(working)return;setWorking(true);setError('');try{const s=session||await request(route);setSession(await request(route,{method,headers:{'X-Editor-Nonce':s.nonce}}))}catch(e){setError(e.message)}finally{setWorking(false)}}
 return <Context.Provider value={{session,working,error,connection}}>{children}</Context.Provider>
}
export function GithubHeader(){
 const {session,working,error,connection}=useContext(Context);
 return <div className="top-actions"><span className={'conn '+(session?.connected?'online':'')}>{session?.connected?'● GitHub · '+session.login:'○ GitHub chưa kết nối'}</span><button className={session?.connected?'quiet':'primary'} disabled={working} onClick={()=>connection(session?.connected?'DELETE':'POST')}>{working?'Đang kiểm tra…':session?.connected?'Ngắt GitHub':'Kết nối GitHub'}</button>{error&&<small role="alert">{error}</small>}</div>
}
export function GithubPublish({title,labels,series,editor,mode,busy}){
 const {session}=useContext(Context),[kind,setKind]=useState('knowledge'),[category,setCategory]=useState('ngon-ngu'),[summary,setSummary]=useState(''),[confirmed,setConfirmed]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null);
 async function submit(){
  if(!session?.connected||!confirmed||sending||busy||!editor)return;
  setSending(true);setError('');setResult(null);
  try{
   if(mode!=='compose')throw Error('Quay về Soạn thảo để dùng nội dung TipTap hiện tại.');
   const draft={kind,category,title,summary,labels,series:series.enabled?{...series,part:Number(series.part),total_parts:Number(series.total_parts)}:null,body:editor.getJSON()};
   const value=await request('/api/github-editor/draft',{method:'POST',headers:{'Content-Type':'application/json','X-Editor-Nonce':session.nonce},body:JSON.stringify({confirm:true,draft})});setResult(value);setConfirmed(false);
  }catch(e){setError(e.message)}finally{setSending(false)}
 }
 return <section className="kit-panel kit-publish-panel" aria-label="GitHub Publishing"><div className="kit-panel-heading"><span className="kit-heading-mark">↗</span><div><h2>GitHub · Tri thức Hàn Quốc</h2><p>Xuất bản riêng, không dùng Cashflow hoặc Blogger.</p></div></div><div className="kit-panel-body" style={{display:'grid',gap:10}}>
 <p style={{overflowWrap:'anywhere'}}>duykhang68/khoahoctienghan</p>
 <label>Không gian<select style={{width:'100%'}} value={kind} onChange={e=>{setKind(e.target.value);setConfirmed(false)}}><option value="knowledge">Knowledge Base</option><option value="tech">Tech Blog</option></select></label>
 {kind==='knowledge'&&<label>Chuyên mục<select style={{width:'100%'}} value={category} onChange={e=>{setCategory(e.target.value);setConfirmed(false)}}>{topics.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
 <label>Mô tả ngắn<textarea style={{width:'100%'}} maxLength={500} rows={2} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
 {!session?.connected&&<p>Chạy <code>gh auth login</code> trên MacBook nếu cần, sau đó nhấn Kết nối GitHub ở đầu trang.</p>}
 <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Tôi xác nhận nội dung sẽ được gửi lên repository công khai.</label>
 <button className="save full" disabled={!session?.connected||!confirmed||sending||busy||!title.trim()||mode!=='compose'} onClick={submit}>{sending?'Đang tạo Draft PR…':'Gửi bài mới → Draft PR'}</button>
 {error&&<p role="alert">{error}</p>}{result&&<p role="status"><a target="_blank" rel="noreferrer" href={result.url}>Draft PR #{result.number}</a> · chưa xuất bản</p>}
 <small>Chỉ bài mới ở bản tích hợp này. Kiểm tra PR trước khi xuất bản. Nhãn và Series được lưu cùng bài viết. Ảnh URL chưa được adapter hỗ trợ; dữ liệu không hợp lệ sẽ bị chặn. Blogger/Drive bên dưới vẫn là dịch vụ riêng.</small></div></section>
}
