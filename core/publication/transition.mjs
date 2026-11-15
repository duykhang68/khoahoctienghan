// Pure patches; shell persists each step before subsequent side effects.
/** @typedef {Readonly<{phase:string,id:string,source:string,number?:number,head?:string,base?:string,pr?:number,route?:string,merge?:string,verified?:string}>} QueueState */
export function preparedPatch(base,head,route){return {base,head,route,phase:'WAITING_CI'};}
export function mergedPatch(merge){return {phase:'MERGED',merge};}
export function verifiedPatch(verified){return {phase:'VERIFIED',verified};}
export function rebuildPatch(){return {set:{phase:'QUEUED'},remove:['head','base','pr','rebuild','route']};}
