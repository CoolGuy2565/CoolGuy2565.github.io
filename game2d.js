console.log('2D Game loading...');

let gameActive = false;
const TILE_SIZE = 32;

// Item types
const ITEMS = {
    GRASS: { id: 0, name: 'Grass', color: '#4CAF50', emoji: '🌱' },
    DIRT: { id: 1, name: 'Dirt', color: '#8B4513', emoji: '🟫' },
    STONE: { id: 2, name: 'Stone', color: '#888888', emoji: '🪨' },
    WOOD: { id: 3, name: 'Wood', color: '#D2691E', emoji: '🪵' },
    PLANKS: { id: 4, name: 'Planks', color: '#CD853F', emoji: '📦' },
    PICKAXE: { id: 5, name: 'Pickaxe', color: '#555555', emoji: '⛏️' },
    AXE: { id: 6, name: 'Axe', color: '#666666', emoji: '🪓' },
    TORCH: { id: 7, name: 'Torch', color: '#FFA500', emoji: '🔥' },
    COAL: { id: 8, name: 'Coal', color: '#333333', emoji: '⚫' },
};

// Crafting recipes
const RECIPES = {
    'Planks': { input: { WOOD: 1 }, output: { PLANKS: 4 } },
    'Pickaxe': { input: { PLANKS: 3, WOOD: 2 }, output: { PICKAXE: 1 } },
    'Axe': { input: { PLANKS: 3, WOOD: 2 }, output: { AXE: 1 } },
    'Torch': { input: { COAL: 1, WOOD: 1 }, output: { TORCH: 4 } },
};

// Game state
const game = {
    player: { x: 5, y: 5 },
    map: [],
    inventory: {
        GRASS: 10,
        DIRT: 10,
        STONE: 5,
        WOOD: 3,
        PLANKS: 0,
        PICKAXE: 0,
        AXE: 0,
        TORCH: 0,
        COAL: 2,
    },
    selectedItem: 'WOOD',
    menuOpen: false,
};

// Canvas setup
const canvas = document.getElementById('gameContainer');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Generate map
function generateMap() {
    const mapWidth = 50;
    const mapHeight = 50;
    game.map = [];
    
    for (let y = 0; y < mapHeight; y++) {
        game.map[y] = [];
        for (let x = 0; x < mapWidth; x++) {
            const noise = Math.sin(x * 0.1) * Math.sin(y * 0.1);
            if (noise > 0.5) {
                game.map[y][x] = ITEMS.GRASS.id;
            } else if (noise > 0) {
                game.map[y][x] = ITEMS.DIRT.id;
            } else {
                game.map[y][x] = ITEMS.STONE.id;
            }
        }
    }
}

// Draw map
function drawMap() {
    const startX = Math.max(0, game.player.x - 8);
    const startY = Math.max(0, game.player.y - 6);
    
    for (let y = startY; y < Math.min(game.map.length, startY + 15); y++) {
        for (let x = startX; x < Math.min(game.map[0].length, startX + 20); x++) {
            const blockId = game.map[y][x];
            const item = Object.values(ITEMS).find(i => i.id === blockId);
            
            const px = (x - startX) * TILE_SIZE;
            const py = (y - startY) * TILE_SIZE;
            
            ctx.fillStyle = item.color;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            
            // Draw emoji
            ctx.font = '16px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.emoji, px + TILE_SIZE/2, py + TILE_SIZE/2);
        }
    }
    
    // Draw player
    const playerX = 8 * TILE_SIZE;
    const playerY = 6 * TILE_SIZE;
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(playerX + 2, playerY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🧑', playerX + TILE_SIZE/2, playerY + TILE_SIZE/2);
}

// Draw inventory
function drawInventory() {
    const invHeight = 150;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, canvas.height - invHeight, canvas.width, invHeight);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Inventory:', 10, canvas.height - 130);
    
    let x = 10;
    let y = canvas.height - 110;
    let itemCount = 0;
    
    for (const [itemKey, count] of Object.entries(game.inventory)) {
        if (count > 0) {
            const item = ITEMS[itemKey];
            const isSelected = game.selectedItem === itemKey;
            
            ctx.fillStyle = isSelected ? '#FFD700' : '#666';
            ctx.fillRect(x, y, 60, 60);
            ctx.strokeStyle = isSelected ? '#FFF' : '#333';
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.strokeRect(x, y, 60, 60);
            
            ctx.font = '24px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.emoji, x + 30, y + 25);
            
            ctx.font = 'bold 12px Arial';
            ctx.fillText(count, x + 30, y + 50);
            
            x += 70;
            itemCount++;
            if (itemCount >= 10) {
                x = 10;
                y += 70;
            }
        }
    }
    
    // Draw controls
    ctx.font = '12px Arial';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.fillText('Arrow keys: Move | Click item: Select | C: Craft | B: Break | P: Place | ESC: Menu', 10, canvas.height - 10);
}

// Draw crafting menu
function drawCraftingMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CRAFTING MENU', canvas.width / 2, 40);
    
    let y = 100;
    let index = 0;
    
    for (const [recipeName, recipe] of Object.entries(RECIPES)) {
        const canCraft = Object.entries(recipe.input).every(([item, amount]) => 
            game.inventory[item] >= amount
        );
        
        ctx.fillStyle = canCraft ? '#4CAF50' : '#999';
        ctx.fillRect(100, y, canvas.width - 200, 50);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`[${index + 1}] ${recipeName}`, 120, y + 20);
        
        const inputStr = Object.entries(recipe.input)
            .map(([item, amt]) => `${amt}x ${ITEMS[item].name}`)
            .join(', ');
        const outputStr = Object.entries(recipe.output)
            .map(([item, amt]) => `${amt}x ${ITEMS[item].name}`)
            .join(', ');
        
        ctx.font = '12px Arial';
        ctx.fillText(`${inputStr} → ${outputStr}`, 120, y + 38);
        
        y += 70;
        index++;
    }
    
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press number or click to craft | ESC to close', canvas.width / 2, canvas.height - 40);
}

// Break block
function breakBlock() {
    const frontX = game.player.x + (game.player.direction === 'right' ? 1 : game.player.direction === 'left' ? -1 : 0);
    const frontY = game.player.y + (game.player.direction === 'down' ? 1 : game.player.direction === 'up' ? -1 : 0);
    
    if (frontX >= 0 && frontY >= 0 && game.map[frontY] && game.map[frontY][frontX]) {
        const blockId = game.map[frontY][frontX];
        const item = Object.values(ITEMS).find(i => i.id === blockId);
        
        if (item) {
            game.map[frontY][frontX] = ITEMS.DIRT.id;
            game.inventory[item.name.toUpperCase()] = (game.inventory[item.name.toUpperCase()] || 0) + 1;
        }
    }
}

// Place block
function placeBlock() {
    const frontX = game.player.x + (game.player.direction === 'right' ? 1 : game.player.direction === 'left' ? -1 : 0);
    const frontY = game.player.y + (game.player.direction === 'down' ? 1 : game.player.direction === 'up' ? -1 : 0);
    
    if (game.inventory[game.selectedItem] > 0) {
        if (frontX >= 0 && frontY >= 0 && game.map[frontY] && game.map[frontY][frontX] !== undefined) {
            game.map[frontY][frontX] = ITEMS[game.selectedItem].id;
            game.inventory[game.selectedItem]--;
        }
    }
}

// Craft item
function craft(recipeIndex) {
    const recipes = Object.entries(RECIPES);
    if (recipeIndex >= 0 && recipeIndex < recipes.length) {
        const [recipeName, recipe] = recipes[recipeIndex];
        
        // Check if can craft
        const canCraft = Object.entries(recipe.input).every(([item, amount]) => 
            game.inventory[item] >= amount
        );
        
        if (canCraft) {
            // Remove input
            Object.entries(recipe.input).forEach(([item, amount]) => {
                game.inventory[item] -= amount;
            });
            
            // Add output
            Object.entries(recipe.output).forEach(([item, amount]) => {
                game.inventory[item] = (game.inventory[item] || 0) + amount;
            });
        }
    }
}

// Input
const keys = {};
game.player.direction = 'right';

document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    
    if (e.key === 'ArrowUp') { game.player.y = Math.max(0, game.player.y - 1); }
    if (e.key === 'ArrowDown') { game.player.y++; }
    if (e.key === 'ArrowLeft') { game.player.x = Math.max(0, game.player.x - 1); game.player.direction = 'left'; }
    if (e.key === 'ArrowRight') { game.player.x++; game.player.direction = 'right'; }
    if (e.key === 'b') breakBlock();
    if (e.key === 'p') placeBlock();
    if (e.key === 'c') { game.menuOpen = !game.menuOpen; }
    if (e.key === 'Escape') { document.getElementById('menu').classList.toggle('hidden'); }
    
    // Craft shortcuts
    for (let i = 0; i < 9; i++) {
        if (e.key === (i + 1).toString()) craft(i);
    }
    
    // Item selection with numbers
    const invItems = Object.keys(game.inventory).filter(k => game.inventory[k] > 0);
    for (let i = 0; i < invItems.length && i < 9; i++) {
        if (e.key === (i + 1).toString()) game.selectedItem = invItems[i];
    }
});

canvas.addEventListener('click', (e) => {
    if (!gameActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const invHeight = 150;
    
    if (clickY > canvas.height - invHeight) {
        // Inventory click
        let x = 10;
        let y = canvas.height - 110;
        let itemCount = 0;
        
        const invItems = Object.keys(game.inventory).filter(k => game.inventory[k] > 0);
        
        for (const itemKey of invItems) {
            if (clickX >= x && clickX < x + 60 && clickY >= y && clickY < y + 60) {
                game.selectedItem = itemKey;
                return;
            }
            x += 70;
            itemCount++;
            if (itemCount >= 10) {
                x = 10;
                y += 70;
            }
        }
    }
});

// Game loop
function gameLoop() {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameActive) {
        drawMap();
        
        if (game.menuOpen) {
            drawCraftingMenu();
        } else {
            drawInventory();
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Start game
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('menu').classList.add('hidden');
    gameActive = true;
});

// Generate and start
generateMap();
gameLoop();
