import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {inspectArchitecture} from './architecture/inspect.mjs';
import {readTrackedCore} from './architecture/read-core.mjs';
import {measureTask} from './architecture/context-budget.mjs';
const manifest=JSON.parse(readFileSync('docs/architecture/context-benchmark.json','utf8'));
const {graph,violations}=inspectArchitecture(readTrackedCore());
if(violations.length)throw Error('Run check:architecture first; graph is not valid');
const readSize=path=>readFileSync(path).length;
if(process.argv.includes('--verify-baseline')){
 const tree=execFileSync('git',['rev-parse',manifest.baseline.sha+'^{tree}'],{encoding:'utf8'}).trim();
 if(tree!==manifest.baseline.tree)throw Error('Baseline tree mismatch');
 for(const entry of new Map(manifest.tasks.flatMap(t=>t.baseline).map(e=>[e.path,e])).values()){
  const actual=execFileSync('git',['rev-parse',manifest.baseline.sha+':'+entry.path],{encoding:'utf8'}).trim();
  if(actual!==entry.blob||Number(execFileSync('git',['cat-file','-s',actual],{encoding:'utf8'}).trim())!==entry.bytes)throw Error('Baseline blob mismatch: '+entry.path);
 }
}
const rows=manifest.tasks.map(task=>measureTask(task,readSize,graph));
const report={baseline:manifest.baseline.sha,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sharedInstructionBytes:manifest.shared.reduce((n,p)=>n+readSize(p),0),unit:'UTF-8 source bytes, not model tokens',tasks:rows};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{console.table(rows.map(({extraCoreFiles,...row})=>({...row,extraCoreFiles:extraCoreFiles.length})));console.log('Shared instructions (excluded from task totals): '+report.sharedInstructionBytes+' B; not model tokens.');}
if(process.argv.includes('--check')&&rows.some(row=>!row.pass))process.exitCode=1;
