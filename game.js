console.log('Game script loaded');
console.log('THREE available:', typeof THREE !== 'undefined');

// Simple terrain generation
function getTerrainHeight(x, z) {
    const h1 = Math.sin(x * 0.1) * 4;
    const h2 = Math.sin(z * 0.1) * 4;
    const h3 = Math.sin(x * 0.05 + z * 0.05) * 6;
    return Math.floor(20 + h1 + h2 + h3);
}

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 100, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('gameContainer').appendChild(renderer.domElement);

console.log('Scene created');

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(100, 100, 100);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
scene.add(sun);

// Groups
const blockGroup = new THREE.Group();
scene.add(blockGroup);

// Player state
const player = {
    pos: new THREE.Vector3(50, 100, 50),
    vel: new THREE.Vector3(0, 0, 0),
    onGround: false
};

let loadedBlocks = {};

// Input
const keys = {};
let mouseX = 0, mouseY = 0;

document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

document.addEventListener('click', () => document.body.requestPointerLock());

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        mouseX -= e.movementX * 0.005;
        mouseY -= e.movementY * 0.005;
        mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load terrain around player
function loadTerrain() {
    const px = Math.floor(player.pos.x);
    const pz = Math.floor(player.pos.z);
    const range = 40;
    
    for (let x = px - range; x < px + range; x += 2) {
        for (let z = pz - range; z < pz + range; z += 2) {
            const key = `${x},${z}`;
            if (!loadedBlocks[key]) {
                const h = getTerrainHeight(x, z);
                
                // Create grass
                let mat = new THREE.MeshStandardMaterial({ color: 0x33cc33 });
                let mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
                mesh.position.set(x, h, z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                blockGroup.add(mesh);
                
                // Create dirt below
                for (let y = h - 1; y > h - 4; y--) {
                    let dirtMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });
                    let dirtMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), dirtMat);
                    dirtMesh.position.set(x, y, z);
                    dirtMesh.castShadow = true;
                    dirtMesh.receiveShadow = true;
                    blockGroup.add(dirtMesh);
                }
                
                // Create stone below
                for (let y = h - 4; y > 0; y--) {
                    let stoneMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    let stoneMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), stoneMat);
                    stoneMesh.position.set(x, y, z);
                    stoneMesh.castShadow = true;
                    stoneMesh.receiveShadow = true;
                    blockGroup.add(stoneMesh);
                }
                
                loadedBlocks[key] = true;
            }
        }
    }
}

// Update player
function updatePlayer(dt) {
    const speed = 12;
    
    // Direction vectors
    const forward = new THREE.Vector3(Math.sin(mouseX), 0, -Math.cos(mouseX)).normalize();
    const right = new THREE.Vector3(Math.cos(mouseX), 0, Math.sin(mouseX));
    
    let accel = new THREE.Vector3(0, 0, 0);
    if (keys['w']) accel.add(forward.clone().multiplyScalar(speed));
    if (keys['s']) accel.add(forward.clone().multiplyScalar(-speed));
    if (keys['a']) accel.add(right.clone().multiplyScalar(-speed));
    if (keys['d']) accel.add(right.clone().multiplyScalar(speed));
    
    player.vel.x = accel.x;
    player.vel.z = accel.z;
    player.vel.y -= 9.8 * dt;
    
    player.pos.add(player.vel.clone().multiplyScalar(dt));
    
    // Collision
    const h = getTerrainHeight(player.pos.x, player.pos.z) + 1.6;
    if (player.pos.y <= h) {
        player.pos.y = h;
        player.vel.y = 0;
        player.onGround = true;
        
        if (keys[' ']) {
            player.vel.y = 12;
            player.onGround = false;
        }
    } else {
        player.onGround = false;
    }
    
    // Update camera
    camera.position.copy(player.pos);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseX;
    camera.rotation.x = mouseY;
    
    // Update HUD
    const px = Math.floor(player.pos.x);
    const py = Math.floor(player.pos.y);
    const pz = Math.floor(player.pos.z);
    document.getElementById('position').textContent = `${px}, ${py}, ${pz}`;
}

// Animation loop
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.016);
    lastTime = now;
    
    updatePlayer(dt);
    loadTerrain();
    
    renderer.render(scene, camera);
}

console.log('Initializing game...');
animate();
console.log('Game started!');
