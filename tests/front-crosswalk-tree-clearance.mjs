import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');
assert.ok(source.includes("['front-crosswalk-clear-zone',17.0,51.0,10.0,5.0]"),'front crosswalk clear zone must exist');
assert.ok(source.includes("if(treeHitsHardscape(x,z,0))continue;"),'perimeter shrub ring must honor clear zones');

function randomSequence(seed=93713){
  return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
}
const rng=randomSequence();
const boundary=a=>1+.022*Math.sin(a*5)+.014*Math.sin(a*11+.8);
const rim=(a,f=1)=>[Math.cos(a)*70*boundary(a)*f,Math.sin(a)*87*boundary(a)*f-26];
const candidates=[];
for(let i=0;i<156;i++){
  const a=i*2.39996,f=.86+rng()*.085,[x,z]=rim(a,f),h=3.3+rng()*2.2;
  if(Math.abs(x-17)<=10.75&&Math.abs(z-51)<=5.75)candidates.push([i,x,z,h]);
}
assert.equal(candidates.length,9,'expected deterministic high-quality tree candidates in marked pocket');

console.log(JSON.stringify({
  passed:true,
  clearZone:{center:[17,51],halfExtents:[10,5]},
  deterministicCandidates:candidates.length
}));
