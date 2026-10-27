import {readFileSync,writeFileSync} from 'node:fs';
const path=process.argv[2],r=JSON.parse(readFileSync(path));
const median=a=>{a=[...a].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const variants=[...new Set(r.events.map(e=>e.variant))];
const candidate=variants.find(v=>v!=='base'),pairs=[...new Set(r.events.map(e=>e.rep))].map(rep=>({base:r.events.find(e=>e.rep===rep&&e.variant==='base'),head:r.events.find(e=>e.rep===rep&&e.variant===candidate)}));
const summary={bytes:r.bytes,pairs:pairs.length,candidate,metrics:{}};
for(const key of ['idleHeap','inputReadyHeap','executionAddedHeap','peakHeap','addedHeap','peakRss','cpuMs','wallMs','executionMs','postGCHeap']){
 if(pairs[0].base[key]===undefined)continue;
 const base=pairs.map(p=>p.base[key]),head=pairs.map(p=>p.head[key]),reduction=pairs.map(p=>100*(p.base[key]-p.head[key])/p.base[key]);
 summary.metrics[key]={base:median(base),head:median(head),medianReduction:median(reduction),min:Math.min(...reduction),max:Math.max(...reduction),wins:reduction.filter(x=>x>0).length};
}
writeFileSync(path.replace(/\.json$/,'.summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
