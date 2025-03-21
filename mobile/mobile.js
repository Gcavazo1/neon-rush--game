/**
 * Neon Rush - Mobile Version
 * Game adaptation for mobile devices
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const playButton = document.querySelector('.play-button');
    const gameContainer = document.querySelector('.game-fullscreen');
    const closeButton = document.querySelector('.close-game');
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    const mobileCanvas = document.getElementById('mobile-game-canvas');
    const mobileScoreDisplay = document.getElementById('mobile-score-display');
    const mobileGameOver = document.getElementById('mobile-game-over');
    const mobileFinalScore = document.getElementById('mobile-final-score');
    const mobileRestartBtn = document.getElementById('mobile-restart-btn');
    const gameLauncher = document.querySelector('.game-launcher');
    const gameIcon = document.querySelector('.game-thumbnail');
    const gameAreaContainer = document.querySelector('.game-area-container');
    
    // Animation constants
    const ANIMATION = {
        ZOOM_DURATION: 2500,  // 2.5 seconds for zoom (slower)
        FADE_DURATION: 800,   // 0.8 seconds for fade
        MAX_ZOOM: 8           // Maximum zoom factor
    };
    
    // Game variables - similar to desktop version
    let ctx;
    let gameStarted = false;
    let isGameOver = false;
    let score = 0;
    let obstacles = [];
    let particles = [];
    let lastObstacleTime = 0;
    let obstacleInterval = 1500;
    let baseObstacleInterval = 1500;
    let gridOffset = 0;
    let speed = 5;
    let baseSpeed = 5;
    let jumpCooldown = false;
    let lastJumpTime = 0;
    let lastTapTime = 0;
    let isSpeedRush = false;
    let speedRushEnd = 0;
    let scoreMultiplier = 1;
    let nextSpeedRushScore = 50;
    let difficultyLevel = 1;
    let colorTransitionProgress = 0;
    let colorTransitionDirection = 0;
    let animationInProgress = false;
    
    // Color definitions - copied from desktop version
    const normalGridColor = 'rgba(0, 255, 255, 0.7)';
    const rushGridColor = 'rgba(255, 138, 44, 0.7)';
    
    // Mobile-specific variables
    let devicePixelRatio = window.devicePixelRatio || 1;
    let frameID;
    let canvasWidth, canvasHeight;
    
    // Initialize collapsible sections
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const parent = this.parentElement;
            parent.classList.toggle('active');
        });
    });
    
    // Game launcher
    playButton.addEventListener('click', function() {
        if (animationInProgress) return;
        
        animationInProgress = true;
        
        // Start the zoom animation on the game icon
        const iconRect = gameIcon.getBoundingClientRect();
        const centerX = iconRect.left + iconRect.width / 2;
        const centerY = iconRect.top + iconRect.height / 2;
        
        // Create a cloned version of the icon for the zoom effect
        const zoomIcon = gameIcon.cloneNode(true);
        zoomIcon.style.position = 'fixed';
        zoomIcon.style.left = `${iconRect.left}px`;
        zoomIcon.style.top = `${iconRect.top}px`;
        zoomIcon.style.width = `${iconRect.width}px`;
        zoomIcon.style.height = `${iconRect.height}px`;
        zoomIcon.style.zIndex = '9999';
        zoomIcon.style.transition = `transform ${ANIMATION.ZOOM_DURATION}ms ease-in-out, opacity ${ANIMATION.FADE_DURATION}ms ease-in-out`;
        zoomIcon.style.transformOrigin = 'center center';
        zoomIcon.classList.add('zoom-clone');
        document.body.appendChild(zoomIcon);
        
        // Hide the play button
        playButton.style.opacity = '0';
        playButton.style.pointerEvents = 'none';
        
        // Fade out the background image
        gameAreaContainer.style.transition = `opacity ${ANIMATION.ZOOM_DURATION}ms ease-in-out`;
        
        // First frame to trigger transitions
        setTimeout(() => {
            zoomIcon.style.transform = `scale(${ANIMATION.MAX_ZOOM})`;
            zoomIcon.style.opacity = '0';
            gameAreaContainer.style.opacity = '0.1'; // Fade background to almost transparent but not completely
        }, 50);
        
        // When zoom animation completes
        setTimeout(() => {
            // Remove the zoomed icon
            document.body.removeChild(zoomIcon);
            
            // Display game container
            gameContainer.style.display = 'block';
            gameContainer.style.opacity = '0';
            
            // Fade in the game container
            setTimeout(() => {
                gameContainer.style.transition = `opacity ${ANIMATION.FADE_DURATION}ms ease-in-out`;
                gameContainer.style.opacity = '1';
                
                // Hide the launcher container after fade completes
                setTimeout(() => {
                    gameAreaContainer.style.visibility = 'hidden';
                    gameAreaContainer.style.opacity = '1'; // Reset opacity for when we return
                    
                    // Complete the setup
                    animationInProgress = false;
                    
                    // Try to lock screen orientation for gameplay
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(function() {
                            console.log('Orientation lock not supported');
                        });
                    }
                    
                    // Initialize game
                    initGame();
                }, ANIMATION.FADE_DURATION);
            }, 50);
        }, ANIMATION.ZOOM_DURATION);
    });
    
    // Close button for game container
    closeButton.addEventListener('click', function() {
        // Reset visibility of game launcher
        gameAreaContainer.style.visibility = 'visible';
        playButton.style.opacity = '1';
        playButton.style.pointerEvents = 'auto';
        
        // Hide the game container with fade effect
        gameContainer.style.opacity = '0';
        
        setTimeout(() => {
            gameContainer.style.display = 'none';
            
            // Clean up game resources
            cancelAnimationFrame(frameID);
            
            // Unlock screen orientation
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }, ANIMATION.FADE_DURATION);
    });
    
    // Restart button
    mobileRestartBtn.addEventListener('click', function() {
        resetGame();
        startGame();
    });
    
    // Touch controls for jumping
    mobileCanvas.addEventListener('touchstart', handleTouchStart);
    
    function handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling
        
        if (isGameOver) {
            resetGame();
            startGame();
            return;
        }
        
        if (!gameStarted) {
            startGame();
            return;
        }
        
        // Double tap detection for double jump
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            if (player.jumpCount < 2 && !jumpCooldown) {
                player.velY = -player.jumpPower * 0.8; // Slightly less powerful for second jump
                player.isJumping = true;
                player.jumpCount++;
                
                // Add jump particles
                createJumpParticles();
                
                // Set jump cooldown
                jumpCooldown = true;
                lastJumpTime = Date.now();
            }
        }
        
        lastTapTime = currentTime;
        
        // Regular jump
        if (player.jumpCount === 0 && !jumpCooldown) {
            player.velY = -player.jumpPower;
            player.isJumping = true;
            player.jumpCount++;
            
            // Add jump particles
            createJumpParticles();
            
            // Set jump cooldown
            jumpCooldown = true;
            lastJumpTime = Date.now();
        }
    }
    
    // Initialize game
    function initGame() {
        // Set up canvas
        ctx = mobileCanvas.getContext('2d');
        
        // Make sure the canvas is properly sized
        resizeCanvas();
        
        // Create player with proportions based on canvas size
        player = {
            width: canvasWidth * 0.07,
            height: canvasWidth * 0.07,
            x: canvasWidth * 0.2,
            y: canvasHeight - (canvasWidth * 0.07) - 10, // Add small gap from bottom
            velY: 0,
            isJumping: false,
            jumpPower: 15,
            jumpCount: 0,
            gravity: 0.8,
            color: '#e807cb' // Purple player color
        };
        
        // Reset game state
        resetGame();
        
        // Draw start screen
        drawStartScreen();
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
    }
    
    function handleResize() {
        // Store old dimensions to calculate ratio
        const oldWidth = canvasWidth;
        const oldHeight = canvasHeight;
        
        // Resize the canvas
        resizeCanvas();
        
        // Adjust player position after resize
        if (player) {
            const widthRatio = canvasWidth / oldWidth;
            player.width *= widthRatio;
            player.height *= widthRatio;
            player.x *= widthRatio;
            
            if (!gameStarted) {
                player.y = canvasHeight - player.height - 10; // Add small gap from bottom
            } else {
                player.y *= canvasHeight / oldHeight;
            }
        }
    }
    
    function resizeCanvas() {
        // Get container dimensions
        const containerWidth = gameContainer.clientWidth;
        const containerHeight = gameContainer.clientHeight;
        
        // Set canvas size
        mobileCanvas.width = containerWidth * devicePixelRatio;
        mobileCanvas.height = containerHeight * devicePixelRatio;
        
        // Set display size
        mobileCanvas.style.width = containerWidth + 'px';
        mobileCanvas.style.height = containerHeight + 'px';
        
        // Store canvas dimensions for later use
        canvasWidth = mobileCanvas.width;
        canvasHeight = mobileCanvas.height;
        
        // Reset the context scaling
        ctx = mobileCanvas.getContext('2d');
        ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    function startGame() {
        if (isGameOver) {
            resetGame();
        }
        
        gameStarted = true;
        isGameOver = false;
        mobileGameOver.style.display = 'none';
        
        // Make sure player is at correct starting position
        if (player) {
            player.y = canvasHeight - player.height - 10;
            player.velY = 0;
            player.isJumping = false;
            player.jumpCount = 0;
        }
        
        // Start game loop
        if (frameID) {
            cancelAnimationFrame(frameID);
        }
        frameID = requestAnimationFrame(gameLoop);
    }
    
    function gameLoop() {
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Update color transition
        updateColorTransition();
        
        // Draw background
        drawBackground();
        
        // Update and draw game elements
        updateGameState();
        drawGameElements();
        
        // Check collision
        checkCollision();
        
        // Update score display
        mobileScoreDisplay.textContent = `Score: ${score}`;
        
        // Continue game loop if not game over
        if (!isGameOver) {
            frameID = requestAnimationFrame(gameLoop);
        }
    }
    
    // Reset game state
    function resetGame() {
        // Reset game variables
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
        player.y = canvasHeight - player.height;
        player.velY = 0;
        player.isJumping = false;
        player.jumpCount = 0;
        
        // Reset UI
        mobileScoreDisplay.textContent = 'Score: 0';
        mobileGameOver.style.display = 'none';
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
        
        // Show start screen
        drawStartScreen();
    }
    
    function drawStartScreen() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw grid background
        drawGrid();
        
        // Draw player
        drawPlayer();
        
        // Draw start text
        ctx.fillStyle = '#0ff';
        ctx.font = '30px ArcadeClassic';
        ctx.textAlign = 'center';
        ctx.fillText('TAP TO START', canvasWidth / (2 * devicePixelRatio), canvasHeight / (2 * devicePixelRatio));
        ctx.fillStyle = '#e807cb';
        ctx.font = '20px ArcadeClassic';
        ctx.fillText('TAP TWICE TO DOUBLE JUMP', canvasWidth / (2 * devicePixelRatio), canvasHeight / (2 * devicePixelRatio) + 40);
    }
    
    // Update game state
    function updateGameState() {
        // Apply gravity to player
        player.velY += player.gravity;
        player.y += player.velY;
        
        // Ground collision
        if (player.y > canvasHeight - player.height) {
            player.y = canvasHeight - player.height;
            player.velY = 0;
            player.isJumping = false;
            player.jumpCount = 0;
        }
        
        // Reset jump cooldown
        if (jumpCooldown && Date.now() - lastJumpTime > 200) {
            jumpCooldown = false;
        }
        
        // Speed rush check
        if (score >= nextSpeedRushScore && !isSpeedRush) {
            // Start speed rush
            isSpeedRush = true;
            speedRushEnd = Date.now() + 5000; // 5 seconds duration
            scoreMultiplier = 2;
            
            // Increase difficulty level
            difficultyLevel++;
            
            // Set next speed rush threshold
            nextSpeedRushScore += 50;
            
            // Begin color transition
            colorTransitionDirection = 1;
            
            // Increase speed for rush mode
            baseSpeed = 5 + (difficultyLevel - 1) * 0.5;
            speed = baseSpeed * 1.5;
            
            // Decrease obstacle interval for rush mode
            baseObstacleInterval = Math.max(1500 - (difficultyLevel - 1) * 100, 800);
            obstacleInterval = baseObstacleInterval * 0.7;
        }
        
        // Check if speed rush should end
        if (isSpeedRush && Date.now() > speedRushEnd) {
            // End speed rush
            isSpeedRush = false;
            scoreMultiplier = 1;
            
            // Begin color transition back
            colorTransitionDirection = -1;
            
            // Return to normal speed
            speed = baseSpeed;
            obstacleInterval = baseObstacleInterval;
        }
        
        // Generate obstacles
        const currentTime = Date.now();
        if (currentTime - lastObstacleTime > obstacleInterval) {
            generateObstacle();
            lastObstacleTime = currentTime;
        }
        
        // Update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= speed;
            
            // Remove obstacles that have moved off screen
            if (obstacles[i].x + obstacles[i].width < 0) {
                if (!obstacles[i].passed) {
                    score += 1 * scoreMultiplier;
                    obstacles[i].passed = true;
                }
                obstacles.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].alpha -= 0.01;
            
            if (particles[i].alpha <= 0) {
                particles.splice(i, 1);
            }
        }
    }
    
    // Update color transition
    function updateColorTransition() {
        if (colorTransitionDirection > 0) {
            // Transitioning to rush mode
            colorTransitionProgress = Math.min(colorTransitionProgress + 0.02, 1);
            if (colorTransitionProgress >= 1) {
                colorTransitionDirection = 0;
            }
        } else if (colorTransitionDirection < 0) {
            // Transitioning back to normal
            colorTransitionProgress = Math.max(colorTransitionProgress - 0.02, 0);
            if (colorTransitionProgress <= 0) {
                colorTransitionDirection = 0;
            }
        }
    }
    
    // Function to interpolate between two colors
    function interpolateColor(color1, color2, factor) {
        if (factor === 0) return color1;
        if (factor === 1) return color2;
        return color1.replace(/[\d.]+/g, function(match) {
            return Math.round(parseFloat(match) * (1 - factor) + parseFloat(match) * factor);
        });
    }
    
    // Generate obstacles
    function generateObstacle() {
        const obstacleHeight = Math.random() * (canvasHeight * 0.2) + canvasHeight * 0.1;
        let yPos = canvasHeight - obstacleHeight;
        const obstacleWidth = canvasWidth * 0.05;
        
        // Determine obstacle type: ground or air
        const isAirObstacle = Math.random() > 0.7;
        
        if (isAirObstacle) {
            yPos = canvasHeight - obstacleHeight - player.height * 1.2;
        }
        
        // Create obstacle
        const obstacle = {
            x: canvasWidth,
            y: yPos,
            width: obstacleWidth,
            height: obstacleHeight,
            color: isAirObstacle ? '#e807cb' : '#fedb3d', // Purple for air, yellow for ground
            isAir: isAirObstacle,
            passed: false
        };
        
        // Determine if it's a double obstacle (more likely as score increases)
        const doubleProbability = Math.min(0.3, 0.1 + difficultyLevel * 0.03);
        if (Math.random() < doubleProbability && !isAirObstacle) {
            // Add a companion air obstacle
            obstacles.push({
                x: canvasWidth + obstacleWidth * 2,
                y: canvasHeight - obstacleHeight - player.height * 2,
                width: obstacleWidth,
                height: obstacleHeight * 0.7,
                color: '#e807cb', // Purple for air obstacle
                isAir: true,
                isCompanion: true,
                mainObstacle: obstacle,
                passed: false
            });
        }
        
        obstacles.push(obstacle);
    }
    
    // Draw game elements
    function drawGameElements() {
        // Draw player
        drawPlayer();
        
        // Draw obstacles
        obstacles.forEach(obstacle => {
            drawObstacle(obstacle);
        });
        
        // Draw particles
        drawParticles();
    }
    
    // Draw player
    function drawPlayer() {
        const glow = isSpeedRush ? '#ff8a2c' : '#0ff';
        
        // Player body
        ctx.fillStyle = player.color;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Draw helmet (yellow stripe)
        ctx.fillStyle = '#fedb3d';
        ctx.fillRect(player.x, player.y + player.height * 0.15, player.width, player.height * 0.15);
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    // Draw obstacle
    function drawObstacle(obstacle) {
        let fillColor = obstacle.color;
        let strokeColor = '#0ff';
        
        if (isSpeedRush || colorTransitionProgress > 0) {
            strokeColor = '#ff8a2c';
        }
        
        // Draw main shape
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        
        if (obstacle.isAir) {
            // Air obstacle (drone)
            const centerX = obstacle.x + obstacle.width / 2;
            const centerY = obstacle.y + obstacle.height / 2;
            
            // Drone body
            ctx.beginPath();
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height * 0.7);
            
            // Draw yellow stripe
            ctx.fillStyle = '#fedb3d';
            ctx.fillRect(obstacle.x, centerY - obstacle.height * 0.1, obstacle.width, obstacle.height * 0.2);
            
            // Glow effect
            ctx.shadowColor = fillColor;
            ctx.shadowBlur = 15;
            ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height * 0.7);
            
            // Reset shadow
            ctx.shadowBlur = 0;
            
            // Draw hover effect
            const gradientColor = isSpeedRush ? '#ff8a2c' : fillColor;
            const gradient = ctx.createRadialGradient(
                centerX, obstacle.y + obstacle.height * 0.85, 0,
                centerX, obstacle.y + obstacle.height * 0.85, obstacle.width
            );
            gradient.addColorStop(0, gradientColor);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, obstacle.y + obstacle.height * 0.85, obstacle.width, 0, Math.PI, true);
            ctx.fill();
            
            // For connected double obstacles, add energy beam
            if (obstacle.isCompanion && obstacle.mainObstacle) {
                const mainX = obstacle.mainObstacle.x + obstacle.mainObstacle.width / 2;
                const mainY = obstacle.mainObstacle.y;
                
                const gradient = ctx.createLinearGradient(centerX, centerY, mainX, mainY);
                gradient.addColorStop(0, '#fedb3d');
                gradient.addColorStop(1, fillColor);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(centerX, centerY + obstacle.height * 0.3);
                ctx.lineTo(mainX, mainY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        } else {
            // Ground obstacle
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add glow effect
            ctx.shadowColor = fillColor;
            ctx.shadowBlur = 10;
            ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Reset shadow
            ctx.shadowBlur = 0;
        }
    }
    
    // Create jump particles
    function createJumpParticles() {
        const particleCount = 10;
        const particleSize = player.width / 10;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height,
                size: Math.random() * particleSize + particleSize,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 5,
                color: '#0ff',
                alpha: 1
            });
        }
    }
    
    // Draw particles
    function drawParticles() {
        particles.forEach(particle => {
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
    
    // Draw background with grid
    function drawBackground() {
        // Fill background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw grid
        drawGrid();
    }
    
    // Draw grid effect
    function drawGrid() {
        ctx.save();
        
        // Draw perspective grid
        const horizon = canvasHeight * 0.4;
        const gridRows = 20;
        const gridColumns = 20;
        const vanishingPointX = canvasWidth / 2;
        
        // Interpolate grid color based on transition progress
        const currentGridColor = interpolateColor(normalGridColor, rushGridColor, colorTransitionProgress);
        
        // Draw horizontal grid lines with perspective
        ctx.strokeStyle = currentGridColor;
        ctx.lineWidth = 1.5;
        
        for (let i = 0; i <= gridRows; i++) {
            const y = horizon + (canvasHeight - horizon) * (i / gridRows);
            const lineOpacity = 1 - (i / gridRows) * 0.3;
            
            ctx.globalAlpha = lineOpacity;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
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
            const offsetX = (i * 40 + gridOffset) % (canvasWidth * 2) - canvasWidth;
            const normalizedI = offsetX / (canvasWidth / gridColumns / devicePixelRatio);
            
            const startX = vanishingPointX + (normalizedI * (canvasWidth / gridColumns) / 4);
            const lineOpacity = 1 - Math.min(1, Math.abs(normalizedI) / gridColumns * 0.7);
            
            ctx.globalAlpha = lineOpacity;
            ctx.beginPath();
            ctx.moveTo(startX, horizon);
            ctx.lineTo(vanishingPointX + normalizedI * (canvasWidth / gridColumns / devicePixelRatio), canvasHeight);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // Check collision
    function checkCollision() {
        if (isGameOver) return;
        
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            
            // Simple AABB collision detection
            if (
                player.x < obstacle.x + obstacle.width &&
                player.x + player.width > obstacle.x &&
                player.y < obstacle.y + obstacle.height &&
                player.y + player.height > obstacle.y
            ) {
                // Collision detected
                gameOver();
                break;
            }
        }
    }
    
    // Game over
    function gameOver() {
        isGameOver = true;
        cancelAnimationFrame(frameID);
        
        mobileGameOver.style.display = 'block';
        mobileFinalScore.textContent = `YOUR SCORE: ${score}`;
    }
}); 