# Minecraft Online - Web Game

A 3D Minecraft-like game built with HTML5, JavaScript, and Three.js.

## Features

✨ **Core Features**:
- ✅ 3D first-person exploration
- ✅ Dynamic terrain generation with Perlin-like noise
- ✅ Block placement and breaking
- ✅ Building and crafting with inventory system
- ✅ Simple mob enemies that chase you
- ✅ Health and hunger system
- ✅ Smooth physics and collision detection

## Controls

| Key | Action |
|-----|--------|
| **W/A/S/D** | Move forward/left/backward/right |
| **Space** | Jump |
| **Mouse Look** | Click anywhere to enable, move mouse to look around |
| **Left Click** | Break blocks |
| **Right Click** | Place blocks |
| **Scroll Wheel** | Change selected block in inventory |

## Block Types

- 🟩 **Grass** - Green surface blocks
- 🟫 **Dirt** - Brown underground blocks
- ⬜ **Stone** - Gray deep blocks
- 🟪 **Wood** - Brown wooden blocks
- 🟢 **Leaves** - Green tree leaves
- 🟡 **Sand** - Desert sand blocks
- 🟦 **Water** - Blue water blocks

## How to Play

1. **Open the game** - Visit the game in your browser
2. **Look around** - Click to enable mouse lock, then move your mouse to look
3. **Move** - Use WASD keys to walk around
4. **Mine** - Left-click on blocks to break them and add them to inventory
5. **Build** - Right-click to place blocks from your inventory
6. **Survive** - Avoid mobs (orange creatures) that spawn around you
7. **Explore** - Walk around the procedurally generated world

## Gameplay Tips

- 💡 Break blocks to collect them and expand your inventory
- 🏠 Build structures to create shelter
- 👹 Mobs will chase you if you get too close - avoid them or hide in buildings
- 📍 Health decreases when mobs get close - stay away or find higher ground
- 🔄 Blocks respawn when you load/reload chunks

## Technical Details

- **Engine**: Three.js (3D graphics)
- **Language**: JavaScript (ES6 modules)
- **Rendering**: WebGL
- **Performance**: Dynamic chunk loading for performance
- **Generation**: Procedural terrain using sine wave noise

## Deployment

This game is ready to deploy to GitHub Pages:

```bash
git add .
git commit -m "Add Minecraft online game"
git push origin main
```

Then visit: `https://YOUR_USERNAME.github.io/`

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- WebGL support
- JavaScript enabled

## Future Improvements

- [ ] Better terrain generation (real Perlin noise)
- [ ] More block types and crafting recipes
- [ ] Day/night cycle
- [ ] Inventory GUI with drag/drop
- [ ] Mining progression (tools needed to break certain blocks)
- [ ] Sound effects and music
- [ ] Multiplayer support
- [ ] Custom skins

## Credits

Built with:
- [Three.js](https://threejs.org/) - 3D graphics library
- Vanilla JavaScript - Game logic

Enjoy! 🎮
