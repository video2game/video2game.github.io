import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CameraOperator } from '../core/CameraOperator';
import { Stats } from '../../lib/utils/Stats';
import { CannonDebugRenderer } from '../../lib/cannon/CannonDebugRenderer';
import { InputManager } from '../core/InputManager';
import { LoadingManager } from '../core/LoadingManager';
import { InfoStack } from '../core/InfoStack';
import { IWorldEntity } from '../interfaces/IWorldEntity';
import { IUpdatable } from '../interfaces/IUpdatable';
import { Character } from '../characters/Character';
import { Path } from './Path';
import { Coins } from './Coins';
import { Vase } from './Vase';
import { Vehicle } from '../vehicles/Vehicle';
import { Scenario } from './Scenario';
import { Sky } from './Sky';
export declare class World {
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    composer: any;
    stats: Stats;
    graphicsWorld: THREE.Scene;
    sky: Sky;
    physicsWorld: CANNON.World;
    parallelPairs: any[];
    physicsFrameRate: number;
    physicsFrameTime: number;
    physicsMaxPrediction: number;
    clock: THREE.Clock;
    renderDelta: number;
    logicDelta: number;
    requestDelta: number;
    sinceLastFrame: number;
    justRendered: boolean;
    params: any;
    inputManager: InputManager;
    cameraOperator: CameraOperator;
    timeScaleTarget: number;
    console: InfoStack;
    cannonDebugRenderer: CannonDebugRenderer;
    scenarios: Scenario[];
    characters: Character[];
    vehicles: Vehicle[];
    paths: Path[];
    coins: Coins;
    vase: Vase;
    coins_glbs: any[];
    scenarioGUIFolder: any;
    updatables: IUpdatable[];
    wind_uniforms: any;
    wind_meshes: any;
    frac_scale_values: any[];
    frac_rot_values: any[];
    frac_translate_values: any[];
    frac_meshes: any[];
    frac_meshes_start_break: any[];
    full_meshes: any[];
    frac_meshes_sorted: any[];
    frac_scale: any[];
    frac_translate: any[];
    frac_frame: any[];
    pre_frac_frame: any[];
    frac_tot_frame: any;
    kitti_models: any[];
    kitti_loaded_list: any[];
    kitti_model_num: number;
    camera_projmat: number[];
    kitti_material_list: any[];
    kitti_uv_models_loaded: any[];
    kitti_uvmodel_num: number;
    track_collider: any;
    track_collider_base: any;
    track_sp: any;
    kitti_uv_models: any[];
    intrinsic: any;
    fix_camera_y: number;
    fx: any;
    fy: any;
    cx: any;
    cy: any;
    progressBar: any;
    progress: {};
    onload: number;
    total_load: number;
    interface_loaded: boolean;
    loadingManager: any;
    total_load_progress: {};
    pot: any;
    pot_path: any;
    pot_pos: any;
    table_pos: any;
    activate_collision_pot: boolean;
    track_off_x: any;
    track_off_y: any;
    track_off_z: any;
    shoot: boolean;
    shoot_interval: number;
    shoot_sec: number;
    balls: any[];
    track_base_pos: any;
    track_base_quat: any;
    private lastScenarioID;
    shoot_cnt: number;
    balls_hit: any[];
    hit_cnt: number;
    msec: number;
    game_finished: boolean;
    constructor(worldScenePath?: any);
    update_progress_bar(world: World): void;
    private init_shadow;
    private init_uvmapping;
    private init_uvmapping_ply;
    private init_convex_collision_box;
    init_trimesh_collision_glb(world: World, path: string): void;
    private init_convex_collision_box_glb;
    private init_convex_collision_box_center;
    private init_bakedsdf_bbox;
    update(timeStep: number, unscaledTimeStep: number): void;
    updatePhysics(timeStep: number): void;
    isOutOfBounds(position: CANNON.Vec3): boolean;
    outOfBoundsRespawn(body: CANNON.Body, position?: CANNON.Vec3): void;
    initProgressBar(name: any, length: any): void;
    updateProgressBar(name: any, index: any): void;
    /**
     * Rendering loop.
     * Implements fps limiter and frame-skipping
     * Calls world's "update" function before rendering.
     * @param {World} world
     */
    render(world: World): void;
    setTimeScale(value: number): void;
    add(worldEntity: IWorldEntity): void;
    registerUpdatable(registree: IUpdatable): void;
    remove(worldEntity: IWorldEntity): void;
    unregisterUpdatable(registree: IUpdatable): void;
    loadScene(loadingManager: LoadingManager, gltf: any): void;
    launchScenario(scenarioID: string, loadingManager?: LoadingManager): void;
    restartScenario(): void;
    clearEntities(): void;
    scrollTheTimeScale(scrollAmount: number): void;
    updateControls(controls: any): void;
    private generateHTML;
    private createParamsGUI;
}
