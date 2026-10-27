import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getHeapStatistics,writeHeapSnapshot} from 'node:v8';
import {performance} from 'node:perf_hooks';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {freemem} from 'node:os';
import {once} from 'node:events';
import assert from 'node:assert/strict';

if(!isMainThread){
 let peak=process.memoryUsage.rss();
 const timer=setInterval(()=>{const rss=process.memoryUsage.rss();peak=Math.max(peak,rss);if(rss>2684354560||freemem()<3221225472){writeFileSync(workerData.guard,JSON.stringify({rss,free:freemem()}));process.kill(process.pid,'SIGKILL');}},5);
 parentPort.on('message',()=>{clearInterval(timer);parentPort.postMessage(peak);});
}else{
 const c=JSON.parse(process.argv[2]);
 const g=await import(c.variant==='compact'?'../../work/graphql-js-pr/src/index.ts':'../../work/graphql-js-study/src/index.ts');
 const schema=g.buildSchema('type Query {rows:[Row!]!} type Row {f0:String! child:Row}');
 const document=g.parse('{rows{f0 child{f0 child{f0}}}}');
 const fieldResolver=c.async?((source,_args,_ctx,info)=>info.fieldName==='f0'?Promise.resolve(source.f0):source[info.fieldName]):undefined;
 const execute=()=>g.execute({schema,document,rootValue:globalThis.__studyInput,fieldResolver});
 globalThis.__studyInput={rows:[{f0:'warmup',child:{f0:'warmup',child:{f0:'warmup'}}}]};
 for(let i=0;i<20;i++)await execute();
 globalThis.__studyInput=undefined;
 const guard=new Worker(new URL(import.meta.url),{workerData:{guard:c.output+'.guard.json'}});
 await once(guard,'online');
 const stages=[];const mark=name=>stages.push({name,...process.memoryUsage()});
 global.gc();global.gc();mark('runtime-idle');
 if(c.snapshot==='idle')writeHeapSnapshot(c.output+'.heapsnapshot');
 globalThis.__studyInput=JSON.parse(readFileSync(c.fixture,'utf8')).data;
 // Let parser call-stack temporaries expire before measuring caller-owned input.
 await new Promise(r=>setImmediate(r));
 global.gc();global.gc();mark('input-ready');
 let session;
 if(c.profile){const {Session}=await import('node:inspector');session=new Session();session.connect();await new Promise((resolve,reject)=>session.post('HeapProfiler.startSampling',{samplingInterval:16384,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true},e=>e?reject(e):resolve()));}
 const cpu=process.cpuUsage(),start=performance.now();
 globalThis.__studyResult=execute();mark('execute-returned');
 globalThis.__studyResult=await globalThis.__studyResult;
 const executionMs=performance.now()-start,executionCpu=process.cpuUsage(cpu);
 assert(!globalThis.__studyResult.errors,JSON.stringify(globalThis.__studyResult.errors));
 mark('execution-done');
 if(c.profile){const {profile}=await new Promise((resolve,reject)=>session.post('HeapProfiler.stopSampling',(e,r)=>e?reject(e):resolve(r)));writeFileSync(c.output+'.heapprofile',JSON.stringify(profile));session.disconnect();}
 let retained;
 if(c.snapshot==='executed'){global.gc();global.gc();retained=process.memoryUsage();writeHeapSnapshot(c.output+'.heapsnapshot');}
 let text=JSON.stringify(globalThis.__studyResult);mark('serialized');
 let buffer=Buffer.from(text);mark('encoded');
 const bytes=buffer.length,sha256=createHash('sha256').update(buffer).digest('hex');
 const responseMs=performance.now()-start,responseCpu=process.cpuUsage(cpu);
 let inputRows=0,outputRows=0;
 for(const row of globalThis.__studyInput.rows)for(let p=row;p;p=p.child)inputRows++;
 for(const row of globalThis.__studyResult.data.rows)for(let p=row;p;p=p.child)outputRows++;
 assert.equal(inputRows,outputRows);
 globalThis.__studyInput=globalThis.__studyResult=undefined;text=buffer=undefined;
 await new Promise(r=>setImmediate(r));global.gc();global.gc();mark('released');
 guard.postMessage('stop');const [rssSampled]=await once(guard,'message');await guard.terminate();
 const peakHeap=Math.max(...stages.slice(0,-1).map(s=>s.heapUsed));
 const r={config:c,node:process.versions,platform:process.platform,heapLimit:getHeapStatistics().heap_size_limit,stages,bytes,sha256,inputRows,outputRows,retained,executionMs,executionCpu,responseMs,responseCpu,idleHeap:stages[0].heapUsed,inputReadyHeap:stages[1].heapUsed,executionAddedHeap:Math.max(stages[2].heapUsed,stages[3].heapUsed)-stages[1].heapUsed,peakHeap,addedHeap:peakHeap-stages[0].heapUsed,peakRss:Math.max(rssSampled,process.resourceUsage().maxRSS*1024)};
 writeFileSync(c.output+'.json',JSON.stringify(r,null,2));console.log(JSON.stringify({...r,stages:undefined,node:undefined,config:undefined}));
}
