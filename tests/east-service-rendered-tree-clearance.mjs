import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');
const zone="['east-service-rendered-tree-clear-zone',27.6,41.6,3.4,3.4]";
assert.ok(source.includes(zone),'rendered east-service tree clear zone must exist');

function randomSequence(seed=93713){
  return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
}
const boundary=a=>1+.022*Math.sin(a*5)+.014*Math.sin(a*11+.8);
const rim=(a,f=1)=>[Math.cos(a)*70*boundary(a)*f,Math.sin(a)*87*boundary(a)*f-26];
const rng=randomSequence();
const candidates=[];
for(let i=0;i<156;i++){
  const a=i*2.39996,f=.86+rng()*.085,[x,z]=rim(a,f),h=3.3+rng()*2.2;
  if(x>31&&x<46)continue;
  if(z<-78&&Math.abs(x)<39)continue;
  if(Math.abs(x-27.6)<=4.15&&Math.abs(z-41.6)<=4.15)candidates.push({i,x,z,h});
}
assert.equal(candidates.length,1,'expected one deterministic large-tree object in the marked pocket');
assert.equal(candidates[0].i,79,'marked rendered tree must remain deterministic candidate #79');
assert.ok(Math.abs(candidates[0].x-27.585)<.02);
assert.ok(Math.abs(candidates[0].z-41.573)<.02);

console.log(JSON.stringify({
  passed:true,
  removedGeneratedTree:{index:79,x:+candidates[0].x.toFixed(3),z:+candidates[0].z.toFixed(3),height:+candidates[0].h.toFixed(2)},
  clearZone:{center:[27.6,41.6],halfExtents:[3.4,3.4]}
}));
