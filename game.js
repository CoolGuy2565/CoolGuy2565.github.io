import * as THREE from 'https://cdn.jsdelivr.net/npm/three@r128/build/three.module.js';

// Game constants
const BLOCK_SIZE = 1;
const WORLD_WIDTH = 100;
const WORLD_HEIGHT = 100;
const TERRAIN_HEIGHT = 20;
const RENDER_DISTANCE = 50;
const TICK_SPEED = 0.05; // seconds per game tick

// Block types
const BLOCK_TYPES = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    SAND: 6,
    WATER: 7,
    BEDROCK: 8
};

// Game state
const gameState = {
    blocks: {},
    player: {
        position: new THREE.Vector3(50, 30, 50),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        isOnGround: false,
        health: 10,
        hunger: 10,
        inventory: {
            GRASS: 64,
            DIRT: 64,
            STONE: 64,
            WOOD: 64,
            LEAVES: 64,
            SAND: 64
        },
        selectedIndex: 0
    },
    mobs: [],
    lastTick: 0,
    gameTime: 0
};

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, RENDER_DISTANCE * BLOCK_SIZE, RENDER_DISTANCE * BLOCK_SIZE * 2);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('gameContainer').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -256;
directionalLight.shadow.camera.right = 256;
directionalLight.shadow.camera.top = 256;
directionalLight.shadow.camera.bottom = -256;
scene.add(directionalLight);

// Block meshes cache
const blockMeshes = {};
const blockGroup = new THREE.Group();
scene.add(blockGroup);

// Mob group
const mobGroup = new THREE.Group();
scene.add(mobGroup);

// Input handling
const keys = {};
const mouseControls = {
    x: 0,
    y: 0,
    locked: false
};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse lock pointer
document.addEventListener('click', () => {
    document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
    document.body.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        mouseControls.x -= e.movementX * 0.005;
        mouseControls.y -= e.movementY * 0.005;
        mouseControls.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseControls.y));
    }
});

// Mouse click for block breaking/placing
window.addEventListener('mousedown', (e) => {
    if (e.button === 0) breakBlock();
    if (e.button === 2) placeBlock();
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

// Scroll for inventory
window.addEventListener('wheel', (e) => {
    e.preventDefault();
    const inventoryItems = Object.keys(gameState.player.inventory);
    if (e.deltaY > 0) {
        gameState.player.selectedIndex = (gameState.player.selectedIndex + 1) % inventoryItems.length;
    } else {
        gameState.player.selectedIndex = (gameState.player.selectedIndex - 1 + inventoryItems.length) % inventoryItems.length;
    }
    updateInventoryDisplay();
});

// Terrain generation using Perlin-like noise
function getTerrainHeight(x, z) {
    // Simple noise using sine waves
    const scale1 = Math.sin(x * 0.05) * Math.sin(z * 0.05) * 5;
    const scale2 = Math.sin(x * 0.01) * Math.sin(z * 0.01) * 10;
    const height = 10 + scale1 + scale2 + Math.random() * 3;
    return Math.floor(height);
}

// Get block type based on position
function getBlockType(x, y, z) {
    if (y === 0) return BLOCK_TYPES.BEDROCK; // Bedrock layer (air)
    const terrainHeight = getTerrainHeight(x, z);
    
    if (y > terrainHeight) return BLOCK_TYPES.AIR;
    if (y === terrainHeight) return BLOCK_TYPES.GRASS;
    if (y > terrainHeight - 3) return BLOCK_TYPES.DIRT;
    return BLOCK_TYPES.STONE;
}

// Block key for hashmap
function blockKey(x, y, z) {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

// Create block geometry
function createBlockMesh(x, y, z, blockType) {
    const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // Color based on block type
    let color;
    switch (blockType) {
        case BLOCK_TYPES.GRASS: color = 0x33cc33; break;
        case BLOCK_TYPES.DIRT: color = 0x8b6f47; break;
        case BLOCK_TYPES.STONE: color = 0x888888; break;
        case BLOCK_TYPES.WOOD: color = 0x8b4513; break;
        case BLOCK_TYPES.LEAVES: color = 0x228b22; break;
        case BLOCK_TYPES.SAND: color = 0xedc9af; break;
        case BLOCK_TYPES.WATER: color = 0x4488ff; break;
        default: color = 0xffffff;
    }
    
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2, z + BLOCK_SIZE / 2);
    mesh.userData.blockType = blockType;
    mesh.userData.x = x;
    mesh.userData.y = y;
    mesh.userData.z = z;
    
    return mesh;
}

// Load chunks around player
function loadChunks() {
    const CHUNK_SIZE = 16;
    const playerChunkX = Math.floor(gameState.player.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(gameState.player.position.z / CHUNK_SIZE);
    
    for (let cx = playerChunkX - 2; cx <= playerChunkX + 2; cx++) {
        for (let cz = playerChunkZ - 2; cz <= playerChunkZ + 2; cz++) {
            for (let x = cx * CHUNK_SIZE; x < (cx + 1) * CHUNK_SIZE; x++) {
                for (let z = cz * CHUNK_SIZE; z < (cz + 1) * CHUNK_SIZE; z++) {
                    const terrainHeight = getTerrainHeight(x, z);
                    for (let y = 0; y < terrainHeight + 1; y++) {
                        const key = blockKey(x, y, z);
                        if (!gameState.blocks[key]) {
                            const blockType = getBlockType(x, y, z);
                            if (blockType !== BLOCK_TYPES.AIR) {
                                const mesh = createBlockMesh(x, y, z, blockType);
                                blockGroup.add(mesh);
                                gameState.blocks[key] = { type: blockType, mesh };
                            }
                        }
                    }
                }
            }
        }
    }
}

// Break block
function breakBlock() {
    const raycaster = new THREE.Raycaster(camera.position, camera.getWorldDirection(new THREE.Vector3()));
    const intersects = raycaster.intersectObjects(blockGroup.children);
    
    if (intersects.length > 0) {
        const block = intersects[0].object;
        const key = blockKey(block.userData.x, block.userData.y, block.userData.z);
        if (gameState.blocks[key]) {
            delete gameState.blocks[key];
            blockGroup.remove(block);
            
            // Add to inventory
            const blockName = Object.keys(BLOCK_TYPES).find(key => BLOCK_TYPES[key] === block.userData.blockType);
            if (gameState.player.inventory[blockName] === undefined) {
                gameState.player.inventory[blockName] = 0;
            }
            gameState.player.inventory[blockName]++;
            updateInventoryDisplay();
        }
    }
}

// Place block
function placeBlock() {
    const raycaster = new THREE.Raycaster(camera.position, camera.getWorldDirection(new THREE.Vector3()));
    const intersects = raycaster.intersectObjects(blockGroup.children);
    
    if (intersects.length > 0) {
        const blockUnder = intersects[0].object;
        const normal = intersects[0].face.normal;
        const newPos = {
            x: Math.floor(blockUnder.userData.x + normal.x),
            y: Math.floor(blockUnder.userData.y + normal.y),
            z: Math.floor(blockUnder.userData.z + normal.z)
        };
        
        const inventoryItems = Object.keys(gameState.player.inventory);
        const selectedItem = inventoryItems[gameState.player.selectedIndex];
        
        if (gameState.player.inventory[selectedItem] > 0) {
            const key = blockKey(newPos.x, newPos.y, newPos.z);
            if (!gameState.blocks[key]) {
                const blockType = BLOCK_TYPES[selectedItem];
                const mesh = createBlockMesh(newPos.x, newPos.y, newPos.z, blockType);
                blockGroup.add(mesh);
                gameState.blocks[key] = { type: blockType, mesh };
                gameState.player.inventory[selectedItem]--;
                updateInventoryDisplay();
            }
        }
    }
}

// Update inventory display
function updateInventoryDisplay() {
    const inventoryContainer = document.getElementById('inventory');
    inventoryContainer.innerHTML = '';
    
    const items = Object.keys(gameState.player.inventory);
    items.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        if (index === gameState.player.selectedIndex) slot.classList.add('selected');
        slot.innerHTML = `${item.charAt(0)}<br><small>${gameState.player.inventory[item]}</small>`;
        inventoryContainer.appendChild(slot);
    });
}

// Create a mob
function createMob(x, y, z) {
    const geometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
    const mob = new THREE.Mesh(geometry, material);
    mob.castShadow = true;
    mob.receiveShadow = true;
    mob.position.set(x, y, z);
    mob.userData.health = 5;
    mob.userData.velocity = new THREE.Vector3();
    mob.userData.target = null;
    
    mobGroup.add(mob);
    gameState.mobs.push(mob);
    
    return mob;
}

// Spawn initial mobs
function spawnMobs() {
    if (gameState.mobs.length < 5) {
        const x = gameState.player.position.x + (Math.random() - 0.5) * 60;
        const z = gameState.player.position.z + (Math.random() - 0.5) * 60;
        const terrainHeight = getTerrainHeight(x, z);
        createMob(x, terrainHeight + 1, z);
    }
}

// Update player physics
function updatePlayer(dt) {
    const moveSpeed = 15;
    const jumpForce = 8;
    const gravity = 25;
    
    // Movement
    let moveForward = 0;
    let moveRight = 0;
    
    if (keys['w']) moveForward += 1;
    if (keys['s']) moveForward -= 1;
    if (keys['a']) moveRight -= 1;
    if (keys['d']) moveRight += 1;
    
    // Apply camera rotation to movement
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(camera.up, forward);
    
    gameState.player.velocity.x = (forward.x * moveForward + right.x * moveRight) * moveSpeed;
    gameState.player.velocity.z = (forward.z * moveForward + right.z * moveRight) * moveSpeed;
    
    // Gravity
    gameState.player.velocity.y -= gravity * dt;
    
    // Jump
    if ((keys[' '] || keys['w']) && gameState.player.isOnGround) {
        gameState.player.velocity.y = jumpForce;
        gameState.player.isOnGround = false;
    }
    
    // Update position
    gameState.player.position.add(gameState.player.velocity.clone().multiplyScalar(dt));
    
    // Collision with terrain
    const px = Math.floor(gameState.player.position.x);
    const py = Math.floor(gameState.player.position.y);
    const pz = Math.floor(gameState.player.position.z);
    
    gameState.player.isOnGround = false;
    const key = blockKey(px, py - 1, pz);
    if (gameState.blocks[key] || py <= 0) {
        gameState.player.position.y = py + 1.6;
        gameState.player.velocity.y = 0;
        gameState.player.isOnGround = true;
    }
    
    // Boundary check
    if (gameState.player.position.y < 0) {
        gameState.player.position.y = 30;
        gameState.player.health--;
    }
    
    // Update camera
    camera.position.copy(gameState.player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseControls.x;
    camera.rotation.x = mouseControls.y;
    
    // Update HUD
    document.getElementById('health').textContent = Math.max(0, gameState.player.health);
    document.getElementById('hunger').textContent = Math.max(0, gameState.player.hunger);
    document.getElementById('position').textContent = 
        `${px}, ${py}, ${pz}`;
}

// Update mobs
function updateMobs(dt) {
    gameState.mobs.forEach((mob, index) => {
        const dx = gameState.player.position.x - mob.position.x;
        const dz = gameState.player.position.z - mob.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Chase player if close
        if (dist < 40) {
            const speed = 5;
            mob.userData.velocity.x = (dx / dist) * speed;
            mob.userData.velocity.z = (dz / dist) * speed;
        } else {
            mob.userData.velocity.x = 0;
            mob.userData.velocity.z = 0;
        }
        
        // Gravity
        mob.userData.velocity.y -= 25 * dt;
        
        // Update position
        mob.position.add(mob.userData.velocity.clone().multiplyScalar(dt));
        
        // Collision with terrain
        const mx = Math.floor(mob.position.x);
        const my = Math.floor(mob.position.y);
        const mz = Math.floor(mob.position.z);
        
        const key = blockKey(mx, my - 0.5, mz);
        if (gameState.blocks[key] || my <= 0) {
            mob.position.y = my + 1;
            mob.userData.velocity.y = 0;
        }
        
        // Check collision with player
        if (dist < 1.5) {
            gameState.player.health -= dt;
        }
        
        // Remove distant mobs
        if (dist > 100) {
            mobGroup.remove(mob);
            gameState.mobs.splice(index, 1);
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const now = performance.now() / 1000;
    const dt = Math.min(TICK_SPEED, (now - gameState.lastTick) / 1000);
    gameState.lastTick = now;
    
    loadChunks();
    updatePlayer(dt);
    updateMobs(dt);
    spawnMobs();
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize game
updateInventoryDisplay();
animate();
