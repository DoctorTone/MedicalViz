import $ from "jquery";
import * as THREE from "three";
//import { TrackballControls } from "three-trackballcontrols";
let TrackballControls = require("three-trackballcontrols");

import { BaseApp } from "./baseApp";
import { APPCONFIG } from "./appConfig";

import "./main.css";

// Shaders
const vshader = `
    varying vec4 texPosition;

    void main() {
        texPosition = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fshader = `
    varying vec4 texPosition;
    uniform sampler2D pointTexture;

    void main() {
        vec2 texCoords = vec2((texPosition.x/250.0) + 0.5, (texPosition.y/250.0) + 0.5);
        gl_FragColor = texture2D(pointTexture, texCoords);
        gl_FragColor.a = gl_FragColor.r;
    }
`

class MedicalViz extends BaseApp {
    constructor() {
        super();
        this.cameraRotate = false;
        this.rotSpeed = Math.PI/20;
        this.rotDirection = 1;
        this.zoomingIn = false;
        this.zoomingOut = false;
        this.zoomSpeed = APPCONFIG.ZOOM_SPEED;

        //Temp variables
        this.tempVec = new THREE.Vector3();
    }

    init() {
        super.init();
    }

    createScene() {
        // Init base createsScene
        super.createScene();

        // Create root object.
        this.root = new THREE.Object3D();
        this.scene.add(this.root);
        this.root.rotation.y = APPCONFIG.ROOT_ROTATE;

        // Textures
        let loader = new THREE.TextureLoader();

        let texture = loader.load("../textures/cns_tra750.png");

        const uniforms = {
            pointTexture: { value: texture }
        }

        // Shader material
        const shaderMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            transparent: true,
            vertexShader: vshader,
            fragmentShader: fshader
        });

        // Create 2 planes
        let planeGeom = new THREE.PlaneBufferGeometry(APPCONFIG.PLANE_SIZE, APPCONFIG.PLANE_SIZE);
        let planeMat = new THREE.MeshLambertMaterial( {map: texture, transparent: true});
        let plane = new THREE.Mesh(planeGeom, shaderMat);
        this.scene.add(plane);

        // Ref cube
        let cubeGeom = new THREE.BoxBufferGeometry(10, 10, 10);
        let cubeMat = new THREE.MeshLambertMaterial( { color: 0xff0000});
        let cube = new THREE.Mesh(cubeGeom, cubeMat);
        cube.position.z = -50;
        this.scene.add(cube);
    }

    update() {
        let delta = this.clock.getDelta();

        if (this.cameraRotate) {
            this.root.rotation[this.rotAxis] += (this.rotSpeed * this.rotDirection * delta);
        }

        if(this.zoomingIn) {
            this.tempVec.copy(this.camera.position);
            this.tempVec.multiplyScalar(this.zoomSpeed * delta);
            this.root.position.add(this.tempVec);
            //DEBUG
            //console.log("Root = ", this.root.position);
        }

        if(this.zoomingOut) {
            this.tempVec.copy(this.camera.position);
            this.tempVec.multiplyScalar(this.zoomSpeed * delta);
            this.root.position.sub(this.tempVec);
            //DEBUG
            //console.log("Root = ", this.root.position);
        }

        super.update();
    }

}

$(document).ready( () => {
    // Initialise
    const app = new MedicalViz();

    app.init();
    app.createScene();

    app.run();
});