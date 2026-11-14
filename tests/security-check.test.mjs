import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {containsPotentialSecret} from '../scripts/secret-patterns.mjs';

// Synthetic fixtures built at runtime: never commit complete token-like strings.
const prefix=['ghs',''].join('_');
const classic=prefix+'a'.repeat(36);
// An early separator defeats the former contiguous-alphanumeric signature.
const start=prefix+'12345_abc.def-_.';
const stateless=length=>start+'z'.repeat(length-start.length);
const otherTokens=[
 ['ghp',''].join('_')+'a'.repeat(36),
 ['gho',''].join('_')+'a'.repeat(36),
 ['ghu',''].join('_')+'a'.repeat(36),
 ['ghr',''].join('_')+'a'.repeat(36),
 ['github','pat',''].join('_')+'a'.repeat(40),
 ['-----BEGIN ','PRIVATE KEY-----'].join('')
];

test('secret detection accepts legacy and variable-length stateless signatures',()=>{
 assert.equal(classic.length,40);
 assert.ok(containsPotentialSecret(classic));
 for(const length of [520,1024,2048]){
  const token=stateless(length);
  assert.equal(token.length,length);
  assert.ok(containsPotentialSecret('Authorization: Bearer '+token));
 }
 for(const token of otherTokens)assert.ok(containsPotentialSecret(token));
 for(const safe of ['ordinary content',prefix,prefix+'abc','TOKEN_PLACEHOLDER']){
  assert.equal(containsPotentialSecret(safe),false);
 }
});

test('tracked-file security gate fails closed without printing synthetic secrets',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'kb-secret-gate-'));
 const scanner=fileURLToPath(new URL('../scripts/security-check.mjs',import.meta.url));
 try{
  execFileSync('git',['init','-q'],{cwd});
  const run=()=>spawnSync(process.execPath,[scanner],{cwd,encoding:'utf8'});
  writeFileSync(join(cwd,'tracked.txt'),'Safe documentation');
  execFileSync('git',['add','tracked.txt'],{cwd});
  assert.equal(run().status,0);
  for(const token of [classic,stateless(520),stateless(2048),...otherTokens]){
   writeFileSync(join(cwd,'tracked.txt'),token);
   const result=run();
   assert.equal(result.status,1);
   const output=result.stdout+result.stderr;
   assert.match(output,/Potential secret in tracked\.txt/);
   assert.equal(output.includes(token),false,'gate must not print secret values');
  }
  writeFileSync(join(cwd,'tracked.txt'),'Safe documentation');
  writeFileSync(join(cwd,'.env'),'DUMMY=1');
  execFileSync('git',['add','-f','.env'],{cwd});
  const envResult=run();
  assert.equal(envResult.status,1);
  assert.match(envResult.stderr,/Tracked environment file: \.env/);
 }finally{
  rmSync(cwd,{recursive:true,force:true});
 }
});
