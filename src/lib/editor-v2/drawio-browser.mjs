import {blankDrawio,validateDrawioSource} from './drawio-source.mjs';
const origin='https://embed.diagrams.net';
const editorURL=origin+'/?embed=1&proto=json&spin=1&ui=kennedy&dark=0&lang=vi&noSaveBtn=1&noExitBtn=0&suppressNewWindows=1';
function browserXML(value){
 const xml=validateDrawioSource(value);
 const parsed=new DOMParser().parseFromString(xml,'application/xml');
 if(parsed.querySelector('parsererror')||!['mxfile','mxGraphModel'].includes(parsed.documentElement.localName))throw Error('Không đọc được cấu trúc file draw.io.');
 return xml;
}
async function toWebP(data){
 if(typeof data!=='string'||data.length>20_000_000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw Error('Draw.io chưa trả về ảnh PNG hợp lệ.');
 const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
 if(bytes.length<24||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw Error('Ảnh PNG không hợp lệ.');
 const view=new DataView(bytes.buffer),w=view.getUint32(16),h=view.getUint32(20);
 if(!w||!h||w>10000||h>10000||w*h>25_000_000)throw Error('Sơ đồ quá lớn. Hãy chia thành nhiều sơ đồ.');
 const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
 try{
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let src=canvas.toDataURL('image/webp',.9);if(src.length>2_000_023)src=canvas.toDataURL('image/webp',.75);
  if(!src.startsWith('data:image/webp;base64,')||src.length>2_000_023)throw Error('Không thể chuyển sơ đồ thành WebP dưới 1,5 MB.');
  return {src,width:canvas.width,height:canvas.height};
 }finally{bitmap.close()}
}
export function mountDrawio(root,{onSave}){
 const dialog=root.querySelector('[data-drawio-dialog]'),host=root.querySelector('[data-drawio-host]'),status=root.querySelector('[data-drawio-status]');
 let session=null,timer=null;
 function stop(){clearTimeout(timer);session=null;host.replaceChildren();if(dialog.open)dialog.close()}
 function setStatus(text){status.textContent=text}
 function send(s,message){s.frame.contentWindow?.postMessage(JSON.stringify(message),origin)}
 function requestTimeout(s,msg){clearTimeout(timer);timer=setTimeout(()=>{if(session===s){s.pending=null;setStatus(msg)}},30000)}
 window.addEventListener('message',async event=>{
  const s=session;if(!s||event.origin!==origin||event.source!==s.frame.contentWindow||typeof event.data!=='string'||event.data.length>21_000_000)return;
  let message;try{message=JSON.parse(event.data)}catch{return}
  if(!message||typeof message!=='object')return;
  if(message.event==='init'&&!s.initialized){
   s.initialized=true;clearTimeout(timer);send(s,{action:'load',xml:s.xml,autosave:0,title:'Editor V2 · Sơ đồ',dark:false});setStatus('Vẽ sơ đồ, sau đó nhấn Save & Exit để lưu vào bài.');
  }else if(message.event==='save'&&s.initialized&&!s.pending){
   try{
    const xml=browserXML(message.xml),key=crypto.randomUUID();s.pending={xml,key};
    setStatus('Đang xuất trang sơ đồ hiện tại và chuyển WebP…');
    send(s,{action:'export',format:'png',xml,currentPage:true,width:1600,border:12,background:'#ffffff',transparent:false,message:key});
    requestTimeout(s,'Chưa nhận được ảnh. Nhấn Save & Exit để thử lại hoặc đóng cửa sổ.');
   }catch(e){setStatus(e.message)}
  }else if(message.event==='export'&&s.pending&&!s.pending.processing){
   const p=s.pending;
   // Current official protocol echoes the export request in message; accept its key or object form.
   if(message.format!=='png'||(message.message!==p.key&&message.message?.message!==p.key))return;
   p.processing=true;clearTimeout(timer);
   try{
    const result=await toWebP(message.data);
    if(session!==s||s.pending!==p)return;
    onSave(s.block,{...result,drawioXml:p.xml});stop();
   }catch(e){if(session===s){s.pending=null;setStatus(e.message+' — thử Save & Exit lại.')}}
  }else if(message.event==='exit'&&!s.pending){
   if(!message.modified||confirm('Đóng draw.io và bỏ thay đổi chưa lưu?'))stop();
  }
 });
 root.querySelector('[data-drawio-close]').addEventListener('click',()=>{if(!session?.initialized||confirm('Đóng draw.io? Thay đổi chưa lưu sẽ bị bỏ.'))stop()});
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!session?.initialized||confirm('Đóng draw.io? Thay đổi chưa lưu sẽ bị bỏ.'))stop()});
 dialog.addEventListener('close',()=>{if(session){clearTimeout(timer);session=null;host.replaceChildren()}});
 function open(block,source=block.drawioXml||blankDrawio){
  if(session)return;
  const xml=browserXML(source),frame=document.createElement('iframe');
  frame.title='Draw.io — trình vẽ sơ đồ';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads');frame.referrerPolicy='no-referrer';
  const s={frame,block,xml,pending:null,initialized:false};session=s;setStatus('Đang kết nối draw.io…');
  frame.src=editorURL;host.replaceChildren(frame);dialog.showModal();requestTimeout(s,'Chưa kết nối được draw.io. Kiểm tra mạng hoặc đóng và thử lại.');
 }
 return {open,isOpen:()=>!!session};
}
export function downloadDrawio(xml){
 const valid=browserXML(xml),url=URL.createObjectURL(new Blob([valid],{type:'application/octet-stream'}));
 const link=document.createElement('a');link.href=url;link.download='so-do.drawio';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function importDrawio(file){
 if(!file||file.size>300000)throw Error('File draw.io tối đa 300 KB.');
 return browserXML(await file.text());
}
