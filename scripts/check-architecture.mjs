import {inspectArchitecture} from './architecture/inspect.mjs';
import {readTrackedCore} from './architecture/read-core.mjs';
const sources=readTrackedCore(),{violations,graph}=inspectArchitecture(sources);
if(violations.length){
 for(const v of violations)console.error(v.path+':'+v.line+' '+v.message);
 process.exitCode=1;
}else console.log('Architecture gate passed: '+sources.size+' core modules, '+[...graph.values()].reduce((n,x)=>n+x.length,0)+' internal imports, no detected cycles or forbidden boundaries.');
