// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ СЦЕНЫ
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Голубое небо
scene.fog = new THREE.FogExp2(0x87CEEB, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// ==========================================
// 2. УПРАВЛЕНИЕ МЕНЮ И МЫШЬЮ (Pointer Lock)
// ==========================================
const controls = new THREE.PointerLockControls(camera, document.body);
const menuOverlay = document.getElementById('menu-overlay');
const startBtn = document.getElementById('start-btn');

// Клик по кнопке в меню запускает игру
startBtn.addEventListener('click', () => controls.lock());

// Поведение меню при входе/выходе из игры
controls.addEventListener('lock', () => menuOverlay.style.display = 'none');
controls.addEventListener('unlock', () => menuOverlay.style.display = 'flex');

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
// 3. ГЕНЕРАЦИЯ МИРА (Горы и Холмы)
// ==========================================
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
const materials = {
    grass: new THREE.MeshLambertMaterial({ color: 0x557a2b }),
    dirt: new THREE.MeshLambertMaterial({ color: 0x866043 }),
    stone: new THREE.MeshLambertMaterial({ color: 0x808080 })
};

const worldWidth = 24;
const worldDepth = 24;

for (let x = -worldWidth/2; x < worldWidth/2; x++) {
    for (let z = -worldDepth/2; z < worldDepth/2; z++) {
        // Синусоиды создают плавные холмы и низины (псевдо-шум)
        let heightValue = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 3 + Math.sin(x * 0.05) * 2;
        let groundHeight = Math.floor(heightValue) + 4; // Базовый уровень земли

        for (let y = 0; y <= groundHeight; y++) {
            let type = 'dirt';
            if (y === groundHeight) type = 'grass'; // Сверху трава
            else if (y < groundHeight - 2) type = 'stone'; // Глубоко — камень

            const block = new THREE.Mesh(geo, materials[type]);
            block.position.set(x, y, z);
            scene.add(block);
            blocks.push(block);
        }
    }
}
camera.position.set(0, 10, 5); // Позиция спавна игрока повыше

// ==========================================
// 4. ИНВЕНТАРЬ (Клавиши 1, 2, 3)
// ==========================================
let currentBlockType = 'grass';
const slots = document.querySelectorAll('.slot');

document.addEventListener('keydown', (e) => {
    if (e.key === '1') switchSelect(0, 'grass');
    if (e.key === '2') switchSelect(1, 'dirt');
    if (e.key === '3') switchSelect(2, 'stone');
});

function switchSelect(index, type) {
    slots.forEach(s => s.classList.remove('active'));
    slots[index].classList.add('active');
    currentBlockType = type;
}

// ==========================================
// 5.СТРОИТЕЛЬСТВО И РАЗРУШЕНИЕ
// ==========================================
const raycaster = new THREE.Raycaster();
window.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);

    if (hits.length > 0 && hits.distance < 5) {
        if (e.button === 0) { // Левый клик — ломать
            scene.remove(hits[0].object);
            blocks.splice(blocks.indexOf(hits[0].object), 1);
        } else if (e.button === 2) { // Правый клик — ставить
            const newBlock = new THREE.Mesh(geo, materials[currentBlockType]);
            newBlock.position.copy(hits[0].object.position).add(hits[0].face.normal);
            scene.add(newBlock);
            blocks.push(newBlock);
        }
    }
});
window.addEventListener('contextmenu', e => e.preventDefault());

// ==========================================
// 6. ИГРОВОЙ ЦИКЛ (Физика и Гравитация)
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked) {
        const delta = clock.getDelta();
        
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 2.0 * delta; // Падение под силой гравитации

        let moveZ = Number(keys.Forward) - Number(keys.Backward);
        let moveX = Number(keys.Right) - Number(keys.Left);

        if (moveZ !== 0) velocity.z -= moveZ * 40.0 * delta;
        if (moveX !== 0) velocity.x -= moveX * 40.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Временная заглушка пола, чтобы не упасть в бесконечную бездну
        camera.position.y += velocity.y * delta;
        if (camera.position.y < 8.5) { 
            velocity.y = 0;
            camera.position.y = 8.5;
            canJump = true;
        }

        if (keys.Jump && canJump) {
            velocity.y = 8.0;
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
