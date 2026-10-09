import * as THREE from 'three';
import type {ContentItem} from '../domain';
/** Semantic asset registry: replace procedural meshes with GLB later without changing activity logic. */
export class KitchenScene {
 private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(48,1,.1,100);
 private renderer:THREE.WebGLRenderer;private raycaster=new THREE.Raycaster();private pointer=new THREE.Vector2();
 private meshes:THREE.Object3D[]=[];private frame=0;private resizeObserver:ResizeObserver;
 onSelect?:(key:string)=>void;
 constructor(private container:HTMLElement,items:ContentItem[]){
 this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));container.appendChild(this.renderer.domElement);
 this.scene.background=new THREE.Color('#f3dfb9');this.camera.position.set(0,5.8,10.5);this.camera.lookAt(0,.45,0);
 this.scene.add(new THREE.HemisphereLight(0xffffff,0xb7a68a,2.4));
 const floor=new THREE.Mesh(new THREE.BoxGeometry(12,.2,8),new THREE.MeshStandardMaterial({color:0xe0b78e}));floor.position.y=-.6;this.scene.add(floor);
 const table=new THREE.Mesh(new THREE.BoxGeometry(8,.3,3),new THREE.MeshStandardMaterial({color:0xb67845}));table.position.y=-.2;this.scene.add(table);
 items.forEach((item,i)=>{const mesh=this.createObject(item.assetKey);mesh.position.set((i-(items.length-1)/2)*1.65,.45,0);mesh.userData.assetKey=item.assetKey;mesh.traverse(obj=>obj.userData.assetKey=item.assetKey);this.scene.add(mesh);this.meshes.push(mesh)})
 this.renderer.domElement.addEventListener('pointerup',this.handlePointer);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.animate();}
 private createObject(key:string):THREE.Group {const group=new THREE.Group();const colors:Record<string,number>={'food.apple':0xd83d38,'food.banana':0xf7d34a,'tableware.cup':0x69b8ed,'tableware.plate':0xf5f3ea,'food.bread':0xc68a4e};const material=new THREE.MeshStandardMaterial({color:colors[key]??0xb7cb94});let geometry:THREE.BufferGeometry;
 if(key==='tableware.cup')geometry=new THREE.CylinderGeometry(.48,.38,.9,24);
 else if(key==='tableware.plate')geometry=new THREE.CylinderGeometry(.68,.68,.11,32);
 else if(key==='food.banana')geometry=new THREE.CapsuleGeometry(.25,1.05,8,16);
 else if(key==='food.bread')geometry=new THREE.BoxGeometry(.95,.65,.65);
 else geometry=new THREE.SphereGeometry(.55,24,16);
 const object=new THREE.Mesh(geometry,material);if(key==='food.banana')object.rotation.z=-.8;group.add(object);return group;}
 private handlePointer=(event:PointerEvent)=>{const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects(this.meshes,true);if(hits.length){const key=hits[0].object.userData.assetKey as string;this.onSelect?.(key)}};
 private resize(){const width=this.container.clientWidth,height=this.container.clientHeight||350;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height)}
 private animate=()=>{this.frame=requestAnimationFrame(this.animate);this.renderer.render(this.scene,this.camera)};
 dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.renderer.domElement.removeEventListener('pointerup',this.handlePointer);this.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m=>m.dispose())}});this.renderer.dispose();this.renderer.domElement.remove()}
}