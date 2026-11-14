import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const files=execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
const signatures=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{40,}/];
for(const f of files){
 if(f==='scripts/security-check.mjs')continue;
 if(/(^|\/)\.env(?:\..*)?$/.test(f)&&!f.endsWith('.example'))throw Error('Tracked environment file: '+f);
 let s;try{s=readFileSync(f,'utf8')}catch{continue}
 if(signatures.some(x=>x.test(s)))throw Error('Potential secret in '+f);
}
console.log('Basic tracked-file secret checks passed.');
