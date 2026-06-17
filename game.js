// ==========================================
// 1. ENGINE SETUP (Scene, Camera, Lighting)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky color
scene.fog = new THREE.FogExp2(0x87CEEB, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// ==========================================
// 2. PLAYER MOVEMENT & JUMPING
// ==========================================
const controls = new THREE.PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

let keys = { Forward: false, Backward: false, Left: false, Right: false, Jump: false };
let velocity = new THREE.Vector3();
let canJump = false;

document.addEventListener('keydown', (e) => handleKey(e.code, true));
document.addEventListener('keyup', (e) => handleKey(e.code, false));

function handleKey(code, isPressed) {
    if (code === 'KeyW') keys.Forward = isPressed;
    if (code === 'KeyS') keys.Backward = isPressed;
    if (code === 'KeyA') keys.Left = isPressed;
    if (code === 'KeyD') keys.Right = isPressed;
    if (code === 'Space') keys.Jump = isPressed;
}

// ==========================================
// 3. WORLD GENERATION (Blocks)
// ==========================================
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
const materials = {
    grass: new THREE.MeshLambertMaterial({ color: 0x557a2b }),
    dirt: new THREE.MeshLambertMaterial({ color: 0x866043 }),
    stone: new THREE.MeshLambertMaterial({ color: 0x808080 })
};

// Generate simple terrain
for (let x = -10; x < 10; x++) {
    for (let z = -10; z < 10; z++) {
        for (let y = 0; y < 3; y++) {
            let type = 'dirt';
            if (y === 2) type = 'grass';
            if (y === 0) type = 'stone';

            const block = new THREE.Mesh(geo, materials[type]);
            block.position.set(x, y, z);
            scene.add(block);
            blocks.push(block);
        }
    }
}
camera.position.set(0, 5, 0); // Start player above ground

// ==========================================
// 4. INVENTORY LOGIC (Selecting block types)
// ==========================================
let currentBlockType = 'grass';
const slots = document.querySelectorAll('.slot');

// Scroll or number keys to switch blocks can be added here
// For now, click slot to select
slots.forEach(slot => {
    slot.addEventListener('click', () => {
        slots.forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        currentBlockType = slot.getAttribute('data-block');
    });
});

// ==========================================
// 5. BLOCK INTERACTIONS (Build & Destroy)
// ==========================================
const raycaster = new THREE.Raycaster();
window.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);

    if (hits.length > 0 && hits.distance < 5) {
        if (e.button === 0) { // Left Click: Destroy
            scene.remove(hits[0].object);
            blocks.splice(blocks.indexOf(hits[0].object), 1);
        } else if (e.button === 2) { // Right Click: Build active type
            const newBlock = new THREE.Mesh(geo, materials[currentBlockType]);
            newBlock.position.copy(hits[0].object.position).add(hits[0].face.normal);
            scene.add(newBlock);
            blocks.push(newBlock);
        }
    }
});
window.addEventListener('contextmenu', e => e.preventDefault());

// ==========================================
// 6. ANIMATION, COLLISIONS & GRAVITY LOOP
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked) {
        const delta = clock.getDelta();
        
        // Air resistance / friction
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 2.0 * delta; // Gravity mechanics

        let moveZ = Number(keys.Forward) - Number(keys.Backward);
        let moveX = Number(keys.Right) - Number(keys.Left);

        if (moveZ !== 0) velocity.z -= moveZ * 40.0 * delta;
        if (moveX !== 0) velocity.x -= moveX * 40.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Simple Ground Collision (Y level threshold)
        camera.position.y += velocity.y * delta;
        if (camera.position.y < 4.5) { 
            velocity.y = 0;
            camera.position.y = 4.5;
            canJump = true;
        }

        // Jumping execution
        if (keys.Jump && canJump) {
            velocity.y = 8.0; // Jump force
            canJump = false;
        }
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
