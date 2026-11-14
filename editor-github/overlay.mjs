// Apply only the audited integration anchors in the pinned upstream App.
export function overlayApp(source,componentImport){
 function swap(old,next){if(source.split(old).length!==2)throw Error('Original Editor integration anchor changed: '+old.slice(0,80));source=source.replace(old,()=>next)}
 swap("import DrivePanel from './DrivePanel.jsx';","import DrivePanel from './DrivePanel.jsx';\nimport {GithubProvider,GithubHeader,GithubPublish} from "+JSON.stringify(componentImport)+";");
 swap("return 'dn-reddit-editor-local-v1-'+(blogId||'new');","return 'dn-korean-editor-local-v1-'+(blogId||'new');");
 swap("return <div className={'app reddit-layout'+' kit-layout'}>","return <GithubProvider><div className={'app reddit-layout'+' kit-layout'}>");
 const header='<div className="top-actions"><span className={\'conn \'+(connected?\'online\':\'\')}>{connected?\'● Blogger đã kết nối\':\'○ Chưa kết nối\'}</span>{connected?<button className="quiet" onClick={logout}>Ngắt kết nối</button>:<a className="primary" href="/auth/google/start">Kết nối Blogger ↗</a>}</div>';
 swap(header,"<GithubHeader/>");
 swap("<aside className=\"kit-right\" aria-label=\"Lưu và xuất bản\">","<aside className=\"kit-right\" aria-label=\"Lưu và xuất bản\"><GithubPublish title={title} labels={labelsArray} series={series} editor={editor} mode={mode} busy={saving||driveBusy}/>");
 swap("href={link.href} target=\"_blank\"","href={'https://duynguyen-reddit-editor.pages.dev'+link.href} target=\"_blank\"");
 // Only the final closing tag belongs to App (not other components).
 const tail='  </div>;\n}';
 if(!source.trimEnd().endsWith(tail))throw Error('Original App closing anchor changed');
 source=source.trimEnd().slice(0,-tail.length)+'  </div></GithubProvider>;\n}\n';
 return source;
}
