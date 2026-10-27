import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freemem} from 'node:os';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const [bytesArg,repsArg,tag,asyncArg='false']=process.argv.slice(2),bytes=+bytesArg,reps=+repsArg,async=asyncArg==='true';
assert([3000000,25000000,100000000].includes(bytes));assert(reps>0&&reps<=5);assert(/^[a-z0-9-]+$/.test(tag));
const out=resolve('outputs/graphql-js-study'),fixture=resolve(bytes===3000000?out+'/dense-3000000.json':`work/fixtures/dense-${bytes}.json`),path=out+'/'+tag+'.json';assert(!existsSync(path));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),fixtureSha=sha(fixture);
const files=['outputs/graphql-js-study/source-pr-run.mjs','outputs/graphql-js-study/source-pr-case.mjs','work/graphql-js-pr/src/jsutils/CompactExecutionResultMap.ts','work/graphql-js-pr/src/execution/Executor.ts','work/graphql-js-pr/src/jsutils/promiseForObject.ts','work/graphql-js-study/src/execution/Executor.ts','work/graphql-js-study/src/jsutils/promiseForObject.ts'];
const identity=()=>Object.fromEntries(files.map(p=>[p,sha(p)]));const source=identity();
const report={bytes,reps,async,node:process.versions,source,fixtureSha,events:[],startedAt:new Date().toISOString()};const save=()=>writeFileSync(path,JSON.stringify(report,null,2));save();
const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_V8_COVERAGE;
for(let rep=0;rep<reps;rep++)for(const variant of (rep%2?['compact','base']:['base','compact'])){
 assert(freemem()>6500000000);assert.deepEqual(identity(),source);
 const output=out+`/${tag}-r${rep}-${variant}`,c={variant,fixture,async,output};
 const p=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=2813','--max-semi-space-size=16',out+'/source-pr-case.mjs',JSON.stringify(c)],{env,encoding:'utf8',timeout:240000,maxBuffer:4*1048576});
 writeFileSync(output+'.log',p.stdout+'\nSTDERR\n'+p.stderr);
 if(p.status!==0){report.events.push({rep,variant,failed:true,status:p.status,error:p.error?.message});save();throw new Error(p.stderr+' '+p.error);}
 const r=JSON.parse(readFileSync(output+'.json'));assert.equal(r.bytes,bytes);assert.equal(r.sha256,fixtureSha);
 const event={rep,variant,idleHeap:r.idleHeap,inputReadyHeap:r.inputReadyHeap,executionAddedHeap:r.executionAddedHeap,peakHeap:r.peakHeap,addedHeap:r.addedHeap,peakRss:r.peakRss,cpuMs:(r.responseCpu.user+r.responseCpu.system)/1000,wallMs:r.responseMs,executionMs:r.executionMs,postGCHeap:r.stages.at(-1).heapUsed,outputRows:r.outputRows,sha256:r.sha256};
 report.events.push(event);save();console.log(JSON.stringify(event));
}report.completedAt=new Date().toISOString();save();
