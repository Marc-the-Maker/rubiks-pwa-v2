import * as THREE from 'three';

// --- Configuration ---
const CUBE_SIZE = 1;
const SPACING = 0.05;
const SHUFFLE_MOVES = 20; 
const SHUFFLE_SPEED = 200; 

// Colors: Right, Left, Top, Bottom, Front, Back
const COLORS = [0xff0000, 0xff8800, 0xffffff, 0xffff00, 0x00ff00, 0x0000ff]; 

// --- Globals ---
let scene, camera, renderer;
let allCubelets = [];
let pivotGroup; 
let isAnimating = false;
let moveQueue = []; 

// Camera State
let camRadius = 10;
let camTheta = Math.PI / 4;
let camPhi = Math.PI / 4;

let raycaster = new THREE.Raycaster();

init();
animate();

function init() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    createRubiksCube();

    window.addEventListener('resize', onWindowResize);
    document.getElementById('btn-shuffle').addEventListener('click', startShuffle);
    document.getElementById('btn-solve').addEventListener('click', solveCube);

    setupInputHandling();
}

function createRubiksCube() {
    pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const materials = COLORS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    const blackMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.9});

    for(let x=-1; x<=1; x++) {
        for(let y=-1; y<=1; y++) {
            for(let z=-1; z<=1; z++) {
                const materialsArr = [];
                materialsArr.push(x===1 ? materials[0] : blackMat);
                materialsArr.push(x===-1 ? materials[1] : blackMat);
                materialsArr.push(y===1 ? materials[2] : blackMat);
                materialsArr.push(y===-1 ? materials[3] : blackMat);
                materialsArr.push(z===1 ? materials[4] : blackMat);
                materialsArr.push(z===-1 ? materials[5] : blackMat);

                const cubelet = new THREE.Mesh(geometry, materialsArr);
                cubelet.position.set(
                    x * (CUBE_SIZE + SPACING),
                    y * (CUBE_SIZE + SPACING),
                    z * (CUBE_SIZE + SPACING)
                );
                
                cubelet.userData = { x, y, z, isCubelet: true };
                scene.add(cubelet);
                allCubelets.push(cubelet);
            }
        }
    }
}

function setupInputHandling() {
    const canvas = renderer.domElement;
    const globe = document.getElementById('globe-control');

    let globeStart = null;
    globe.addEventListener('pointerdown', (e) => {
        globeStart = { x: e.clientX, y: e.clientY, theta: camTheta, phi: camPhi };
        globe.setPointerCapture(e.pointerId);
    });
    globe.addEventListener('pointermove', (e) => {
        if(!globeStart) return;
        const dx = e.clientX - globeStart.x;
        const dy = e.clientY - globeStart.y;
        camTheta = globeStart.theta - dx * 0.01;
        camPhi = globeStart.phi - dy * 0.01;
        camPhi = Math.max(0.1, Math.min(Math.PI - 0.1, camPhi));
        updateCameraPosition();
    });
    globe.addEventListener('pointerup', (e) => {
        globe.releasePointerCapture(e.pointerId);
        globeStart = null;
    });

    // --- SNAP SWIPE LOGIC ---
    let startZone = null;

    canvas.addEventListener('pointerdown', (e) => {
        if(!e.isPrimary || isAnimating || moveQueue.length > 0) return;

        const hit = getIntersect(e.clientX, e.clientY);
        if (hit) {
            startZone = getZoneId(hit.object, hit.face.normal);
            canvas.setPointerCapture(e.pointerId); 
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if(!startZone) return;

        const hit = getIntersect(e.clientX, e.clientY);
        if (hit) {
            const currentZone = getZoneId(hit.object, hit.face.normal);
            if (currentZone && currentZone !== startZone) {
                const validMove = calculateAndQueueMove(startZone, currentZone);
                if(validMove) {
                    startZone = null; 
                    canvas.releasePointerCapture(e.pointerId);
                }
            }
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        startZone = null;
        canvas.releasePointerCapture(e.pointerId);
    });

    let initialPinch = null;
    let initialRad = null;
    canvas.addEventListener('touchstart', (e) => {
        if(e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinch = Math.sqrt(dx*dx + dy*dy);
            initialRad = camRadius;
            e.preventDefault();
        }
    }, {passive: false});

    canvas.addEventListener('touchmove', (e) => {
        if(e.touches.length === 2 && initialPinch) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            camRadius = Math.max(5, Math.min(20, initialRad * (initialPinch / dist)));
            updateCameraPosition();
        }
    }, {passive: false});
    canvas.addEventListener('touchend', () => { initialPinch = null; });
}

function getIntersect(clientX, clientY) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const mouse = new THREE.Vector2(
        (x / rect.width) * 2 - 1,
        -(y / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(allCubelets);
    if(intersects.length > 0) {
        const normal = intersects[0].face.normal.clone();
        normal.transformDirection(intersects[0].object.matrixWorld).round();
        return { object: intersects[0].object, face: { normal: normal } };
    }
    return null;
}

function getZoneId(object, n) {
    const x = Math.round(object.position.x);
    const y = Math.round(object.position.y);
    const z = Math.round(object.position.z);
    if (n.z > 0.5) return 1 + ( (1-y)*3 + (x+1) );
    if (n.x > 0.5) return 10 + ( (1-y)*3 + (1-z) );
    if (n.z < -0.5) return 19 + ( (1-y)*3 + (1-x) );
    if (n.x < -0.5) return 28 + ( (1-y)*3 + (z+1) );
    if (n.y > 0.5) return 37 + ( (1-z)*3 + (x+1) );
    if (n.y < -0.5) return 46 + ( (z+1)*3 + (x+1) );
    return null;
}

// --- YOUR LOCKED IN LOGIC ---
function calculateAndQueueMove(start, end) {
    const diff = end - start;
    const face = Math.ceil(start / 9);
    const idx = (start - 1) % 9;
    const row = Math.floor(idx / 3); 
    const col = idx % 3;             

    let axis, slice, dir; 

    // --- HORIZONTAL SWIPES (+/- 1) ---
    if (Math.abs(diff) === 1) {
        if (Math.floor((start-1)/3) !== Math.floor((end-1)/3)) return false; 
        const d = Math.sign(diff); 

        if (face === 1) { axis = 'y'; slice = (1-row); dir = d; } 
        if (face === 2) { axis = 'y'; slice = (1-row); dir = d; }
        if (face === 3) { axis = 'y'; slice = (1-row); dir = d; }
        if (face === 4) { axis = 'y'; slice = (1-row); dir = d; }
        if (face === 5) { axis = 'z'; slice = (1-row); dir = -d; }
        if (face === 6) { axis = 'z'; slice = (row-1); dir = d; }
    }

    // --- VERTICAL SWIPES (+/- 3) ---
    else if (Math.abs(diff) === 3) {
        const d = Math.sign(diff); 

        if (face === 1) { axis = 'x'; slice = (col-1); dir = d; }
        if (face === 2) { axis = 'z'; slice = (1-col); dir = -d; }
        if (face === 3) { axis = 'x'; slice = (1-col); dir = -d; }
        if (face === 4) { axis = 'z'; slice = (col-1); dir = d; }
        if (face === 5) { axis = 'x'; slice = (col-1); dir = -d; }
        if (face === 6) { axis = 'x'; slice = (col-1); dir = -d; }
    }

    if (axis) {
        addToQueue(axis, slice, dir, 300);
        return true; 
    }
    return false; 
}

function addToQueue(axis, index, dir, duration) {
    moveQueue.push({ axis, index, dir, duration });
    processQueue();
}

function processQueue() {
    if(isAnimating || moveQueue.length === 0) return;
    const move = moveQueue.shift();
    triggerRotation(move.axis, move.index, move.dir, move.duration);
}

function triggerRotation(axis, index, dir, duration) {
    isAnimating = true;
    const targetCubelets = allCubelets.filter(c => Math.round(c.position[axis]) === index);

    pivotGroup.rotation.set(0,0,0);
    pivotGroup.position.set(0,0,0);
    targetCubelets.forEach(c => {
        scene.attach(c);
        pivotGroup.attach(c);
    });

    const targetRot = (Math.PI / 2) * dir;
    const startTime = performance.now();

    function loop(time) {
        const elapsed = time - startTime;
        const t = Math.min(1, elapsed / duration);
        const ease = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        if (axis === 'x') pivotGroup.rotation.x = targetRot * ease;
        if (axis === 'y') pivotGroup.rotation.y = targetRot * ease;
        if (axis === 'z') pivotGroup.rotation.z = targetRot * ease;

        if(t < 1) {
            requestAnimationFrame(loop);
        } else {
            if (axis === 'x') pivotGroup.rotation.x = targetRot;
            if (axis === 'y') pivotGroup.rotation.y = targetRot;
            if (axis === 'z') pivotGroup.rotation.z = targetRot;
            finalizeMove();
        }
    }
    requestAnimationFrame(loop);
    sendToESP32(axis, index, dir);
}

function finalizeMove() {
    pivotGroup.updateMatrixWorld();
    const children = [...pivotGroup.children];
    children.forEach(c => {
        c.updateMatrixWorld();
        scene.attach(c);
        c.position.x = Math.round(c.position.x / (CUBE_SIZE + SPACING)) * (CUBE_SIZE + SPACING);
        c.position.y = Math.round(c.position.y / (CUBE_SIZE + SPACING)) * (CUBE_SIZE + SPACING);
        c.position.z = Math.round(c.position.z / (CUBE_SIZE + SPACING)) * (CUBE_SIZE + SPACING);
        
        const euler = new THREE.Euler().setFromQuaternion(c.quaternion);
        c.rotation.set(
            Math.round(euler.x / (Math.PI/2)) * (Math.PI/2),
            Math.round(euler.y / (Math.PI/2)) * (Math.PI/2),
            Math.round(euler.z / (Math.PI/2)) * (Math.PI/2)
        );
        c.updateMatrix();
    });
    isAnimating = false;
    processQueue();
}

function startShuffle() {
    if(moveQueue.length > 0 || isAnimating) return;
    const axes = ['x', 'y', 'z'];
    const indices = [-1, 0, 1];
    const dirs = [1, -1];
    for(let i = 0; i < SHUFFLE_MOVES; i++) {
        const rAxis = axes[Math.floor(Math.random() * 3)];
        const rIdx = indices[Math.floor(Math.random() * 3)];
        const rDir = dirs[Math.floor(Math.random() * 2)];
        moveQueue.push({ axis: rAxis, index: rIdx, dir: rDir, duration: SHUFFLE_SPEED });
    }
    processQueue();
}

function solveCube() {
    moveQueue = [];
    isAnimating = false;
    scene.remove(pivotGroup);
    allCubelets.forEach(c => scene.remove(c));
    allCubelets = [];
    createRubiksCube();
    console.log("Sent SOLVE to ESP32");
}

function sendToESP32(axis, index, dir) {
    console.log(`ESP32 CMD -> Axis:${axis} | Index:${index} | Dir:${dir}`);
}

function updateCameraPosition() {
    camera.position.x = camRadius * Math.sin(camPhi) * Math.sin(camTheta);
    camera.position.y = camRadius * Math.cos(camPhi);
    camera.position.z = camRadius * Math.sin(camPhi) * Math.cos(camTheta);
    camera.lookAt(0, 0, 0);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}