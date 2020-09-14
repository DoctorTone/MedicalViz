import $ from "jquery";
import * as THREE from "three";
//import { TrackballControls } from "three-trackballcontrols";
let TrackballControls = require("three-trackballcontrols");

import { BaseApp } from "./baseApp";
import { APPCONFIG } from "./appConfig";
import { NRRDLoader } from "./NRRDLoader";

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

const PLANE_INC = 0.25;
class MedicalViz extends BaseApp {
    constructor() {
        super();
        this.cameraRotate = false;
        this.rotSpeed = Math.PI/20;
        this.rotDirection = 1;
        this.zoomingIn = false;
        this.zoomingOut = false;
        this.zoomSpeed = APPCONFIG.ZOOM_SPEED;
        this.renderUpdate = false;

        // Volume attributes
        this.volumeVertices = [];
        this.volumeLines = [];
        this.lineIndices = [];
        this.planeNormal = new THREE.Vector3();
        this.viewingDir = new THREE.Line3();
        this.offset = new THREE.Vector3();
        this.planeOffset;
        this.startSlice = 0;
        this.intersectPlane = new THREE.Plane();

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

        // Textures
        let loader = new THREE.TextureLoader();

        let texture = loader.load("../textures/cns_tra750.png");

        const uniforms = {
            u_data: { value: texture }
        }

        // Shader material
        this.shaderMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            transparent: true,
            vertexShader: vshader,
            fragmentShader: fshader
        });

        // Create viewing plane
        let planeGeom = new THREE.PlaneBufferGeometry(APPCONFIG.PLANE_SIZE, APPCONFIG.PLANE_SIZE);
        let planeMat = new THREE.MeshLambertMaterial( {color: 0xffffff});
        this.viewingPlane = new THREE.Mesh(planeGeom, planeMat);
        this.scene.add(this.viewingPlane);

        // Ref cube
        let cubeGeom = new THREE.BoxBufferGeometry(10, 10, 10);
        let cubeMat = new THREE.MeshLambertMaterial( { color: 0xff0000});
        let cube = new THREE.Mesh(cubeGeom, cubeMat);
        cube.position.z = -50;
        //this.scene.add(cube);

        // Front vertices
        const LEFT_EDGE_X = -80;
        const RIGHT_EDGE_X = 80;
        const TOP_EDGE_Y = 128;
        const BOTTOM_EDGE_Y = -128;
        const FRONT_EDGE_Z = 110.5;
        const BACK_EDGE_Z = -110.5;

        // Vertices
        this.volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, TOP_EDGE_Y, FRONT_EDGE_Z));
        this.volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, TOP_EDGE_Y, BACK_EDGE_Z));
        this.volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, BOTTOM_EDGE_Y, FRONT_EDGE_Z));
        this.volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, TOP_EDGE_Y, FRONT_EDGE_Z));

        this.volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, TOP_EDGE_Y, BACK_EDGE_Z));
        this.volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, BOTTOM_EDGE_Y, BACK_EDGE_Z));
        this.volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, BOTTOM_EDGE_Y, FRONT_EDGE_Z));
        this.volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, BOTTOM_EDGE_Y, BACK_EDGE_Z));

        // Lines
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[0], this.volumeVertices[1]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[1], this.volumeVertices[4]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[4], this.volumeVertices[7]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[1], this.volumeVertices[5]));

        this.volumeLines.push(new THREE.Line3(this.volumeVertices[0], this.volumeVertices[2]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[2], this.volumeVertices[5]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[5], this.volumeVertices[7]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[2], this.volumeVertices[6]));

        this.volumeLines.push(new THREE.Line3(this.volumeVertices[0], this.volumeVertices[3]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[3], this.volumeVertices[6]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[6], this.volumeVertices[7]));
        this.volumeLines.push(new THREE.Line3(this.volumeVertices[3], this.volumeVertices[4]));

        // Load medical image data
        let modelLoader = new NRRDLoader().load("./models/nrrd/MRIDataPNG.nrrd", volume => {
            const TEXTURE_SIZE_X = volume.xLength;
            const TEXTURE_SIZE_Y = volume.yLength;
            const TEXTURE_SIZE_Z = volume.zLength;

            let texture3D = new THREE.DataTexture3D( volume.data, TEXTURE_SIZE_X, TEXTURE_SIZE_Y, TEXTURE_SIZE_Z );
            texture3D.format = THREE.RedFormat;
            texture3D.type = THREE.UnsignedByteType;
            texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
            texture3D.unpackAlignment = 1;
            uniforms.u_data.value = texture3D;

            this.renderUpdate = true;
        })
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

    renderVolume() {
        // Remove existing geometry
        this.scene.remove(this.root);
        this.root = new THREE.Object3D();
        this.scene.add(this.root);

        // Set up plane
        // Plane normal
        this.planeNormal.copy(this.camera.position);
        this.planeNormal.sub(this.controls.target);
        this.planeNormal.normalize();

        // Plane offset
        let nearest = this.getClosestVertex(this.volumeVertices, this.camera.position);
        this.viewingDir.set(this.controls.target, this.camera.position);
        this.viewingDir.closestPointToPoint(nearest.vertex, false, this.offset);

        // Viewing plane
        this.viewingPlane.position.copy(this.offset);
        this.viewingPlane.lookAt(this.controls.target);

        // DEBUG
        //console.log("Offset = ", offset);

        this.planeOffset = this.offset.sub(this.controls.target).length();
        this.numSlices = Math.round(this.planeOffset / PLANE_INC) * 2;
        //uniforms.u_slices.value.z = numSlices;
        this.planeOffset *= -1;
        // Prevent co=planar issues
        this.planeOffset += (PLANE_INC * this.startSlice);
        //planeOffset += planeInc;
        this.intersectPlane.set(this.planeNormal, this.planeOffset);

        // Get intersection points
        let intersectionPoints;
        let currentGeometry;
        let currentMesh;
        for (let slice=0; slice<this.numSlices; ++slice) {
            currentGeometry = new THREE.Geometry();
            intersectionPoints = this.getIntersectionPoints(nearest.nearest, this.intersectPlane);
            for (let i=0, numPoints=intersectionPoints.length; i<numPoints; ++i) {
                currentGeometry.vertices.push(new THREE.Vector3().copy(intersectionPoints[i]));
            }
            // Advance plane
            this.planeOffset += PLANE_INC;
            this.intersectPlane.set(this.planeNormal, this.planeOffset);

            // Viewing plane
            //viewingPlane.position.copy(planeNormal.multiplyScalar(planeOffset * -1));

            // Remove duplicates
            currentGeometry.mergeVertices();

            // Disregard if co-planer or no intersection at all
            if (currentGeometry.vertices.length <= 2) {
                continue;
            }
            
            //orderVertices(currentGeometry, camera.matrixWorldInverse);
            this.orderFaces(currentGeometry);

            //currentMesh = new THREE.Mesh(currentGeometry, wireframeWhite);
            currentGeometry.computeBoundingSphere();
            currentGeometry.computeFaceNormals();
            currentMesh = new THREE.Mesh(currentGeometry, this.volumeShader);
            this.root.add(currentMesh);
        }
        //displayElem.textContent = startSlice;
    }

    getIntersectionPoints(nearestVertex, intersectPlane) {
        this.lineIndices.length = 0;
        switch (nearestVertex) {
            case 0:
                this.lineIndices.push(0, 1);
                this.lineIndices.push(1, 4);
                this.lineIndices.push(4, 7);
                this.lineIndices.push(1, 5);
                this.lineIndices.push(0, 2);
                this.lineIndices.push(2, 5);
                this.lineIndices.push(5, 7);
                this.lineIndices.push(2, 6);
                this.lineIndices.push(0, 3);
                this.lineIndices.push(3, 6);
                this.lineIndices.push(6, 7);
                this.lineIndices.push(3, 4);
                break;

            case 1:
                break;

            case 2:
                break;

            case 3:
                break;

            case 4:
                break;

            case 5:
                break;

            case 6:
                break;

            case 7:
                break;

            default:
                break;

        }
        // Set line segments
        let currentIndex = 0
        let currentStart;
        let currentEnd;
        for (let i=0, numSegs=this.lineIndices.length/2; i<numSegs; ++i) {
            currentStart = this.lineIndices[currentIndex];
            currentEnd = this.lineIndices[currentIndex + 1];
            this.volumeLines[i].set(this.volumeVertices[currentStart], this.volumeVertices[currentEnd]);
            currentIndex += 2;
        }

        // Get intersections
        let intersectionPoints = [];
        let intersects;
        intersects = this.getLineIntersections([0, 1, 2], intersectPlane);
        if (intersects) {
            intersectionPoints.push(intersects);
        }

        intersects = this.getLineIntersections([3], intersectPlane);
        if (intersects) {
            intersectionPoints.push(intersects);
        }

        intersects = this.getLineIntersections([4, 5, 6], intersectPlane);
        if (intersects) {
            intersectionPoints.push(intersects);
        }

        intersects = this.getLineIntersections([7], intersectPlane);
        if (intersects) {
            intersectionPoints.push(intersects);
        }

        intersects = this.getLineIntersections([8, 9, 10], intersectPlane);
        if (intersects) {
            intersectionPoints.push(intersects);
        }

        intersects = this.getLineIntersections([11], intersectPlane);
        if (intersects) {
            intersectionPoints.push(intersects);
        }

        return intersectionPoints;
    }

    getLineIntersections(lineNumbers, plane) {
        let intersects;
        let intersectPoint = new THREE.Vector3();

        for (let i=0, numLines=lineNumbers.length; i<numLines; ++i) {
            intersects = plane.intersectLine(this.volumeLines[lineNumbers[i]], intersectPoint);
            if (intersects) {
                return intersectPoint;
            }
        }

        return false;
    }

    orderFaces(geometry) {
        switch(geometry.vertices.length) {
            case 3:
                geometry.faces.push( new THREE.Face3(0, 2, 1));
                break;

            case 4:
                geometry.faces.push( new THREE.Face3(0, 2, 1));
                geometry.faces.push( new THREE.Face3(0, 3, 2));
                break;

            case 5:
                geometry.faces.push( new THREE.Face3(0, 2, 1));
                geometry.faces.push( new THREE.Face3(0, 3, 2));
                geometry.faces.push( new THREE.Face3(0, 4, 3));
                break;

            case 6:
                geometry.faces.push( new THREE.Face3(0, 2, 1));
                geometry.faces.push( new THREE.Face3(0, 3, 2));
                geometry.faces.push( new THREE.Face3(0, 4, 3));
                geometry.faces.push( new THREE.Face3(0, 5, 4));
                break;

            default:
                console.log("Too many points = ", geometry.vertices.length);
                break;
        }
    }

    getClosestVertex(vertices, point) {
        let nearestDistance = 100000;
        let distance;
        let nearestVertex;

        for (let i=0, numVerts=vertices.length; i<numVerts; ++i) {
            distance = vertices[i].distanceTo(point);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestVertex = i;
            }
        }

        return {
            nearest: nearestVertex,
            vertex: vertices[nearestVertex]
        }
    }
}

$(document).ready( () => {
    // Initialise
    const app = new MedicalViz();

    app.init();
    app.createScene();

    app.run();
});