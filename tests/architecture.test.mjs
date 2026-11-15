import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectArchitecture,coreClosure,isCorePath} from '../scripts/architecture/inspect.mjs';
import {measureTask} from '../scripts/architecture/context-budget.mjs';
const inspect=entries=>inspectArchitecture(new Map(entries));
test('R10 parser recognizes imports, re-exports, pure cross-domain leaves and explicit time',()=>{
 const r=inspect([['core/a.mjs',"import\n {value}\n from './b.mjs'; export const next=(ms)=>new Date(ms); export {value};"],['core/b.mjs','export const value=1;']]);
 assert.deepEqual(r.violations,[]);assert.deepEqual(coreClosure(['core/a.mjs'],r.graph),['core/a.mjs','core/b.mjs']);
 assert.ok(isCorePath('src/lib/editor-v2/media-validation.mjs'));assert.ok(!isCorePath('back-office/worker.mjs'));
});
test('R10 detects forbidden I/O imports, indirect re-exports, clock, random and runtime globals',()=>{
 const r=inspect([['core/a.mjs',"import fs from 'node:fs'; export {x} from '../shell.mjs'; export const a=()=>fetch('x'); export const b=()=>Date.now(); export const c=()=>Math['random'](); export const d=()=>new Date(); export const e=()=>import('./b.mjs'); export const f=()=>globalThis.crypto;"],['core/b.mjs','export const x=1;']]);
 const messages=r.violations.map(x=>x.message).join('\n');
 for(const value of ['Forbidden dependency','outside boundary','fetch','Date.now','Math.random','new Date()','Dynamic import','globalThis'])assert.ok(messages.includes(value),value);
});
test('R10 detects circular core dependencies without rejecting data keys or strings',()=>{
 const r=inspect([['core/a.mjs',"export {b} from './b.mjs'; export const a={fetch:'Date.now()'};"],['core/b.mjs',"import {a} from './a.mjs'; export const b=a;"]]);
 assert.equal(r.violations.length,1);assert.match(r.violations[0].message,/Circular/);
});
test('R10 budgets expand transitive core dependencies, deduplicate and fail closed',()=>{
 const graph=new Map([['core/a.mjs',['core/b.mjs']],['core/b.mjs',[]]]),sizes={'core/a.mjs':100,'core/b.mjs':200,'test.mjs':25};
 const row=measureTask({id:'fixture',baseline:[{bytes:1000}],candidate:['core/a.mjs','test.mjs','test.mjs'],maxBytes:300},p=>sizes[p],graph);
 assert.equal(row.after,125);assert.equal(row.expandedBytes,325);assert.deepEqual(row.extraCoreFiles,['core/b.mjs']);assert.equal(row.pass,false);
});
