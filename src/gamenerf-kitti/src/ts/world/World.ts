import * as THREE from 'three';
import * as CANNON from 'cannon';
import Swal from 'sweetalert2';
import * as $ from 'jquery';

import { CameraOperator } from '../core/CameraOperator';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader  } from 'three/examples/jsm/shaders/FXAAShader';

import { Detector } from '../../lib/utils/Detector';
import { Stats } from '../../lib/utils/Stats';
import * as GUI from '../../lib/utils/dat.gui';
import { CannonDebugRenderer } from '../../lib/cannon/CannonDebugRenderer';
import * as _ from 'lodash';

import { InputManager } from '../core/InputManager';
import * as Utils from '../core/FunctionLibrary';
import { LoadingManager } from '../core/LoadingManager';
import { InfoStack } from '../core/InfoStack';
import { UIManager } from '../core/UIManager';
import { IWorldEntity } from '../interfaces/IWorldEntity';
import { IUpdatable } from '../interfaces/IUpdatable';
import { Character } from '../characters/Character';
import { Path } from './Path';
import { Coins } from './Coins';
import {Vase} from './Vase';
import { CollisionGroups } from '../enums/CollisionGroups';
import { BoxCollider } from '../physics/colliders/BoxCollider';
import { TrimeshCollider } from '../physics/colliders/TrimeshCollider';
import { Vehicle } from '../vehicles/Vehicle';
import { Scenario } from './Scenario';
import { Sky } from './Sky';
import { Ocean } from './Ocean';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'

import { NeRFShader } from '../../lib/shaders/NeRFShader'
import { Vector3 } from 'three';
import { SimplifyModifier } from '../../lib/utils/THREE.SimplifyModifiers.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {Geometry, Face3} from 'three/examples/jsm/deprecated/Geometry'
// import express from 'express';
// import cors from 'cors';

// const app = express();
// app.use(cors());

const SCALE = 34.77836216;
const external = 'https://huggingface.co/hongchi/video2game_v1.0/resolve/main/'
// const external = './nerf_models/'
const CH = 14.5;

function distance(point, rectangle) {
	const rectangleX1 = rectangle[0][0];
	const rectangleY1 = rectangle[0][1];
	const rectangleX2 = rectangle[1][0];
	const rectangleY2 = rectangle[1][1];
	const rectangleX3 = rectangle[2][0];
	const rectangleY3 = rectangle[2][1];
	const rectangleX4 = rectangle[3][0];
	const rectangleY4 = rectangle[3][1];

	var average_x = (rectangleX1 + rectangleX2 + rectangleX3 + rectangleX4) / 4;
	var average_y = (rectangleY1 + rectangleY2 + rectangleY3 + rectangleY4) / 4;

	return (point[0] - average_x)*(point[0] - average_x) + (point[1] - average_y)*(point[1] - average_y)
}

function pointInRectangle(point, rectangle):boolean {
	// Unpack the point coordinates
	const pointX = point[0];
	const pointY = point[1];
  
	// Unpack the rectangle coordinates
	const rectangleX1 = rectangle[0][0];
	const rectangleY1 = rectangle[0][1];
	const rectangleX2 = rectangle[1][0];
	const rectangleY2 = rectangle[1][1];
	const rectangleX3 = rectangle[2][0];
	const rectangleY3 = rectangle[2][1];
	const rectangleX4 = rectangle[3][0];
	const rectangleY4 = rectangle[3][1];
  
	// Calculate the vectors of the rectangle sides
	const vector1X = rectangleX2 - rectangleX1;
	const vector1Y = rectangleY2 - rectangleY1;
	const vector2X = rectangleX3 - rectangleX2;
	const vector2Y = rectangleY3 - rectangleY2;
  
	// Calculate the dot products
	const dotProduct1 = (pointX - rectangleX1) * vector1X + (pointY - rectangleY1) * vector1Y;
	const dotProduct2 = (pointX - rectangleX2) * vector2X + (pointY - rectangleY2) * vector2Y;
  
	// Check if the dot products have the same sign
	if ((dotProduct1 >= 0 && dotProduct2 >= 0)) {
	  // Calculate the vectors of the other two sides
	  const vector3X = rectangleX4 - rectangleX3;
	  const vector3Y = rectangleY4 - rectangleY3;
	  const vector4X = rectangleX1 - rectangleX4;
	  const vector4Y = rectangleY1 - rectangleY4;
  
	  // Calculate the dot products
	  const dotProduct3 = (pointX - rectangleX3) * vector3X + (pointY - rectangleY3) * vector3Y;
	  const dotProduct4 = (pointX - rectangleX4) * vector4X + (pointY - rectangleY4) * vector4Y;
  
	  // Check if the dot products have the same sign
	  if (dotProduct3 >= 0 && dotProduct4 >= 0) {
		return true; // Point is inside the rectangle
	  }
	}

	if ((dotProduct1 <= 0 && dotProduct2 <= 0)) {
		// Calculate the vectors of the other two sides
		const vector3X = rectangleX4 - rectangleX3;
		const vector3Y = rectangleY4 - rectangleY3;
		const vector4X = rectangleX1 - rectangleX4;
		const vector4Y = rectangleY1 - rectangleY4;
	
		// Calculate the dot products
		const dotProduct3 = (pointX - rectangleX3) * vector3X + (pointY - rectangleY3) * vector3Y;
		const dotProduct4 = (pointX - rectangleX4) * vector4X + (pointY - rectangleY4) * vector4Y;
	
		// Check if the dot products have the same sign
		if (dotProduct3 <= 0 && dotProduct4 <= 0) {
		  return true; // Point is inside the rectangle
		}
	}
  
	return false; // Point is outside the rectangle
}



export class World
{
	public renderer: THREE.WebGLRenderer;
	public camera: THREE.PerspectiveCamera;
	public composer: any;
	public stats: Stats;
	public graphicsWorld: THREE.Scene;
	public sky: Sky;
	public physicsWorld: CANNON.World;
	public parallelPairs: any[];
	public physicsFrameRate: number;
	public physicsFrameTime: number;
	public physicsMaxPrediction: number;
	public clock: THREE.Clock;
	public renderDelta: number;
	public logicDelta: number;
	public requestDelta: number;
	public sinceLastFrame: number;
	public justRendered: boolean;
	public params: any;
	public inputManager: InputManager;
	public cameraOperator: CameraOperator;
	public timeScaleTarget: number = 1;
	public console: InfoStack;
	public cannonDebugRenderer: CannonDebugRenderer;
	public scenarios: Scenario[] = [];
	public characters: Character[] = [];
	public vehicles: Vehicle[] = [];
	public paths: Path[] = [];
	public coins: Coins;
	public vase: Vase;
	public coins_glbs=[];
	public scenarioGUIFolder: any;
	public updatables: IUpdatable[] = [];
	public wind_uniforms;
	public wind_meshes;
	public frac_scale_values=[];
	public frac_rot_values=[];
	public frac_translate_values=[];
	public frac_meshes=[];
	public frac_meshes_start_break=[];
	public full_meshes=[];
	public frac_meshes_sorted=[];
	public frac_scale=[];
	public frac_translate=[];
	public frac_frame=[];
	public pre_frac_frame=[];
	public frac_tot_frame;
	public kitti_models=[];
	public kitti_loaded_list=[];
	public kitti_model_num:number=0;
	public camera_projmat: number[];
	public kitti_material_list=[];
	public kitti_uv_models_loaded=[];
	public kitti_uvmodel_num=0;
	// public kitti_scene_list=[];
	public kitti_uv_models=[];
	public intrinsic;
	public fix_camera_y:number=CH;
	public fx;
	public fy;
	public cx;
	public cy;
	public progressBar;
	public progress={};
	public onload=0;
	public total_load=0;
	public interface_loaded=false;
	public loadingManager=null;
	public total_load_progress = {};
	public footpoint;
	public footpoints=[];
	public msec=0;
	public car_racing_game=false;
	public temple_run_game=false;
	public coin_collected=0;
	public chair_broken=0;
	public ckpts=[];
	public ckpt_seq=0;
	public blender_collisions=[];

	private lastScenarioID: string;

	constructor(worldScenePath?: any)
	{
		const scope = this;

		// WebGL not supported
		if (!Detector.webgl)
		{
			Swal.fire({
				icon: 'warning',
				title: 'WebGL compatibility',
				text: 'This browser doesn\'t seem to have the required WebGL capabilities. The application may not work correctly.',
				footer: '<a href="https://get.webgl.org/" target="_blank">Click here for more information</a>',
				showConfirmButton: false,
				buttonsStyling: false
			});
		}

		// Renderer
		let pixelRatio = 2;
		this.renderer = new THREE.WebGLRenderer(
			{
			powerPreference: 'high-performance',
			precision: 'highp',
			antialias: false
		},
		);
		let width = 1408;
		let height = 376;
		this.renderer.setPixelRatio(pixelRatio);
		this.renderer.setSize(width, height);
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.0;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputEncoding = THREE.sRGBEncoding;

		this.generateHTML();

		// Auto window resize
		// function onWindowResize(): void
		// {
		// 	scope.camera.aspect = width / height;
		// 	scope.camera.updateProjectionMatrix();
		// 	scope.renderer.setSize(width, height);
		// 	fxaaPass.uniforms['resolution'].value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
		// 	scope.composer.setSize(width * pixelRatio, height * pixelRatio);
		// }
		// window.addEventListener('resize', onWindowResize, false);

		// Three.js scene
		this.graphicsWorld = new THREE.Scene();
		// this.camera = new THREE.PerspectiveCamera(80, width/height, 0.01, 1000);
		this.camera = new THREE.PerspectiveCamera();
		var fx = 552.554261;
		var fy = 552.554261;
		var cx = 682.049453;
		var cy = 238.769549;
		this.fx = fx;
		this.fy = fy;
		this.cx = cx;
		this.cy = cy;
		var f = 500.0;
		var n = 0.02;
		var n00 = 2.0 * fx / width;
		var n11 = 2.0 * fy / height;
		var n02 = 1.0 - 2.0 * cx / width;
		var n12 = 2.0 * cy / height - 1.0;
		var n32 = -1.0;
		var n22 = (f + n) / (n - f);
		var n23 = (2 * f * n) / (n - f);
		this.camera_projmat = [n00, 0, n02, 0, 
								0, n11, n12, 0, 
								0, 0, n22, n23, 
								0, 0, n32, 0];
		this.intrinsic = new THREE.Matrix3().fromArray([
			fx, 0, cx,
			0, fy, cy,
			0, 0, 1
		]).transpose();

		this.camera.projectionMatrix = new THREE.Matrix4().fromArray(this.camera_projmat).transpose();
		this.camera.projectionMatrixInverse = new THREE.Matrix4().fromArray(this.camera_projmat).transpose().invert();
		// Passes
		let renderPass = new RenderPass( this.graphicsWorld, this.camera );
		let fxaaPass = new ShaderPass( FXAAShader );

		// FXAA
		// let pixelRatio = this.renderer.getPixelRatio();
		fxaaPass.material['uniforms'].resolution.value.x = 1 / ( width * pixelRatio );
		fxaaPass.material['uniforms'].resolution.value.y = 1 / ( height * pixelRatio );

		// Composer
		this.composer = new EffectComposer( this.renderer );
		this.composer.addPass( renderPass );
		this.composer.addPass( fxaaPass );

		// Physics
		this.physicsWorld = new CANNON.World();
		this.physicsWorld.gravity.set(0, -9.81, 0);
		this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
		this.physicsWorld.solver.iterations = 10;
		this.physicsWorld.allowSleep = true;

		this.parallelPairs = [];
		this.physicsFrameRate = 60;
		this.physicsFrameTime = 1 / this.physicsFrameRate;
		this.physicsMaxPrediction = this.physicsFrameRate;

		// RenderLoop
		this.clock = new THREE.Clock();
		this.renderDelta = 0;
		this.logicDelta = 0;
		this.sinceLastFrame = 0;
		this.justRendered = false;

		// Stats (FPS, Frame time, Memory)
		this.stats = Stats();
		// Create right panel GUI
		this.createParamsGUI(scope);

		// Initialization
		this.inputManager = new InputManager(this, this.renderer.domElement);
		this.cameraOperator = new CameraOperator(this, this.camera, this.params.Mouse_Sensitivity);
		this.sky = new Sky(this);
		
		// NeRF
		this.wind_uniforms = [];

		


		// Load scene if path is supplied
		if (worldScenePath !== undefined)
		{
			let loadingManager = new LoadingManager(this);
			this.loadingManager = loadingManager;
			loadingManager.onFinishedCallback = () =>
			{
				this.update(1, 1);
				this.setTimeScale(1);
				var prompt = 'Feel free to explore the world based on KITTI-360 Loop! Interact with available vehicle.<br><br>Acknowledgement: This demo is based on <a href="https://github.com/swift502/Sketchbook" target="_blank">Sketchbook</a><br><br><button onclick="world.temple_run(world);" style="background-color: orange; border: none; color: black; border: 5px solid yellow; padding: 1px 5px; width: 120px; height: 50px; text-align: center; text-decoration: none; display: inline-block;font-size: 18px;font-family: -apple-system, BlinkMacSystemFont, helvetica, arial, sans-serif;">Temple Run</button><br><br><button onclick="world.car_racing(world);" style="background-color: orange; border: none; color: black; padding: 1px 5px; text-align: center; text-decoration: none; display: inline-block;font-size: 18px; border: 5px solid yellow; width: 120px; height: 50px;  font-family: -apple-system, BlinkMacSystemFont, helvetica, arial, sans-serif;">Car Racing</button>';
				Swal.fire({
					title: 'Welcome to Video2Game Demo!',
					html: prompt,
					footer: '<a href="https://video2game.github.io/" target="_blank">Video2Game GitHub page</a>',
					confirmButtonText: 'Free Play',
					buttonsStyling: false,
					showConfirmButton: false,
					onClose: () => {
						UIManager.setUserInterfaceVisible(true);
						this.msec = 0;
						var timer = document.getElementById("timer");
						timer.style.visibility = "visible";
					}
				});
			};
			loadingManager.loadGLTF(worldScenePath, (gltf) =>
				{
					this.loadScene(loadingManager, gltf);
				}
			);
		}
		else
		{
			UIManager.setUserInterfaceVisible(true);
			UIManager.setLoadingScreenVisible(false);
			Swal.fire({
				icon: 'success',
				title: 'Hello world!',
				text: 'Empty Video2Game world was succesfully initialized. Enjoy the blueness of the sky.',
				buttonsStyling: false
			});
		}

		this.renderer.compile(this.graphicsWorld, this.camera);
		this.render(this);
	}

	public init_trimesh_collision(world: World, path: string){
		// _scale = 1;
		var cas = 0;
		fetch(path+'mesh_'+cas.toString()+'_slim_cc/cc.json').then(response => { return response.json(); }).then(phy_paths => {
			console.log(phy_paths);
			function disposeArray() {
				this.array = null;
			}
			phy_paths.forEach(phy_path => {
			// var phy_path = phy_paths[0];
			new PLYLoader().load(path+'mesh_'+cas.toString()+'_slim_cc/'+phy_path, geo => {
				var geometry = new THREE.BufferGeometry();
				const position = geo.getAttribute( 'position' );
				var vertices = position.array;
				var faces = [];
				// console.log(vertices);
				const index = geo.getIndex();
				for ( let i = 0; i < index.count; i += 3 ) {
					const face = {
						a: index.getX(i),
						b: index.getX(i+1),
						c: index.getX(i+2),
					};
					faces.push(face);
				}
				// console.log(faces);
				const positions = [];
				faces.forEach(face => {
					positions.push(vertices[face.a*3],
						vertices[face.a*3+1],
						vertices[face.a*3+2]);
					positions.push(vertices[face.b*3],
						vertices[face.b*3+1],
						vertices[face.b*3+2]);
					positions.push(vertices[face.c*3],
						vertices[face.c*3+1],
						vertices[face.c*3+2]);
				});
				geometry.setAttribute( 'position', new THREE.Float32BufferAttribute(positions , 3 ).onUpload( disposeArray ) );
				geometry.computeVertexNormals();
				// console.log(positions);
				let child = new THREE.Mesh(geometry);
				child.position.x = -45;
				child.position.y = 14;
				child.position.z = 0;
				child.rotateX(-3.1415927/2);
				child.scale.x = SCALE * 1;
				child.scale.y = SCALE * 1;
				child.scale.z = SCALE * 1;
				let mesh = child as THREE.Mesh;
				let phys = new TrimeshCollider(mesh, {});
				world.physicsWorld.addBody(phys.body);

				let child_shadow = (mesh as THREE.Mesh).clone();
				child_shadow.material = new THREE.ShadowMaterial();
				child_shadow.receiveShadow = true;
				// child_shadow.castShadow = true;
				child_shadow.material.opacity = 0.8;

				child_shadow.frustumCulled = false;
				// child_shadow.onAfterRender = function(){
				// 	child_shadow.frustumCulled = true;
				// 	child_shadow.onAfterRender = function(){};
				// };

				world.sky.csm.setupMaterial(child_shadow.material);
				world.graphicsWorld.add(child_shadow);
			});
		});
		});
	}

	public car_racing(world:World){
		console.log('car_racing');

		world.car_racing_game = true;
		world.temple_run_game = false;
		var gameinfo = document.getElementById("gameinfo");
		gameinfo.style.width = '280px';
		gameinfo.style.height = '180px';
		gameinfo.style.visibility = "visible";
		world.blender_collisions.forEach(body => {
			world.physicsWorld.addBody(body);
		})

		Swal.close();
	}	
	public temple_run(world:World){
		console.log('temple_run');

		world.car_racing_game = false;
		world.temple_run_game = true;

		var gameinfo = document.getElementById("gameinfo");
		// gameinfo.innerText = "\n  Coins collected: "+world.coin_collected.toString()+"\nBroken chairs: "+world.chair_broken.toString();
		gameinfo.style.visibility = "visible";
		Swal.close();
	}
	private init_shadow(world: World, path: string): void {
		
		
		fetch(path).then(response => {
			return response.json();
		}).then(json => {
			function disposeArray() {
				this.array = null;
			}
			json.forEach(element => {
				var geometry = new THREE.BufferGeometry();
				const positions = [];
				element.faces.forEach(face => {
					positions.push(element.vertices[face[0]][0],
						element.vertices[face[0]][1],
						element.vertices[face[0]][2]);
					positions.push(element.vertices[face[1]][0],
						element.vertices[face[1]][1],
						element.vertices[face[1]][2]);
					positions.push(element.vertices[face[2]][0],
						element.vertices[face[2]][1],
						element.vertices[face[2]][2])
				})
				geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ).onUpload( disposeArray ) );
				geometry.computeVertexNormals();
				var mesh = new THREE.Mesh(geometry);
				mesh.position.x = -45;
				mesh.position.y = 13.9;
				mesh.position.z = 0;
				mesh.rotateX(-3.1415927/2);
				// mesh.rotateZ(3.1415927/4);
				mesh.scale.x = SCALE;
				mesh.scale.y = SCALE;
				mesh.scale.z = SCALE;

				let child_shadow = (mesh as THREE.Mesh).clone();
				child_shadow.material = new THREE.ShadowMaterial();
				child_shadow.receiveShadow = true;
				// child_shadow.castShadow = true;
				child_shadow.material.opacity = 0.8;

				child_shadow.frustumCulled = false;
				// child_shadow.onAfterRender = function(){
				// 	child_shadow.frustumCulled = true;
				// 	child_shadow.onAfterRender = function(){};
				// };

				world.sky.csm.setupMaterial(child_shadow.material);
				world.graphicsWorld.add(child_shadow);
				
				// world.graphicsWorld.add(mesh);
				
			});
		});

		
	}

	public update_progress_bar(world: World){
		var total_bar = 50.1;
		var total_bar_int = 50;
		var ok = '🟩';
		var nok = '🟥';
	    var progressBar = document.getElementById('progressBarw');
		var load_progress = 0.0;
		for (var load_i in world.total_load_progress){
			world.total_load_progress[load_i].forEach(load_i_j => {
				load_progress += load_i_j;
			})
		}
		// console.log(load_progress);
		// console.log(this.total_load*100);
		var okblock_f = (load_progress / (this.total_load*100.0)) * total_bar;
		// console.log(okblock_f);
		var okblock = 0;
		var pbstr = '';
		for (var oki=1; oki<okblock_f; oki+=1){
			pbstr = pbstr+ok;
			okblock += 1;
		}
		for (var noki=0; noki<total_bar-okblock; noki+=1){
			pbstr = pbstr+nok;
		}
		// console.log(pbstr);
		progressBar.innerText = pbstr;
		if(okblock == total_bar_int){
			progressBar.innerText = "";
		}
	}
	

	private init_uvmapping(world: World, path: string, idx: number, sky_scale: number=1, _cascade: number=null): void{

		
		function createNetworkWeightTexture(network_weights) {
			let width = network_weights.length;
			let height = network_weights[0].length;
			
			let weightsData = new Float32Array(width * height);
			for (let co = 0; co < height; co++) {
				for (let ci = 0; ci < width; ci++) {
					let index = co * width + ci; // column-major
					let weight = network_weights[ci][co];
					weightsData[index] = weight;
				}
			}
			
			let width_pad = width + (4 - width % 4); // make divisible by 4
			let weightsData_pad = new Float32Array(width_pad * height);
			for (let j = 0; j < width_pad; j += 4) {
				for (let i = 0; i < height; i++) {
					for (let c = 0; c < 4; c++) {
						if (c + j >= width) { 
							weightsData_pad[j * height + i * 4 + c] = 0.0; // zero padding
						} else {
							weightsData_pad[j * height + i * 4 + c] = weightsData[j + i * width + c];
						}
					}
				}
			}

			let texture = new THREE.DataTexture(weightsData_pad, 1, width_pad * height / 4, THREE.RGBAFormat, THREE.FloatType);
			texture.magFilter = THREE.LinearFilter;
			texture.minFilter = THREE.LinearMipMapLinearFilter;
			texture.needsUpdate = true;
			return texture;
		}

		function createViewDependenceFunctions(network_weights) {
		
			let channelsZero = network_weights['net.0.weight'].length;
			let channelsOne = network_weights['net.1.weight'].length;
			let channelsTwo = network_weights['net.1.weight'][0].length;

			console.log('[INFO] load MLP: ', channelsZero, channelsOne)

			let RenderFragShader = NeRFShader.RenderFragShader_template.trim().replace(new RegExp('NUM_CHANNELS_ZERO', 'g'), channelsZero);
			RenderFragShader = RenderFragShader.replace(new RegExp('NUM_CHANNELS_ONE', 'g'), channelsOne);
			RenderFragShader = RenderFragShader.replace(new RegExp('NUM_CHANNELS_TWO', 'g'), channelsTwo);

			return RenderFragShader;
		}

		fetch(path+'mlp.json').then(response => { return response.json(); }).then(network_weights => {

            console.log("[INFO] loading:", idx);

            // check bound, load all meshes
            let bound = network_weights['bound'];
			let cascade;
			cascade = network_weights['cascade'];
            world.kitti_uv_models[idx] = [];
			world.initProgressBar(path, cascade);

            for (let cas = 0; cas < cascade; cas++) {

                // load feature texture
                let tex0 = new THREE.TextureLoader().load(path+'feat0_'+cas.toString()+'.png', object => {
                    console.log('[INFO] loaded diffuse tex:', idx, cas);
					world.updateProgressBar(path, cas*3+1);
                },
				(xhr) => {
					// // console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
				});
                let tex1 = new THREE.TextureLoader().load(path+'feat1_'+cas.toString()+'.png', object => {
                    console.log('[INFO] loaded specular tex:', idx, cas);
					world.updateProgressBar(path, cas*3+2);
                },
				(xhr) => {
					// // console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
				});

                
            
                // load MLP
                let RenderFragShader = createViewDependenceFunctions(network_weights);
                let weightsTexZero = createNetworkWeightTexture(network_weights['net.0.weight']);
                let weightsTexOne = createNetworkWeightTexture(network_weights['net.1.weight']);
				
				var side; 
				// let _scale = 1;
				if(cascade != 1 && cas != cascade - 1){
					side = THREE.FrontSide;
					// _scale = SCALE;
					tex0.magFilter = THREE.LinearFilter;
					tex0.minFilter = THREE.LinearFilter;
					tex1.magFilter = THREE.LinearFilter;
					tex1.minFilter = THREE.LinearFilter;
				}
				else{
					side = THREE.BackSide;
					// _scale = SCALE*(1+idx*0.01);
					// _scale = SCALE * sky_scale;

					tex0.magFilter = THREE.LinearFilter;
					tex0.minFilter = THREE.LinearMipMapLinearFilter;
					tex1.magFilter = THREE.LinearFilter;
					tex1.minFilter = THREE.LinearMipMapLinearFilter;
				}
                let newmat = new THREE.ShaderMaterial({
					side: side,
                    vertexShader: NeRFShader.RenderVertShader.trim(),
                    fragmentShader: RenderFragShader,
                    uniforms: {
                        'mode': { value: 0 },
                        'tDiffuse': { value: tex0 },
                        'tSpecular': { value: tex1 },
                        'weightsZero': { value: weightsTexZero },
                        'weightsOne': { value: weightsTexOne },
						'gmatrix_inv': {'value': new THREE.Matrix4()},
						'intrinsic': {'value': world.intrinsic},
						'c2w_T': {'value': new THREE.Matrix3()},
						'fx': {'value': world.fx},
						'fy': {'value': world.fy},
						'cx': {'value': world.cx},
						'cy': {'value': world.cy},						
                    },
                });
            
                // load obj
                new OBJLoader().load(path+'mesh_'+cas.toString()+'.obj', object => {
                    object.traverse(function (child) {
                        if (child.type == 'Mesh') {
							child.receiveShadow = false;
							child.castShadow = false;
							child.position.x = -45;
							child.position.y = 14;
							child.position.z = 0;
							child.rotateX(-3.1415927/2);
							if (cas != cascade - 1){
								child.scale.x = SCALE * 1;
								child.scale.y = SCALE * 1;
								child.scale.z = SCALE * 1;
							}
							else{
								child.scale.x = SCALE * sky_scale;
								child.scale.y = SCALE * sky_scale;
								child.scale.z = SCALE * sky_scale;
							}
							
							child.frustumCulled = false;

                            (child as THREE.Mesh).material = newmat;
                    		world.kitti_uv_models[idx].push(child);

							
						}
                    });
                    console.log('[INFO] loaded mesh:', idx, cas);
					world.updateProgressBar(path, cas*3);
					
	
                    world.graphicsWorld.add(object);
                },
				(xhr) => {
					// // console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
				});
				// _scale = 1;

            }

            world.kitti_uv_models_loaded[idx] = true;
			// world.update_progressbar(idx);
        });
	}

	private init_uvmapping_ply(world: World, path: string, idx: number, sky_scale: number=1, _cascade: number=null): void{

		
		function createNetworkWeightTexture(network_weights) {
			let width = network_weights.length;
			let height = network_weights[0].length;
			
			let weightsData = new Float32Array(width * height);
			for (let co = 0; co < height; co++) {
				for (let ci = 0; ci < width; ci++) {
					let index = co * width + ci; // column-major
					let weight = network_weights[ci][co];
					weightsData[index] = weight;
				}
			}
			
			let width_pad = width + (4 - width % 4); // make divisible by 4
			let weightsData_pad = new Float32Array(width_pad * height);
			for (let j = 0; j < width_pad; j += 4) {
				for (let i = 0; i < height; i++) {
					for (let c = 0; c < 4; c++) {
						if (c + j >= width) { 
							weightsData_pad[j * height + i * 4 + c] = 0.0; // zero padding
						} else {
							weightsData_pad[j * height + i * 4 + c] = weightsData[j + i * width + c];
						}
					}
				}
			}

			let texture = new THREE.DataTexture(weightsData_pad, 1, width_pad * height / 4, THREE.RGBAFormat, THREE.FloatType);
			texture.magFilter = THREE.LinearFilter;
			texture.minFilter = THREE.LinearMipmapLinearFilter;
			texture.needsUpdate = true;
			return texture;
		}

		function createViewDependenceFunctions(network_weights) {
		
			let channelsZero = network_weights['net.0.weight'].length;
			let channelsOne = network_weights['net.1.weight'].length;
			let channelsTwo = network_weights['net.1.weight'][0].length;

			console.log('[INFO] load MLP: ', channelsZero, channelsOne)

			let RenderFragShader = NeRFShader.RenderFragShader_template.trim().replace(new RegExp('NUM_CHANNELS_ZERO', 'g'), channelsZero);
			RenderFragShader = RenderFragShader.replace(new RegExp('NUM_CHANNELS_ONE', 'g'), channelsOne);
			RenderFragShader = RenderFragShader.replace(new RegExp('NUM_CHANNELS_TWO', 'g'), channelsTwo);

			return RenderFragShader;
		}

		fetch(path+'mlp.json').then(response => { return response.json(); }).then(network_weights => {

            console.log("[INFO] loading:", idx);

            // check bound, load all meshes
            let bound = network_weights['bound'];
			let cascade;
			cascade = _cascade == null? network_weights['cascade']: _cascade;
            world.kitti_uv_models[idx] = [];
			world.initProgressBar(path, cascade);
			world.total_load_progress[idx] = new Array(cascade*3).fill(0);

            for (let cas = 0; cas < cascade; cas++) {

                // load feature texture
                let tex0 = new THREE.TextureLoader().load(path+'feat0_'+cas.toString()+'.png', object => {
                    console.log('[INFO] loaded diffuse tex:', idx, cas);
					world.updateProgressBar(path, cas*3+1);
					world.total_load_progress[idx][cas*3+1] = 100;
					world.update_progress_bar(world);
                },
				(xhr) => {
					world.total_load_progress[idx][cas*3+1] = (xhr.loaded / xhr.total) * 100;
					world.update_progress_bar(world);
					// // console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
				});
                let tex1 = new THREE.TextureLoader().load(path+'feat1_'+cas.toString()+'.png', object => {
                    console.log('[INFO] loaded specular tex:', idx, cas);
					world.updateProgressBar(path, cas*3+2);
					world.total_load_progress[idx][cas*3+2] = 100;
					world.update_progress_bar(world);
                },
				(xhr) => {
					world.total_load_progress[idx][cas*3+2] = (xhr.loaded / xhr.total) * 100;
					world.update_progress_bar(world);
					// // console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
				});

                
            
                // load MLP
                let RenderFragShader = createViewDependenceFunctions(network_weights);
                let weightsTexZero = createNetworkWeightTexture(network_weights['net.0.weight']);
                let weightsTexOne = createNetworkWeightTexture(network_weights['net.1.weight']);
				
				var side; 
				// let _scale = 1;
				if(cascade == 1 || cas != cascade - 1){
					side = THREE.FrontSide;
					// _scale = SCALE;
					// tex0.wrapS = THREE.ClampToEdgeWrapping;
					// tex0.wrapT = THREE.ClampToEdgeWrapping;
					tex0.magFilter = THREE.LinearFilter;
					tex0.minFilter = THREE.LinearFilter;
					tex1.magFilter = THREE.LinearFilter;
					tex1.minFilter = THREE.LinearFilter;
					console.log("LinearFilter")
				}
				else{
					side = THREE.BackSide;
					// _scale = SCALE*(1+idx*0.01);
					// _scale = SCALE * sky_scale;

					tex0.magFilter = THREE.LinearFilter;
					tex0.minFilter = THREE.LinearMipMapLinearFilter;
					tex1.magFilter = THREE.LinearFilter;
					tex1.minFilter = THREE.LinearMipMapLinearFilter;
				}

                let newmat = new THREE.ShaderMaterial({
					side: side,
                    vertexShader: NeRFShader.RenderVertShader.trim(),
                    fragmentShader: RenderFragShader,
                    uniforms: {
                        'mode': { value: 0 },
                        'tDiffuse': { value: tex0 },
                        'tSpecular': { value: tex1 },
                        'weightsZero': { value: weightsTexZero },
                        'weightsOne': { value: weightsTexOne },
						'gmatrix_inv': {'value': new THREE.Matrix4()},
						'intrinsic': {'value': world.intrinsic},
						'c2w_T': {'value': new THREE.Matrix3()},
						'fx': {'value': world.fx},
						'fy': {'value': world.fy},
						'cx': {'value': world.cx},
						'cy': {'value': world.cy},						
                    },
                });
            
                // load obj
                new PLYLoader().load(path+'mesh_'+cas.toString()+'.ply', geo => {
					world.total_load_progress[idx][cas*3] = 100;
					world.update_progress_bar(world);

					let child = new THREE.Mesh(geo);
					child.receiveShadow = false;
					child.castShadow = false;
					child.position.x = -45;
					child.position.y = 14;
					child.position.z = 0;
					child.rotateX(-3.1415927/2);
					if (cascade == 1 || cas != cascade - 1){
						child.scale.x = SCALE * 1;
						child.scale.y = SCALE * 1;
						child.scale.z = SCALE * 1;
					}
					else{
						child.scale.x = SCALE * sky_scale;
						child.scale.y = SCALE * sky_scale;
						child.scale.z = SCALE * sky_scale;
					}
					
					child.frustumCulled = false;

					(child as THREE.Mesh).material = newmat;
					world.kitti_uv_models[idx].push(child);

                    console.log('[INFO] loaded mesh:', idx, cas);
					world.updateProgressBar(path, cas*3);
	
                    world.graphicsWorld.add(child);

                },
				(xhr) => {
					// // console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
					world.total_load_progress[idx][cas*3] = (xhr.loaded / xhr.total) * 100;
					world.update_progress_bar(world);
					
				});
				
            }

			

            world.kitti_uv_models_loaded[idx] = true;
			// world.update_progressbar(idx);
        });
	}


	private init_bakedsdf_bbox(world: World, path: string): void {

		fetch(path + 'bbox_reloc.json').then(response => {
			return response.json();
		}).then(json => {
			function disposeArray() {
				this.array = null;
			}
			json.forEach(element => {
				var geometry = new THREE.BufferGeometry();
				const positions = [];
				element.faces.forEach(face => {
					positions.push(element.vertices[face[0]][0],
						element.vertices[face[0]][1],
						element.vertices[face[0]][2]);
					positions.push(element.vertices[face[1]][0],
						element.vertices[face[1]][1],
						element.vertices[face[1]][2]);
					positions.push(element.vertices[face[2]][0],
						element.vertices[face[2]][1],
						element.vertices[face[2]][2])
				})
				geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ).onUpload( disposeArray ) );
				geometry.computeVertexNormals();
				var mesh = new THREE.Mesh(geometry);
				mesh.position.x = -45;
				mesh.position.y = 14;
				mesh.position.z = 0;
				mesh.rotateX(-3.1415927/2);
				// mesh.rotateZ(3.1415927/4);
				mesh.scale.x = SCALE;
				mesh.scale.y = SCALE;
				mesh.scale.z = SCALE;

				let phys = new TrimeshCollider(mesh, {});
				// phys.body.collisionFilterGroup = CollisionGroups.Default;
				// phys.body.collisionResponse = true;

				// phys.body.collisionFilterGroup = CollisionGroups.TrimeshColliders;
				world.physicsWorld.addBody(phys.body);
			});
		});
	}
	
	public update(timeStep: number, unscaledTimeStep: number): void
	{
		this.updatePhysics(timeStep);

		// Update registred objects
		this.updatables.forEach((entity) => {
			entity.update(timeStep, unscaledTimeStep);
		});

		// Lerp time scale
		this.params.Time_Scale = THREE.MathUtils.lerp(this.params.Time_Scale, this.timeScaleTarget, 0.2);

		// Physics debug
		if (this.params.Debug_Physics) this.cannonDebugRenderer.update();
		
		if (true){
			this.camera.projectionMatrix  = new THREE.Matrix4().fromArray(this.camera_projmat).transpose();
			this.camera.projectionMatrixInverse  = new THREE.Matrix4().fromArray(this.camera_projmat).transpose().invert();

			let scale = SCALE;
			let scene_trans = new THREE.Vector3(-45, 14, 0);
			let rx = new THREE.Matrix4().makeRotationX(-3.1415926/2);
			let rx_3 = new THREE.Matrix3().fromArray([
				rx.elements[0], rx.elements[1], rx.elements[2],
				rx.elements[4], rx.elements[5], rx.elements[6],
				rx.elements[8], rx.elements[9], rx.elements[10]
			]);
			
			var p00, p10, p20, p30;
			var p01, p11, p21, p31;
			var p02, p12, p22, p32;
			var p03, p13, p23, p33;
			
			[p00, p10, p20, p30,
				p01, p11, p21, p31,
				p02, p12, p22, p32,
				p03, p13, p23, p33] 
			= this.camera.matrixWorld.elements;
			
			// trans
			let trans_inv = new THREE.Vector3(p03, p13, p23).add(scene_trans.multiplyScalar(-1)).multiplyScalar(1/scale).applyMatrix4(rx.clone().invert())
			
			let c2w_rot_inv = new THREE.Matrix3().fromArray([
				p00, p01, p02,
				p10, p11, p12,
				p20, p21, p22
			]).transpose();
			c2w_rot_inv = new THREE.Matrix3().multiplyMatrices(rx_3.clone().invert(), c2w_rot_inv);
			
			var c00, c10, c20;
			var c01, c11, c21;
			var c02, c12, c22;
			[
				c00, c10, c20,
				c01, c11, c21,
				c02, c12, c22
			] = c2w_rot_inv.elements;
			c2w_rot_inv = new THREE.Matrix3().fromArray([
				c00, -c01, -c02,
				c10, -c11, -c12,
				c20, -c21, -c22
			]).transpose()

			let gmatrix_noc_inv = new THREE.Matrix4().fromArray([
				c00, c01, c02, trans_inv.x,
				c10, c11, c12, trans_inv.y,
				c20, c21, c22, trans_inv.z,
				0, 0, 0, 1
			]).transpose();

			this.kitti_uv_models.forEach((model_list, idx) => {

				if (this.kitti_uv_models_loaded[idx] == true){
					model_list.forEach(model => {
						// model.frustumCulled = true;
						(model.material as THREE.RawShaderMaterial).uniforms['gmatrix_inv']['value'] = gmatrix_noc_inv.clone().invert();
						(model.material as THREE.RawShaderMaterial).uniforms['c2w_T']['value'] = c2w_rot_inv.clone().transpose();
					})
				}
			})
		}

		if (this.temple_run_game){
			// update coin and broken chair
			var gameinfo = document.getElementById("gameinfo");
			gameinfo.innerHTML = "<br>&nbsp;&nbsp;&nbsp;Coins collected: "+this.coin_collected.toString()+"<br>&nbsp;&nbsp;&nbsp;Broken chairs: "+this.chair_broken.toString();
			if(this.msec > 30*1000){
				this.temple_run_game = false;
				var prompt = 'Over 30s!<br>Game Finished!<br>Total Statistic: <br>Coins collected: '+this.coin_collected.toString()+'<br>Broken chairs: '+this.chair_broken.toString()+'<br>Try to collect more coins and break less chairs next time!';
				UIManager.setUserInterfaceVisible(false);
				Swal.fire({
					title: 'Temple run time up!',
					html: prompt,
					footer: '<a href="https://video2game.github.io/" target="_blank">Video2Game GitHub page</a>',
					confirmButtonText: 'Free Play',
					buttonsStyling: false,
					showConfirmButton: true,
					onClose: () => {
						UIManager.setUserInterfaceVisible(true);
						this.msec = 0;
						var timer = document.getElementById("timer");
						timer.style.visibility = "hidden";
					}
				});
				// while(true){

				// }
			}
		}
		
		if (this.car_racing_game){
			var gameinfo = document.getElementById("gameinfo");
			var info_str = "<br>&nbsp;&nbsp;&nbsp;Car Passing Checkpoints: ";
			if(this.ckpt_seq == 0){
				info_str = info_str + "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;None"
			}
			else{
				for(var seq=0; seq<this.ckpt_seq; seq+=1){
					info_str = info_str + "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Checkpoint "+seq.toString()
				}
			}
			gameinfo.innerHTML = info_str;
			if(this.ckpt_seq == 5){
				this.car_racing_game = false;
				var msec = this.msec;
				var p_msec = Math.floor((msec % 1000) * 1.0 / 1000.0 * 100.0);
				var pad_msec = p_msec < 10? "0" : "";
				var sec = Math.floor(msec / 1000);
				var p_sec = sec % 60;
				var pad_sec = p_sec < 10? "0" : "";
				var p_min = Math.floor(sec / 60);
				var pad_min = p_min < 10? "0" : "";
				var total_time = pad_min+p_min.toString()+":"+pad_sec+p_sec.toString()+":"+pad_msec+p_msec.toString();
				var prompt = 'All checkpoints reached!<br>Game Finished!<br>Total Time: <br>'+total_time+'<br>Try to save more time next time!';
				UIManager.setUserInterfaceVisible(false);
				Swal.fire({
					title: 'Car Racing Reach Endpoint!',
					html: prompt,
					footer: '<a href="https://video2game.github.io/" target="_blank">Video2Game GitHub page</a>',
					confirmButtonText: 'Free Play',
					buttonsStyling: false,
					showConfirmButton: true,
					onClose: () => {
						UIManager.setUserInterfaceVisible(true);
						this.msec = 0;
						var timer = document.getElementById("timer");
						timer.style.visibility = "hidden";
					}
				});
			}
		}
	}

	public updatePhysics(timeStep: number): void
	{
		// Step the physics world
		this.physicsWorld.step(this.physicsFrameTime, timeStep);

		this.characters.forEach((char) => {
			if (this.isOutOfBounds(char.characterCapsule.body.position))
			{
				this.outOfBoundsRespawn(char.characterCapsule.body);
			}

			function close(pos1: THREE.Vector3, pos2:  THREE.Vector3){

				var dx = (pos1.x - pos2.x);
				var dy = (pos1.y - pos2.y);
				var dz = (pos1.z - pos2.z);
				
				var dist = dx*dx + dy*dy + dz*dz;
				return dist < 1;
			}
			var coin_to_remove = null;
			this.coins_glbs.forEach((coin, idx) => {
				var c = close(coin.position, char.position);
				if (c){
					// coin.scale.x = 0.02;
					// coin.scale.y = 0.02;
					// coin.scale.z = 0.02;
					coin_to_remove = idx;
					this.coin_collected += 1;
					// console.log("accelarate_frames: ", char.accelarate_frames);
					if(char.accelarate_frames == 0){
						// console.log("accelarate");
						char.moveSpeed = 8;
						char.accelarate_frames = 100;
					}
				}
				coin.frustumCulled = true;
			})
			if(coin_to_remove != null){
				this.coins_glbs[coin_to_remove].visible = false;
				this.graphicsWorld.remove(this.coins_glbs[coin_to_remove]);
				this.coins_glbs.splice(coin_to_remove, 1);
			}
			if(char.accelarate_frames > 0){
				char.accelarate_frames -= 1;
			}
			else{
				char.moveSpeed = 4;
			}

			var vase_list = this.vase.listcoins();
			// console.log('vase_origin revising');
			vase_list.forEach((_vase, idx_frac) => {
				var c = close(_vase.position, char.position);

				if (c|| (this.frac_meshes_start_break[idx_frac] && this.frac_frame[idx_frac] < 39)){
					if (!this.frac_meshes_start_break[idx_frac]){
						this.chair_broken += 1;
					}
					this.frac_meshes_start_break[idx_frac] = true;
					if (this.frac_meshes_sorted[idx_frac] == false){
						let meshes_with_index = [];
						for (let idx = 0; idx < this.frac_meshes[idx_frac].length; idx++){
							meshes_with_index.push([this.frac_meshes[idx_frac][idx][1], this.frac_meshes[idx_frac][idx][0], idx]);
						}
						meshes_with_index.sort(function(left, right) {
							return left[0] < right[0] ? -1 : 1;
						});
						for (let idx = 0; idx < this.frac_meshes[idx_frac].length; idx++) {
							// test.push(test_with_index[j][0]);
							this.frac_meshes[idx_frac][idx] = meshes_with_index[idx][1];
						}
						this.frac_meshes_sorted[idx_frac] = true;
						// console.log(meshes_with_index);
					}

					this.pre_frac_frame[idx_frac] = this.frac_frame[idx_frac];

					if (this.pre_frac_frame[idx_frac] == 0){
						for (let idx = 0; idx < this.frac_meshes[idx_frac].length; idx++) {
							// test.push(test_with_index[j][0]);
							this.frac_meshes[idx_frac][idx].visible = true;
							this.frac_meshes[idx_frac][idx].frustumCulled = true;
						}
						for (let idx = 0; idx < this.full_meshes[idx_frac].length; idx++) {
							// test.push(test_with_index[j][0]);
							this.full_meshes[idx_frac][idx].visible = false;
							this.graphicsWorld.remove(this.full_meshes[idx_frac][idx]);
						}
					}


					function min(a:number, b:number): number{
						return a<b? a:b;
					}
					let idx:number = min(this.pre_frac_frame[idx_frac] + 1, 39);

					this.frac_meshes[idx_frac].forEach((_vase_mesh, meshidx) => {
					// let scale_x = this.frac_scale_values[3*idx];
					// let scale_y = this.frac_scale_values[3*idx+1];
					// let scale_z = this.frac_scale_values[3*idx+2];
						let rot_0 = this.frac_rot_values[meshidx][4*idx];
						let rot_1 = this.frac_rot_values[meshidx][4*idx+1];
						let rot_2 = this.frac_rot_values[meshidx][4*idx+2];
						let rot_3 = this.frac_rot_values[meshidx][4*idx+3];

						let translate_x = this.frac_translate_values[meshidx][3*idx];
						let translate_y = this.frac_translate_values[meshidx][3*idx+1];
						let translate_z = this.frac_translate_values[meshidx][3*idx+2];
					
						let local_matrix;
						let rot_matrix = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(rot_0, rot_1, rot_2, rot_3));
						let translate_matrix = new THREE.Matrix4().makeTranslation(translate_x + this.frac_translate[idx_frac].x, translate_y + this.frac_translate[idx_frac].y, translate_z + this.frac_translate[idx_frac].z);
						local_matrix = new THREE.Matrix4().multiplyMatrices(translate_matrix, rot_matrix);
						
						_vase_mesh.matrixAutoUpdate = false;
						_vase_mesh.matrix = local_matrix;
					// this.graphicsWorld.add(mesh);
					});
					this.frac_frame[idx_frac] = idx;
				}
			})
			
			// track
			var new_ft = this.footpoint.clone();
			if(this.footpoints.length > 100){
				let ft = this.footpoints.shift();
				this.graphicsWorld.remove(ft);
			}
			new_ft.position.x = char.position.x;
			new_ft.position.y = char.position.y-0.5;
			new_ft.position.z = char.position.z;
			this.footpoints.push(new_ft);
			this.graphicsWorld.add(new_ft);
			
		});

		this.vehicles.forEach((vehicle) => {
			if (this.isOutOfBounds(vehicle.rayCastVehicle.chassisBody.position))
			{
				let worldPos = new THREE.Vector3();
				vehicle.spawnPoint.getWorldPosition(worldPos);
				worldPos.y += 1;
				this.outOfBoundsRespawn(vehicle.rayCastVehicle.chassisBody, Utils.cannonVector(worldPos));
			}
		});


		this.vehicles.forEach((vehicle) => {
			var char = vehicle.rayCastVehicle.chassisBody;
			function close(pos1: THREE.Vector3, pos2:  THREE.Vector3){

				var dx = (pos1.x - pos2.x);
				var dy = (pos1.y - pos2.y);
				var dz = (pos1.z - pos2.z);
				
				var dist = dx*dx + dy*dy + dz*dz;
				return dist < 1;
			}

			var coin_to_remove = null;
			this.coins_glbs.forEach((coin, idx) => {
				var c = close(coin.position, new THREE.Vector3(char.position.x, char.position.y, char.position.z));
				if (c){
					coin_to_remove = idx;
				}
				coin.frustumCulled = true;
			})
			if(coin_to_remove != null){
				this.coins_glbs[coin_to_remove].visible = false;
				this.graphicsWorld.remove(this.coins_glbs[coin_to_remove]);
				this.coins_glbs.splice(coin_to_remove, 1);
			}


			var vase_list = this.vase.listcoins();
			// console.log('vase_origin revising');
			vase_list.forEach((_vase, idx_frac) => {
				var c = close(_vase.position, new THREE.Vector3(char.position.x, char.position.y, char.position.z));
				if (c|| (this.frac_meshes_start_break[idx_frac] && this.frac_frame[idx_frac] < 39)){
					this.frac_meshes_start_break[idx_frac] = true;
					if (this.frac_meshes_sorted[idx_frac] == false){
						let meshes_with_index = [];
						for (let idx = 0; idx < this.frac_meshes[idx_frac].length; idx++){
							meshes_with_index.push([this.frac_meshes[idx_frac][idx][1], this.frac_meshes[idx_frac][idx][0], idx]);
						}
						meshes_with_index.sort(function(left, right) {
							return left[0] < right[0] ? -1 : 1;
						});
						for (let idx = 0; idx < this.frac_meshes[idx_frac].length; idx++) {
							// test.push(test_with_index[j][0]);
							this.frac_meshes[idx_frac][idx] = meshes_with_index[idx][1];
						}
						this.frac_meshes_sorted[idx_frac] = true;
						// console.log(meshes_with_index);
					}

					this.pre_frac_frame[idx_frac] = this.frac_frame[idx_frac];

					if (this.pre_frac_frame[idx_frac] == 0){
						for (let idx = 0; idx < this.frac_meshes[idx_frac].length; idx++) {
							// test.push(test_with_index[j][0]);
							this.frac_meshes[idx_frac][idx].visible = true;
						}
						for (let idx = 0; idx < this.full_meshes[idx_frac].length; idx++) {
							// test.push(test_with_index[j][0]);
							this.full_meshes[idx_frac][idx].visible = false;
							this.graphicsWorld.remove(this.full_meshes[idx_frac][idx]);
						}
					}


					function min(a:number, b:number): number{
						return a<b? a:b;
					}
					let idx:number = min(this.pre_frac_frame[idx_frac] + 1, 39);

					this.frac_meshes[idx_frac].forEach((_vase_mesh, meshidx) => {
					// let scale_x = this.frac_scale_values[3*idx];
					// let scale_y = this.frac_scale_values[3*idx+1];
					// let scale_z = this.frac_scale_values[3*idx+2];
						let rot_0 = this.frac_rot_values[meshidx][4*idx];
						let rot_1 = this.frac_rot_values[meshidx][4*idx+1];
						let rot_2 = this.frac_rot_values[meshidx][4*idx+2];
						let rot_3 = this.frac_rot_values[meshidx][4*idx+3];

						let translate_x = this.frac_translate_values[meshidx][3*idx];
						let translate_y = this.frac_translate_values[meshidx][3*idx+1];
						let translate_z = this.frac_translate_values[meshidx][3*idx+2];
					
						let local_matrix;
						let rot_matrix = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(rot_0, rot_1, rot_2, rot_3));
						let translate_matrix = new THREE.Matrix4().makeTranslation(translate_x + this.frac_translate[idx_frac].x, translate_y + this.frac_translate[idx_frac].y, translate_z + this.frac_translate[idx_frac].z);
						local_matrix = new THREE.Matrix4().multiplyMatrices(translate_matrix, rot_matrix);
						
						_vase_mesh.matrixAutoUpdate = false;
						_vase_mesh.matrix = local_matrix;
					// this.graphicsWorld.add(mesh);
					});
					this.frac_frame[idx_frac] = idx;
				}
			})

			if (this.car_racing_game){
				// update checkpoint 
	
				var seq:number;
				var wait_idx: number=null;
				// console.log(this.ckpts);
				for(var idx=0; idx < this.ckpts.length;idx++){
					var range_with_theta = this.ckpts[idx]
					var offset:number;
					var range, central_theta:number;
					seq = range_with_theta[1];
					if(seq == this.ckpt_seq){
						wait_idx = idx
					}
				}
				
				if(wait_idx != null){
					var range = this.ckpts[wait_idx][0];
					// new THREE.Vector3(char.position.x, char.position.y, char.position.z)
					var in_region = pointInRectangle([char.position.x, char.position.z], range);
					if (in_region){
						// in rect here
						this.ckpt_seq += 1;
					}
				}
	
				
			}
		});

	}

	public isOutOfBounds(position: CANNON.Vec3): boolean
	{
		let inside = position.x > -211.882 && position.x < 211.882 &&
					position.z > -169.098 && position.z < 153.232 &&
					position.y > 0.107;
		let belowSeaLevel = position.y < 14.989;

		return !inside && belowSeaLevel;
	}

	public outOfBoundsRespawn(body: CANNON.Body, position?: CANNON.Vec3): void
	{
		let newPos = position || new CANNON.Vec3(0, 16, 0);
		let newQuat = new CANNON.Quaternion(0, 0, 0, 1);

		body.position.copy(newPos);
		body.interpolatedPosition.copy(newPos);
		body.quaternion.copy(newQuat);
		body.interpolatedQuaternion.copy(newQuat);
		body.velocity.setZero();
		body.angularVelocity.setZero();
	}
		
		
	public initProgressBar(name, length) {
	    this.progressBar = document.getElementById('progressBar');
	    this.progress[name] = new Array(length * 3).fill('🔴');
	    this.progressBar.innerText = Object.keys(this.progress).map(key => this.progress[key].join('')).join('|');
		this.onload += (length*3);
		this.total_load += (length*3);
	}
	public updateProgressBar(name, index) {
	    this.progressBar = document.getElementById('progressBar');
	    this.progress[name][index] = '🟢';
	    this.progressBar.innerText = Object.keys(this.progress).map(key => this.progress[key].join('')).join('|');
		this.onload -= 1;
		let all_loaded = (this.onload == 0);
		// console.log(this.progressBar.innerText);
		if (this.loadingManager != null && all_loaded && this.interface_loaded ){
			if (this.loadingManager.onFinishedCallback !== undefined) 
			{
				this.loadingManager.onFinishedCallback();
			}
			else
			{
				UIManager.setUserInterfaceVisible(true);
			}

			UIManager.setLoadingScreenVisible(false);
			this.progressBar.innerText = "";
			var progressBar = document.getElementById('progressBarw');
			progressBar.innerText = "";
		}
	}

	/**
	 * Rendering loop.
	 * Implements fps limiter and frame-skipping
	 * Calls world's "update" function before rendering.
	 * @param {World} world 
	 */
	public render(world: World): void
	{
		this.requestDelta = this.clock.getDelta();

		requestAnimationFrame(() =>
		{
			world.render(world);
		});

		// Getting timeStep
		let unscaledTimeStep = (this.requestDelta + this.renderDelta + this.logicDelta) ;
		let timeStep = unscaledTimeStep * this.params.Time_Scale;
		timeStep = Math.min(timeStep, 1 / 30);    // min 30 fps

		// Logic
		world.update(timeStep, unscaledTimeStep);

		// Measuring logic time
		this.logicDelta = this.clock.getDelta();

		// Frame limiting
		let interval = 1 / 60;
		this.sinceLastFrame += this.requestDelta + this.renderDelta + this.logicDelta;
		this.sinceLastFrame %= interval;

		// Stats end
		this.stats.end();
		this.stats.begin();

		// Actual rendering with a FXAA ON/OFF switch
		this.renderer.clear(true, true, true);
		if (this.params.FXAA) this.composer.render();
		else this.renderer.render(this.graphicsWorld, this.camera);

		// Measuring render time
		this.renderDelta = this.clock.getDelta();
	}

	public setTimeScale(value: number): void
	{
		this.params.Time_Scale = value;
		this.timeScaleTarget = value;
	}

	public add(worldEntity: IWorldEntity): void
	{
		worldEntity.addToWorld(this);
		this.registerUpdatable(worldEntity);
	}

	public registerUpdatable(registree: IUpdatable): void
	{
		this.updatables.push(registree);
		this.updatables.sort((a, b) => (a.updateOrder > b.updateOrder) ? 1 : -1);
	}

	public remove(worldEntity: IWorldEntity): void
	{
		worldEntity.removeFromWorld(this);
		this.unregisterUpdatable(worldEntity);
	}

	public unregisterUpdatable(registree: IUpdatable): void
	{
		_.pull(this.updatables, registree);
	}

	public loadScene(loadingManager: LoadingManager, gltf: any): void
	{	

		// load uvmapping ply and texs first
		this.kitti_uvmodel_num = 20;
		for(let i=0; i < this.kitti_uvmodel_num;i++){
			this.kitti_uv_models_loaded.push(false);
		}


		this.init_uvmapping_ply(this, external+'kitti-rpd/4240-4314-rebuild/', 0, 1.006);
		this.init_uvmapping_ply(this, external+'kitti-rpd/4290-4364-rebuild/', 1, 1.001);
		this.init_uvmapping_ply(this, external+'kitti-rpd/7606-7665-rebuild/', 6, 0.996);
		this.init_uvmapping_ply(this, external+'kitti-rpd/7606-7665-rebuild-2/', 15, 1, 1);
		this.init_uvmapping_ply(this, external+'kitti-rpd/7606-7665-rebuild-3/', 18, 1, 1);
		this.init_uvmapping_ply(this, external+'kitti-rpd/7646-7715-rebuild/', 7, 0.997);
		this.init_uvmapping_ply(this, external+'kitti-rpd/7646-7715-rebuild-2/', 19, 1, 1);
		this.init_uvmapping_ply(this, external+'kitti-rpd/corner-1-rebuild/', 11, 1.007);
		this.init_uvmapping_ply(this, external+'kitti-rpd/6354-6433-rebuild/', 2, 1.002);
		this.init_uvmapping_ply(this, external+'kitti-rpd/6354-6433-rebuild-2/', 16, 1.007, 1);
		this.init_uvmapping_ply(this, external+'kitti-rpd/6414-6493-rebuild/', 3, 1.003);
		this.init_uvmapping_ply(this, external+'kitti-rpd/6474-6553-rebuild/', 4, 1.004);
		this.init_uvmapping_ply(this, external+'kitti-rpd/6498-6577-rebuild/', 5, 1.005);
		this.init_uvmapping_ply(this, external+'kitti-rpd/corner-2-rebuild/', 12, 1.008);
		this.init_uvmapping_ply(this, external+'kitti-rpd/10919-11000-rebuild/', 9, 1.);
		this.init_uvmapping_ply(this, external+'kitti-rpd/10919-11000-rebuild-2/', 17, 1.008, 1);
		this.init_uvmapping_ply(this, external+'kitti-rpd/10980-11050-rebuild/', 10, 1.001);
		this.init_uvmapping_ply(this, external+'kitti-rpd/corner-4-rebuild/', 14, 1.01);
		this.init_uvmapping_ply(this, external+'kitti-rpd/corner-3-rebuild/', 13, 1.011);


		this.init_trimesh_collision(this, external+'kitti-collisions/4240-4314-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/4290-4364-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/7606-7665-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/7606-7665-rebuild-2/');
		this.init_trimesh_collision(this, external+'kitti-collisions/7606-7665-rebuild-3/');
		this.init_trimesh_collision(this, external+'kitti-collisions/7646-7715-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/7646-7715-rebuild-2/');
		this.init_trimesh_collision(this, external+'kitti-collisions/corner-1-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/6354-6433-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/6354-6433-rebuild-2/');
		this.init_trimesh_collision(this, external+'kitti-collisions/6414-6493-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/6474-6553-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/6498-6577-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/corner-2-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/10919-11000-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/10919-11000-rebuild-2/');
		this.init_trimesh_collision(this, external+'kitti-collisions/10980-11050-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/corner-4-rebuild/');
		this.init_trimesh_collision(this, external+'kitti-collisions/corner-3-rebuild/');

		// this.init_bakedsdf_bbox(this, 'src/bboxes/');
		// this.init_shadow(this, 'src/shadow.json');
        // this.init_nerf(this, external+'chair', 0.5, new THREE.Vector3(2.0, 15.3, 0.0), true, null, false);

		// track
		var footpointloader = new GLTFLoader();
		var sceneFile = 'build/assets/footpoint.glb';
		let world = this;
		footpointloader.load(
			sceneFile,
			function (gltf) {
				gltf.scene.traverse(function (child) {
					if ((child as THREE.Mesh).isMesh) {
						// child.frustumCulled = false;
						child.receiveShadow = false;
						child.castShadow = false;
						// child.position.x = char.position.x;
						// child.position.y = char.position.y - 0.7;
						// child.position.z = char.position.z;
						child.scale.x = 0.2;
						child.scale.y = 0.01;
						child.scale.z = 0.2;
						child.rotateY(Math.PI/2);
						child.visible = true;

						// child.frustumCulled = false;
						// child.onAfterRender = function(){
						// 	child.frustumCulled = true;
						// 	child.onAfterRender = function(){};
						// };
						world.footpoint = (child as THREE.Mesh);
					}
				})
				// world.graphicsWorld.add(gltf.scene);
				// console.log("add footpoint: ", char.position);
			},
			(xhr) => {
				// // console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
			},
			(error) => {
				console.log(error);
			}
		);
		


		gltf.scene.traverse((child) => {
			if (child.hasOwnProperty('userData'))
			{
				if (child.type === 'Mesh')
				{
					Utils.setupMeshProperties(child);
					this.sky.csm.setupMaterial(child.material);

					if (child.material.name === 'ocean')
					{
						this.registerUpdatable(new Ocean(child, this));
					}
				}

				if (child.userData.hasOwnProperty('data'))
				{
					if (child.userData.data === 'physics')
					{
						if (child.userData.hasOwnProperty('type')) 
						{
							// Convex doesn't work! Stick to boxes!
							if (child.userData.type === 'box')
							{
								let phys = new BoxCollider({size: new THREE.Vector3(child.scale.x, child.scale.y, child.scale.z)});
								phys.body.position.copy(Utils.cannonVector(child.position));
								phys.body.quaternion.copy(Utils.cannonQuat(child.quaternion));
								phys.body.computeAABB();

								phys.body.shapes.forEach((shape) => {
									shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
								});

								this.physicsWorld.addBody(phys.body);
							}
							else if (child.userData.type === 'trimesh')
							{
								let phys = new TrimeshCollider(child, {});
								this.physicsWorld.addBody(phys.body);
							}

							child.visible = false;
						}
					}

					if (child.userData.data === 'path')
					{
						this.paths.push(new Path(child));
					}

					if (child.userData.data === 'scenario')
					{
						this.scenarios.push(new Scenario(child, this));
					}

					if (child.userData.data === 'coin')
					{
						this.coins = new Coins(child);
						var coin_list = this.coins.listcoins();
						for (let i=0; i<coin_list.length; i++){
							this.pre_frac_frame[i] = 0;
							this.frac_frame[i] = 0;
							this.frac_meshes_sorted[i] = false;
						}
						coin_list.forEach((coin, idx) => {
							// console.log("coin: ", idx, " : ", coin.position);

							var loader = new GLTFLoader();
							var sceneFile = 'src/coin.glb';
							let world = this;
							loader.load(
								sceneFile,
								function (gltf) {
									gltf.scene.traverse(function (child) {
										if ((child as THREE.Mesh).isMesh) {
											child.frustumCulled = false;
											child.receiveShadow = false;
											child.castShadow = false;
											child.position.x = coin.position.x
											child.position.y = coin.position.y
											child.position.z = coin.position.z
											child.scale.x = 0.5;
											child.scale.y = 0.5;
											child.scale.z = 0.5;
											child.visible = true;

											// child.frustumCulled = false;
											// child.onAfterRender = function(){
											// 	child.frustumCulled = true;
											// 	child.onAfterRender = function(){};
											// };
											world.coins_glbs.push(child);
										}
									})
									world.graphicsWorld.add(gltf.scene);
									// console.log("add coin: ", idx);
								},
								(xhr) => {
									// console.log((xhr.loaded / xhr.total) * 100 + '% loaded', idx);
								},
								(error) => {
									console.log(error);
								}
							);
						}); 

					}

					if (child.userData.data === 'vase_origin')
					{
						this.vase = new Vase(child);
						var vase_list = this.vase.listcoins();
						// console.log('vase_origin loading');
						vase_list.forEach((_vase, idx) => {
							// console.log('vase_origin adding');
							let scale = SCALE*0.02;
							// console.log("_vase: ", idx, " : ", _vase.position);
							var path = external+'chair_frac';
							var full_path = external+'chair';
							const nerf_object_rescale:number = scale;

							let nerf_object_offset_x:number = _vase.position.x;
							let nerf_object_offset_y:number = _vase.position.y;
							let nerf_object_offset_z:number = _vase.position.z;
							
							let obj_name = path;
							let full_obj_name = full_path;
							
							let world = this;
							
							world.frac_scale[idx] = scale;
							world.frac_translate[idx] = _vase.position;

							world.frac_meshes_start_break.push(false);
							
							var nerf_gTotalPNGs;
							var nerf_gTotalOBJs;
							var nerf_gLoadedPNGs = 0;
							var nerf_gLoadedOBJs = 0;
							var frac_num = 45;

							fetch(obj_name + '/mlp.json').then(response => {
								return response.json();
							}).then(json => {
								// console.log('mlp');
								nerf_gTotalPNGs = json['obj_num'] * 2;
								nerf_gTotalOBJs = json['obj_num'] * 8;

								let network_weights = json;
								/**
								 * Creates shader code for the view-dependence MLP.
								 *
								 * This populates the shader code in viewDependenceNetworkShaderFunctions with
								 * network weights and sizes as compile-time constants. The result is returned
								 * as a string.
								 *
								 * @param {!Object} scene_params
								 * @return {string}
								 */
								function createViewDependenceFunctions(network_weights) {
									let width = network_weights['0_bias'].length;
									let biasListZero = '';
									for (let i = 0; i < width; i++) {
										let bias = network_weights['0_bias'][i];
										biasListZero += Number(bias).toFixed(7);
										if (i + 1 < width) {
											biasListZero += ', ';
										}
									}
						
									width = network_weights['1_bias'].length;
									let biasListOne = '';
									for (let i = 0; i < width; i++) {
										let bias = network_weights['1_bias'][i];
										biasListOne += Number(bias).toFixed(7);
										if (i + 1 < width) {
											biasListOne += ', ';
										}
									}
						
									width = network_weights['2_bias'].length;
									let biasListTwo = '';
									for (let i = 0; i < width; i++) {
										let bias = network_weights['2_bias'][i];
										biasListTwo += Number(bias).toFixed(7);
										if (i + 1 < width) {
											biasListTwo += ', ';
										}
									}
						
									let channelsZero = network_weights['0_weights'].length;
									let channelsOne = network_weights['0_bias'].length;
									let channelsTwo = network_weights['1_bias'].length;
									let channelsThree = network_weights['2_bias'].length;
						
									let fragmentShaderSource = NeRFShader.gbuffer_frag.replace(
										new RegExp('NUM_CHANNELS_ZERO', 'g'), channelsZero);
									fragmentShaderSource = fragmentShaderSource.replace(
										new RegExp('NUM_CHANNELS_ONE', 'g'), channelsOne);
									fragmentShaderSource = fragmentShaderSource.replace(
										new RegExp('NUM_CHANNELS_TWO', 'g'), channelsTwo);
									fragmentShaderSource = fragmentShaderSource.replace(
										new RegExp('NUM_CHANNELS_THREE', 'g'), channelsThree);
						
									fragmentShaderSource = fragmentShaderSource.replace(
										new RegExp('BIAS_LIST_ZERO', 'g'), biasListZero);
									fragmentShaderSource = fragmentShaderSource.replace(
										new RegExp('BIAS_LIST_ONE', 'g'), biasListOne);
									fragmentShaderSource = fragmentShaderSource.replace(
										new RegExp('BIAS_LIST_TWO', 'g'), biasListTwo);
						
									return fragmentShaderSource;
								}
								/**
								* Creates a data texture containing MLP weights.
								*
								* @param {!Object} network_weights
								* @return {!THREE.DataTexture}
								*/
								function createNetworkWeightTexture(network_weights) {
									let width = network_weights.length;
									let height = network_weights[0].length;
						
									let weightsData = new Float32Array(width * height);
									for (let co = 0; co < height; co++) {
										for (let ci = 0; ci < width; ci++) {
											let index = co * width + ci;
											let weight = network_weights[ci][co];
											weightsData[index] = weight;
										}
									}
									let texture = new THREE.DataTexture(weightsData, width, height, THREE.RedFormat, THREE.FloatType);
									texture.magFilter = THREE.NearestFilter;
									texture.minFilter = THREE.NearestFilter;
									texture.needsUpdate = true;
									return texture;
								}
								let fragmentShaderSource = createViewDependenceFunctions(network_weights);
								let weightsTexZero = createNetworkWeightTexture(network_weights['0_weights']);
								let weightsTexOne = createNetworkWeightTexture(network_weights['1_weights']);
								let weightsTexTwo = createNetworkWeightTexture(network_weights['2_weights']);

								let load_objs = 0;
								for (let i = 0, il = json['obj_num']; i < il; i++) {
									let tex0 = new THREE.TextureLoader().load(
										obj_name + '/shape' + i.toFixed(0) + '.png' + "feat0.png",
										function () {
											nerf_gLoadedPNGs++;
										}
									);
									tex0.magFilter = THREE.NearestFilter;
									tex0.minFilter = THREE.NearestFilter;
									let tex1 = new THREE.TextureLoader().load(
										obj_name + '/shape' + i.toFixed(0) + '.png' + "feat1.png",
										function () {
											nerf_gLoadedPNGs++;
										}
									);
									tex1.magFilter = THREE.NearestFilter;
									tex1.minFilter = THREE.NearestFilter;
									let newmat;
									
									newmat = new THREE.ShaderMaterial({
										side: THREE.DoubleSide,
										vertexShader: NeRFShader.gbuffer_vert.trim(),
										fragmentShader: fragmentShaderSource,
										uniforms: {
											tDiffuse0: { value: tex0 },
											tDiffuse1: { value: tex1 },
											weightsZero: { value: weightsTexZero },
											weightsOne: { value: weightsTexOne },
											weightsTwo: { value: weightsTexTwo },
										},
										glslVersion: THREE.GLSL3
									});
									
									world.frac_meshes[idx] = [];
									for (let j = 0; j < frac_num; j++, load_objs++) {
										new OBJLoader()
											.load(obj_name + '/shape' + i.toFixed(0) + '_' + j.toFixed(0) + '.obj', function (object) {
												object.traverse(function (child) {
													if (child.type == 'Mesh') {
														child.scale.x = nerf_object_rescale;
														child.scale.y = nerf_object_rescale;
														child.scale.z = nerf_object_rescale;
														child.position.x = nerf_object_offset_x;
														child.position.y = nerf_object_offset_y;
														child.position.z = nerf_object_offset_z;

														(child as THREE.Mesh).material = newmat;
														child.receiveShadow = true;
														child.castShadow = true;
														world.frac_meshes[idx].push([child, i*frac_num+j]);

														child.frustumCulled = false;
														// child.onAfterRender = function(){
														// 	child.frustumCulled = true;
														// 	child.onAfterRender = function(){};
														// };
														world.graphicsWorld.add(child);
														child.visible = false;
														
													}
												});
												nerf_gLoadedOBJs++;
											},
											function ( xhr ) {},
											// called when loading has errors
											function ( error ) {}
										);
									}

									world.full_meshes[idx] = [];
									var full_num = 8;
									for (let j = 0; j < full_num; j++, load_objs++) {
										new OBJLoader()
											.load(full_obj_name + '/shape' + i.toFixed(0) + '_' + j.toFixed(0) + '.obj', function (object) {
												object.traverse(function (child) {
													if (child.type == 'Mesh') {
														child.scale.x = nerf_object_rescale;
														child.scale.y = nerf_object_rescale;
														child.scale.z = nerf_object_rescale;
														child.position.x = nerf_object_offset_x;
														child.position.y = nerf_object_offset_y;
														child.position.z = nerf_object_offset_z;

														(child as THREE.Mesh).material = newmat;
														child.receiveShadow = true;
														child.castShadow = true;
														world.full_meshes[idx].push(child);

														child.frustumCulled = false;
														// child.onAfterRender = function(){
														// 	child.frustumCulled = true;
														// 	child.onAfterRender = function(){};
														// };
														world.graphicsWorld.add(child);
														
													}
												});
												nerf_gLoadedOBJs++;
											},
											function ( xhr ) {},
											// called when loading has errors
											function ( error ) {}
										);
									}
								}
								console.log('load nerf scene');
							});

							var file_path = 'src/blend/frac_chair_animate.glb';
							const loader = new GLTFLoader();
							loader.load(
								// resource URL
								file_path,
								// 'src/blend/frac_chair_animate.glb',
								// called when the resource is loaded
								function ( gltf ) {
							
									let animations = gltf.animations; // Array<THREE.AnimationClip>
									animations.forEach(animation => {
										let tracks = animation.tracks;
										// console.log("animation ", animation.name, ": ");
										tracks.forEach((track, idx) => {
											let time_track = track.times;
											let value_track = track.values;
											let value_sz = track.getValueSize();
											world.frac_tot_frame = time_track.length;
											if(idx == 0){
												world.frac_translate_values.push(value_track);
											}
											else if(idx == 1){
												world.frac_rot_values.push(value_track);
											}
											else if(idx == 2){
												world.frac_scale_values.push(value_track);
											}
											// console.log("idx: ", value_track);
										});
									});
							
								},
								// called while loading is progressing
								function ( xhr ) {
							
									// console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
							
								},
								// called when loading has errors
								function ( error ) {
							
									console.log( 'An error happened' );
							
								}
							);
							
						}); 

					}


					if (child.userData.data === 'collision')
					{
						if (child.userData.shape === 'box')
						{
							child.visible = false;
							let phys = new BoxCollider({size: new THREE.Vector3(child.scale.x, child.scale.y, child.scale.z)});
							phys.body.position.copy(Utils.cannonVector(child.position));
							phys.body.quaternion.copy(Utils.cannonQuat(child.quaternion));
							phys.body.computeAABB();

							phys.body.shapes.forEach((shape) => {
								shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
							});

							this.blender_collisions.push(phys.body)
						}
					}

					if (child.userData.data === 'camera_range')
					{
						if (child.userData.shape === 'box')
						{
							child.visible = false;
							var rect_p1 = new THREE.Vector4(-1, 0, -1, 1);
							var rect_p2 = new THREE.Vector4(1, 0, -1, 1);
							var rect_p3 = new THREE.Vector4(1, 0, 1, 1);
							var rect_p4 = new THREE.Vector4(-1, 0, 1, 1);
							
							let rot_matrix = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(child.quaternion._x, child.quaternion._y, child.quaternion._z, child.quaternion._w));
							let translate_matrix = new THREE.Matrix4().makeTranslation(child.position.x, child.position.y, child.position.z);
							let scale_matrix = new THREE.Matrix4().makeScale(child.scale.x, child.scale.y, child.scale.z);
							let T_matrix = new THREE.Matrix4().multiplyMatrices(translate_matrix, new THREE.Matrix4().multiplyMatrices(rot_matrix, scale_matrix));
							
							rect_p1 = rect_p1.applyMatrix4(T_matrix);
							rect_p2 = rect_p2.applyMatrix4(T_matrix);
							rect_p3 = rect_p3.applyMatrix4(T_matrix);
							rect_p4 = rect_p4.applyMatrix4(T_matrix);

							var rect: [[number, number], [number, number], [number, number], [number, number]] = [
								[rect_p1.x / rect_p1.w, rect_p1.z / rect_p1.w],
								[rect_p2.x / rect_p2.w, rect_p2.z / rect_p2.w],
								[rect_p3.x / rect_p3.w, rect_p3.z / rect_p3.w],
								[rect_p4.x / rect_p4.w, rect_p4.z / rect_p4.w]
							]
							// console.log(rect,  child.userData.theta, child.userData.offset);
							this.cameraOperator.range_ctrler.push([rect, child.userData.theta, child.userData.offset]);
						}
					}

					if (child.userData.data === 'ckpt')
					{
						if (child.userData.shape === 'box')
						{
							child.visible = false;
							var rect_p1 = new THREE.Vector4(-1, 0, -1, 1);
							var rect_p2 = new THREE.Vector4(1, 0, -1, 1);
							var rect_p3 = new THREE.Vector4(1, 0, 1, 1);
							var rect_p4 = new THREE.Vector4(-1, 0, 1, 1);
							
							let rot_matrix = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(child.quaternion._x, child.quaternion._y, child.quaternion._z, child.quaternion._w));
							let translate_matrix = new THREE.Matrix4().makeTranslation(child.position.x, child.position.y, child.position.z);
							let scale_matrix = new THREE.Matrix4().makeScale(child.scale.x, child.scale.y, child.scale.z);
							let T_matrix = new THREE.Matrix4().multiplyMatrices(translate_matrix, new THREE.Matrix4().multiplyMatrices(rot_matrix, scale_matrix));
							
							rect_p1 = rect_p1.applyMatrix4(T_matrix);
							rect_p2 = rect_p2.applyMatrix4(T_matrix);
							rect_p3 = rect_p3.applyMatrix4(T_matrix);
							rect_p4 = rect_p4.applyMatrix4(T_matrix);

							var rect: [[number, number], [number, number], [number, number], [number, number]] = [
								[rect_p1.x / rect_p1.w, rect_p1.z / rect_p1.w],
								[rect_p2.x / rect_p2.w, rect_p2.z / rect_p2.w],
								[rect_p3.x / rect_p3.w, rect_p3.z / rect_p3.w],
								[rect_p4.x / rect_p4.w, rect_p4.z / rect_p4.w]
							]
							// console.log(rect,  child.userData.theta, child.userData.offset);
							this.ckpts.push([rect, child.userData.seq]);
						}
					}


				}
			}
		});

		this.graphicsWorld.add(gltf.scene);

		// while(true){
		// 	let unloaded = false;
		// 	// console.log(this.kitti_uv_models_loaded);
		// 	this.kitti_uv_models_loaded.forEach(pname => {
		// 		if(!pname){
		// 			unloaded = true;
		// 		}
		// 	});
		// 	if(!unloaded){
		// 		break;
		// 	}
		// }


		// Launch default scenario
		let defaultScenarioID: string;
		for (const scenario of this.scenarios) {
			if (scenario.default) {
				defaultScenarioID = scenario.id;
				break;
			}
		}
		if (defaultScenarioID !== undefined) this.launchScenario(defaultScenarioID, loadingManager);
	}
	
	public launchScenario(scenarioID: string, loadingManager?: LoadingManager): void
	{
		this.lastScenarioID = scenarioID;

		this.clearEntities();

		// Launch default scenario
		if (!loadingManager) loadingManager = new LoadingManager(this);
		for (const scenario of this.scenarios) {
			if (scenario.id === scenarioID || scenario.spawnAlways) {
				scenario.launch(loadingManager, this);
			}
		}
	}

	public restartScenario(): void
	{
		if (this.lastScenarioID !== undefined)
		{
			document.exitPointerLock();
			this.launchScenario(this.lastScenarioID);
		}
		else
		{
			console.warn('Can\'t restart scenario. Last scenarioID is undefined.');
		}
	}

	public clearEntities(): void
	{
		for (let i = 0; i < this.characters.length; i++) {
			this.remove(this.characters[i]);
			i--;
		}

		for (let i = 0; i < this.vehicles.length; i++) {
			this.remove(this.vehicles[i]);
			i--;
		}
	}

	public scrollTheTimeScale(scrollAmount: number): void
	{
		// Changing time scale with scroll wheel
		const timeScaleBottomLimit = 0.003;
		const timeScaleChangeSpeed = 1.3;
	
		if (scrollAmount > 0)
		{
			this.timeScaleTarget /= timeScaleChangeSpeed;
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = 0;
		}
		else
		{
			this.timeScaleTarget *= timeScaleChangeSpeed;
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = timeScaleBottomLimit;
			this.timeScaleTarget = Math.min(this.timeScaleTarget, 1);
		}
	}

	public updateControls(controls: any): void
	{
		let html = '';
		html += '<h2 class="controls-title">Controls:</h2>';

		controls.forEach((row) =>
		{
			html += '<div class="ctrl-row">';
			row.keys.forEach((key) => {
				if (key === '+' || key === 'and' || key === 'or' || key === '&') html += '&nbsp;' + key + '&nbsp;';
				else html += '<span class="ctrl-key">' + key + '</span>';
			});

			html += '<span class="ctrl-desc">' + row.desc + '</span></div>';
		});

		document.getElementById('controls').innerHTML = html;
	}

	private generateHTML(): void
	{
		// Fonts
		$('head').append('<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&display=swap" rel="stylesheet">');
		$('head').append('<link href="https://fonts.googleapis.com/css2?family=Solway:wght@400;500;700&display=swap" rel="stylesheet">');
		$('head').append('<link href="https://fonts.googleapis.com/css2?family=Cutive+Mono&display=swap" rel="stylesheet">');

		// Loader
		$(`	<div id="loading-screen">
				<div id="loading-screen-background"></div>
				<h1 id="main-title" class="sb-font">Video2Game v1.0</h1>
				<div class="cubeWrap">
					<div class="cube">
						<div class="faces1"></div>
						<div class="faces2"></div>     
					</div> 
				</div> 
				<div id="loading-text">Loading...</div>
			</div>
		`).appendTo('body');

		// UI
		$(`	<div id="ui-container" style="display: none;">
				<div class="github-corner">
					<a href="https://video2game.github.io/" target="_blank" title="Video2Game">
						<svg viewbox="0 0 100 100" fill="currentColor">
							<title>Video2Game</title>
							<path d="M0 0v100h100V0H0zm60 70.2h.2c1 2.7.3 4.7 0 5.2 1.4 1.4 2 3 2 5.2 0 7.4-4.4 9-8.7 9.5.7.7 1.3 2
							1.3 3.7V99c0 .5 1.4 1 1.4 1H44s1.2-.5 1.2-1v-3.8c-3.5 1.4-5.2-.8-5.2-.8-1.5-2-3-2-3-2-2-.5-.2-1-.2-1
							2-.7 3.5.8 3.5.8 2 1.7 4 1 5 .3.2-1.2.7-2 1.2-2.4-4.3-.4-8.8-2-8.8-9.4 0-2 .7-4 2-5.2-.2-.5-1-2.5.2-5
							0 0 1.5-.6 5.2 1.8 1.5-.4 3.2-.6 4.8-.6 1.6 0 3.3.2 4.8.7 2.8-2 4.4-2 5-2z"></path>
						</svg>
					</a>
				</div>
				<div class="left-panel">
					<div id="controls" class="panel-segment flex-bottom"></div>
				</div>
			</div>
		`).appendTo('body');

		// Canvas
		document.body.appendChild(this.renderer.domElement);
		this.renderer.domElement.id = 'canvas';
	}

	private createParamsGUI(scope: World): void
	{
		this.params = {
			Pointer_Lock: true,
			Mouse_Sensitivity: 0.3,
			Time_Scale: 1,
			Shadows: true,
			FXAA: true,
			Debug_Physics: false,
			Debug_FPS: false,
			Sun_Elevation: 50,
			Sun_Rotation: 145,
			fix_camera_y: CH
		};

		const gui = new GUI.GUI();

		// Scenario
		this.scenarioGUIFolder = gui.addFolder('Scenarios');
		this.scenarioGUIFolder.open();

		// World
		let worldFolder = gui.addFolder('World');
		
		worldFolder.add(this.params, 'fix_camera_y', 13.0, 14.5).listen()
			.onChange((value) =>
			{
				scope.fix_camera_y = value;
			});

		// Input
		let settingsFolder = gui.addFolder('Settings');

		
		settingsFolder.add(this.params, 'Debug_Physics')
			.onChange((enabled) =>
			{
				if (enabled)
				{
					this.cannonDebugRenderer = new CannonDebugRenderer( this.graphicsWorld, this.physicsWorld );
				}
				else
				{
					this.cannonDebugRenderer.clearMeshes();
					this.cannonDebugRenderer = undefined;
				}

				scope.characters.forEach((char) =>
				{
					char.raycastBox.visible = enabled;
				});
			});
		settingsFolder.add(this.params, 'Debug_FPS')
			.onChange((enabled) =>
			{
				UIManager.setFPSVisible(enabled);
			});

		gui.open();
	}
}