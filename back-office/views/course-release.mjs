import {courseEscape,courseLabels} from '../course/common.mjs';
import {releaseChecks} from '../course/validation.mjs';
import {buildCoursePreviewModel} from '../../core/course/preview-model.mjs';

function releasePage(state){
 const {row,release}=state,esc=courseEscape,checks=releaseChecks(row),ready=checks.every(x=>x[1]);
 const history=release?'<p>Phiên bản bất biến '+esc(release.version)+' · Lần duyệt '+esc(release.revision)+' · '+esc(new Date(release.approved_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))+' (GMT+7)</p>':'<p>Chưa có phiên bản đã duyệt.</p>';
 return '<style>main{max-width:900px}.release-card{background:#eee8fc;border-radius:16px;padding:20px;margin:16px 0}.release-card li{padding:8px;overflow-wrap:anywhere}.release-card button{min-height:44px;margin-top:16px}.release-card label{display:block}.release-card input{margin:8px}</style><nav><a href="/admin/courses/manage/">← Quản lý khóa học</a></nav><p>P2.8 · DRAFT &amp; PUBLISHING</p><h1>'+esc(row.title)+'</h1><p>Trạng thái: '+esc(courseLabels[row.status])+' · Chỉ phát hành nội bộ, chưa mở bán.</p><section class="release-card"><h2>Kiểm tra sẵn sàng</h2><ul>'+checks.map(([label,ok])=>'<li>'+(ok?'✓ Đạt: ':'✕ Chưa đạt: ')+esc(label)+'</li>').join('')+'</ul><p>Video/audio Drive chưa được đóng băng theo phiên bản; khóa học có liên kết media chưa thể duyệt.</p>'+(row.status==='draft'&&ready&&!release?'<form method="post"><input type="hidden" name="revision" value="'+esc(row.revision)+'"><input type="hidden" name="version" value="'+esc(row.version)+'"><label><input type="checkbox" name="confirm" value="yes" required> Tôi xác nhận nội dung đã lưu và phê duyệt phiên bản riêng tư bất biến.</label><button>Phê duyệt nội bộ</button></form>':'<p>Không thể phê duyệt thêm ở trạng thái hiện tại.</p>')+'</section><section class="release-card"><h2>Lịch sử phiên bản</h2>'+history+'</section>';
}
// P2.7: owner-only, read-only preview. Never serialize answer keys.
export function coursePreviewPage(curr,selected,blocks){
 const esc=courseEscape,base='/admin/courses/'+esc(curr.id)+'/preview/';
 const {entries,pos}=buildCoursePreviewModel(curr,selected);
 const link=l=>base+esc(l.id)+'/';
 const render=b=>{
  if(b.kind==='image')return '<figure><img loading="lazy" src="'+esc(b.src)+'" width="'+b.width+'" height="'+b.height+'" alt="'+esc(b.alt)+'"></figure>';
  if(b.kind==='divider')return '<hr>';
  const t=esc(b.text);
  if(b.kind==='heading')return '<h2>'+t+'</h2>';
  if(b.kind==='subheading')return '<h3>'+t+'</h3>';
  if(b.kind==='quote')return '<blockquote>'+t+'</blockquote>';
  if(b.kind==='note')return '<aside class="cp-note">'+t+'</aside>';
  if(b.kind==='bullet'||b.kind==='ordered'){const tag=b.kind==='bullet'?'ul':'ol';return '<'+tag+'>'+b.text.split(/\r?\n/).filter(x=>x.trim()).map(x=>'<li>'+esc(x)+'</li>').join('')+'</'+tag+'>';}
  return '<p>'+t+'</p>';
 };
 const nav=curr.chapters.map(c=>'<section><h3>'+esc(c.title)+'</h3><ol>'+c.lessons.map(l=>'<li><a href="'+link(l)+'"'+(l.id===selected?.id?' aria-current="page"':'')+'>'+esc(l.title)+'</a></li>').join('')+'</ol></section>').join('');
 const content=selected?'<article><p>Bài '+(pos+1)+' / '+entries.length+'</p><h2>'+esc(selected.title)+'</h2>'+(blocks.length?blocks.map(render).join(''):'<p>Chưa có nội dung bài học đã lưu.</p>')+'<nav class="cp-bottom" aria-label="Chuyển bài">'+(pos>0?'<a href="'+link(entries[pos-1])+'">← Bài trước</a>':'')+(pos+1<entries.length?'<a href="'+link(entries[pos+1])+'">Bài tiếp theo →</a>':'')+'</nav></article>':'<article><h2>Chưa có bài học</h2><p>Thêm bài trong giáo trình để xem trước.</p></article>';
 return '<style>main{max-width:1240px}.cp-banner{background:#fff2cf;padding:14px;border-radius:12px}.cp-grid{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:20px;margin-top:20px}.cp-grid>nav{background:#eee8fc;padding:16px;border-radius:16px;min-width:0}.cp-grid article{background:white;border:1px solid #d6dce5;border-radius:16px;padding:clamp(16px,4vw,36px);min-width:0;overflow-wrap:anywhere}.cp-grid article p,.cp-grid blockquote,.cp-note{white-space:pre-wrap;line-height:1.75}.cp-grid a{display:inline-block;padding:10px 4px;overflow-wrap:anywhere}.cp-grid a[aria-current=page]{font-weight:700;text-decoration:underline;background:#ded3fa}.cp-grid a:focus-visible{outline:3px solid #2563eb}.cp-grid figure{margin:12px 0}.cp-grid img{max-width:100%;height:auto}.cp-note{background:#e5f4ee;padding:12px;border-radius:8px}.cp-bottom{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid #ddd;margin-top:24px}@media(max-width:700px){.cp-grid{grid-template-columns:minmax(0,1fr)}}</style><nav><a href="/admin/courses/manage/">← Quản lý khóa học</a></nav><p>P2.7 · COURSE PREVIEW</p><div class="cp-banner"><strong>Chế độ xem trước riêng tư</strong> · Chỉ quản trị viên · Nội dung đã lưu, chưa xuất bản. Không ghi nhận tiến độ học.</div><h1>'+esc(curr.title)+'</h1><p>'+curr.chapters.length+' chương · '+entries.length+' bài học</p><div class="cp-grid"><nav aria-label="Giáo trình"><h2>Nội dung khóa học</h2>'+nav+'</nav>'+content+'</div>';
}


export {releasePage};
