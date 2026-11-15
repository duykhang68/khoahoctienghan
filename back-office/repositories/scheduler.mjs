// D1 atomic operations: original SQL and bound values.
export const active="'scheduled','sending','retry','awaiting_issue','blocked'";
export const fields='id,title,route,due_at,created_at,state,attempts,receipt_sha,issue_number,error_code';
export const stmt=(db,sql,...args)=>db.prepare(sql).bind(...args);
export const get=(db,sql,...args)=>stmt(db,sql,...args).first();
export const all=async(db,sql,...args)=>(await stmt(db,sql,...args).all()).results;
export const run=(db,sql,...args)=>stmt(db,sql,...args).run();
export async function schedulerHead(db,now){
 await run(db,'INSERT INTO scheduler_health(id,last_tick) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET last_tick=MAX(last_tick,excluded.last_tick)',now);
 await run(db,"UPDATE scheduler_jobs SET state='blocked',error_code='ATTEMPTS_EXHAUSTED',lease=NULL,lease_until=NULL WHERE state='sending' AND lease_until<=? AND attempts>=3",now);
 return get(db,'SELECT * FROM scheduler_jobs WHERE due_at<=? AND state IN ('+active+') ORDER BY due_at,created_at,id LIMIT 1',now);
}
export async function acceptScheduledIssue(db,head,number){
    await db.batch([stmt(db,"UPDATE scheduler_jobs SET state='submitted',issue_number=?,error_code=NULL WHERE id=? AND state='awaiting_issue' AND receipt_sha=?",number,head.id,head.receipt_sha),stmt(db,"DELETE FROM scheduler_chunks WHERE job_id=? AND EXISTS(SELECT 1 FROM scheduler_jobs WHERE id=? AND state='submitted')",head.id,head.id)]);
}
export async function claimScheduledHead(db,lease,leaseUntil,now){
 return get(db,"UPDATE scheduler_jobs SET state='sending',attempts=attempts+1,lease=?,lease_until=?,error_code=NULL WHERE id=(SELECT id FROM scheduler_jobs WHERE due_at<=? AND state IN ("+active+") ORDER BY due_at,created_at,id LIMIT 1) AND attempts<3 AND ((state IN ('scheduled','retry') AND next_at<=?) OR (state='sending' AND lease_until<=?)) RETURNING *",lease,leaseUntil,now,now,now);
}
export async function markAwaitingIssue(db,result,nextAt,claimed,lease){
  await run(db,"UPDATE scheduler_jobs SET state='awaiting_issue',receipt_sha=?,next_at=?,lease=NULL,lease_until=NULL WHERE id=? AND state='sending' AND lease=?",result.sha,nextAt,claimed.id,lease);
}
export async function markScheduleFailure(db,plan,claimed,lease){
  await run(db,"UPDATE scheduler_jobs SET state=?,next_at=?,error_code=?,lease=NULL,lease_until=NULL WHERE id=? AND state='sending' AND lease=?",plan.state,plan.nextAt,plan.errorCode,claimed.id,lease);
}
