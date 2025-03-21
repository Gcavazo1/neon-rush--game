/* ==========================================================================
   NEON RUSH - Game Logic
   
   Table of Contents:
   1. Setup & Initialization
   2. Audio System
   3. Game Variables & State
   4. Canvas & Display
   5. Player System
   6. Obstacle System
   7. Particle System
   8. Background Elements
   9. Game Loop & State Management
   10. Event Handlers
   ========================================================================== */

/* ==========================================================================
   1. Setup & Initialization
   ========================================================================== */
// Canvas and DOM elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const gameOverScreen = document.getElementById('game-over');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Game start state
let gameStarted = false;

/* ==========================================================================
   2. Audio System
   ========================================================================== */
// Audio elements
const jumpSound = new Audio('assets/sounds/jump.mp3');
const doubleJumpSound = new Audio('assets/sounds/doublejump.mp3');
const gameOverSound = new Audio('assets/sounds/gameover.mp3');
const gameMusic = new Audio('assets/sounds/gamestart_nightbeginstoshine.mp3');
const rushSound = new Audio('assets/sounds/rush.mp3');

// Audio volume configuration
jumpSound.volume = 0.4;
doubleJumpSound.volume = 0.5;
gameOverSound.volume = 0.6;
gameMusic.volume = 0.7;
gameMusic.loop = true;
rushSound.volume = 0.8;

// Spotify integration
let spotifyPlayer = null;

// Sound playback helper
function playSound(sound) {
    const soundClone = sound.cloneNode();
    soundClone.volume = sound.volume;
    soundClone.play().catch(e => console.log("Audio play error:", e));
}

/* ==========================================================================
   3. Game Variables & State
   ========================================================================== */
// Core game state
let score = 0;
let lastScore = 0;
let speed = 5;
let baseSpeed = 5;
let obstacles = [];
let obstacleInterval = 1500;
let baseObstacleInterval = 1500;
let lastObstacleTime = 0;
let particles = [];
let animationId;
let gridOffset = 0;
let isGameOver = false;

// Speed rush event state
let isSpeedRush = false;
let speedRushEnd = 0;
let speedRushDuration = 8000;
let scoreMultiplier = 1;
let nextSpeedRushScore = 50;
let difficultyLevel = 1;

// Background color transition state
let colorTransitionProgress = 0;
let colorTransitionDirection = 0; // 0 = no transition, 1 = to rush, -1 = from rush
let colorTransitionSpeed = 0.02; // How fast the colors transition

// Regular background colors (darker purples)
const normalSkyColors = {
    top: '#170a5e',     // Dark purple at top
    middle: '#4a1578',  // Mid purple
    bottom: '#e807cb',  // Pink
    ground: '#000'      // Black at bottom
};

// Rush background colors (warmer yellow/orange/red tones)
const rushSkyColors = {
    top: '#2a1058',     // Slightly lighter purple at top
    middle: '#7a2555',  // Reddish purple
    bottom: '#ff6b35',  // Orange
    ground: '#000'      // Black at bottom
};

// Sun colors for normal and rush states
const normalSunColors = {
    center: '#fedb3d',  // Yellow
    middle: '#ff5f6d',  // Orange
    edge: '#e807cb'     // Pink
};

const rushSunColors = {
    center: '#ffe94e',  // Brighter yellow
    middle: '#ff8f45',  // Brighter orange
    edge: '#ff5c29'     // Reddish orange
};

// Grid colors
const normalGridColor = '#e807cb'; // Bright pink
const rushGridColor = '#ff8a2c';   // Bright orange

// Mountain colors
const normalMountainColors = {
    far: '#0a043c',    // Dark blue for far mountains
    mid: '#1c4e9c',    // Mid blue for middle mountains
    near: '#2772db'    // Brighter blue for near mountains
};

const rushMountainColors = {
    far: '#1c1147',    // Slightly brighter blue for far mountains
    mid: '#2a5da0',    // Warmer blue for middle mountains
    near: '#3e7ce0'    // Brighter blue for near mountains
};

// Palm tree colors for normal and rush modes
const normalPalmColors = {
    trunk: '#000000',       // Black trunk
    leaves: '#e807cb',      // Pink leaves
};

const rushPalmColors = {
    trunk: '#000000',       // Keep black trunk
    leaves: '#ff8a2c',      // Orange leaves to match grid
};

// Function to interpolate between two colors based on progress (0-1)
function interpolateColor(color1, color2, progress) {
    // Parse the hex colors to rgb values
    const parseColor = (color) => {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return [r, g, b];
    };
    
    const rgb1 = parseColor(color1);
    const rgb2 = parseColor(color2);
    
    // Interpolate each component
    const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * progress);
    const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * progress);
    const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * progress);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/* ==========================================================================
   4. Canvas & Display
   ========================================================================== */
// Background star system
let stars = [];
const numStars = 150;

// Sun position and size
let sunRadius = 50;
let sunX = 0;
let sunY = 0;

// Generate palm trees data
const palmTrees = [];
function generatePalmTrees() {
    // Clear existing trees
    palmTrees.length = 0;
    
    // Create palm trees on left side
    for (let i = 0; i < 2; i++) {
        const x = canvas.width * (0.05 + i * 0.20);
        const height = canvas.height * (0.20 + Math.random() * -0.03);
        palmTrees.push({
            x,
            height,
            width: height * 0.2,
            leanDirection: 0.2 + Math.random() * 0.1, // Lean right
            fronds: 5 + Math.floor(Math.random() * 3),
            color: '#270045',
            outlineColor: 'rgba(0, 0, 0, 0.7)'
        });
    }
    
    // Create palm trees on right side
    for (let i = 0; i < 2; i++) {
        const x = canvas.width * (0.8 + i * 0.20);
        const height = canvas.height * (0.20 + Math.random() * -0.03);
        palmTrees.push({
            x,
            height,
            width: height * 0.2,
            leanDirection: -0.2 - Math.random() * 0.1, // Lean left
            fronds: 5 + Math.floor(Math.random() * 3),
            color: '#270045',
            outlineColor: 'rgba(0, 0, 0, 0.7)'
        });
    }
}

// Generate fixed mountain data
const mountainRanges = [
    // Left mountain ranges (positioned to cover left side)
    { xOffset: -0.2, width: 0.76, height: 0.62, color: '#2772db', wireframeColor: 'rgba(0, 255, 255, 0.6)', points: [] },
    { xOffset: -0.01, width: 0.57, height: 0.35, color: '#1c4e9c', wireframeColor: 'rgba(0, 255, 255, 0.5)', points: [] },
    // Right mountain ranges (positioned to cover right side)
    { xOffset: 0.53, width: 0.66, height: 0.70, color: '#2772db', wireframeColor: 'rgba(0, 255, 255, 0.6)', points: [] },
    { xOffset: 0.53, width: 0.5, height: 0.35, color: '#1c4e9c', wireframeColor: 'rgba(0, 255, 255, 0.5)', points: [] },
    // Background mountain range (darker, spans full width)
    { xOffset: -0.1, width: 1.2, height: 0.25, color: '#0a043c', wireframeColor: 'rgba(0, 255, 255, 0.4)', points: [] }
];

function generateMountainPoints() {
    mountainRanges.forEach(range => {
        range.points = [];
        const numPoints = 15; // Fewer points for more angular mountains
        
        // First point at base level
        range.points.push({ x: 0, y: 0 });
        
        // Generate jagged peaks with clear angles - use fixed seeds instead of random
        for (let i = 1; i < numPoints - 1; i++) {
            const x = i / (numPoints - 1);
            
            // Create alternating peaks and valleys with fixed pattern
            let y;
            if (i % 2 === 1) {
                // Peaks - use fixed heights based on position
                const seedValue = (range.xOffset + x) * 25;
                const peakHeight = 0.5 + (Math.sin(seedValue) * 0.15 + 0.15); // Deterministic height variation
                y = peakHeight;
            } else {
                // Valleys between peaks - keep them high for sharp mountains
                const seedValue = (range.xOffset + x) * 1.3;
                const valleyHeight = 0.4 + (Math.cos(seedValue) * 0.1 + 0.1); // Deterministic valley variation
                y = valleyHeight;
            }
            
            range.points.push({ x, y });
        }
        
        // Last point at base level
        range.points.push({ x: 1, y: 0 });
    });
}

// Canvas resize handler
function resizeCanvas() {
    const screenArea = document.getElementById('screen-area');
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    canvas.width = screenArea.clientWidth;
    canvas.height = screenArea.clientHeight;
    
    // Regenerate visual elements on resize
    if (canvas.width !== oldWidth || canvas.height !== oldHeight) {
        stars.length = 0;
        generateStars();
        generateMountainPoints();
        generatePalmTrees();
    }
    
    // Update player position
    if (player) {
        player.x = canvas.width * 0.2;
        player.y = canvas.height - player.height;
    }
    
    // Redraw game state if needed
    if (isGameOver && !animationId) {
        drawBackground();
        player.draw();
        drawParticles();
    }
    
    // Show start screen if game hasn't begun
    if (!gameStarted) {
        drawStartScreen();
    }
}

/* ==========================================================================
   5. Player System
   ========================================================================== */
// Player object with properties and methods
const player = {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    color: '#0ff',
    velY: 0,
    gravity: 0.7,
    jumpStrength: -13,
    isJumping: false,
    jumpCount: 0,
    maxJumps: 2,
    trailTimer: 0,
    trail: [],
    
    // Visual rendering
    draw() {
        // Trail effect management
        this.trailTimer++;
        if (this.trailTimer >= 2) {
            this.trail.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                size: this.width * 0.8,
                life: 12
            });
            this.trailTimer = 0;
        }
        
        // Render trail particles
        ctx.save();
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            t.life--;
            
            if (t.life <= 0) {
                this.trail.splice(i, 1);
                i--;
                continue;
            }
            
            const opacity = t.life / 12;
            const size = t.size * (t.life / 12);
            
            // Inner magenta trail
            ctx.globalAlpha = opacity * 0.6;
            ctx.fillStyle = 'rgba(232, 7, 203, 0.8)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Outer cyan trail
            ctx.globalAlpha = opacity * 0.3;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Hover car rendering
        ctx.save();
        const hoverOffset = Math.sin(Date.now() * 0.005) * 3;
        
        // Ground hover effect
        const glowGradient = ctx.createRadialGradient(
            this.x + this.width/2, this.y + this.height + 10 + hoverOffset,
            0, 
            this.x + this.width/2, this.y + this.height + 10 + hoverOffset,
            this.width * 1.2
        );
        glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.7)');
        glowGradient.addColorStop(0.5, 'rgba(232, 7, 203, 0.3)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height + 8 + hoverOffset, this.width * 1.2, this.width/3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw vehicle body
        ctx.fillStyle = '#111';
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 15;
        
        // Main car body - chassis
        ctx.beginPath();
        ctx.roundRect(this.x, this.y + hoverOffset, this.width, this.height * 0.6, 8);
        ctx.fill();
        
        // Cockpit/windshield
        const windshieldGradient = ctx.createLinearGradient(
            this.x + this.width * 0.5, this.y + hoverOffset,
            this.x + this.width * 0.9, this.y + this.height * 0.4 + hoverOffset
        );
        windshieldGradient.addColorStop(0, '#a7fcff');
        windshieldGradient.addColorStop(1, '#5e8ef7');
        
        ctx.fillStyle = windshieldGradient;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.6, this.y + hoverOffset);
        ctx.lineTo(this.x + this.width * 0.95, this.y + this.height * 0.2 + hoverOffset);
        ctx.lineTo(this.x + this.width * 0.7, this.y + this.height * 0.4 + hoverOffset);
        ctx.lineTo(this.x + this.width * 0.4, this.y + hoverOffset);
        ctx.fill();
        
        // Neon light strips
        ctx.lineWidth = 2;
        
        // Bottom light strip
        ctx.shadowColor = '#e807cb';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#e807cb'; // Pink
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height * 0.6 + hoverOffset);
        ctx.lineTo(this.x + this.width, this.y + this.height * 0.6 + hoverOffset);
        ctx.stroke();
        
        // Top light strip
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#0ff'; // Cyan
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + hoverOffset + 2);
        ctx.lineTo(this.x + this.width * 0.5, this.y + hoverOffset + 2);
        ctx.stroke();
        
        // Front light
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 2, this.y + this.height * 0.3 + hoverOffset, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Rear thrusters
        const thrusterGradient = ctx.createLinearGradient(
            this.x - 8, this.y + hoverOffset,
            this.x, this.y + hoverOffset
        );
        thrusterGradient.addColorStop(0, '#ff5f6d');
        thrusterGradient.addColorStop(1, '#0ff');
        
        ctx.fillStyle = thrusterGradient;
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(this.x - 8, this.y + this.height * 0.15 + hoverOffset, 8, this.height * 0.3, 2);
        ctx.fill();
        
        // Thruster effects when jumping or moving
        const thrustIntensity = Math.abs(this.velY) / 10 + 0.5; // More intense when velocity is higher
        
        ctx.beginPath();
        const engineGlow = ctx.createLinearGradient(
            this.x - 8, this.y + this.height * 0.3 + hoverOffset,
            this.x - 20 - (thrustIntensity * 10), this.y + this.height * 0.3 + hoverOffset
        );
        engineGlow.addColorStop(0, '#ff5f6d');
        engineGlow.addColorStop(0.5, '#e807cb');
        engineGlow.addColorStop(1, 'rgba(232, 7, 203, 0)');
        
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.moveTo(this.x - 8, this.y + this.height * 0.15 + hoverOffset);
        ctx.lineTo(this.x - 20 - (thrustIntensity * 5), this.y + this.height * 0.1 + hoverOffset);
        ctx.lineTo(this.x - 20 - (thrustIntensity * 10), this.y + this.height * 0.3 + hoverOffset);
        ctx.lineTo(this.x - 20 - (thrustIntensity * 5), this.y + this.height * 0.45 + hoverOffset);
        ctx.lineTo(this.x - 8, this.y + this.height * 0.45 + hoverOffset);
        ctx.fill();
        
        ctx.restore();
    },
    
    // Physics update
    update() {
        this.velY += this.gravity;
        this.y += this.velY;
        
        // Ground collision detection
        if (this.y > canvas.height - this.height) {
            this.y = canvas.height - this.height;
            this.velY = 0;
            this.isJumping = false;
            this.jumpCount = 0;
        }
    },
    
    // Jump mechanics
    jump() {
        if (this.jumpCount < this.maxJumps) {
            this.velY = this.jumpStrength;
            this.isJumping = true;
            
            // Jump sound effects
            if (this.jumpCount === 0) {
                playSound(jumpSound);
            } else {
                playSound(doubleJumpSound);
            }
            
            this.jumpCount++;
            createParticles(this.x + this.width/2, this.y + this.height, 10);
        }
    }
};

// Initialize canvas and start event listeners
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
generateStars();
generateMountainPoints();
generatePalmTrees();

/* ==========================================================================
   6. Obstacle System
   ========================================================================== */
// Obstacle class definition
class Obstacle {
    constructor(isAirObstacle, height = 50) {
        // Convert boolean to type string for backward compatibility
        this.type = isAirObstacle ? 'air' : 'ground';
        this.height = isAirObstacle ? 40 : height;
        this.width = 30;
        this.x = canvas.width;
        this.color = isAirObstacle ? '#e807cb' : '#fedb3d'; // Changed air obstacles to purple
        this.passed = false;
        this.scored = false; // Track if points were awarded
        
        // Position based on type
        if (this.type === 'air') {
            this.y = canvas.height - this.height - 80;
        } else {
            this.y = canvas.height - this.height;
        }
        
        // Note: Double obstacles are now created in updateGameState
        // This code is removed to avoid redundant double obstacle creation
    }
    
    draw() {
        ctx.save();
        
        // Make sure all obstacles have strong glow/shadow effect for better visibility
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15; // Increased from 8 to 15 for better visibility
        
        if (this.type === 'air') {
            // Flying drone - with purple, yellow and black color scheme
            ctx.beginPath();
            
            // Main body - black with purple glow
            ctx.fillStyle = '#111'; 
            ctx.shadowColor = '#e807cb';
            ctx.roundRect(this.x, this.y, this.width, this.height * 0.6, 5);
            ctx.fill();
            
            // Yellow accent strip
            ctx.fillStyle = '#fedb3d';
            ctx.shadowColor = '#fedb3d';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.rect(this.x + 2, this.y + this.height * 0.35, this.width - 4, 3);
            ctx.fill();
            
            // Purple glow lights
            ctx.fillStyle = '#e807cb';
            ctx.shadowColor = '#e807cb';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y + 8, 3, 0, Math.PI * 2);
            ctx.arc(this.x + this.width - 8, this.y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Bottom hover glow effect
            const glowGradient = ctx.createRadialGradient(
                this.x + this.width/2, this.y + this.height * 0.6 + 5,
                0, 
                this.x + this.width/2, this.y + this.height * 0.6 + 5,
                this.width * 0.6
            );
            glowGradient.addColorStop(0, 'rgba(232, 7, 203, 0.6)');
            glowGradient.addColorStop(0.7, 'rgba(232, 7, 203, 0.2)');
            glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.ellipse(
                this.x + this.width/2, 
                this.y + this.height * 0.6 + 5, 
                this.width * 0.6, 
                this.width/4, 
                0, 0, Math.PI * 2
            );
            ctx.fill();
        } else if (this.type === 'double') {
            // Ground part (yellow barrier)
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
            ctx.fill();
            
            // Tech grid pattern for ground part
            ctx.shadowBlur = 0; // Disable shadow for detail drawing
            this.drawObstacleDetails(this.x, this.y, this.width, this.height);
            
            // Air part - Updated to match new drone style
            // Main body - black with purple glow
            ctx.fillStyle = '#111';
            ctx.shadowColor = '#e807cb';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.roundRect(this.companion.x, this.companion.y, this.companion.width, this.companion.height * 0.6, 5);
            ctx.fill();
            
            // Yellow accent strip
            ctx.fillStyle = '#fedb3d';
            ctx.shadowColor = '#fedb3d';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.rect(this.companion.x + 2, this.companion.y + this.companion.height * 0.35, this.companion.width - 4, 3);
            ctx.fill();
            
            // Purple glow lights
            ctx.fillStyle = '#e807cb';
            ctx.shadowColor = '#e807cb';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.companion.x + 8, this.companion.y + 8, 3, 0, Math.PI * 2);
            ctx.arc(this.companion.x + this.companion.width - 8, this.companion.y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Bottom hover glow effect
            const compGlowGradient = ctx.createRadialGradient(
                this.companion.x + this.companion.width/2, this.companion.y + this.companion.height * 0.6 + 5,
                0, 
                this.companion.x + this.companion.width/2, this.companion.y + this.companion.height * 0.6 + 5,
                this.companion.width * 0.6
            );
            compGlowGradient.addColorStop(0, 'rgba(232, 7, 203, 0.6)');
            compGlowGradient.addColorStop(0.7, 'rgba(232, 7, 203, 0.2)');
            compGlowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = compGlowGradient;
            ctx.beginPath();
            ctx.ellipse(
                this.companion.x + this.companion.width/2, 
                this.companion.y + this.companion.height * 0.6 + 5, 
                this.companion.width * 0.6, 
                this.companion.width/4, 
                0, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Draw connection between obstacles (energy beam) - stronger glow
            const gradient = ctx.createLinearGradient(
                this.x + this.width/2, this.y,
                this.x + this.width/2, this.companion.y + this.companion.height
            );
            gradient.addColorStop(0, '#fedb3d');
            gradient.addColorStop(1, '#e807cb');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#e807cb';
            ctx.shadowBlur = 10; // Add glow to the connection beam
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.companion.x + this.companion.width/2, this.companion.y + this.companion.height * 0.6);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Regular ground obstacle - digital barrier
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
            ctx.fill();
            
            // Tech grid pattern
            ctx.shadowBlur = 0; // Disable shadow for detail drawing
            this.drawObstacleDetails(this.x, this.y, this.width, this.height);
        }
        
        ctx.restore();
    }
    
    // Helper method for drawing obstacle details
    drawObstacleDetails(x, y, width, height) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y + 10 + i * 15);
            ctx.lineTo(x + width, y + 10 + i * 15);
            ctx.stroke();
        }
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 5 + i * 10, y);
            ctx.lineTo(x + 5 + i * 10, y + height);
            ctx.stroke();
        }
    }
    
    // Movement update
    update() {
        this.x -= speed;
        if (this.type === 'double') {
            this.companion.x -= speed;
        }
    }
    
    // Collision detection
    checkCollision() {
        const playerCollision = (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
        
        // Check companion collision for double obstacles
        if (this.type === 'double') {
            const companionCollision = (
                player.x < this.companion.x + this.companion.width &&
                player.x + player.width > this.companion.x &&
                player.y < this.companion.y + this.companion.height * 0.6 &&
                player.y + player.height > this.companion.y
            );
            
            return playerCollision || companionCollision;
        }
        
        return playerCollision;
    }
}

/* ==========================================================================
   7. Particle System
   ========================================================================== */
// Particle generation
function createParticles(x, y, count, explode = false) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = explode ? Math.random() * 8 + 2 : Math.random() * 2 + 1;
        particles.push({
            x: x,
            y: y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            life: Math.random() * 20 + 10
        });
    }
}

// Particle update logic
function updateParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
        return particle.life > 0;
    });
}

// Particle rendering
function drawParticles() {
    ctx.save();
    particles.forEach(particle => {
        const opacity = particle.life / 30;
        ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

/* ==========================================================================
   8. Background Elements
   ========================================================================== */
// Draw mountains
function drawMountains() {
    // Interpolate mountain colors based on transition progress
    const currentFarMountainColor = interpolateColor(normalMountainColors.far, rushMountainColors.far, colorTransitionProgress);
    const currentMidMountainColor = interpolateColor(normalMountainColors.mid, rushMountainColors.mid, colorTransitionProgress);
    const currentNearMountainColor = interpolateColor(normalMountainColors.near, rushMountainColors.near, colorTransitionProgress);
    
    // Apply colors to mountain ranges
    mountainRanges.forEach(range => {
        ctx.save();
        
        // Calculate mountain position and size
        const mountainWidth = canvas.width * range.width;
        const mountainHeight = canvas.height * range.height;
        const mountainX = canvas.width * range.xOffset;
        
        // Draw mountain shape
        ctx.beginPath();
        ctx.moveTo(mountainX, canvas.height);
        
        // Draw mountain points
        range.points.forEach(point => {
            ctx.lineTo(
                mountainX + (point.x * mountainWidth),
                canvas.height - (point.y * mountainHeight)
            );
        });
        
        // Complete the shape
        ctx.lineTo(mountainX + mountainWidth, canvas.height);
        ctx.closePath();
        
        // Fill mountain with transitioned color
        // Choose appropriate color based on mountain height
        if (range.height <= 0.25) {
            ctx.fillStyle = currentFarMountainColor;
        } else if (range.height <= 0.35) {
            ctx.fillStyle = currentMidMountainColor;
        } else {
            ctx.fillStyle = currentNearMountainColor;
        }
        ctx.fill();
        
        // Draw wireframe effect with enhanced visibility
        // Simple wireframe color that works with both normal and rush modes
        const wireframeColor = colorTransitionProgress > 0.5 ? 
            'rgba(255, 138, 44, 0.7)' : // Rush mode - orange wireframe
            'rgba(0, 255, 255, 0.7)';   // Normal mode - cyan wireframe
        
        ctx.strokeStyle = wireframeColor;
        ctx.lineWidth = 2; // Increased from 1 to 2 for better visibility
        ctx.shadowColor = wireframeColor;
        ctx.shadowBlur = 5;
        ctx.stroke();
        
        ctx.restore();
    });
}

// Draw palm trees at the horizon
function drawPalmTrees() {
    const horizon = canvas.height * 0.4; // Align with mountains
    
    // Interpolate palm tree colors
    const currentLeafColor = interpolateColor(normalPalmColors.leaves, rushPalmColors.leaves, colorTransitionProgress);
    
    palmTrees.forEach(tree => {
        ctx.save();
        
        // Use the pre-calculated position directly from the tree object
        // tree.x is already in canvas coordinates (no need to multiply by canvas.width)
        const x = tree.x;
        const baseY = horizon;
        const trunkWidth = tree.width * 0.2;
        const trunkHeight = tree.height * 0.7;
        const controlPointX = x + (trunkHeight * tree.leanDirection);
        
        // Draw trunk with slight curve
        ctx.beginPath();
        ctx.moveTo(x - trunkWidth/2, baseY);
        ctx.quadraticCurveTo(
            controlPointX, 
            baseY - trunkHeight/2,
            x + (tree.leanDirection * trunkHeight) - trunkWidth/3, 
            baseY - trunkHeight
        );
        ctx.lineTo(x + (tree.leanDirection * trunkHeight) + trunkWidth/3, baseY - trunkHeight);
        ctx.quadraticCurveTo(
            controlPointX, 
            baseY - trunkHeight/2,
            x + trunkWidth/2, 
            baseY
        );
        ctx.closePath();
        
        // Fill trunk
        ctx.fillStyle = tree.color;
        ctx.fill();
        
        // Draw trunk outline with glow
        ctx.strokeStyle = tree.outlineColor;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = tree.outlineColor;
        ctx.shadowBlur = 3;
        ctx.stroke();
        
        // Draw palm fronds (leaves) with transitioned color
        const frondBaseX = x + (tree.leanDirection * trunkHeight);
        const frondBaseY = baseY - trunkHeight;
        
        // Draw each frond
        for (let i = 0; i < tree.fronds; i++) {
            const angle = (i / tree.fronds) * Math.PI;
            const frondLength = tree.height * 0.5;
            
            // Calculate curve control points
            const dirX = Math.cos(angle) * (tree.leanDirection > 0 ? 1 : -1);
            const dirY = -Math.sin(angle) - 0.5;
            const normalizedDir = Math.sqrt(dirX*dirX + dirY*dirY);
            const normalizedX = dirX / normalizedDir;
            const normalizedY = dirY / normalizedDir;
            
            const endX = frondBaseX + normalizedX * frondLength;
            const endY = frondBaseY + normalizedY * frondLength;
            
            // Control point for curve
            const ctrlX = frondBaseX + normalizedX * frondLength * 0.5 + 
                         (normalizedY * frondLength * 0.2);
            const ctrlY = frondBaseY + normalizedY * frondLength * 0.5 -
                         (normalizedX * frondLength * 0.2);
            
            // Draw the frond with transitioned color
            ctx.beginPath();
            ctx.moveTo(frondBaseX, frondBaseY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.lineWidth = 2;
            ctx.strokeStyle = currentLeafColor; // Apply transition color
            ctx.stroke();
            
            // Draw smaller leaflets coming off the frond
            const leaflets = 4;
            for (let j = 1; j <= leaflets; j++) {
                const t = j / (leaflets + 1);
                const leafBaseX = frondBaseX + (endX - frondBaseX) * t;
                const leafBaseY = frondBaseY + (endY - frondBaseY) * t;
                
                // Calculate position on the curve using quadratic formula
                const curveX = (1-t)*(1-t)*frondBaseX + 2*(1-t)*t*ctrlX + t*t*endX;
                const curveY = (1-t)*(1-t)*frondBaseY + 2*(1-t)*t*ctrlY + t*t*endY;
                
                // Direction perpendicular to the curve
                const tangentX = 2*(1-t)*(ctrlX-frondBaseX) + 2*t*(endX-ctrlX);
                const tangentY = 2*(1-t)*(ctrlY-frondBaseY) + 2*t*(endY-ctrlY);
                
                // Normalize and rotate 90 degrees
                const perpX = -tangentY;
                const perpY = tangentX;
                const length = Math.sqrt(perpX*perpX + perpY*perpY);
                
                // Leaflet length depends on position along frond (longer in middle)
                const leafletLength = frondLength * 0.15 * Math.sin(t * Math.PI);
                
                // Draw leaflet on both sides with transitioned color
                ctx.beginPath();
                ctx.moveTo(curveX, curveY);
                ctx.lineTo(
                    curveX + perpX/length * leafletLength,
                    curveY + perpY/length * leafletLength
                );
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(curveX, curveY);
                ctx.lineTo(
                    curveX - perpX/length * leafletLength,
                    curveY - perpY/length * leafletLength
                );
                ctx.stroke();
            }
        }
        
        ctx.restore();
    });
}

// Draw grid effect
function drawGrid() {
    ctx.save();
    
    // Draw perspective grid
    const horizon = canvas.height * 0.4; // Align with mountains
    const gridRows = 20;
    const gridColumns = 20;
    const vanishingPointX = canvas.width / 2;
    
    // Interpolate grid color based on transition progress
    const currentGridColor = interpolateColor(normalGridColor, rushGridColor, colorTransitionProgress);
    
    // Draw horizontal grid lines with perspective
    ctx.strokeStyle = currentGridColor;
    ctx.lineWidth = 1.5;
    
    for (let i = 0; i <= gridRows; i++) {
        const y = horizon + (canvas.height - horizon) * (i / gridRows);
        const lineOpacity = 1 - (i / gridRows) * 0.3;
        
        ctx.globalAlpha = lineOpacity;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Calculate grid animation speed based on game speed and difficulty
    const baseGridSpeed = speed * 0.15;
    const difficultyBonus = (difficultyLevel - 1) * 0.02; // 2% increase per level
    const gridAnimationSpeed = baseGridSpeed * (1 + difficultyBonus);
    
    // Draw vertical grid lines with perspective and animation
    gridOffset = (gridOffset + gridAnimationSpeed) % 40;
    
    for (let i = -gridColumns; i <= gridColumns; i++) {
        // Add offset for animation
        const offsetX = (i * 40 + gridOffset) % (canvas.width * 2) - canvas.width;
        const normalizedI = offsetX / (canvas.width / gridColumns);
        
        const startX = vanishingPointX + (normalizedI * (canvas.width / gridColumns) / 4);
        const lineOpacity = 1 - Math.min(1, Math.abs(normalizedI) / gridColumns * 0.7);
        
        ctx.globalAlpha = lineOpacity;
        ctx.beginPath();
        ctx.moveTo(startX, horizon);
        ctx.lineTo(vanishingPointX + normalizedI * (canvas.width / gridColumns), canvas.height);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw reflection/shadow overlay for grid area
function drawGridOverlay() {
    const horizon = canvas.height * 0.4;
    
    // Interpolate sun reflection gradient color based on transition progress
    const reflectionColor = interpolateColor('#ff5d6d', '#ff8f45', colorTransitionProgress);
    const reflectionColorEnd = interpolateColor('#e807cb', '#ff5c29', colorTransitionProgress);
    
    // Create gradient for sun reflection
    const sunReflectionGradient = ctx.createRadialGradient(
        canvas.width / 2, horizon,
        0,
        canvas.width / 2, horizon,
        canvas.width * 0.6
    );
    sunReflectionGradient.addColorStop(1, `rgba(${parseInt(reflectionColor.slice(1, 3), 16)}, ${parseInt(reflectionColor.slice(3, 5), 16)}, ${parseInt(reflectionColor.slice(5, 7), 16)}, 0.35)`);
    sunReflectionGradient.addColorStop(0.5, `rgba(${parseInt(reflectionColorEnd.slice(1, 3), 16)}, ${parseInt(reflectionColorEnd.slice(3, 5), 16)}, ${parseInt(reflectionColorEnd.slice(5, 7), 16)}, 0.15)`);
    sunReflectionGradient.addColorStop(.32, 'rgba(140, 135, 1, 0.39)');
    
    ctx.save();
    ctx.fillStyle = sunReflectionGradient;
    ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    
    // Add stronger shadow gradient at the horizon line
    const shadowGradient = ctx.createLinearGradient(0, horizon - 20, 0, horizon + 40);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(0, horizon - 20, canvas.width, 60);
    ctx.restore();
}

// Draw the complete background
function drawBackground() {
    // Update color transition progress if needed
    if (colorTransitionDirection !== 0) {
        colorTransitionProgress += colorTransitionDirection * colorTransitionSpeed;
        
        // Clamp the progress between 0 and 1
        if (colorTransitionProgress >= 1) {
            colorTransitionProgress = 1;
            colorTransitionDirection = 0; // End transition
        } else if (colorTransitionProgress <= 0) {
            colorTransitionProgress = 0;
            colorTransitionDirection = 0; // End transition
        }
    }
    
    // Calculate sky gradient based on transition state
    const currentSkyColors = {
        top: interpolateColor(normalSkyColors.top, rushSkyColors.top, colorTransitionProgress),
        middle: interpolateColor(normalSkyColors.middle, rushSkyColors.middle, colorTransitionProgress),
        bottom: interpolateColor(normalSkyColors.bottom, rushSkyColors.bottom, colorTransitionProgress),
        ground: normalSkyColors.ground // Ground stays black
    };
    
    // Draw sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, currentSkyColors.top);
    skyGradient.addColorStop(0.4, currentSkyColors.middle);
    skyGradient.addColorStop(0.6, currentSkyColors.bottom);
    skyGradient.addColorStop(1, currentSkyColors.ground);
    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    drawStars();
    
    // Draw sun
    drawSun();
    
    // Draw grid (move before mountains for proper z-ordering)
    drawGrid();
    
    // Draw sun reflection and shadow overlay
    drawGridOverlay();
    
    // Draw mountains on top of grid
    drawMountains();
    
    // Draw palm trees
    drawPalmTrees();
}

/* ==========================================================================
   9. Game Loop & State Management
   ========================================================================== */
// Game initialization
function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        startMusic();
        gameLoop();
    }
}

// Game over state
function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    
    // Update score display
    finalScore.textContent = `YOUR SCORE: ${score}`;
    gameOverScreen.style.display = 'block';
    
    // Create explosion particles
    createParticles(player.x + player.width/2, player.y + player.height/2, 50, true);
    
    // Play game over sound
    playSound(gameOverSound);
    
    // Pause the music
    gameMusic.pause();
}

// Game state reset
function resetGame() {
    // Reset core game variables
    score = 0;
    isGameOver = false;
    gameStarted = false;
    obstacles.length = 0;
    particles.length = 0;
    speed = 5;
    baseSpeed = 5;
    obstacleInterval = 1500;
    baseObstacleInterval = 1500;
    
    // Reset player state
    player.y = canvas.height - player.height;
    player.velY = 0;
    player.isJumping = false;
    player.jumpCount = 0;
    
    // Reset UI
    scoreDisplay.textContent = 'Score: 0';
    gameOverScreen.style.display = 'none';
    lastObstacleTime = 0;
    
    // Reset special events
    isSpeedRush = false;
    speedRushEnd = 0;
    scoreMultiplier = 1;
    nextSpeedRushScore = 50;
    difficultyLevel = 1;
    
    // Reset color transition state
    colorTransitionProgress = 0;
    colorTransitionDirection = 0;
    
    // Reset audio
    gameMusic.pause();
    
    // Show start screen
    drawStartScreen();
}

// Main game loop
function gameLoop(timestamp = 0) {
    if (!timestamp) timestamp = 0;
    if (!lastObstacleTime) lastObstacleTime = timestamp;
    if (!lastScore) lastScore = timestamp;
    
    if (!isGameOver) {
        updateGameState(timestamp);
        drawGame();
        animationId = requestAnimationFrame(gameLoop);
    }
}

/* ==========================================================================
   10. Event Handlers
   ========================================================================== */
// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        
        if (!gameStarted) {
            startGame();
        } else if (!isGameOver) {
            player.jump();
        } else {
            resetGame();
        }
    }
});

// Mouse/touch controls
canvas.addEventListener('click', () => {
    if (!gameStarted) {
        startGame();
    } else if (!isGameOver) {
        player.jump();
    } else {
        resetGame();
    }
});

restartBtn.addEventListener('click', resetGame);

// Initialize game
resizeCanvas();
generateStars();
generatePalmTrees();
drawStartScreen();

// Update game state
function updateGameState(timestamp) {
    // Check if we've reached a speed rush threshold
    if (score >= nextSpeedRushScore && !isSpeedRush) {
        startSpeedRush();
    }
    
    // Check if speed rush should end
    if (isSpeedRush && timestamp > speedRushEnd) {
        endSpeedRush();
    }
    
    // Update obstacles
    if (timestamp - lastObstacleTime > obstacleInterval) {
        // Determine obstacle type with adjusted probabilities
        const obstacleHeight = Math.random() * 20 + 20;
        
        // Base double obstacle chance increases with score
        let doubleChance = Math.min(0.15, score * 0.004); // Slower growth
        
        // Increase chance during speed rush
        if (isSpeedRush) {
            doubleChance += 0.15; // Additional 15% chance during rush
        }
        
        // Determine obstacle type based on probabilities
        const random = Math.random();
        
        if (random < doubleChance) {
            // Create a double obstacle
            const obstacle = new Obstacle(false, obstacleHeight);
            obstacle.type = 'double';
            obstacle.companion = {
                x: obstacle.x,
                y: canvas.height - obstacle.height - 80,
                width: obstacle.width,
                height: 40,
                color: '#e807cb' // Updated from cyan to purple
            };
            obstacles.push(obstacle);
        } else if (random < 0.3 + doubleChance) {
            // Create an air obstacle
            obstacles.push(new Obstacle(true, obstacleHeight));
        } else {
            // Create a ground obstacle
            obstacles.push(new Obstacle(false, obstacleHeight));
        }
        
        lastObstacleTime = timestamp;
    }
    
    // Update player
    player.update();
    
    // Update and filter obstacles
    obstacles = obstacles.filter(obstacle => {
        obstacle.update();
        
        // Only score when obstacles pass off screen, not in obstacle.update()
        if (obstacle.x + obstacle.width < 0) {
            if (!obstacle.scored) {
                obstacle.scored = true;
                // Award points for passing obstacles (1 point normally, 2 during rush)
                score += 1 * scoreMultiplier;
                scoreDisplay.textContent = `Score: ${score}`;
            }
            return false;
        }
        
        if (obstacle.checkCollision(player)) {
            gameOver();
            return false;
        }
        return true;
    });
    
    // Update particles
    particles = particles.filter(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
        return particle.life > 0;
    });
    
    // Gradually increase difficulty based on score - only check at specific intervals
    // Make this more gradual - only every 30 points instead of 20
    if (score > 0 && Math.floor(score / 30) > Math.floor((score - 1) / 30)) {
        increaseBaseDifficulty();
    }
}

// Speed Rush Functions
function startSpeedRush() {
    isSpeedRush = true;
    speedRushEnd = performance.now() + speedRushDuration;
    
    // Start color transition to rush colors
    colorTransitionDirection = 1;
    
    // Store values before change for logging
    const oldSpeed = speed;
    const oldInterval = obstacleInterval;
    
    // Temporarily increase speed and reduce obstacle interval - but more subtly
    speed = baseSpeed * 1.025; // Smaller multiplier (was 1.03)
    obstacleInterval = baseObstacleInterval * 0.7; // Less aggressive reduction (was 0.6)
    scoreMultiplier = 2;
    
    // Log the changes
    console.log(`Speed Rush started at score: ${score}`);
    console.log(`Speed: ${oldSpeed.toFixed(2)} -> ${speed.toFixed(2)} (Rush multiplier: 1.02x)`);
    console.log(`Obstacle interval: ${oldInterval.toFixed(0)}ms -> ${obstacleInterval.toFixed(0)}ms (Rush multiplier: 0.8x)`);
    console.log(`Score multiplier: 2x points`);
    
    // Play rush sound
    playSound(rushSound);
    
    // Create particles for visual effect
    createParticles(canvas.width / 2, canvas.height / 2, 100, true);
    
    // Calculate next speed rush threshold
    nextSpeedRushScore += 50;
    
    // Increase difficulty level
    difficultyLevel++;
    
    console.log(`Next Speed Rush at score: ${nextSpeedRushScore}, Difficulty level: ${difficultyLevel}`);
}

function endSpeedRush() {
    // Store values before change for logging
    const oldSpeed = speed;
    const oldInterval = obstacleInterval;
    
    isSpeedRush = false;
    
    // Start color transition back to normal colors
    colorTransitionDirection = -1;
    
    // Return speed to normal but keep obstacle interval with a gentler reduction
    speed = baseSpeed;
    // Very subtle reduction based on difficulty level
    obstacleInterval = Math.max(baseObstacleInterval - (difficultyLevel * 10), 700); // Less aggressive (was difficultyLevel * 100, min 500)
    scoreMultiplier = 1;
    
    // Log the changes
    console.log(`Speed Rush ended at score: ${score}`);
    console.log(`Speed: ${oldSpeed.toFixed(2)} -> ${speed.toFixed(2)} (returned to base speed)`);
    console.log(`Obstacle interval: ${oldInterval.toFixed(0)}ms -> ${obstacleInterval.toFixed(0)}ms (gentle permanent reduction)`);
    console.log(`Score multiplier: 1x (normal)`);
    console.log(`Difficulty level: ${difficultyLevel}`);
}

function increaseBaseDifficulty() {
    console.log(`Increasing difficulty at score: ${score}`);
    
    // Make the speed increase much more subtle
    if (baseSpeed < 10) {
        const oldSpeed = baseSpeed;
        baseSpeed += 0.02; // Very subtle increase (was 0.1 before)
        if (!isSpeedRush) {
            speed = baseSpeed;
        }
        console.log(`Speed increased: ${oldSpeed.toFixed(2)} -> ${baseSpeed.toFixed(2)}`);
    }
    
    // Gradually reduce base obstacle interval
    if (baseObstacleInterval > 800) {
        const oldInterval = baseObstacleInterval;
        baseObstacleInterval -= 2; // Very subtle decrease (was 15 before)
        if (!isSpeedRush) {
            obstacleInterval = baseObstacleInterval;
        }
        console.log(`Obstacle interval decreased: ${oldInterval.toFixed(0)}ms -> ${baseObstacleInterval.toFixed(0)}ms`);
    }
}

// Draw game elements
function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background elements
    drawBackground();
    
    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());
    
    // Draw player
    player.draw();
    
    // Draw particles
    drawParticles();
    
    // Draw speed rush indicator if active
    if (isSpeedRush) {
        drawSpeedRushIndicator();
    }
}

// Draw speed rush indicator
function drawSpeedRushIndicator() {
    const remainingTime = speedRushEnd - performance.now();
    const percentage = remainingTime / speedRushDuration;
    
    // Draw border flash
    ctx.save();
    ctx.strokeStyle = `rgba(255, 0, 255, ${0.5 + Math.sin(performance.now() / 100) * 0.5})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw timer bar
    ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
    ctx.fillRect(0, 0, canvas.width * percentage, 10);
    
    // Draw multiplier text
    ctx.fillStyle = '#f0f';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#f0f';
    ctx.shadowBlur = 10;
    ctx.fillText(`2X POINTS`, canvas.width / 2, 30);
    ctx.restore();
}

// Draw start screen
function drawStartScreen() {
    // Draw the background first
    drawBackground();
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0ff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 32px "Press Start 2P", monospace';
    ctx.fillText('NEON RUSH', canvas.width / 2, canvas.height / 3);
    
    // Draw subtitle
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#e807cb';
    ctx.shadowColor = '#e807cb';
    ctx.fillText('The Night Begins To Shine', canvas.width / 2, canvas.height / 3 + 40);
    
    // Draw click to start button
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    
    const buttonWidth = 220;
    const buttonHeight = 60;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height / 2 + 20;
    
    ctx.beginPath();
    ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 5;
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillText('CLICK TO START', canvas.width / 2, buttonY + buttonHeight / 2 + 6);
    
    // Draw music credit
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#888';
    ctx.shadowBlur = 0;
    ctx.fillText('Music: B.E.R. - The Night Begins To Shine (Dragon Remix)', canvas.width / 2, canvas.height - 20);
    
    ctx.restore();
}

// Start music function - now plays the local audio file
function startMusic() {
    try {
        gameMusic.currentTime = 0;
        gameMusic.play().catch(e => {
            console.log("Music play error:", e);
            // Add a button to manually start music if autoplay is blocked
            addMusicStartButton();
        });
    } catch (e) {
        console.log("Music play error:", e);
    }
}

// Function to add a music start button if autoplay is blocked
function addMusicStartButton() {
    // If a button already exists, don't add another one
    if (document.getElementById('music-start-btn')) return;
    
    const musicBtn = document.createElement('button');
    musicBtn.id = 'music-start-btn';
    musicBtn.textContent = 'Click for Music';
    musicBtn.style.position = 'absolute';
    musicBtn.style.bottom = '85px';
    musicBtn.style.right = '10px';
    musicBtn.style.backgroundColor = '#111';
    musicBtn.style.color = '#0ff';
    musicBtn.style.border = '1px solid #0ff';
    musicBtn.style.borderRadius = '5px';
    musicBtn.style.padding = '5px 10px';
    musicBtn.style.cursor = 'pointer';
    musicBtn.style.zIndex = '100';
    musicBtn.style.fontFamily = 'sans-serif';
    musicBtn.style.fontSize = '12px';
    musicBtn.style.boxShadow = '0 0 5px #0ff';
    
    musicBtn.addEventListener('click', () => {
        gameMusic.play().catch(e => console.log("Music play error:", e));
        musicBtn.remove();
    });
    
    document.body.appendChild(musicBtn);
}

// Generate stars for the night sky
function generateStars() {
    stars = [];
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height * 0.4), // Keep stars above horizon
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            twinkleSpeed: Math.random() * 0.03 + 0.01,
            twinkleOffset: Math.random() * Math.PI * 2  // Random starting phase
        });
    }
}

// Draw the stars with twinkling effect
function drawStars() {
    ctx.save();
    
    // Stars should be more visible during normal mode, slightly less during rush
    const starOpacityMultiplier = 1 - (colorTransitionProgress * 0.3);
    
    stars.forEach(star => {
        // Calculate twinkling effect
        const twinkle = Math.sin(performance.now() * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
        
        // Draw star with adjusted opacity
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle * starOpacityMultiplier})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.restore();
}

// Draw sun
function drawSun() {
    ctx.save();
    
    // Interpolate current sun colors based on transition progress
    const currentSunColors = {
        center: interpolateColor(normalSunColors.center, rushSunColors.center, colorTransitionProgress),
        middle: interpolateColor(normalSunColors.middle, rushSunColors.middle, colorTransitionProgress),
        edge: interpolateColor(normalSunColors.edge, rushSunColors.edge, colorTransitionProgress)
    };
    
    // Set sun position and size
    sunX = canvas.width / 2;
    sunY = canvas.height * 0.28; // High in the sky
    sunRadius = canvas.width * 0.2; // Sun size
    
    // Create sun gradient with current transition colors
    const sunGradient = ctx.createRadialGradient(
        sunX, sunY,
        0,
        sunX, sunY,
        sunRadius
    );
    sunGradient.addColorStop(0, currentSunColors.center); // Center color
    sunGradient.addColorStop(0.7, currentSunColors.middle); // Middle color
    sunGradient.addColorStop(1, currentSunColors.edge); // Edge color
    
    // Draw sun circle
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = sunGradient;
    ctx.fill();
    
    // Draw sun lines for retro effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    const numLines = 7; // Number of horizontal lines across sun
    const sunLineSpacing = (sunRadius * 2) / (numLines + 1);
    
    for (let i = 1; i <= numLines; i++) {
        const lineY = sunY - sunRadius + (i * sunLineSpacing);
        ctx.fillRect(sunX - sunRadius, lineY, sunRadius * 2, 3);
    }
    
    ctx.restore();
}