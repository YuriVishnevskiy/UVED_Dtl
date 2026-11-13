import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

const modelUrls = Object.fromEntries([
  'bmw-m4','bmw-x5-g05','bmw-x6-f96'
].map(name => [name,'./models/' + name + '.glb']));
const zones = ['hood','bumperF','bumperR','doorFL','doorFR','fenderFL','fenderFR','fenderRL','fenderRR','roof','trunk','mirrorL','mirrorR','cupFL','cupFR','sillL','sillR'];

// Coordinates are in the original M4 GLB mesh space. The paint mesh groups
// several panels together, so the same spatial boundaries drive picking and tint.
const classify = `
  int zone(vec3 p) {
    bool left = p.x > 285.7;
    float side = abs(p.x - 285.7);
    if (side > 3.74 && p.y < -162.8 && p.y > -163.9 && p.z < -3.78) return left ? 12 : 13;
    if (side > 3.55 && p.y < -166.14 && p.y > -167.15 && p.z < -3.29 && p.z > -3.74) return left ? 14 : 15;
    if (p.y > -158.1 && p.z > -3.48) return 2;
    if (p.y < -172.34 && p.z > -3.35) return 3;
    if (p.y < -172.0 && p.z < -3.35 && side < 3.1) return 11;
    if (p.z < -5.20 && p.y > -170.6 && p.y < -164.05) return 10;
    if (p.z < -3.02 && p.y > -162.05 && p.y < -156.6 && side < 2.88) return 1;
    if (p.z > -1.65 && side > 3.05 && p.y < -160.6 && p.y > -169.4) return left ? 16 : 17;
    if (side > 3.0 && p.y < -161.95 && p.y > -167.57 && p.z > -4.16 && p.z < -1.1) return left ? 4 : 5;
    if (side > 2.65 && p.y > -162.0 && p.z < -1.1) return left ? 6 : 7;
    if (side > 2.6 && p.y < -167.57 && p.z < -1.1) return left ? 8 : 9;
    return 0;
  }`;

function zoneIndex(p) {
  const left = p.x > 285.7;
  const side = Math.abs(p.x - 285.7);
  if (side > 3.74 && p.y < -162.8 && p.y > -163.9 && p.z < -3.78) return left ? 12 : 13;
  if (side > 3.55 && p.y < -166.14 && p.y > -167.15 && p.z < -3.29 && p.z > -3.74) return left ? 14 : 15;
  if (p.y > -158.1 && p.z > -3.48) return 2;
  if (p.y < -172.34 && p.z > -3.35) return 3;
  if (p.y < -172 && p.z < -3.35 && side < 3.1) return 11;
  if (p.z < -5.2 && p.y > -170.6 && p.y < -164.05) return 10;
  if (p.z < -3.02 && p.y > -162.05 && p.y < -156.6 && side < 2.88) return 1;
  if (p.z > -1.65 && side > 3.05 && p.y < -160.6 && p.y > -169.4) return left ? 16 : 17;
  if (side > 3 && p.y < -161.95 && p.y > -167.57 && p.z > -4.16 && p.z < -1.1) return left ? 4 : 5;
  if (side > 2.65 && p.y > -162 && p.z < -1.1) return left ? 6 : 7;
  if (side > 2.6 && p.y < -167.57 && p.z < -1.1) return left ? 8 : 9;
  return 0;
}

const pendingModels = new Map();
let viewer;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function model(name) {
  if (!pendingModels.has(name)) {
    pendingModels.set(name,new GLTFLoader().loadAsync(modelUrls[name]).catch(error => {
      pendingModels.delete(name);
      throw error;
    }));
  }
  return pendingModels.get(name);
}
const namedPanels = {
  bonnet:'hood','door-front-left':'doorFL','door-front-right':'doorFR',
  'door-rear-left':'doorRL','door-rear-right':'doorRR'
};
const fleetZones = [...zones,'tailgate','lightF','lightR'];
function classifyFleetPoint(point,box,tailgate,modelKey) {
  const size = box.getSize(new THREE.Vector3());
  const x = (point.x-box.min.x)/size.x;
  const y = (point.y-box.min.y)/size.y;
  const z = (point.z-box.min.z)/size.z;
  const side = (modelKey === 'bmw-x5-g05' ? x > .5 : x < .5) ? 'L' : 'R';
  const edge = Math.abs(x-.5);
  if (z > .90 && y < .61) return 'bumperF';
  if (z < .10 && y < .54) return 'bumperR';
  if (y > .87 && edge < .39) return 'roof';
  if (edge > .29 && z > .69) return 'fenderF'+side;
  if (edge > .29 && z < .30) return 'fenderR'+side;
  if (edge > .30 && y < .30) return 'sill'+side;
  if (z > .72 && y > .42) return 'hood';
  if (z < .18 && y > .44) return tailgate ? 'tailgate' : 'trunk';
  if (edge > .30 && z >= .30 && z <= .69 && y > .30 && y < .71) return 'door'+(z>.49?'F':'R')+side;
  if (edge > .36 && y > .48 && y < .68 && z > .56 && z < .73) return 'mirror'+side;
  return '';
}
function fleetPaint(highlights) {
  const material = new THREE.MeshPhysicalMaterial({
    color:0x9aa7b5,metalness:.62,roughness:.34,clearcoat:.78,clearcoatRoughness:.22,side:THREE.DoubleSide
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.fleetHighlight = highlights;
    shader.vertexShader = 'attribute float wrapZone; varying float fleetZone;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nfleetZone = wrapZone;'
    );
    shader.fragmentShader = 'varying float fleetZone; uniform float fleetHighlight[' + (fleetZones.length+1) + '];\n' + shader.fragmentShader.replace(
      '#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.31,.54,.85), fleetHighlight[int(fleetZone + .5)]);'
    );
  };
  return material;
}
function prepareFleetMesh(mesh,box,tailgate,material,modelKey) {
  let named;
  for (let node=mesh; node && !named; node=node.parent) {
    if (node.userData.panel) named=node.userData.panel;
    else if (/^boot(?:$|_)/.test(node.name)) named=tailgate?'tailgate':'trunk';
    else named=namedPanels[node.name];
  }
  const surface=mesh.material;
  if (!/^(paint|body$)/i.test(surface.name)) {
    if (/^light[FR]$/.test(named ?? '') || /^light(White|Amber|Red)/.test(surface.name)) {
      mesh.userData.part=named ?? (surface.name==='lightRed'?'lightR':'lightF');
      mesh.material=surface.clone();
      mesh.material.userData.base=surface.color.clone();
    }
    return null;
  }
  const geometry=mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const positions=geometry.attributes.position;
  const ids=new Float32Array(positions.count);
  const point=new THREE.Vector3();
  for (let i=0;i<positions.count;i+=3) {
    point.set(
      (positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3,
      (positions.getY(i)+positions.getY(i+1)+positions.getY(i+2))/3,
      (positions.getZ(i)+positions.getZ(i+1)+positions.getZ(i+2))/3
    ).applyMatrix4(mesh.matrixWorld);
    ids.fill(fleetZones.indexOf(named ?? classifyFleetPoint(point,box,tailgate,modelKey))+1,i,i+3);
  }
  geometry.setAttribute('wrapZone',new THREE.BufferAttribute(ids,1));
  mesh.geometry=geometry;
  mesh.material=material;
  return geometry;
}

function paintMaterial(highlights) {
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x9aa7b5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.29, clearcoat: 0.75, clearcoatRoughness: 0.23
  });
  paint.onBeforeCompile = shader => {
    shader.uniforms.panelHighlight = highlights;
    shader.vertexShader = 'varying vec3 panelPoint;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\npanelPoint = position;'
    );
    shader.fragmentShader = 'varying vec3 panelPoint;\nuniform float panelHighlight[18];\n' + classify + '\n' + shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.31, 0.50, 0.74), panelHighlight[zone(panelPoint)]);'
    );
  };
  return paint;
}

function createViewer(host, gltf, callbacks, options) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label','3D-модель: ' + options.label + '. Поворот стрелками влево и вправо.');
  host.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(5.8, 2.65, 5.85);
  camera.lookAt(0, 0.49, 0);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.025);
  scene.environment = environment.texture;
  const fill = new THREE.HemisphereLight(0xcad9f6,0x474241,1.15);
  const key = new THREE.DirectionalLight(0xe8efff,2.0);
  key.position.set(-2,6,5);
  const edge = new THREE.DirectionalLight(0xd3e3ff,1.7);
  edge.position.set(-4,3,-5);
  scene.add(fill,key,edge);
  room.dispose();
  pmrem.dispose();

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(2.95, 3.04, 0.18, 128),
    new THREE.MeshStandardMaterial({color:0x65706d, metalness:0.12, roughness:0.72})
  );
  pedestal.position.y = -0.092;
  scene.add(pedestal);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.955, 0.013, 8, 128),
    new THREE.MeshStandardMaterial({color:0xb7ced5, metalness:0.56, roughness:0.44})
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.035;
  scene.add(rim);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64,64,8,64,64,62);
  gradient.addColorStop(0,'rgba(0,0,0,.8)');
  gradient.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,128,128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8,5.7),new THREE.MeshBasicMaterial({
    map:shadowTexture, transparent:true, depthWrite:false
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  const turntable = new THREE.Group();
  turntable.add(shadow);
  scene.add(turntable);

  const car = gltf.scene.clone(true);
  const box = new THREE.Box3().setFromObject(car);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = 4.8 / Math.max(size.x, size.z);
  car.scale.setScalar(scale);
  car.position.set(-center.x * scale, 0.018 - box.min.y * scale, -center.z * scale);
  turntable.add(car);

  car.updateMatrixWorld(true);
  const fleetBox = new THREE.Box3().setFromObject(car);
  const fleetHighlight = {value:new Float32Array(fleetZones.length+1)};
  const genericPaint = fleetPaint(fleetHighlight);
  const fleetGeometries = [];
  const fleetLightMaterials = [];
  const highlight = {value: new Float32Array(18)};
  const paint = paintMaterial(highlight);
  const pickable = new Set();
  const surfaces = [];
  car.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (options.modelKey === 'bmw-m4' && /logo|badge|emblem/i.test(mesh.material.name)) {
      mesh.visible = false;
      return;
    }
    surfaces.push(mesh);
    if (options.modelKey === 'bmw-x5-g05' || options.modelKey === 'bmw-x6-f96') {
      const geometry = prepareFleetMesh(mesh,fleetBox,true,genericPaint,options.modelKey);
      if (geometry) {
        fleetGeometries.push(geometry);
        pickable.add(mesh);
      }
      if (mesh.userData.part && mesh.material.userData.base) fleetLightMaterials.push(mesh.material);
    }
    if (mesh.userData.part) pickable.add(mesh);
    if (options.modelKey === 'bmw-m4' && /^Meshes(zx1|body151|livery1)Mtl$/.test(mesh.material.name)) {
      mesh.material = paint;
      pickable.add(mesh);
    }
  });

  const tint = new THREE.Color(0x6baafa);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let target = -0.39;
  let angle = target;
  let pointer;
  let hover;
  let chosen = new Set();
  const transitions = new Map();
  const finish = {
    clear: [0x9aa7b5,.27,.88], color:[0x446b82,.32,.70],
    matte:[0x9aa7b5,.76,.08], satin:[0x9aa7b5,.48,.38]
  }[options.finish] ?? [0x9aa7b5,.34,.78];
  const finishColor = new THREE.Color(finish[0]);
  let finishStart = options.finish ? performance.now() : null;
  let raf = 0;
  let lastTime = 0;
  const controller = new AbortController();
  const on = (element, event, handler) => element.addEventListener(event, handler,{signal:controller.signal});
  const resize = new ResizeObserver(() => {
    if (!host.clientWidth || !host.clientHeight) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.fov = camera.aspect < 1.35 ? 43 : 34;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    schedule();
  });
  resize.observe(host);

  function schedule() {
    if (!raf) raf = requestAnimationFrame(render);
  }
  function render(time) {
    raf = 0;
    const elapsed = Math.min(48, time - lastTime || 16);
    lastTime = time;
    angle += (target - angle) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 65));
    turntable.rotation.y = angle;
    const still = reducedMotion.matches;
    if (finishStart !== null) {
      const progress = still ? 1 : THREE.MathUtils.clamp((time - finishStart) / 720, 0, 1);
      const ease = 1 - (1 - progress) ** 3;
      for (const material of [paint, genericPaint]) {
        material.color.setHex(0x9aa7b5).lerp(finishColor, ease);
        material.roughness = THREE.MathUtils.lerp(.34, finish[1], ease);
        material.clearcoat = THREE.MathUtils.lerp(.78, finish[2], ease);
      }
      if (progress === 1) finishStart = null;
    }
    highlightPanels(time);
    renderer.render(scene,camera);
    if (Math.abs(target - angle) > 0.001 || transitions.size || finishStart !== null) schedule();
  }
  function highlightPanels(time) {
    const still = reducedMotion.matches;
    const strengths = new Map();
    for (const [id, change] of transitions) {
      const progress = still ? 1 : THREE.MathUtils.clamp((time - change.start) / 420, 0, 1);
      const sweep = change.to > change.from ? Math.sin(Math.PI * progress) * .24 : 0;
      strengths.set(id, THREE.MathUtils.clamp(THREE.MathUtils.lerp(change.from, change.to, progress) + sweep, 0, 1.2));
      if (progress === 1) transitions.delete(id);
    }
    function strength(id) {
      const group = id.startsWith('mirror') ? 'mirrors' : id.startsWith('cup') ? 'cups' : id;
      return Math.max(strengths.get(id) ?? Number(chosen.has(id)), strengths.get(group) ?? Number(chosen.has(group)));
    }
    zones.forEach((id,i) => { highlight.value[i+1] = Math.max(strength(id)*.36, hover === id ? .16 : 0); });
    fleetZones.forEach((id,i) => { fleetHighlight.value[i+1] = Math.max(strength(id)*.46, hover === id ? .20 : 0); });
    for (const mesh of pickable) {
      const id = mesh.userData.part;
      if (!id || !mesh.material.userData.base) continue;
      mesh.material.color.copy(mesh.material.userData.base).lerp(tint, Math.max(strength(id)*.48, hover === id ? .22 : 0));
    }
  }
  function findPanel(event) {
    const bounds = canvas.getBoundingClientRect();
    mouse.set((event.clientX-bounds.left)/bounds.width*2-1, 1-(event.clientY-bounds.top)/bounds.height*2);
    raycaster.setFromCamera(mouse,camera);
    const hit = raycaster.intersectObjects(surfaces,false)[0];
    if (!hit || !pickable.has(hit.object)) return;
    const ids = hit.object.geometry.getAttribute('wrapZone');
    if (ids) return fleetZones[ids.getX(hit.faceIndex*3)-1];
    return hit.object.userData.part ?? zones[zoneIndex(hit.object.worldToLocal(hit.point)) - 1];
  }
  function setHover(id) {
    if (id === hover) return;
    hover = id;
    callbacks.inspect(id);
    schedule();
  }
  on(canvas,'pointerdown',event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp,velocity:0,drag:false};
  });
  on(canvas,'pointermove',event => {
    if (!pointer) {
      setHover(findPanel(event));
      return;
    }
    if (pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    if (!pointer.drag && (Math.abs(dx) < 7 || Math.abs(event.clientY-pointer.y) > Math.abs(dx))) return;
    if (!pointer.drag) {
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
      setHover(undefined);
    }
    pointer.drag = true;
    target += dx * 0.009;
    pointer.velocity = dx / Math.max(12,event.timeStamp-pointer.time);
    pointer.x = event.clientX;
    pointer.time = event.timeStamp;
    schedule();
  });
  on(canvas,'pointerup',event => {
    if (pointer?.id !== event.pointerId) return;
    if (pointer.drag) {
      if (!reducedMotion.matches && event.timeStamp - pointer.time < 90) {
        target += THREE.MathUtils.clamp(pointer.velocity * 0.19,-0.25,0.25);
      }
      schedule();
    } else {
      const id = findPanel(event);
      if (id && !/^(cup|handle|grille|sill)/.test(id)) callbacks.select(id);
      setHover(id);
      callbacks.inspect(id);
    }
    pointer = undefined;
    canvas.classList.remove('is-dragging');
  });
  function cancelPointer() {
    pointer = undefined;
    canvas.classList.remove('is-dragging');
    setHover(undefined);
  }
  on(canvas,'pointercancel',cancelPointer);
  on(canvas,'pointerleave',() => {if (!pointer?.drag) cancelPointer();});
  function turn(direction) {
    target += direction * Math.PI / 4;
    schedule();
  }
  on(canvas,'keydown',event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    turn(event.key === 'ArrowLeft' ? -1 : 1);
  });
  host.querySelectorAll('[data-paint]').forEach(button => on(button,'click',() => {
    finishStart = null;
    const color = new THREE.Color(button.dataset.paint);
    paint.color.copy(color);
    genericPaint.color.copy(color);
    host.querySelectorAll('[data-paint]').forEach(swatch => swatch.setAttribute('aria-pressed',String(swatch===button)));
    schedule();
  }));
  host.querySelectorAll('[data-turn]').forEach(button => on(button,'click',() => turn(Number(button.dataset.turn))));
  schedule();

  return {
    host,
    sync(ids) {
      const next = new Set(ids);
      const now = performance.now();
      let index = 0;
      for (const id of new Set([...next, ...chosen])) {
        const from = Number(chosen.has(id));
        const to = Number(next.has(id));
        if (from === to) continue;
        const change = transitions.get(id);
        const progress = change ? THREE.MathUtils.clamp((now - change.start) / 420, 0, 1) : 1;
        const current = change ? THREE.MathUtils.lerp(change.from, change.to, progress) : from;
        transitions.set(id, {from:current, to, start:now + (to ? Math.min(index++, 8) * 85 : 0)});
      }
      chosen = next;
      schedule();
    },
    dispose() {
      controller.abort();
      resize.disconnect();
      cancelAnimationFrame(raf);
      [pedestal,rim,shadow].forEach(mesh => {mesh.geometry.dispose();mesh.material.dispose();});
      fleetGeometries.forEach(geometry => geometry.dispose());
      fleetLightMaterials.forEach(surface => surface.dispose());
      genericPaint.dispose();
      paint.dispose();
      shadowTexture.dispose();
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    }
  };
}

window.uvedShowroom = {
  async mount(host, callbacks, options) {
    try {
      const gltf = await model(options.modelKey);
      if (!host.isConnected || (options.active && !options.active())) return;
      viewer?.dispose();
      viewer = createViewer(host,gltf,callbacks,options);
      viewer.sync(callbacks.selected());
      host.querySelector('.showroom-status').hidden = true;
    } catch (error) {
      if (host.isConnected) host.querySelector('.showroom-status').textContent = '3D-модель не загрузилась. Выберите детали в списке.';
      console.error(error);
    }
  },
  sync(ids) {if (viewer && viewer.host.id !== 'vehicle-preview') viewer.sync(ids);},
  unmount(host) {
    if (!viewer || (host && viewer.host !== host)) return;
    viewer.dispose();
    viewer = undefined;
  }
};
