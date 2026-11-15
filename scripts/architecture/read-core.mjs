import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {isCorePath} from './inspect.mjs';
export function readTrackedCore(){
 const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:16_000_000}).split('\0').filter(isCorePath);
 if(!paths.length)throw Error('No tracked functional core modules');
 return new Map(paths.map(path=>[path,readFileSync(path,'utf8')]));
}
