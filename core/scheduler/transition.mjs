import {sha} from './validation.mjs';
/** @typedef {Readonly<{id:string,route:string,state:string,attempts:number,receipt_sha?:string,next_at:number}>} ScheduledJob */
export function schedulerReady(configured,lastTick,now){return configured&&Number.isSafeInteger(lastTick)&&now-lastTick>=0&&now-lastTick<=300000;}
export function headDisposition(head){return !head?'idle':head.state==='blocked'?'blocked':head.state==='awaiting_issue'?'awaiting_issue':'claim';}
export function receiptMatches(claimed,result){return result.id===claimed.id&&sha(result.sha)&&result.route===claimed.route&&(!claimed.receipt_sha||claimed.receipt_sha===result.sha);}
export function isConfirmedIssue(number){return Number.isSafeInteger(number)&&number>0;}
export function awaitingDeadline(now){return now+900000;}
export function leaseDeadline(now){return now+600000;}
