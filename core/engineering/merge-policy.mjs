export function sensitiveFile(path=''){return /^(\.github\/|AGENTS\.md$|engineering\/|core\/engineering\/|core\/publication\/|core\/scheduler\/|core\/editorial\/(?:local-publication|content-validation|document-schema|webp|metadata|tech-visual-validation|knowledge-visual-validation)\.mjs$|editor-github\/|back-office\/repositories\/scheduler\.mjs$|scripts\/|tests\/|playwright\.config\.|package(?:-lock)?\.json$|astro\.config\.|src\/content\.config\.)/.test(path);}
// Ordinary browser regression specs accompanying a UI change are not automation policy.
// Test-only changes, test deletions/renames, helpers and all infrastructure still require review.
export function mergeReviewRequired(pr,files){
 if(!Array.isArray(files)||!files.length||files.some(f=>!f.filename||!f.status))return true;
 const ui=/^(?:ui|ux)\//.test(pr?.head?.ref||'')&&files.some(f=>/^src\/(?:styles\/|layouts\/|components\/|pages\/techblog\/)/.test(f.filename)&&['added','modified'].includes(f.status));
 return files.some(f=>{
  if(!sensitiveFile(f.filename)&&!sensitiveFile(f.previous_filename))return false;
  return !(ui&&/^tests\/e2e\/[a-zA-Z0-9_-]+\.spec\.ts$/.test(f.filename)&&['added','modified'].includes(f.status)&&!f.previous_filename);
 });
}

// Explicit fresh evidence; no API calls or merge authority in this module.
export function exactMainCI(mainCI,main){
 return Boolean(mainCI&&mainCI.head_sha===main&&mainCI.status==='completed'&&mainCI.conclusion==='success');
}
