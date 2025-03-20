// Canvas setup and DOM elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const gameOverScreen = document.getElementById('game-over');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Add start screen variable
let gameStarted = false;

// Audio setup
const jumpSound = new Audio('assets/sounds/jump.mp3');
const doubleJumpSound = new Audio('assets/sounds/doublejump.mp3');
const gameOverSound = new Audio('assets/sounds/gameover.mp3');
const gameMusic = new Audio('assets/sounds/gamestart_nightbeginstoshine.mp3');
const speedUpSound = new Audio('assets/sounds/speedup.mp3'); // Optional: Add a speed up sound effect
const rushSound = new Audio('assets/sounds/rush.mp3'); // Rush event sound effect

// Spotify player reference
let spotifyPlayer = null;

// Preload sounds and set volume
jumpSound.volume = 0.4;
doubleJumpSound.volume = 0.5;
gameOverSound.volume = 0.6;
gameMusic.volume = 0.7;
gameMusic.loop = true;
speedUpSound.volume = 0.6;
rushSound.volume = 0.8; // Slightly louder for impact

// Helper function to play sounds with a small delay to prevent overlapping
function playSound(sound) {
    // Clone sound to allow overlapping plays
    const soundClone = sound.cloneNode();
    soundClone.volume = sound.volume;
    soundClone.play().catch(e => console.log("Audio play error:", e));
}

// Game variables
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

// Special event variables
let isSpeedRush = false;
let speedRushEnd = 0;
let speedRushDuration = 8000; // 8 seconds
let scoreMultiplier = 1;
let nextSpeedRushScore = 50;
let difficultyLevel = 1;

// Generate static stars for consistent rendering
const stars = [];
function generateStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height * 0.5),
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            twinkle: Math.random() * 0.1
        });
    }
}

// Generate palm trees data
const palmTrees = [];
function generatePalmTrees() {
    // Clear existing trees
    palmTrees.length = 0;
    
    // Create palm trees on left side
    for (let i = 0; i < 2; i++) {
        const x = canvas.width * (0.05 + i * 0.15);
        const height = canvas.height * (0.15 + Math.random() * -0.03);
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
        const x = canvas.width * (0.8 + i * 0.15);
        const height = canvas.height * (0.15 + Math.random() * -0.03);
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
    { xOffset: -0.2, width: 0.7, height: 0.3, color: '#2772db', wireframeColor: 'rgba(0, 255, 255, 0.6)', points: [] },
    { xOffset: -0.1, width: 0.5, height: 0.25, color: '#1c4e9c', wireframeColor: 'rgba(0, 255, 255, 0.5)', points: [] },
    // Right mountain ranges (positioned to cover right side)
    { xOffset: 0.5, width: 0.7, height: 0.3, color: '#2772db', wireframeColor: 'rgba(0, 255, 255, 0.6)', points: [] },
    { xOffset: 0.6, width: 0.5, height: 0.25, color: '#1c4e9c', wireframeColor: 'rgba(0, 255, 255, 0.5)', points: [] },
    // Background mountain range (darker, spans full width)
    { xOffset: -0.1, width: 1.2, height: 0.15, color: '#0a043c', wireframeColor: 'rgba(0, 255, 255, 0.4)', points: [] }
];

function generateMountainPoints() {
    mountainRanges.forEach(range => {
        range.points = [];
        const numPoints = 15; // Fewer points for more angular mountains
        
        // First point at base level
        range.points.push({ x: 0, y: 0 });
        
        // Generate jagged peaks with clear angles
        for (let i = 1; i < numPoints - 1; i++) {
            const x = i / (numPoints - 1);
            
            // Create alternating sharp peaks and valleys
            let y;
            if (i % 2 === 1) {
                // Peaks - vary the height for natural look
                const peakHeight = 0.7 + Math.random() * 0.3; // Peak height varies from 70% to 100%
                y = peakHeight;
            } else {
                // Valleys between peaks - keep them high for sharp mountains
                const valleyHeight = 0.3 + Math.random() * 0.2; // Valley height varies from 30% to 50%
                y = valleyHeight;
            }
            
            range.points.push({ x, y });
        }
        
        // Last point at base level
        range.points.push({ x: 1, y: 0 });
    });
}

// Draw a palm tree
function drawPalmTree(tree, baseY) {
    ctx.save();
    
    // Draw trunk with slight curve
    const trunkWidth = tree.width * 0.2;
    const trunkHeight = tree.height * 0.7;
    const controlPointX = tree.x + (trunkHeight * tree.leanDirection);
    
    ctx.beginPath();
    ctx.moveTo(tree.x - trunkWidth/2, baseY);
    ctx.quadraticCurveTo(
        controlPointX, 
        baseY - trunkHeight/2,
        tree.x + (tree.leanDirection * trunkHeight) - trunkWidth/3, 
        baseY - trunkHeight
    );
    ctx.lineTo(tree.x + (tree.leanDirection * trunkHeight) + trunkWidth/3, baseY - trunkHeight);
    ctx.quadraticCurveTo(
        controlPointX, 
        baseY - trunkHeight/2,
        tree.x + trunkWidth/2, 
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
    
    // Draw palm fronds (leaves)
    const frondBaseX = tree.x + (tree.leanDirection * trunkHeight);
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
        
        // Draw the frond
        ctx.beginPath();
        ctx.moveTo(frondBaseX, frondBaseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.lineWidth = 2;
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
            
            // Draw leaflet on both sides
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
}

// Canvas resizing
function resizeCanvas() {
    const screenArea = document.getElementById('screen-area');
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    canvas.width = screenArea.clientWidth;
    canvas.height = screenArea.clientHeight;
    
    // Regenerate stars, mountains, and palm trees when canvas size changes
    if (canvas.width !== oldWidth || canvas.height !== oldHeight) {
        stars.length = 0;
        generateStars();
        generateMountainPoints();
        generatePalmTrees();
    }
    
    if (player) {
        player.x = canvas.width * 0.2;
        player.y = canvas.height - player.height;
    }
    
    if (isGameOver && !animationId) {
        drawBackground();
        player.draw();
        drawParticles();
    }
    
    // If game hasn't started, draw the start screen
    if (!gameStarted) {
        drawStartScreen();
    }
}

// Player properties
const player = {
    x: 0, // Will be set properly after canvas is sized
    y: 0, // Will be set properly after canvas is sized
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
    
    draw() {
        // Update trail
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
        
        // Draw and update trail
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
            
            ctx.globalAlpha = opacity * 0.6;
            ctx.fillStyle = 'rgba(232, 7, 203, 0.8)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = opacity * 0.3;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Main character (retro-futuristic hover car)
        ctx.save();
        const hoverOffset = Math.sin(Date.now() * 0.005) * 3;
        
        // Draw hover glow effect
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
    
    update() {
        this.velY += this.gravity;
        this.y += this.velY;
        
        // Floor collision
        if (this.y > canvas.height - this.height) {
            this.y = canvas.height - this.height;
            this.velY = 0;
            this.isJumping = false;
            this.jumpCount = 0;
        }
    },
    
    jump() {
        if (this.jumpCount < this.maxJumps) {
            this.velY = this.jumpStrength;
            this.isJumping = true;
            
            // Play the appropriate sound based on jump count
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

// Obstacle class
class Obstacle {
    constructor(isAirObstacle, height = 50) {
        // Convert boolean to type string for backward compatibility
        this.type = isAirObstacle ? 'air' : 'ground';
        this.height = isAirObstacle ? 40 : height;
        this.width = 30;
        this.x = canvas.width;
        this.color = isAirObstacle ? '#0ff' : '#fedb3d'; // Changed ground obstacles to yellow
        this.passed = false;
        this.scored = false; // Track if points were awarded
        
        // Position based on type
        if (this.type === 'air') {
            this.y = canvas.height - this.height - 80;
        } else {
            this.y = canvas.height - this.height;
        }
        
        // Create random double obstacles occasionally during speed rush
        if (!isAirObstacle && isSpeedRush && Math.random() > 0.7) {
            this.type = 'double';
            // Double obstacle has two parts - create companion
            this.companion = {
                x: this.x,
                y: canvas.height - this.height - 80,
                width: this.width,
                height: 40,
                color: '#0ff'
            };
        }
    }
    
    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        
        if (this.type === 'air') {
            // Flying drone - more synthwave style
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height * 0.6, 5);
            ctx.fill();
            
            // Drone lights
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y + 8, 3, 0, Math.PI * 2);
            ctx.arc(this.x + this.width - 8, this.y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Grid pattern on drone
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x + 5, this.y + this.height * 0.3);
            ctx.lineTo(this.x + this.width - 5, this.y + this.height * 0.3);
            ctx.stroke();
        } else if (this.type === 'double') {
            // Ground part (yellow barrier)
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
            ctx.fill();
            
            // Tech grid pattern for ground part
            this.drawObstacleDetails(this.x, this.y, this.width, this.height);
            
            // Air part (cyan drone)
            ctx.fillStyle = this.companion.color;
            ctx.shadowColor = this.companion.color;
            ctx.beginPath();
            ctx.roundRect(this.companion.x, this.companion.y, this.companion.width, this.companion.height * 0.6, 5);
            ctx.fill();
            
            // Draw connection between obstacles (energy beam)
            const gradient = ctx.createLinearGradient(
                this.x + this.width/2, this.y,
                this.x + this.width/2, this.companion.y + this.companion.height
            );
            gradient.addColorStop(0, '#fedb3d');
            gradient.addColorStop(1, '#0ff');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.companion.x + this.companion.width/2, this.companion.y + this.companion.height * 0.6);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Drone lights for air part
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.companion.x + 8, this.companion.y + 8, 3, 0, Math.PI * 2);
            ctx.arc(this.companion.x + this.companion.width - 8, this.companion.y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Regular ground obstacle - digital barrier
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
            ctx.fill();
            
            // Tech grid pattern
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
    
    update() {
        this.x -= speed;
        
        // Update companion position for double obstacles
        if (this.type === 'double') {
            this.companion.x = this.x;
        }
    }
    
    checkCollision() {
        const playerCollision = (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
        
        // Check collision with companion obstacle for double obstacles
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

// Particle system
function createParticles(x, y, count, explode = false) {
    for (let i = 0; i < count; i++) {
        let particle = {
            x: x,
            y: y,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * (explode ? 8 : 3),
            speedY: (Math.random() - 0.5) * (explode ? 8 : 3),
            color: isSpeedRush ? `hsl(${Math.random() * 60 + 300}, 100%, 50%)` : `hsl(${Math.random() * 60 + 180}, 100%, 50%)`,
            life: 30 + Math.random() * 20
        };
        particles.push(particle);
    }
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        particles[i].x += particles[i].speedX;
        particles[i].y += particles[i].speedY;
        particles[i].life--;
        
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function drawParticles() {
    ctx.save();
    for (const p of particles) {
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Background rendering
function drawBackground() {
    // Background gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#170a5e'); // Dark purple at top
    skyGradient.addColorStop(0.5, '#4a1578'); // Mid purple
    skyGradient.addColorStop(0.8, '#e807cb'); // Pink
    skyGradient.addColorStop(1, '#000'); // Black at bottom
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw vertical lines for background texture
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
    ctx.lineWidth = 1;
    const lineSpacing = 10;
    
    for (let i = 0; i < canvas.width; i += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    
    // Draw stars (using pre-generated data)
    ctx.fillStyle = '#fff';
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        // Add subtle twinkling effect
        const twinkleOffset = Math.sin(Date.now() * 0.001 + i * 10) * star.twinkle;
        
        ctx.globalAlpha = star.opacity + twinkleOffset;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Draw sun (positioned higher in the sky)
    const sunWidth = canvas.width * 0.4;
    const sunHeight = sunWidth * 0.5;
    const sunX = canvas.width / 2 - sunWidth / 2;
    const sunY = canvas.height * 0.16; // Moved even higher (was 0.25)
    
    // Create sun gradient
    const sunGradient = ctx.createRadialGradient(
        canvas.width / 2, sunY + sunHeight / 2, 
        0,
        canvas.width / 2, sunY + sunHeight / 2, 
        sunWidth / 2
    );
    sunGradient.addColorStop(0, '#fedb3d'); // Yellow
    sunGradient.addColorStop(0.7, '#ff5f6d'); // Orange
    sunGradient.addColorStop(1, '#e807cb'); // Pink
    
    ctx.beginPath();
    ctx.arc(canvas.width / 2, sunY + sunHeight / 2, sunWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = sunGradient;
    ctx.fill();
    
    // Draw sun lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    const numLines = 7; // Fewer lines for cleaner look
    const sunLineSpacing = sunHeight / (numLines + 1);
    
    for (let i = 1; i <= numLines; i++) {
        const lineY = sunY + i * sunLineSpacing;
        ctx.fillRect(sunX, lineY, sunWidth, 3);
    }
    
    // Order the mountain ranges for proper render order (back to front)
    const orderedRanges = [...mountainRanges].sort((a, b) => a.height - b.height);
    
    // Draw angular mountains
    const mountainBaseY = canvas.height * 0.4; // Base line for mountains
    
    // Draw mountains from back to front
    orderedRanges.forEach(range => {
        const mountainWidth = canvas.width * range.width;
        const mountainHeight = canvas.height * range.height;
        const mountainX = canvas.width * range.xOffset;
        
        ctx.save();
        ctx.beginPath();
        
        // Start from bottom-left of mountain
        ctx.moveTo(mountainX, mountainBaseY);
        
        // Draw mountain outline with jagged peaks
        for (const point of range.points) {
            const x = mountainX + point.x * mountainWidth;
            const y = mountainBaseY - point.y * mountainHeight;
            ctx.lineTo(x, y);
        }
        
        // Fill with gradient
        const mountainGradient = ctx.createLinearGradient(0, mountainBaseY - mountainHeight, 0, mountainBaseY);
        mountainGradient.addColorStop(0, range.color); // Main color
        mountainGradient.addColorStop(1, '#0a043c'); // Dark blue at bottom
        ctx.fillStyle = mountainGradient;
        ctx.fill();
        
        // Draw the outline with glow
        ctx.strokeStyle = range.wireframeColor;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = range.wireframeColor;
        ctx.shadowBlur = 3;
        ctx.stroke();
        
        // Draw wireframe horizontal lines
        const wireframeLines = 4; // Number of horizontal wireframe lines
        for (let i = 1; i <= wireframeLines; i++) {
            const lineY = mountainBaseY - (mountainHeight * i / (wireframeLines + 1));
            
            ctx.beginPath();
            ctx.moveTo(mountainX, lineY);
            
            // Find intersections with the mountain silhouette
            for (let j = 1; j < range.points.length; j++) {
                const p1 = range.points[j-1];
                const p2 = range.points[j];
                
                const x1 = mountainX + p1.x * mountainWidth;
                const y1 = mountainBaseY - p1.y * mountainHeight;
                const x2 = mountainX + p2.x * mountainWidth;
                const y2 = mountainBaseY - p2.y * mountainHeight;
                
                // If line crosses the wireframe horizontal
                if ((y1 <= lineY && y2 >= lineY) || (y1 >= lineY && y2 <= lineY)) {
                    // Calculate intersection
                    const crossX = x1 + (x2 - x1) * ((lineY - y1) / (y2 - y1));
                    ctx.lineTo(crossX, lineY);
                }
            }
            
            ctx.lineTo(mountainX + mountainWidth, lineY);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            ctx.stroke();
        }
        
        ctx.restore();
    });
    
    // Draw grid (moving effect) - simplified and slowed down
    gridOffset = (gridOffset + speed * 0.2) % 40; // Slower animation
    const horizon = canvas.height * 0.4; // Align with mountains
    const gridRows = 20;
    
    // Draw palm trees silhouettes on the horizon
    palmTrees.forEach(tree => {
        drawPalmTree(tree, horizon);
    });
    
    ctx.strokeStyle = '#e807cb'; // Bright pink
    ctx.lineWidth = 1.5;
    
    // Draw horizontal grid lines with perspective
    for (let i = 0; i <= gridRows; i++) {
        const y = horizon + (canvas.height - horizon) * (i / gridRows);
        const lineOpacity = 1 - (i / gridRows) * 0.3;
        
        ctx.globalAlpha = lineOpacity;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw vertical grid lines with perspective
    const gridColumns = 20; // Fewer lines
    const vanishingPointX = canvas.width / 2;
    
    for (let i = -gridColumns; i <= gridColumns; i++) {
        // Add offset for animation (slower)
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
    
    ctx.globalAlpha = 1;
}

// Obstacle generation
function generateObstacles(timestamp) {
    if (timestamp - lastObstacleTime > obstacleInterval) {
        // Select random obstacle type with increased chance of double obstacles as score increases
        const doubleChance = Math.min(0.2, score * 0.01); // Gradually increases with score, max 20%
        const random = Math.random();
        
        let type;
        if (random < doubleChance) {
            type = 'double';
        } else if (random < 0.4 + doubleChance) {
            type = 'air';
        } else {
            type = 'ground';
        }
        
        obstacles.push(new Obstacle(type));
        lastObstacleTime = timestamp;
    }
}

// Draw start screen
function drawStartScreen() {
    // Draw the background first
    drawBackground();
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
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

// Start the game
function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        
        // Start the music
        startMusic();
        
        // Start the game loop
        gameLoop();
    }
}

// Game state management
function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    finalScore.textContent = `Your score: ${score}`;
    gameOverScreen.style.display = 'block';
    createParticles(player.x + player.width/2, player.y + player.height/2, 50, true);
    
    // Play game over sound
    playSound(gameOverSound);
    
    // Pause the music
    gameMusic.pause();
}

function resetGame() {
    score = 0;
    isGameOver = false;
    gameStarted = false;
    obstacles.length = 0;
    particles.length = 0;
    speed = 5;
    baseSpeed = 5;
    obstacleInterval = 1500;
    baseObstacleInterval = 1500;
    player.y = canvas.height - player.height;
    player.velY = 0;
    player.isJumping = false;
    player.jumpCount = 0;
    scoreDisplay.textContent = 'Score: 0';
    gameOverScreen.style.display = 'none';
    lastObstacleTime = 0;
    
    // Reset speed rush variables
    isSpeedRush = false;
    speedRushEnd = 0;
    scoreMultiplier = 1;
    nextSpeedRushScore = 50;
    difficultyLevel = 1;
    
    // Pause the music when resetting
    gameMusic.pause();
    
    // Draw the start screen instead of immediately starting
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

// Event listeners
window.addEventListener('keydown', (e) => {
    // Prevent default scrolling behavior when spacebar is pressed
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

// Initialize the game
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
generateStars();
generateMountainPoints();
generatePalmTrees();

// Draw the start screen instead of starting the game immediately
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
        const obstacleHeight = Math.random() * 20 + 20;
        const isAirObstacle = Math.random() > 0.7;
        obstacles.push(new Obstacle(isAirObstacle, obstacleHeight));
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
    if (!isSpeedRush && score > 0 && Math.floor(score / 30) > Math.floor((score - 1) / 30)) {
        increaseBaseDifficulty();
    }
}

// Speed Rush Functions
function startSpeedRush() {
    isSpeedRush = true;
    speedRushEnd = performance.now() + speedRushDuration;
    
    // Temporarily increase speed and reduce obstacle interval
    speed = baseSpeed * 1.03;
    obstacleInterval = baseObstacleInterval * 0.6;
    scoreMultiplier = 2;
    
    // Play speed up and rush sounds
    playSound(speedUpSound);
    playSound(rushSound);
    
    // Create particles for visual effect
    createParticles(canvas.width / 2, canvas.height / 2, 100, true);
    
    // Calculate next speed rush threshold
    nextSpeedRushScore += 50;
    
    // Increase difficulty level
    difficultyLevel++;
    
    console.log(`Speed Rush started! Next at score: ${nextSpeedRushScore}`);
}

function endSpeedRush() {
    isSpeedRush = false;
    
    // Return speed to normal but keep obstacle interval higher based on difficulty
    speed = baseSpeed;
    obstacleInterval = Math.max(baseObstacleInterval - (difficultyLevel * 100), 500);
    scoreMultiplier = 1;
    
    console.log("Speed Rush ended!");
}

function increaseBaseDifficulty() {
    // Make the speed increase more subtle
    if (baseSpeed < 10) {
        baseSpeed += 0.01; // Much more subtle increase
        if (!isSpeedRush) {
            speed = baseSpeed;
        }
    }
    
    // Gradually reduce base obstacle interval
    if (baseObstacleInterval > 800) {
        baseObstacleInterval -= 15; // Half the previous rate
        if (!isSpeedRush) {
            obstacleInterval = baseObstacleInterval;
        }
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