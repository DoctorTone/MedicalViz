import $ from "jquery";
import * as THREE from "three";
//import { TrackballControls } from "three-trackballcontrols";
let TrackballControls = require("three-trackballcontrols");

import { BaseApp } from "./baseApp";
import "bootstrap";
import { APPCONFIG, lineIndices0, lineIndices1, lineIndices3, lineIndices4, lineIndices2, lineIndices5, lineIndices6, lineIndices7 } from "./appConfig";
import { NRRDLoader } from "./NRRDLoader";

import "bootstrap/dist/css/bootstrap.min.css";
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
    precision mediump sampler3D;

    varying vec4 texPosition;
    uniform vec3 u_slices;
    uniform sampler3D u_data;
    uniform float u_thresh;
    uniform float u_alphaScale;

    void main() {
        vec3 texCoords = vec3((texPosition.x/u_slices.x) + 0.5, (texPosition.y/u_slices.y) + 0.5, (texPosition.z/u_slices.z) + 0.5);
        gl_FragColor = texture(u_data, texCoords);
        if (gl_FragColor.r < u_thresh) {
            discard;
        }
        gl_FragColor.b = gl_FragColor.g = gl_FragColor.r;
        gl_FragColor.a = gl_FragColor.r;
        gl_FragColor.a *= u_alphaScale;
    }
`

const PLANE_INC = 1.0;

// Front vertices
const LEFT_EDGE_X = -80;
const RIGHT_EDGE_X = 80;
const TOP_EDGE_Y = 128;
const BOTTOM_EDGE_Y = -128;
const FRONT_EDGE_Z = 110.5;
const BACK_EDGE_Z = -110.5;

// Vertices
const volumeVertices = [];
volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, TOP_EDGE_Y, FRONT_EDGE_Z));
volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, TOP_EDGE_Y, BACK_EDGE_Z));
volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, BOTTOM_EDGE_Y, FRONT_EDGE_Z));
volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, TOP_EDGE_Y, FRONT_EDGE_Z));

volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, TOP_EDGE_Y, BACK_EDGE_Z));
volumeVertices.push(new THREE.Vector3(RIGHT_EDGE_X, BOTTOM_EDGE_Y, BACK_EDGE_Z));
volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, BOTTOM_EDGE_Y, FRONT_EDGE_Z));
volumeVertices.push(new THREE.Vector3(LEFT_EDGE_X, BOTTOM_EDGE_Y, BACK_EDGE_Z));

const uniforms = {
    u_data: { value: null },
    u_slices: { value: new THREE.Vector3(160, 256, 221)},
    u_thresh: { value: $("#alphaRange").val() / 255.0 },
    u_alphaScale: { value: $("#alphaScale").val() }
};

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
        this.currentLineIndices = lineIndices0;
        this.planeNormal = new THREE.Vector3();
        this.viewingDir = new THREE.Line3();
        this.offset = new THREE.Vector3();
        this.planeOffset;
        this.startSlice = 0;
        this.intersectPlane = new THREE.Plane();
        this.renderOveride = false;
        this.sliceScale = 1;
        this.planeInc = PLANE_INC * this.sliceScale;

        //Temp variables
        this.tempVec1 = new THREE.Vector3();
        this.tempVec2 = new THREE.Vector3();
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

        // Shader material
        this.volumeShader = new THREE.ShaderMaterial({
            uniforms: uniforms,
            transparent: true,
            side: THREE.DoubleSide,
            vertexShader: vshader,
            fragmentShader: fshader
        });

        let volumeLines = [];
        
        volumeLines.push(new THREE.Line3());
        volumeLines[0].set(volumeVertices[0], volumeVertices[1]);
        volumeLines.push(new THREE.Line3());
        volumeLines[1].set(volumeVertices[1], volumeVertices[4]);
        volumeLines.push(new THREE.Line3());
        volumeLines[2].set(volumeVertices[4], volumeVertices[7]);
        volumeLines.push(new THREE.Line3());
        volumeLines[3].set(volumeVertices[1], volumeVertices[5]);

        volumeLines.push(new THREE.Line3());
        volumeLines[4].set(volumeVertices[0], volumeVertices[2]);
        volumeLines.push(new THREE.Line3());
        volumeLines[5].set(volumeVertices[2], volumeVertices[5]);
        volumeLines.push(new THREE.Line3());
        volumeLines[6].set(volumeVertices[5], volumeVertices[7]);
        volumeLines.push(new THREE.Line3());
        volumeLines[7].set(volumeVertices[2], volumeVertices[6]);

        volumeLines.push(new THREE.Line3());
        volumeLines[8].set(volumeVertices[0], volumeVertices[3]);
        volumeLines.push(new THREE.Line3());
        volumeLines[9].set(volumeVertices[3], volumeVertices[6]);
        volumeLines.push(new THREE.Line3());
        volumeLines[10].set(volumeVertices[6], volumeVertices[7]);
        volumeLines.push(new THREE.Line3());
        volumeLines[11].set(volumeVertices[3], volumeVertices[4]);

        //this.volumeVertices = volumeVertices;
        this.volumeLines = volumeLines;

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
        });

        let cubeMat = new THREE.LineBasicMaterial( { color: 0xff0000 });
        let cubeGeom = this.createCubeSegments(APPCONFIG.CUBE_WIDTH);
        let cube = new THREE.LineSegments( cubeGeom, cubeMat );
        cube.computeLineDistances();
        cube.position.set(-100, 0, 0);
        this.scene.add( cube );
    }

    createCubeSegments(width) {
        let cubeGeom = new THREE.BufferGeometry();
        let position = [];
        // Top
        position.push( width/2, width/2, width/2, -width/2, width/2, width/2);
        position.push( -width/2, width/2, width/2, -width/2, width/2, -width/2);
        position.push( -width/2, width/2, -width/2, width/2, width/2, -width/2);
        position.push( width/2, width/2, -width/2, width/2, width/2, width/2);

        // Middle
        position.push( width/2, width/2, width/2, width/2, -width/2, width/2);
        position.push( -width/2, width/2, width/2, -width/2, -width/2, width/2);
        position.push( -width/2, width/2, -width/2, -width/2, -width/2, -width/2);
        position.push( width/2, width/2, -width/2, width/2, -width/2, -width/2);

        // Bottom
        position.push( width/2, -width/2, width/2, -width/2, -width/2, width/2);
        position.push( -width/2, -width/2, width/2, -width/2, -width/2, -width/2);
        position.push( -width/2, -width/2, -width/2, width/2, -width/2, -width/2);
        position.push( width/2, -width/2, -width/2, width/2, -width/2, width/2);

        cubeGeom.setAttribute("position", new THREE.Float32BufferAttribute( position, 3 ));

        return cubeGeom;
    }

    update() {
        let delta = this.clock.getDelta();

        super.update();
    }

    updateVolume() {
        this.renderUpdate = true;
    }

    renderVolume() {
        // Remove existing geometry
        this.scene.remove(this.root);
        this.root = new THREE.Object3D();
        this.scene.add(this.root);

        this.planeInc = PLANE_INC * this.sliceScale;

        // Set up plane
        // Plane normal
        this.planeNormal.copy(this.camera.position);
        this.planeNormal.sub(this.controls.target);
        this.planeNormal.normalize();

        // Plane offset
        let nearest = this.getClosestVertex(volumeVertices, this.camera.position);

        this.viewingDir.set(this.controls.target, this.camera.position);
        this.viewingDir.closestPointToPoint(volumeVertices[nearest], false, this.offset);

        // DEBUG
        //console.log("Offset = ", offset);

        this.planeOffset = this.offset.sub(this.controls.target).length();
        this.numSlices = Math.round(this.planeOffset / this.planeInc) * 2;
        // Show number of slices
        $("#numSlices").html(this.numSlices);

        uniforms.u_thresh.value = $("#alphaRange").val() / 255.0;
        uniforms.u_alphaScale.value = $("#alphaScale").val();

        //uniforms.u_slices.value.z = numSlices;
        this.planeOffset *= -1;
        // Prevent co=planar issues
        //this.planeOffset += (PLANE_INC * this.startSlice);
        //planeOffset += planeInc;
        this.intersectPlane.set(this.planeNormal, this.planeOffset);

        // Get intersection points
        let intersectionPoints;
        let currentGeometry;
        let currentMesh;
        for (let slice=0; slice<this.numSlices; ++slice) {
            currentGeometry = new THREE.Geometry();
            intersectionPoints = this.getIntersectionPoints(nearest, this.intersectPlane);
            for (let i=0, numPoints=intersectionPoints.length; i<numPoints; ++i) {
                currentGeometry.vertices.push(new THREE.Vector3().copy(intersectionPoints[i]));
            }
            // Advance plane
            this.planeOffset += this.planeInc;
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
            currentMesh.renderOrder = this.numSlices - slice;
            this.root.add(currentMesh);
        }
        //displayElem.textContent = startSlice;
    }

    getIntersectionPoints(nearestVertex, intersectPlane) {
        switch (nearestVertex) {
            case 0:
                this.currentLineIndices = lineIndices0;
                break;

            case 1:
                this.currentLineIndices = lineIndices1;
                break;

            case 2:
                this.currentLineIndices = lineIndices2;
                break;

            case 3:
                this.currentLineIndices = lineIndices3;
                break;

            case 4:
                this.currentLineIndices = lineIndices4;
                break;

            case 5:
                this.currentLineIndices = lineIndices5;
                break;

            case 6:
                this.currentLineIndices = lineIndices6;
                break;

            case 7:
                this.currentLineIndices = lineIndices7;
                break;

            default:
                break;

        }
        // Set line segments
        let currentIndex = 0
        let currentStart;
        let currentEnd;
        for (let i=0, numSegs=this.currentLineIndices.length/2; i<numSegs; ++i) {
            currentStart = this.currentLineIndices[currentIndex];
            currentEnd = this.currentLineIndices[currentIndex + 1];
            this.volumeLines[i].set(volumeVertices[currentStart], volumeVertices[currentEnd]);
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

        return nearestVertex;
    }
}

$(document).ready( () => {
    // Initialise
    const app = new MedicalViz();

    app.init();
    app.createScene();

    $("#alphaRange").on("change", () => {
        app.updateVolume();
    });

    $("#alphaScale").on("change", () => {
        app.updateVolume();
    });

    app.run();
});