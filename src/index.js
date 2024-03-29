import $ from "jquery";
import * as THREE from "three";

import { BaseApp } from "./baseApp";
import "bootstrap";
import { APPCONFIG, lineIndices0, lineIndices1, lineIndices3, lineIndices4, lineIndices2, lineIndices5, lineIndices6, lineIndices7 } from "./appConfig";
import { NRRDLoader } from "./NRRDLoader";

import "bootstrap/dist/css/bootstrap.min.css";
import "./main.css";

// Shaders
const vshader = `
    varying vec4 texPosition;

    //varying vec3 vNormal;
    varying vec3 vCam;

    void main() {
        //vNormal = normal;
        vCam = cameraPosition;
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
    uniform float u_clipPlaneX;
    uniform float u_clipPlaneY;
    uniform float u_clipPlaneZ;
    uniform vec3 u_clipCubeMax;
    uniform vec3 u_clipCubeMin;
    uniform bool u_clipCubeEnabled;
    uniform bool u_clipPlaneXEnabled;
    uniform bool u_clipPlaneYEnabled;
    uniform bool u_clipPlaneZEnabled;

    void main() {
        if (u_clipCubeEnabled) {
            if (texPosition.x > u_clipCubeMax.x || texPosition.x < u_clipCubeMin.x) {
                discard;
            }
            if (texPosition.y > u_clipCubeMax.y || texPosition.y < u_clipCubeMin.y) {
                discard;
            }
            if (texPosition.z > u_clipCubeMax.z || texPosition.z < u_clipCubeMin.z) {
                discard;
            }
        }

        // Model is rotated so that y-axis => z-axis
        if (u_clipPlaneXEnabled) {
            if (texPosition.x > u_clipPlaneX) {
                discard;
            }
        }

        if (u_clipPlaneYEnabled) {
            if (texPosition.z > u_clipPlaneY) {
                discard;
            }
        }

        if (u_clipPlaneZEnabled) {
            if (texPosition.y < u_clipPlaneZ) {
                discard;
            }
        }

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

const fSolidShader = `
    vec3 shading(vec3 N, vec3 V, vec3 L) {

        // Materials
        vec3 Ka = vec3(0.1, 0.1, 0.1); // Ambient
        vec3 Kd = vec3(0.6, 0.6, 0.6); // Diffuse
        vec3 Ks = vec3(0.2, 0.2, 0.2); // Specular
        float shininess = 100.0; // Shininess

        // Light properties
        vec3 lightColour = vec3(1.0, 1.0, 1.0);
        vec3 ambientLight = vec3(0.3, 0.3, 0.3);

        // Halfway vector
        vec3 H = normalize(L + V);

        // Ambient term
        vec3 ambient = Ka * ambientLight;

        // Diffuse term
        float diffuseLight = max(dot(L, N), 0.0);
        vec3 diffuse = Kd * lightColour * diffuseLight;

        // Specular term
        float specularLight = pow(max(dot(H, N), 0.0), shininess);
        if (diffuseLight <= 0.0) {
            specularLight = 0.0;
        }
        vec3 specular = Ks * lightColour * specularLight;

        return ambient + diffuse + specular;
    }

    precision mediump sampler3D;

    varying vec4 texPosition;
    //varying vec3 vNormal;
    varying vec3 vCam;
    uniform vec3 u_slices;
    uniform sampler3D u_data;
    uniform float u_thresh;
    uniform float u_clipPlaneX;
    uniform float u_clipPlaneY;
    uniform float u_clipPlaneZ;
    uniform bool u_clipPlaneXEnabled;
    uniform bool u_clipPlaneYEnabled;
    uniform bool u_clipPlaneZEnabled;
    uniform vec3 u_clipCubeMax;
    uniform vec3 u_clipCubeMin;
    uniform bool u_clipCubeEnabled;

    void main() {
        if (u_clipCubeEnabled) {
            if (texPosition.x > u_clipCubeMax.x || texPosition.x < u_clipCubeMin.x) {
                discard;
            }
            if (texPosition.y > u_clipCubeMax.y || texPosition.y < u_clipCubeMin.y) {
                discard;
            }
            if (texPosition.z > u_clipCubeMax.z || texPosition.z < u_clipCubeMin.z) {
                discard;
            }
        }

        // Model is rotated so that y-axis => z-axis
        if (u_clipPlaneXEnabled) {
            if (texPosition.x > u_clipPlaneX) {
                discard;
            }
        }

        if (u_clipPlaneYEnabled) {
            if (texPosition.z > u_clipPlaneY) {
                discard;
            }
        }

        if (u_clipPlaneZEnabled) {
            if (texPosition.y < u_clipPlaneZ) {
                discard;
            }
        }

        vec3 texCoords = vec3((texPosition.x/u_slices.x) + 0.5, (texPosition.y/u_slices.y) + 0.5, (texPosition.z/u_slices.z) + 0.5);
        vec3 position = texCoords.xyz;
        float thresh = texture(u_data, texCoords).r;
        if (thresh < u_thresh) {
            discard;
        }

        float delta = 1.0/256.0;
        vec3 sample1, sample2;
        sample1.x = texture(u_data, texCoords - vec3(delta, 0.0, 0.0)).x;
        sample2.x = texture(u_data, texCoords + vec3(delta, 0.0, 0.0)).x;
        sample1.y = texture(u_data, texCoords - vec3(0.0, delta, 0.0)).x;
        sample2.y = texture(u_data, texCoords + vec3(0.0, delta, 0.0)).x;
        sample1.z = texture(u_data, texCoords - vec3(0.0, 0.0, delta)).x;
        sample2.z = texture(u_data, texCoords + vec3(0.0, 0.0, delta)).x;

        vec3 lightPos = vec3(100.0, -600.0, 100.0);
        vec3 lightPos2 = vec3(0.0, 300.0, 0.0);

        vec3 N = normalize(sample1 - sample2);
        vec3 L = normalize( lightPos - position);
        vec3 L2 = normalize( lightPos2 - position);
        vec3 V = normalize( vCam - position);

        vec3 shade1 = shading(N, V, L);
        vec3 shade2 = shading(N, V, L2);

        gl_FragColor.rgb = shade1 + shade2;


        gl_FragColor.a = 1.0;
    }
`

let PLANE_INC = 1.0;

// Front vertices
const LEFT_EDGE_X = -80;
const RIGHT_EDGE_X = 80;
const TOP_EDGE_Y = 128;
const BOTTOM_EDGE_Y = -128;
const FRONT_EDGE_Z = 110.5;
const BACK_EDGE_Z = -110.5;

// Cube movement
const DIR_LEFT = new THREE.Vector3(-1, 0, 0);
const DIR_RIGHT = new THREE.Vector3(1, 0, 0);
const DIR_DOWN = new THREE.Vector3(0, 0, -1);
const DIR_UP = new THREE.Vector3(0, 0, 1);
const DIR_BACK = new THREE.Vector3(0, 1, 0);
const DIR_FORWARD = new THREE.Vector3(0, -1, 0);

// Cube scale
const CUBE_SCALE_DOWN = new THREE.Vector3(-1, -1, -1);
const CUBE_SCALE_UP = new THREE.Vector3(1, 1, 1);

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
    u_slices: { value: new THREE.Vector3()},
    u_thresh: { value: $("#alphaRange").val() / 255.0 },
    u_alphaScale: { value: $("#alphaScale").val() },
    u_clipPlaneX: { value: $("#clipPlaneXValue").val() },
    u_clipPlaneXEnabled: { value: false },
    u_clipPlaneY: { value: $("#clipPlaneYValue").val() },
    u_clipPlaneYEnabled: { value: false },
    u_clipPlaneZ: { value: $("#clipPlaneZValue").val() },
    u_clipPlaneZEnabled: { value: false },
    u_clipCubeMax: { value: new THREE.Vector3()},
    u_clipCubeMin: { value: new THREE.Vector3()},
    u_clipCubeEnabled: { value: false }
};

// Shader materials
const transparentVolumeShader = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    vertexShader: vshader,
    fragmentShader: fshader
});

const solidVolumeShader = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: false,
    vertexShader: vshader,
    fragmentShader: fSolidShader
});

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
        this.currentShader = transparentVolumeShader;

        // Cube attributes
        this.cubeMoving = false;
        this.cubeScaling = false;

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
            uniforms.u_slices.value.set(TEXTURE_SIZE_X, TEXTURE_SIZE_Y, TEXTURE_SIZE_Z);
            uniforms.u_data.value = texture3D;

            $("#loading").addClass("d-none");

            this.renderUpdate = true;
        });

        // Add clip cube
        let cubeMat = new THREE.LineBasicMaterial( { color: 0xff0000 });
        let cubeGeom = this.createCubeSegments(APPCONFIG.CUBE_WIDTH);
        let cube = new THREE.LineSegments( cubeGeom, cubeMat );
        cube.computeLineDistances();
        cube.position.set(APPCONFIG.CUBE_START_X, APPCONFIG.CUBE_START_Y, APPCONFIG.CUBE_START_Z);

        // Set up clip cube
        cube.geometry.computeBoundingBox();
        uniforms.u_clipCubeMax.value = cube.geometry.boundingBox.max;
        uniforms.u_clipCubeMin.value = cube.geometry.boundingBox.min;
        
        cube.visible = false;
        this.scene.add( cube );
        this.clipCube = cube;

        // Add global clipping planes
        // Clip plane representation
        let clipPlaneGeom = new THREE.PlaneBufferGeometry(APPCONFIG.PLANE_SIZE, APPCONFIG.PLANE_SIZE);
        let clipPlaneMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.25
        });

        // Right to left plane
        // Add handles at each corner
        const spherePositions = [];
        let sphereGeom = new THREE.SphereBufferGeometry(APPCONFIG.PLANE_CORNER_RADIUS);
        let sphereMat = new THREE.MeshLambertMaterial( { color: 0xffa500});

        let clipPlaneXGroup = new THREE.Group();
        this.scene.add(clipPlaneXGroup);
        
        let currentSphere;
        spherePositions.push(new THREE.Vector3(-APPCONFIG.PLANE_SIZE/2, APPCONFIG.PLANE_SIZE/2, 0));
        spherePositions.push(new THREE.Vector3(APPCONFIG.PLANE_SIZE/2, APPCONFIG.PLANE_SIZE/2, 0));
        spherePositions.push(new THREE.Vector3(APPCONFIG.PLANE_SIZE/2, -APPCONFIG.PLANE_SIZE/2, 0));
        spherePositions.push(new THREE.Vector3(-APPCONFIG.PLANE_SIZE/2, -APPCONFIG.PLANE_SIZE/2, 0));

        for (let i=0; i<APPCONFIG.NUM_CORNERS; ++i) {
            currentSphere = new THREE.Mesh(sphereGeom, sphereMat);
            currentSphere.position.copy(spherePositions[i]);
            clipPlaneXGroup.add(currentSphere);
        }
        let clipPlaneX = new THREE.Mesh(clipPlaneGeom, clipPlaneMat);
        clipPlaneXGroup.add(clipPlaneX);
        clipPlaneXGroup.position.x = APPCONFIG.PLANE_START_X;
        clipPlaneXGroup.rotation.y = Math.PI/2;
        clipPlaneXGroup.renderOrder = APPCONFIG.RENDER_FIRST +2;
        clipPlaneXGroup.visible = false;
        this.clipPlaneXGroup = clipPlaneXGroup;

        // Top to bottom plane
        let clipPlaneYGroup = new THREE.Group();
        this.scene.add(clipPlaneYGroup);

        for (let i=0; i<APPCONFIG.NUM_CORNERS; ++i) {
            currentSphere = new THREE.Mesh(sphereGeom, sphereMat);
            currentSphere.position.copy(spherePositions[i]);
            clipPlaneYGroup.add(currentSphere);
        }
        let clipPlaneY = new THREE.Mesh(clipPlaneGeom, clipPlaneMat);
        clipPlaneYGroup.add(clipPlaneY);
        clipPlaneYGroup.position.z = APPCONFIG.PLANE_START_Z;
        clipPlaneYGroup.renderOrder = APPCONFIG.RENDER_FIRST + 1;
        clipPlaneYGroup.visible = false;
        this.clipPlaneYGroup = clipPlaneYGroup;

        // Back to front plane
        let clipPlaneZGroup = new THREE.Group();
        this.scene.add(clipPlaneZGroup);

        for (let i=0; i<APPCONFIG.NUM_CORNERS; ++i) {
            currentSphere = new THREE.Mesh(sphereGeom, sphereMat);
            currentSphere.position.copy(spherePositions[i]);
            clipPlaneZGroup.add(currentSphere);
        }
        let clipPlaneZ = new THREE.Mesh(clipPlaneGeom, clipPlaneMat);
        clipPlaneZGroup.add(clipPlaneZ);
        clipPlaneZGroup.position.y = APPCONFIG.PLANE_START_Y;
        clipPlaneZGroup.rotation.x = -Math.PI/2;
        clipPlaneZGroup.renderOrder = APPCONFIG.RENDER_FIRST;
        clipPlaneZGroup.visible = false;
        this.clipPlaneZGroup = clipPlaneZGroup;
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

        if (this.cubeMoving) {
            this.clipCube.position.addScaledVector(this.cubeDirection, delta * APPCONFIG.MOVE_SPEED);
        }

        if (this.cubeScaling) {
            this.clipCube.scale.addScaledVector(this.cubeScale, delta * APPCONFIG.SCALE_SPEED);
            // Do not scale beyond zero
            if (this.clipCube.scale.x < APPCONFIG.MIN_CUBE_SCALE) {
                this.clipCube.scale.set(APPCONFIG.MIN_CUBE_SCALE, APPCONFIG.MIN_CUBE_SCALE, APPCONFIG.MIN_CUBE_SCALE);
            }
        }

        super.update();
    }

    updateVolume() {
        this.renderUpdate = true;
    }

    updateSampleDistance(distance) {
        PLANE_INC = distance;
        this.renderUpdate = true;
    }

    updateClipPlane(planeID, value) {
        switch (planeID) {
            case APPCONFIG.CLIP_PLANE_X:
                uniforms.u_clipPlaneX.value = value;
                this.clipPlaneXGroup.position.x = value;
                break;

            case APPCONFIG.CLIP_PLANE_Y:
                uniforms.u_clipPlaneY.value = value;
                this.clipPlaneYGroup.position.z = value;
                break;

            case APPCONFIG.CLIP_PLANE_Z:
                uniforms.u_clipPlaneZ.value = value;
                this.clipPlaneZGroup.position.y = value;
                break;

            default:
                break;
        }
        
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

        this.planeOffset = this.offset.sub(this.controls.target).length();
        this.numSlices = Math.round(this.planeOffset / this.planeInc) * 2;

        // Show number of slices
        $("#numSlices").html(this.numSlices);

        uniforms.u_thresh.value = $("#alphaRange").val() / 255.0;
        uniforms.u_alphaScale.value = $("#alphaScale").val();

        this.planeOffset *= -1;
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

            // Remove duplicates
            currentGeometry.mergeVertices();

            // Disregard if co-planer or no intersection at all
            if (currentGeometry.vertices.length <= 2) {
                continue;
            }
            
            this.orderFaces(currentGeometry);

            currentGeometry.computeBoundingSphere();
            currentGeometry.computeFaceNormals();
            currentMesh = new THREE.Mesh(currentGeometry, this.currentShader);
            currentMesh.renderOrder = this.numSlices - slice;
            this.root.add(currentMesh);
        }
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

    moveClipCube(status, direction) {
        if (!this.clipCube.visible) return;

        switch (direction) {
            case APPCONFIG.LEFT:
                this.cubeDirection = DIR_LEFT;
                break;

            case APPCONFIG.RIGHT:
                this.cubeDirection = DIR_RIGHT;
                break;

            case APPCONFIG.DOWN:
                this.cubeDirection = DIR_DOWN;
                break;

            case APPCONFIG.UP:
                this.cubeDirection = DIR_UP;
                break;

            case APPCONFIG.BACK:
                this.cubeDirection = DIR_BACK;
                break;

            case APPCONFIG.FORWARD:
                this.cubeDirection = DIR_FORWARD;
                break;

            default:
                break;
        }

        this.cubeMoving = status;
    }

    scaleClipCube(status, direction) {
        if (!this.clipCube.visible) return;

        switch (direction) {
            case APPCONFIG.SCALE_DOWN:
                this.cubeScale = CUBE_SCALE_DOWN;
                break;

            case APPCONFIG.SCALE_UP:
                this.cubeScale = CUBE_SCALE_UP;
                break;

            default:
                break;
        }

        this.cubeScaling = status;
    }

    toggleClipCube() {
        this.clipCube.visible = !this.clipCube.visible;
    }

    clipVolume() {
        if (!this.clipCube.visible) return;

        this.clipCube.geometry.computeBoundingBox();
        // Take scaling into account
        this.clipCube.geometry.boundingBox.max.multiply(this.clipCube.scale);
        this.clipCube.geometry.boundingBox.min.multiply(this.clipCube.scale);

        uniforms.u_clipCubeMax.value.addVectors(this.clipCube.geometry.boundingBox.max, this.clipCube.position);
        uniforms.u_clipCubeMin.value.addVectors(this.clipCube.geometry.boundingBox.min, this.clipCube.position);
        uniforms.u_clipCubeEnabled.value = !uniforms.u_clipCubeEnabled.value;

        $("#clipVolume").html(uniforms.u_clipCubeEnabled.value ? "Reset" : "Clip");
    }

    toggleClipPlane(planeID) {
        switch (planeID) {
            case APPCONFIG.CLIP_PLANE_X:
                this.clipPlaneXGroup.visible = !this.clipPlaneXGroup.visible;
                uniforms.u_clipPlaneXEnabled.value = this.clipPlaneXGroup.visible;
                break;

            case APPCONFIG.CLIP_PLANE_Y:
                this.clipPlaneYGroup.visible = !this.clipPlaneYGroup.visible;
                uniforms.u_clipPlaneYEnabled.value = this.clipPlaneYGroup.visible;
                break;

            case APPCONFIG.CLIP_PLANE_Z:
                this.clipPlaneZGroup.visible = !this.clipPlaneZGroup.visible;
                uniforms.u_clipPlaneZEnabled.value = this.clipPlaneZGroup.visible;
                break;

            default:
                break;
        }
    }

    toggleShader() {
        this.currentShader = this.currentShader === transparentVolumeShader ? solidVolumeShader : transparentVolumeShader;
        this.renderUpdate = true;
    }

    stopNotifications(elemList) {
        for(let i=0, numElems=elemList.length; i<numElems; ++i) {
            $('#' + elemList[i]).contextmenu(() => {
                return false;
            });
        }
    }
}

$( () => {
    // Info for small res devices
    if (window.innerWidth < APPCONFIG.MIN_DEVICE_WIDTH) {
        $("#warningModal").modal();
    }

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

    $("#clipPlaneXValue").on("input", event => {
        app.updateClipPlane(APPCONFIG.CLIP_PLANE_X, event.target.value);
    });

    $("#clipPlaneYValue").on("input", event => {
        app.updateClipPlane(APPCONFIG.CLIP_PLANE_Y, event.target.value);
    });

    $("#clipPlaneZValue").on("input", event => {
        app.updateClipPlane(APPCONFIG.CLIP_PLANE_Z, event.target.value);
    });

    // Move elements
    let moveCubeLeft = $("#moveCubeLeft");
    let moveCubeRight = $("#moveCubeRight");
    let moveCubeDown = $("#moveCubeDown");
    let moveCubeUp = $("#moveCubeUp");
    let moveCubeBack = $("#moveCubeBack");
    let moveCubeForward = $("#moveCubeForward");
    let scaleCubeDown = $("#scaleCubeDown");
    let scaleCubeUp = $("#scaleCubeUp");
    let clipVolume = $("#clipVolume");
    let toggleClipCube = $("#toggleClipCube");
    let toggleClipPlaneX = $("#toggleClipPlaneX");
    let toggleClipPlaneY = $("#toggleClipPlaneY");
    let toggleClipPlaneZ = $("#toggleClipPlaneZ");
    let toggleShader = $("#toggleShader");
    let sampleDist = $("#sampleDist");

    sampleDist.on("change", event => {
        app.updateSampleDistance(event.target.value);
    });

    // Move cube via mouse
    moveCubeLeft.on("mousedown", () => {
        app.moveClipCube(true, APPCONFIG.LEFT);
    });

    moveCubeLeft.on("mouseup", () => {
        app.moveClipCube(false);
    });

    moveCubeRight.on("mousedown", () => {
        app.moveClipCube(true, APPCONFIG.RIGHT);
    });

    moveCubeRight.on("mouseup", () => {
        app.moveClipCube(false);
    });

    moveCubeDown.on("mousedown", () => {
        app.moveClipCube(true, APPCONFIG.DOWN);
    });

    moveCubeDown.on("mouseup", () => {
        app.moveClipCube(false);
    });

    moveCubeUp.on("mousedown", () => {
        app.moveClipCube(true, APPCONFIG.UP);
    });

    moveCubeUp.on("mouseup", () => {
        app.moveClipCube(false);
    });

    moveCubeBack.on("mousedown", () => {
        app.moveClipCube(true, APPCONFIG.BACK);
    });

    moveCubeBack.on("mouseup", () => {
        app.moveClipCube(false);
    });

    moveCubeForward.on("mousedown", () => {
        app.moveClipCube(true, APPCONFIG.FORWARD);
    });

    moveCubeForward.on("mouseup", () => {
        app.moveClipCube(false);
    });

    scaleCubeDown.on("mousedown", () => {
        app.scaleClipCube(true, APPCONFIG.SCALE_DOWN);
    });

    scaleCubeDown.on("mouseup", () => {
        app.scaleClipCube(false);
    });

    scaleCubeUp.on("mousedown", () => {
        app.scaleClipCube(true, APPCONFIG.SCALE_UP);
    });

    scaleCubeUp.on("mouseup", () => {
        app.scaleClipCube(false);
    });

    // Move cube via touch
    moveCubeLeft.on("touchstart", () => {
        app.moveClipCube(true, APPCONFIG.LEFT);
    });

    moveCubeLeft.on("touchend", () => {
        app.moveClipCube(false);
    });

    moveCubeRight.on("touchstart", () => {
        app.moveClipCube(true, APPCONFIG.RIGHT);
    });

    moveCubeRight.on("touchend", () => {
        app.moveClipCube(false);
    });

    moveCubeDown.on("touchstart", () => {
        app.moveClipCube(true, APPCONFIG.DOWN);
    });

    moveCubeDown.on("touchend", () => {
        app.moveClipCube(false);
    });

    moveCubeUp.on("touchstart", () => {
        app.moveClipCube(true, APPCONFIG.UP);
    });

    moveCubeUp.on("touchend", () => {
        app.moveClipCube(false);
    });

    moveCubeBack.on("touchstart", () => {
        app.moveClipCube(true, APPCONFIG.BACK);
    });

    moveCubeBack.on("touchend", () => {
        app.moveClipCube(false);
    });

    moveCubeForward.on("touchstart", () => {
        app.moveClipCube(true, APPCONFIG.FORWARD);
    });

    moveCubeForward.on("touchend", () => {
        app.moveClipCube(false);
    });

    scaleCubeDown.on("touchstart", () => {
        app.scaleClipCube(true, APPCONFIG.SCALE_DOWN);
    });

    scaleCubeDown.on("touchend", () => {
        app.scaleClipCube(false);
    });

    scaleCubeUp.on("touchstart", () => {
        app.scaleClipCube(true, APPCONFIG.SCALE_UP);
    });

    scaleCubeUp.on("touchend", () => {
        app.scaleClipCube(false);
    });

    clipVolume.on("click", () => {
        app.clipVolume();
    });

    // Toggle clip planes
    toggleClipCube.on("click", () => {
        app.toggleClipCube();
    });

    toggleClipPlaneX.on("click", () => {
        app.toggleClipPlane(APPCONFIG.CLIP_PLANE_X);
    });

    toggleClipPlaneY.on("click", () => {
        app.toggleClipPlane(APPCONFIG.CLIP_PLANE_Y);
    });

    toggleClipPlaneZ.on("click", () => {
        app.toggleClipPlane(APPCONFIG.CLIP_PLANE_Z);
    });

    toggleShader.on("click", () => {
        app.toggleShader();
    });

    $("#info").on("click", () => {
        $("#infoModal").modal();
    });

    let elemList = ["title", "alphaProperties", "clipPlanes", "cubeControls", "toggleShaderContainer", "copyright", "info"];
    app.stopNotifications(elemList);

    app.run();
});