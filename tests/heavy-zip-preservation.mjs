import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const hash=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const protectedSha={
 'campus.js':'7bcd4ea716879d3525a272eb8a6812dd63f0affa',
 'index.html':'f7c5baa8bbcc856dd776aebd4776847c2c4f02fd',
 'styles.css':'e75303165de4674aa9bdd4fd5a9ccc4a8e8115ff',
 'campus-fence.js':'4fa8aa442fcab02d579f1261bd806bccb89b5404',
 'campus-materials.js':'07af3820680b4fbaf00d5c1307bca4c5b1978268',
 'campus-water.js':'a8e69c96af1e873d8de4b197014d98198e8d2f14'
};
for(const [p,sha] of Object.entries(protectedSha))assert.equal(hash(read(p)),sha,p+' must remain byte-identical');
const scene=read('scene.js'),ui=read('explore-ui.js'),interiors=read('campus-interiors.js'),polish=read('interior-polish.js'),css=read('explore-enhancements.css');
for(const s of ['EXTERIOR_ZONES','enhanceExteriorCampus','bessYard','h2Plant','bess-substation','green-h2']){
 assert.ok(!scene.includes(s),'Prohibited new exterior asset '+s);
}
assert.ok(!ui.includes('EXTERIOR_ZONES'),'Unapproved exterior POI');
assert.ok(!ui.includes('orbitDock.remove()'),'Floating global dock is not allowed');
assert.ok(!css.includes('pointer-events:auto!important'),'Do not capture the original hero/cinematic interface');
assert.ok(scene.includes('createCampusInteriors'),'Interior runtime must be connected');
assert.ok(scene.includes('updateInteriorWalk(dt)'),'Walk must remain live');
assert.ok(ui.includes('data-action="enter"'),'Enter action');
assert.ok(ui.includes('data-action="exit"'),'Exit action');
for(const [id,x,z,w,d,h] of [
 ['manufacturing',-16,35,34,18,7],
 ['headquarters',9,34,11,11,5],
 ['compute-01',11,-45,29,9,6.4],
 ['compute-02',11,-58,29,9,6.4],
 ['compute-03',11,-71,29,9,6.4],
 ['recycling',-12,-89,27,17,6.8]]){
 assert.ok(interiors.includes("id:'"+id+"'"),'Missing interior '+id);
 assert.ok(interiors.includes('x:'+x+',z:'+z+',w:'+w+',d:'+d+',h:'+h),'Hall envelope changed '+id);
}
for(const term of ['createHmiTexture','createRackFaceTexture','createHqVideoWallTexture','enhanceInterior']){
 assert.ok(polish.includes(term),'Heavy polish feature missing '+term);
}
const version=JSON.parse(read('version.json'));
assert.equal(version.zipSourceSha256,'9a82c1196731adc0024fe27fb7ffed9ff2da8187df2776d41079eab2b8e643e0');
assert.equal(version.interiorSpaces.length,6);
console.log('PASS: six heavy interiors, preserved exterior bytes, no extra external facilities, original Convalt UI.');
