console.log('Game script loaded');
let gameActive = false;
let gameStarted = false;

// Menu and game start
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('menu').classList.add('hidden');
    gameActive = true;
    gameStarted = true;
    console.log('Game started!');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameStarted) {
        const menu = document.getElementById('menu');
        menu.classList.toggle('hidden');
        gameActive = !gameActive;
    }
});

// Terrain generation
function getTerrainHeight(x, z) {
    x = Math.floor(x);
    z = Math.floor(z);
    const h1 = Math.sin(x * 0.05) * 6;
    const h2 = Math.sin(z * 0.05) * 6;
    const h3 = Math.sin((x + z) * 0.03) * 8;
    return Math.floor(30 + h1 + h2 + h3);
}

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 150, 300);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('gameContainer').appendChild(renderer.domElement);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(150, 150, 150);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);

// Blocks group
const blockGroup = new THREE.Group();
scene.add(blockGroup);

// Player
const player = {
    pos: new THREE.Vector3(50, 150, 50),
    vel: new THREE.Vector3(0, 0, 0),
    onGround: false
};

let loadedChunks = {};
const CHUNK_SIZE = 16;

// Input
const keys = {};
let mouseX = 0, mouseY = 0;

document.addEventListener('keydown', (e) => {
    if (gameActive) keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

document.addEventListener('click', () => {
    if (gameActive) document.body.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && gameActive) {
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

// Load chunks
function loadChunks() {
    const cx = Math.floor(player.pos.x / CHUNK_SIZE);
    const cz = Math.floor(player.pos.z / CHUNK_SIZE);
    
    for (let x = cx - 2; x <= cx + 2; x++) {
        for (let z = cz - 2; z <= cz + 2; z++) {
            const key = `${x},${z}`;
            if (!loadedChunks[key]) {
                const sx = x * CHUNK_SIZE;
                const sz = z * CHUNK_SIZE;
                
                for (let bx = sx; bx < sx + CHUNK_SIZE; bx++) {
                    for (let bz = sz; bz < sz + CHUNK_SIZE; bz++) {
                        const height = getTerrainHeight(bx, bz);
                        
                        // Grass
                        let mat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
                        let mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
                        mesh.position.set(bx, height, bz);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        blockGroup.add(mesh);
                        
                        // Dirt
                        for (let y = height - 1; y > height - 4; y--) {
                            let dmat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                            let dmesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), dmat);
                            dmesh.position.set(bx, y, bz);
                            dmesh.castShadow = true;
                            dmesh.receiveShadow = true;
                            blockGroup.add(dmesh);
                        }
                        
                        // Stone
                        for (let y = height - 4; y > 0; y--) {
                            let smat = new THREE.MeshStandardMaterial({ color: 0x888888 });
                            let smesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), smat);
                            smesh.position.set(bx, y, bz);
                            smesh.castShadow = true;
                            smesh.receiveShadow = true;
                            blockGroup.add(smesh);
                        }
                    }
                }
                loadedChunks[key] = true;
            }
        }
    }
}

// Update player
function updatePlayer(dt) {
    if (!gameActive) return;
    
    const speed = 15;
    const fwd = new THREE.Vector3(Math.sin(mouseX), 0, -Math.cos(mouseX)).normalize();
    const rgt = new THREE.Vector3(Math.cos(mouseX), 0, Math.sin(mouseX));
    
    let vel = new THREE.Vector3();
    if (keys['w']) vel.add(fwd.clone().multiplyScalar(speed));
    if (keys['s']) vel.add(fwd.clone().multiplyScalar(-speed));
    if (keys['a']) vel.add(rgt.clone().multiplyScalar(-speed));
    if (keys['d']) vel.add(rgt.clone().multiplyScalar(speed));
    
    player.vel.x = vel.x;
    player.vel.z = vel.z;
    player.vel.y -= 20 * dt;
    player.pos.add(player.vel.clone().multiplyScalar(dt));
    
    // Collision
    const h = getTerrainHeight(player.pos.x, player.pos.z) + 2;
    if (player.pos.y <= h) {
        player.pos.y = h;
        player.vel.y = 0;
        player.onGround = true;
        if (keys[' ']) {
            player.vel.y = 15;
        }
    } else {
        player.onGround = false;
    }
    
    camera.position.copy(player.pos);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseX;
    camera.rotation.x = mouseY;
    
    document.getElementById('position').textContent = `${Math.floor(player.pos.x)}, ${Math.floor(player.pos.y)}, ${Math.floor(player.pos.z)}`;
}

// FPS counter
let fps = 0, lastFpsTime = 0, frameCount = 0;

// Animation loop
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    
    if (gameActive) {
        loadChunks();
        updatePlayer(dt);
    }
    
    // FPS counter
    frameCount++;
    if (now - lastFpsTime > 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsTime = now;
        document.getElementById('fps').textContent = fps;
    }
    
    renderer.render(scene, camera);
}

animate();
