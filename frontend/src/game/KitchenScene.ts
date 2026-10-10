import * as THREE from 'three';
import type { ContentItem } from '../domain';

/** Lightweight, offline-ready stylised 3D kitchen. Asset keys remain independent of models. */
export class KitchenScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private renderer: THREE.WebGLRenderer;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private targets: THREE.Group[] = [];
  private selectable: THREE.Object3D[] = [];
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private hovered?: THREE.Group;
  private timer = new THREE.Timer();
  private mascot?: THREE.Group;
  private celebrateUntil = 0;
  private selected?: THREE.Group;
  onSelect?: (key: string) => void;

  constructor(private container: HTMLElement, items: ContentItem[]) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.timer.connect(container.ownerDocument);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.65;
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y';
    this.renderer.domElement.setAttribute('aria-label', '可交互的 3D 厨房，点击物品回答');
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color('#e8f1e5');
    this.scene.fog = new THREE.Fog('#e8f1e5', 14, 29);
    this.camera.position.set(0, 4.5, 10.8);
    this.camera.lookAt(0, 1.2, 0);

    const ambient = new THREE.HemisphereLight(0xeef8ff, 0xa17b63, 2.1);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffedcc, 3.5);
    sun.position.set(-3, 9, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
    sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    const fill = new THREE.PointLight(0xffffff, 14, 15);
    fill.position.set(5, 5, 3); this.scene.add(fill);

    this.buildRoom();
    this.buildMascot();
    const unique = Array.from(new Map(items.map(item => [item.assetKey, item])).values()).slice(0, 5);
    unique.forEach((item, i) => {
      const model = this.createItem(item.assetKey);
      model.position.set((i - (unique.length - 1) / 2) * 1.65, 1.32, 0.65);
      model.userData.key = item.assetKey;
      model.userData.baseY = model.position.y;
      model.traverse(child => { child.userData.key = item.assetKey; });
      this.scene.add(model);
      this.targets.push(model);
      this.selectable.push(model);
    });
    this.renderer.domElement.addEventListener('pointermove', this.move);
    this.renderer.domElement.addEventListener('pointerleave', this.leave);
    this.renderer.domElement.addEventListener('pointerup', this.click);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
  }

  private mat(color: string, roughness = .72, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
  private addBox(parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], color: string, bevel = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.mat(color));
    mesh.position.set(...pos);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    if (bevel) mesh.rotation.y = bevel;
    return mesh;
  }
  private addMesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: string, pos: [number,number,number], roughness = .7) {
    const mesh = new THREE.Mesh(geometry, this.mat(color, roughness));
    mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private buildRoom() {
    this.addBox(this.scene, [28, .22, 20], [0, -.16, 0], '#d8c2a9');
    this.addBox(this.scene, [24, 13, .2], [0, 6, -6], '#f6eee0');
    this.addBox(this.scene, [.18, 13, 18], [-11, 6, -1], '#e7e3cd');
    // Warm window with visible sky and crossbars.
    this.addBox(this.scene, [4.0, 3.25, .12], [-5.5, 4.9, -5.8], '#d9aa6a');
    this.addBox(this.scene, [3.45, 2.8, .13], [-5.5, 4.9, -5.68], '#a9dce6');
    this.addBox(this.scene, [.15, 3, .2], [-5.5, 4.9, -5.55], '#fff5dd');
    this.addBox(this.scene, [3.5, .15, .2], [-5.5, 4.9, -5.54], '#fff5dd');
    // Cabinet and shelves at back bring spatial depth.
    this.addBox(this.scene, [8.5, 1.5, 1.5], [3.6, 1.05, -4.45], '#b5cda3');
    this.addBox(this.scene, [9.1, .23, 1.75], [3.6, 1.85, -4.35], '#f4e4cc');
    for (const x of [-.05, 2.45, 4.95, 7.2]) {
      this.addBox(this.scene, [.06, 1.27, .08], [x, 1.07, -3.65], '#8da67c');
    }
    this.addBox(this.scene, [6, .15, .9], [2.1, 4.7, -5.18], '#b88053');
    for (let i = 0; i < 5; i++) {
      this.addBox(this.scene, [.24, 1.05, .55], [i * .55 + .7, 5.25, -5.1], ['#a6c9d0','#f1b59e','#e9db9c'][i % 3]);
    }
    // Main island with an overhang, thickness and legs.
    this.addBox(this.scene, [9.5, .34, 3.8], [0, .94, .75], '#e9bd89');
    this.addBox(this.scene, [9.2, .12, 3.7], [0, 1.13, .75], '#fff0d8');
    this.addBox(this.scene, [8.2, .78, 2.7], [0, .35, .65], '#81a698');
    this.addBox(this.scene, [8.3, .12, .15], [0, .35, 2.04], '#658b80');
    // Small decorative plant and pot.
    this.addMesh(this.scene, new THREE.CylinderGeometry(.28,.21,.48,16), '#f6b07d', [7.65, 2.15, -4.5]);
    for (let i = 0; i < 5; i++) {
      const leaf = this.addMesh(this.scene, new THREE.SphereGeometry(.17,10,10),'#4d9a70',[7.65 + Math.cos(i*1.25)*.27,2.6 + (i%2)*.18,-4.5 + Math.sin(i*1.25)*.2]);
      leaf.scale.set(.8,2.0,.8);
    }
  }
  /** Original cartoon guide, made with native meshes for offline support. */
  private buildMascot() {
    const pet = new THREE.Group();
    const body=this.addMesh(pet,new THREE.SphereGeometry(.60,24,20),'#f4aa6d',[0,.65,0]);body.scale.set(1,.94,.82);
    const face=this.addMesh(pet,new THREE.SphereGeometry(.46,24,20),'#ffe4bb',[0,.72,.38]);face.scale.set(1,.83,.45);
    for(const x of [-.19,.19]) {
      const ear=this.addMesh(pet,new THREE.CapsuleGeometry(.16,.48,8,12),'#f4aa6d',[x,1.45,-.06]);
      ear.rotation.z=x<0?.18:-.18;
      this.addMesh(pet,new THREE.SphereGeometry(.075,16,12),'#3e4a49',[x,.81,.59]);
      const cheek=this.addMesh(pet,new THREE.SphereGeometry(.10,12,12),'#f99fa2',[x*1.6,.59,.57]);cheek.scale.z=.5;
    }
    this.addMesh(pet,new THREE.SphereGeometry(.075,12,12),'#925d4e',[0,.57,.66]);
    for(const x of [-.32,.32])this.addMesh(pet,new THREE.SphereGeometry(.18,16,12),'#f4aa6d',[x,.13,.09]);
    pet.position.set(-3.7,1.55,-1.1);pet.scale.setScalar(.95);
    this.scene.add(pet);this.mascot=pet;
  }
  celebrate(key: string) {
    this.selected=this.targets.find(target=>target.userData.key===key);
    this.celebrateUntil=this.timer.getElapsed()+1.25;
  }
  private createItem(key: string): THREE.Group {
    const g = new THREE.Group();
    if (key === 'food.apple') {
      const apple = this.addMesh(g,new THREE.SphereGeometry(.47,32,24),'#e74340',[0,.12,0],.4);
      apple.scale.set(1, .92, .96);
      this.addMesh(g,new THREE.CylinderGeometry(.055,.07,.27,10),'#68432a',[0,.65,0]);
      const leaf = this.addMesh(g,new THREE.SphereGeometry(.23,16,12),'#73aa56',[.18,.7,0]);
      leaf.scale.set(1.1,.24,.55);leaf.rotation.z=.45;
      this.addMesh(g,new THREE.SphereGeometry(.12,12,8),'#ff8971',[-.19,.31,.38]).scale.set(1.5,.7,.2);
    } else if(key === 'food.banana') {
      const banana = this.addMesh(g,new THREE.TorusGeometry(.5,.19,12,44,Math.PI*.90),'#f8cf46',[0,.08,0],.5);
      banana.rotation.z=.25;banana.rotation.x=-.4;
      this.addMesh(g,new THREE.CylinderGeometry(.1,.1,.17,12),'#937b39',[-.48,-.04,0]);
    } else if(key === 'tableware.cup') {
      this.addMesh(g,new THREE.CylinderGeometry(.37,.31,.75,32),'#67b6cb',[0,.14,0],.28);
      const rim=this.addMesh(g,new THREE.TorusGeometry(.37,.055,12,32),'#b9e6e9',[0,.54,0],.2);rim.rotation.x=Math.PI/2;
      const handle=this.addMesh(g,new THREE.TorusGeometry(.25,.09,12,28),'#67b6cb',[.4,.15,0]);handle.rotation.y=Math.PI/2;
      this.addMesh(g,new THREE.CylinderGeometry(.29,.29,.015,32),'#4a8998',[0,.54,0]);
    } else if(key === 'tableware.plate') {
      this.addMesh(g,new THREE.CylinderGeometry(.66,.52,.12,40),'#f1e9de',[0,-.2,0],.2);
      const rim=this.addMesh(g,new THREE.TorusGeometry(.55,.09,12,40),'#dcbca3',[0,-.12,0]);rim.rotation.x=Math.PI/2;
      this.addMesh(g,new THREE.CylinderGeometry(.42,.42,.02,40),'#fdf9f2',[0,-.12,0]);
    } else if(key==='food.bread') {
      const loaf=this.addMesh(g,new THREE.CapsuleGeometry(.42,.52,9,24),'#ba7a40',[0,.04,0]);
      loaf.rotation.z=Math.PI/2;loaf.scale.set(.9,1,1.05);
      const crust=this.addMesh(g,new THREE.BoxGeometry(.8,.10,.8),'#eab475',[0,.14,.02]);
      crust.rotation.z=.1;
    } else {
      this.addMesh(g,new THREE.DodecahedronGeometry(.45),'#9fc89f',[0,.1,0]);
    }
    // Floating pedestal makes each target visibly distinct and clickable.
    this.addMesh(g,new THREE.CylinderGeometry(.75,.8,.085,40),'#fff9ee',[0,-.58,0],.55);
    const ring=this.addMesh(g,new THREE.TorusGeometry(.71,.027,8,40),'#e7c49c',[0,-.52,0]);
    ring.rotation.x=Math.PI/2;
    return g;
  }
  private hit(event: PointerEvent) {
    const bounds=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects(this.selectable,true);
    return hits.length ? this.targets.find(x => x.userData.key === hits[0].object.userData.key) : undefined;
  }
  private move=(event:PointerEvent)=> {
    this.hovered=this.hit(event);
    this.renderer.domElement.style.cursor=this.hovered?'pointer':'grab';
  };
  private leave=()=>{this.hovered=undefined};
  private click=(event:PointerEvent)=>{const target=this.hit(event);if(target)this.onSelect?.(target.userData.key as string)};
  private resize(){
    const w=this.container.clientWidth,h=this.container.clientHeight||420;
    this.camera.aspect=w/h;
    this.camera.position.set(0,w<650?5.8:4.5,w<650?15:10.8);
    this.camera.lookAt(0,1.15,.2);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);
  }
  private animate=()=>{
    this.frame=requestAnimationFrame(this.animate);
    this.timer.update();
    const t=this.timer.getElapsed();
    for(let i=0;i<this.targets.length;i++){
      const item=this.targets[i],hover=item===this.hovered;
      item.position.y=(item.userData.baseY as number)+Math.sin(t*1.7+i)*.04+(hover?.17:0);
      const scale=hover?1.12:1;
      item.scale.lerp(new THREE.Vector3(scale,scale,scale),.14);
      item.rotation.y=Math.sin(t*.55+i)*.055;
    }
    if(this.mascot){
      this.mascot.position.y=1.55+Math.sin(t*2.7)*.085;
      this.mascot.rotation.z=Math.sin(t*1.4)*.07;
    }
    if(this.selected && t<this.celebrateUntil) {
      this.selected.rotation.y+=.13;
      this.selected.scale.setScalar(1.15+Math.sin(t*16)*.07);
    } else if(t>=this.celebrateUntil)this.selected=undefined;
    this.renderer.render(this.scene,this.camera);
  };
  dispose(){
    cancelAnimationFrame(this.frame);this.timer.dispose();this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove',this.move);
    this.renderer.domElement.removeEventListener('pointerleave',this.leave);
    this.renderer.domElement.removeEventListener('pointerup',this.click);
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh){
      object.geometry.dispose();
      for(const mat of (Array.isArray(object.material)?object.material:[object.material]))mat.dispose();
    }});
    this.renderer.dispose();this.renderer.domElement.remove();
  }
}
