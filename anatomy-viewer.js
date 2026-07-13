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

  let center=new THREE.Vector3(),radius=2,angle=0,model=null,raf=null;

  function fit(object){
    const box=new THREE.Box3().setFromObject(object);
    const size=box.getSize(new THREE.Vector3());
    center=box.getCenter(new THREE.Vector3());
    const maxDim=Math.max(size.x,size.y,size.z)||1;
    const fov=camera.fov*(Math.PI/180);
    radius=Math.abs(maxDim/Math.sin(fov/2))*0.62;
    camera.near=radius/100;camera.far=radius*20;
    camera.position.set(center.x,center.y+size.y*0.05,center.z+radius);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
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
    camera.position.x=center.x+Math.sin(angle)*radius;
    camera.position.z=center.z+Math.cos(angle)*radius;
    camera.lookAt(center);
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
    pause:pause,resume:resume,resize:resize,dispose:dispose,
    get camera(){return camera;},get center(){return center;},get radius(){return radius;},get loaded(){return!!model;}
  };
}
