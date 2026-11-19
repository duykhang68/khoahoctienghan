import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicationSnapshot} from '../back-office/adapters/publication-progress.mjs';
const sha='a'.repeat(40),head='b'.repeat(40),base='c'.repeat(40),repo='duykhang68/khoahoctienghan';
const issue=(number,phase,extra={},closed=false)=>({number,title:'[Editor V2] Bài '+number,state:closed?'closed':'open',user:{login:'github-actions[bot]'},body:'<!-- editor-v2-fifo:'+JSON.stringify({id:number.toString(16).padStart(64,'0'),source:sha,phase,...extra})+' -->'});
test('FIFO snapshot is scoped, cached, strict HEAD, and survives GitHub 403 without false progress',async()=>{
 const calls=[],now=1700000000000;
 const request=async(url,opts)=>{
  calls.push({url,auth:opts.headers.Authorization});
  if(url.includes('/issues?'))return Response.json([issue(11,'WAITING_CI',{head,base,pr:12}),issue(10,'VERIFIED',{merge:sha,verified:sha,pr:10,route:'ngon-ngu/bai-thu/'},true)]);
  if(url.endsWith('/pulls/12'))return Response.json({state:'open',head:{sha:head,ref:'content/editor-fifo-11-'+base.slice(0,12),repo:{full_name:repo}},base:{ref:'main',sha:base}});
  if(url.includes('/ci.yml/runs'))return Response.json({workflow_runs:[{id:123,head_sha:head,head_repository:{full_name:repo},head_branch:'content/editor-fifo-11-'+base.slice(0,12),event:'pull_request',status:'completed',conclusion:'success'}]});
  throw Error('Unexpected URL');
 };
 const first=await publicationSnapshot({PUBLICATION_GITHUB_TOKEN:'fixture'},request,now);
 assert.deepEqual(first.rows.map(row=>row.number),[10,11]);
 assert.equal(first.evidence[11].ci.conclusion,'success');
 assert.equal(first.stale,false);assert.equal(first.fromCache,false);
 assert.equal(calls.length,3);assert(calls.every(x=>x.auth==='Bearer fixture'));
 const hit=await publicationSnapshot({},()=>{throw Error('Must use cache')},now+1000);
 assert.equal(hit.fromCache,true);
 const stale=await publicationSnapshot({},async()=>new Response('',{status:403}),now+300001);
 assert.equal(stale.stale,true);assert.equal(stale.warning,'GITHUB_RATE_LIMITED');assert.equal(stale.evidence[11].ci.conclusion,'success');
});
