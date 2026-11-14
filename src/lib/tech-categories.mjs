// Deterministic topic classification; no external service or manually supplied category.
const taxonomy = [
 {id:'engineering',label:'Engineering',terms:['engineering culture','engineering researcher','ci cd','github actions','continuous delivery','continuous integration','self healing','squash merge','quality gate','regression','deployment','deploy','pull request','commit','build','workflow','repository','tu phuc hoi']},
 {id:'architecture',label:'Architecture',terms:['software architecture','system design','microservices','islands architecture','kien truc phan mem','kien truc he thong','distributed systems','event sourcing','event driven architecture','monolith','api gateway','service mesh','database architecture']},
 {id:'security',label:'Security',terms:['cybersecurity','information security','bao mat','xac thuc','oauth','oidc','zero trust','vulnerability','xss','csrf','supply chain security','secret scanning','encryption','security policy','phishing']},
 {id:'performance',label:'Performance',terms:['web performance','core web vitals','largest contentful paint','lcp','cls','inp','hieu nang','toi uu toc do','lazy loading','benchmark','caching','cdn','profiling','latency']},
 {id:'frontend',label:'Frontend & UI/UX',terms:['frontend','ui ux','giao dien','trai nghiem nguoi dung','responsive design','design system','typography','accessibility','css grid','flexbox','web design','component design','mobile layout']},
 {id:'ai-data',label:'AI & Data',terms:['machine learning','large language model','llm','tri tue nhan tao','data science','data engineering','vector database','embedding','rag','neural network','model training','huan luyen mo hinh','data pipeline','deep learning']},
 {id:'tools',label:'Developer Tools',terms:['developer tools','cong cu lap trinh','code editor','visual studio code','terminal','command line','cli tool','version control','static site generator','trinh tao trang tinh','toolchain','ide','debugger']}
];
export function normalizeTopic(value=''){
 return String(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function scoreText(value,terms){
 const text=' '+normalizeTopic(value)+' ';
 return terms.reduce((score,term)=>score+(text.includes(' '+term+' ')?(term.includes(' ')?2:1):0),0);
}
export function inferCategory(post){
 const headings=(post.sections||[]).filter(s=>!/^tai lieu|^tham khao/.test(normalizeTopic(s.heading))).map(s=>s.heading);
 const sections=(post.sections||[]).filter(s=>!/^tai lieu|^tham khao/.test(normalizeTopic(s.heading))).flatMap(s=>s.paragraphs||[]);
 const ranked=taxonomy.map(c=>({id:c.id,label:c.label,score:5*scoreText(post.title,c.terms)+3*scoreText(post.summary,c.terms)+2*scoreText(headings.join(' '),c.terms)+scoreText(sections.join(' '),c.terms)})).sort((a,b)=>b.score-a.score);
 return ranked[0].score>=5?{id:ranked[0].id,label:ranked[0].label}:{id:'engineering',label:'Engineering'};
}
export function categoryIndex(posts){
 const grouped=new Map();
 for(const post of posts){const cat=inferCategory(post);const current=grouped.get(cat.id);grouped.set(cat.id,{...cat,count:(current?.count||0)+1});}
 return [...grouped.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'en'));
}
