import {coreClosure} from './inspect.mjs';
export function measureTask(task,readSize,graph){
 const before=task.baseline.reduce((n,entry)=>n+entry.bytes,0);
 const selected=[...new Set(task.candidate)];
 // Include every transitive pure dependency of selected core roots. Test
 // imports and effect-shell dependency graphs are deliberately not expanded.
 const dependencies=coreClosure(selected,graph);
 const expanded=[...new Set([...selected,...dependencies])];
 const sum=paths=>paths.reduce((n,path)=>n+readSize(path),0);
 const after=sum(selected),expandedBytes=sum(expanded);
 return {id:task.id,before,after,expandedBytes,coreDependencyBytes:sum(dependencies),extraCoreFiles:expanded.filter(p=>!selected.includes(p)),maxBytes:task.maxBytes,pass:expandedBytes<=task.maxBytes,reductionPercent:Math.round((1-after/before)*10000)/100};
}
