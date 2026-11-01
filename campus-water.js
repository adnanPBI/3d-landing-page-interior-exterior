import * as THREE from 'three';

/** Planar, real-scene reflections for the pond; high quality only.
 * Updates are capped at 8 Hz / 512 px. The original water material and geometry
 * still supply shading, depth and ripples. No video or background photograph.
 */
export function installWaterReflection(water,scene,renderer,high=true) {
  if(!high)return {dispose(){}};
  const target=new THREE.WebGLRenderTarget(512,512,{depthBuffer:true});
  target.texture.name='campus-pond-planar-reflection';
  const mirror=new THREE.PerspectiveCamera();
  const textureMatrix=new THREE.Matrix4(),bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const cameraPos=new THREE.Vector3(),waterPos=new THREE.Vector3(),look=new THREE.Vector3();
  const plane=new THREE.Plane(),clip=new THREE.Vector4(),q=new THREE.Vector4(),normal=new THREE.Vector3(0,1,0);
  const uniforms={campusReflection:{value:target.texture},campusReflectionMatrix:{value:textureMatrix},campusReflectionValid:{value:0},campusWaterTime:{value:0}};
  const material=water.material,oldCompile=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
  material.onBeforeCompile=(shader)=>{
    oldCompile.call(material,shader);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='uniform mat4 campusReflectionMatrix; varying vec4 vCampusReflection;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvCampusReflection=campusReflectionMatrix*modelMatrix*vec4(transformed,1.0);');
    shader.fragmentShader='uniform sampler2D campusReflection; uniform float campusReflectionValid; uniform float campusWaterTime; varying vec4 vCampusReflection;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      if(campusReflectionValid>0.5){
        vec2 reflectUV=vCampusReflection.xy/vCampusReflection.w;
        vec2 distortion=vec2(sin(reflectUV.y*120.0+campusWaterTime*.65),sin(reflectUV.x*95.0-campusWaterTime*.47))*.0011;
        vec3 reflected=texture2D(campusReflection,clamp(reflectUV+distortion,vec2(.001),vec2(.999))).rgb;
        float fresnel=.12+.65*pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),2.0);
        outgoingLight=mix(outgoingLight,reflected,min(.67,fresnel));
      }
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>oldKey.call(material)+'-campus-planar-v4';material.needsUpdate=true;
  let rendering=false,last=-Infinity,disposed=false;
  water.userData.reflector=true;water.userData.reflectionState={frames:0,failed:false};
  water.onBeforeRender=(_renderer,_scene,camera)=>{
    if(disposed||rendering||!camera.isPerspectiveCamera)return;
    const now=performance.now();uniforms.campusWaterTime.value=now/1000;
    if(now-last<125)return;
    water.getWorldPosition(waterPos);camera.getWorldPosition(cameraPos);
    if(cameraPos.y<=waterPos.y+.1)return;
    mirror.copy(camera,false);mirror.position.copy(cameraPos);mirror.position.y=2*waterPos.y-cameraPos.y;
    camera.getWorldDirection(look).add(cameraPos);look.y=2*waterPos.y-look.y;
    mirror.up.set(0,1,0).applyQuaternion(camera.quaternion).reflect(normal);
    mirror.lookAt(look);mirror.updateMatrixWorld();mirror.projectionMatrix.copy(camera.projectionMatrix);
    textureMatrix.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    // Oblique near plane clips geometry below the water rather than reflecting
    // the site's underside or the pond's own support geometry.
    plane.setFromNormalAndCoplanarPoint(normal,waterPos).applyMatrix4(mirror.matrixWorldInverse);
    clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const e=mirror.projectionMatrix.elements;
    q.set((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);
    const dot=clip.dot(q);if(Math.abs(dot)<1e-7)return;
    clip.multiplyScalar(2/dot);e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.002;e[14]=clip.w;
    const previousTarget=renderer.getRenderTarget(),previousXR=renderer.xr.enabled,previousShadow=renderer.shadowMap.autoUpdate;
    const previousTone=renderer.toneMapping;
    const viewport=new THREE.Vector4(),scissor=new THREE.Vector4();renderer.getViewport(viewport);renderer.getScissor(scissor);const scissorTest=renderer.getScissorTest();
    rendering=true;water.visible=false;
    try{
      renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=THREE.NoToneMapping;
      renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.clear();renderer.render(scene,mirror);
      uniforms.campusReflectionValid.value=1;water.userData.reflectionState.frames++;last=now;
    }catch(error){
      uniforms.campusReflectionValid.value=0;water.userData.reflectionState.failed=true;last=Infinity;
      console.warn('Optional pond reflections disabled; retaining base water shading.',error);
    }finally{
      water.visible=true;rendering=false;renderer.xr.enabled=previousXR;renderer.shadowMap.autoUpdate=previousShadow;renderer.toneMapping=previousTone;
      renderer.setRenderTarget(previousTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
    }
  };
  return {target,dispose(){if(disposed)return;disposed=true;water.onBeforeRender=()=>{};material.onBeforeCompile=oldCompile;material.customProgramCacheKey=oldKey;target.dispose();}};
}
