// Each guarded course mutation targets at most one row. D1 meta.changes includes trigger side effects.
// Zero remains a conflict; missing or invalid metadata must not confirm a write.
export const courseWriteChanged=result=>result?.success!==false&&Number.isSafeInteger(result?.meta?.changes)&&result.meta.changes>0;

/** @typedef {Readonly<{status:string,version:number}>} VersionedSnapshot */
/** @param {VersionedSnapshot|null} current @param {Readonly<{version:number}>} input */
export function planVersionedUpdate(current,input){
 if(!current)return {kind:'not-found'};
 if(current.status!=='draft'||current.version!==input.version)return {kind:'conflict'};
 return {kind:'write',expectedVersion:input.version,nextVersion:input.version+1};
}
