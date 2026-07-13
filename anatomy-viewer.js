// ═══════════════════════════════════════════════════════════
// OFFLINE 3D ANATOMY VIEWER — Three.js + local GLB, no network dependency.
// Requires THREE (r128) + THREE.GLTFLoader loaded first via <script> tags.
// Model: "human male muscular anatomy model" by Chenzoss (Sketchfab), CC-BY-4.0.
// ═══════════════════════════════════════════════════════════
function createAnatomyViewer(container, opts){
  opts=opts||{};
  const glbPath=opts.glbPath||'human_muscular_anatomy_model.glb';
  const rotateSpeed=opts.rotateSpeed!=null?opts.rotateSpeed:0.0025;
  const onLoaded=opts.onLoaded||function(){};
  const onError=opts.onError||function(){};

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,Math.max(container.clientWidth,1)/Math.max(container.clientHeight,1),0.01,1000);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(container.clientWidth,container.clientHeight);
  if('outputEncoding' in renderer)renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff,0x1a1a24,1.15));
  const key=new THREE.DirectionalLight(0xffffff,1.4);key.position.set(2,4,3);scene.add(key);
  const rim=new THREE.DirectionalLight(0xfb7185,0.55);rim.position.set(-3,1.5,-2.5);scene.add(rim);
  const fill=new THREE.DirectionalLight(0x60a5fa,0.35);fill.position.set(3,-1,-2);scene.add(fill);

  let center=new THREE.Vector3(),radius=2,angle=0,model=null,raf=null,bbox=null;
  // Current vs. target orbit focus — lets focusRegion() retarget smoothly without
  // needing hand-guessed per-model coordinates (everything is derived from the
  // model's own real bounding box, so it's always framed correctly).
  let curCenter=new THREE.Vector3(),curRadius=2;
  let targetCenter=new THREE.Vector3(),targetRadius=2;

  function fit(object){
    const box=new THREE.Box3().setFromObject(object);
    const size=box.getSize(new THREE.Vector3());
    center=box.getCenter(new THREE.Vector3());
    bbox={min:box.min.clone(),max:box.max.clone(),size:size.clone(),center:center.clone()};
    const maxDim=Math.max(size.x,size.y,size.z)||1;
    const fov=camera.fov*(Math.PI/180);
    radius=Math.abs(maxDim/Math.sin(fov/2))*0.62;
    curCenter.copy(center);curRadius=radius;
    targetCenter.copy(center);targetRadius=radius;
    camera.near=radius/100;camera.far=radius*20;
    camera.position.set(center.x,center.y+size.y*0.05,center.z+radius);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }

  // fracY: 0=bottom of model, 1=top. zoom: smaller=closer. Framing is computed
  // from the model's actual measured height, not guessed absolute coordinates,
  // so it's correct for whatever model is loaded.
  function focusRegion(fracY,zoom){
    if(!bbox)return;
    targetCenter.set(bbox.center.x,bbox.min.y+bbox.size.y*fracY,bbox.center.z);
    targetRadius=Math.max(bbox.size.y*(zoom!=null?zoom:0.55),bbox.size.y*0.12);
  }
  function resetRegion(){
    if(!bbox)return;
    targetCenter.copy(center);
    targetRadius=radius;
  }

  const loader=new THREE.GLTFLoader();
  loader.load(glbPath,function(gltf){
    model=gltf.scene;
    scene.add(model);
    fit(model);
    tick();
    onLoaded();
  },undefined,function(err){
    console.error('Anatomy model failed to load:',err);
    onError(err);
  });

  function tick(){
    raf=requestAnimationFrame(tick);
    angle+=rotateSpeed;
    curCenter.lerp(targetCenter,0.06);
    curRadius+=(targetRadius-curRadius)*0.06;
    camera.position.x=curCenter.x+Math.sin(angle)*curRadius;
    camera.position.z=curCenter.z+Math.cos(angle)*curRadius;
    camera.position.y=curCenter.y+curRadius*0.05;
    camera.lookAt(curCenter);
    renderer.render(scene,camera);
  }

  function resize(){
    if(!container.clientWidth||!container.clientHeight)return;
    camera.aspect=container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth,container.clientHeight);
  }
  window.addEventListener('resize',resize);

  function pause(){if(raf){cancelAnimationFrame(raf);raf=null;}}
  function resume(){if(!raf&&model)tick();}
  function dispose(){
    pause();
    window.removeEventListener('resize',resize);
    renderer.dispose();
    if(container.contains(renderer.domElement))container.removeChild(renderer.domElement);
  }

  return{
    pause:pause,resume:resume,resize:resize,dispose:dispose,focusRegion:focusRegion,resetRegion:resetRegion,
    get camera(){return camera;},get center(){return center;},get radius(){return radius;},get loaded(){return!!model;}
  };
}
