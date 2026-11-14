// Descriptive labels only: never used to grant write, review or merge permission.
export const labelDefinitions={
 'techblog':{color:'7057ff',description:'Engineering Blog content and publishing'},
 'engineering':{color:'1d76db',description:'Engineering infrastructure, CI/CD and developer quality'},
 'automation':{color:'0e8a16',description:'Automated workflows and engineering controllers'},
 'ui/ux':{color:'d4c5f9',description:'User interface and experience'},
 'dependencies':{color:'0366d6',description:'Dependency or GitHub Actions version updates'},
 'security':{color:'b60205',description:'Security-related change'},
 'maintenance':{color:'c5def5',description:'Maintenance and cleanup'},
 'bug':{color:'d73a4a',description:"Something isn't working"},
 'enhancement':{color:'a2eeef',description:'New feature or request'},
 'documentation':{color:'0075ca',description:'Improvements or additions to documentation'}
};
export function labelEligible(p,repo){
 return p.head?.repo?.full_name===repo&&p.base?.ref==='main'&&['duykhang68','dependabot[bot]'].includes(p.user?.login);
}
export function inferPRLabels(p,files=[]){
 const title=String(p.title||'').toLowerCase(),branch=String(p.head?.ref||'').toLowerCase();
 const paths=files.flatMap(f=>[f.filename,f.previous_filename]).filter(Boolean);
 const any=re=>paths.some(x=>re.test(x));
 const labels=new Set();
 if(p.user?.login==='dependabot[bot]'||/^build\(deps\)/.test(title)||branch.startsWith('dependabot/'))labels.add('dependencies');
 if(/^fix(?:\(|:)/.test(title)||branch.startsWith('fix/'))labels.add('bug');
 if(/^feat(?:\(|:)/.test(title)||branch.startsWith('feat/'))labels.add('enhancement');
 if(/tech\s*blog/.test(title)||branch.startsWith('techblog/')||any(/^(src\/data\/techblog\/|src\/pages\/techblog\/|src\/lib\/techblog\.|src\/lib\/tech-categories\.)/))labels.add('techblog');
 if(/engineering|ci\/cd/.test(title)||any(/^(\.github\/workflows\/|engineering\/|scripts\/|tests\/|AGENTS\.md$)/))labels.add('engineering');
 if(/automation|auto[ -]?(update|merge|fix|deploy|label)/.test(title)||any(/^(\.github\/workflows\/|scripts\/(engineering-controller|pr-labels)\.mjs$)/))labels.add('automation');
 if(/^(ui|ux)(?:\(|:)/.test(title)||/^(ui|ux)\//.test(branch))labels.add('ui/ux');
 if(/security|\bsecret scanning\b/.test(title)||any(/(^|\/)security-check\.mjs$/))labels.add('security');
 if(/^docs(?:\(|:)/.test(title)||branch.startsWith('docs/'))labels.add('documentation');
 if(!labels.size||/^chore(?:\(|:)/.test(title))labels.add('maintenance');
 return [...labels];
}
