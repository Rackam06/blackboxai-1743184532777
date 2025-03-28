// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 32;
const MARINE_SIZE = 24;
const SQUAD_SIZE = 4;
const ENEMY_SIZE = 20;
const ENEMY_SPEED = 1;
const BULLET_SPEED = 5;
const FIRING_RANGE = 150;
const GAME_DURATION = 180; // 3 minutes in seconds
const SPAWN_INTERVAL = 3000; // Enemy spawn interval in milliseconds
const PICKUP_SPAWN_CHANCE = 0.8; // Increased chance for pickups
const MIN_PICKUP_INTERVAL = 3000; // Decreased time between pickups
const AMMO_PICKUP_AMOUNT = 30; // Increased ammo from pickups
const INITIAL_AMMO = 50; // Starting ammo per marine
const PICKUP_TYPES = {
    HEALTH: 'health',
    AMMO: 'ammo'
};

// Game state
let canvas, ctx;
let gameLoop;
let spawnLoop;
let marines = [];
let enemies = [];
let bullets = [];
let pickups = [];
let targetPosition = { x: 0, y: 0 };
let gameStarted = false;
let gameTimer = GAME_DURATION;
let lastSpawnTime = 0;
let lastPickupTime = 0;

// Ship layout
const TILE_TYPES = {
    FLOOR: 0,
    WALL: 1,
    DOOR: 2
};

// Simple ship layout (0: floor, 1: wall, 2: door)
const shipLayout = [
    [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1]
];

class Marine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.speed = 2;
        this.health = 100;
        this.ammo = INITIAL_AMMO;
        this.size = MARINE_SIZE;
        this.glowIntensity = 1;
        this.glowDirection = 0.02;
        this.lastShotTime = 0;
        this.fireRate = 500; // milliseconds between shots
        this.rotation = 0; // Angle in radians
        // Individual movement variation
        this.speedVariation = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
        this.positionOffset = {
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 20
        };
    }

    update() {
        // Check for nearby enemies and shoot
        if (this.ammo > 0) {
            const now = Date.now();
            if (now - this.lastShotTime > this.fireRate) {
                const nearestEnemy = this.findNearestEnemy();
                if (nearestEnemy) {
                    const distance = Math.sqrt(
                        Math.pow(nearestEnemy.x - this.x, 2) + 
                        Math.pow(nearestEnemy.y - this.y, 2)
                    );
                    if (distance < FIRING_RANGE) {
                        // Update rotation to face enemy
                        this.rotation = Math.atan2(
                            nearestEnemy.y - this.y,
                            nearestEnemy.x - this.x
                        );
                        this.shoot(nearestEnemy);
                        this.lastShotTime = now;
                        this.ammo--;
                    }
                }
            }
        }

        // Move towards target position with individual variations
        const dx = (this.targetX + this.positionOffset.x) - this.x;
        const dy = (this.targetY + this.positionOffset.y) - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.speed) {
            this.x += (dx / distance) * this.speed * this.speedVariation;
            this.y += (dy / distance) * this.speed * this.speedVariation;
        }
    }

    findNearestEnemy() {
        let nearest = null;
        let minDistance = FIRING_RANGE;
        
        for (const enemy of enemies) {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + 
                Math.pow(enemy.y - this.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = enemy;
            }
        }
        return nearest;
    }

    shoot(enemy) {
        const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        bullets.push(new Bullet(
            this.x,
            this.y,
            Math.cos(angle) * BULLET_SPEED,
            Math.sin(angle) * BULLET_SPEED
        ));
    }

    draw(ctx) {
        ctx.save();
        
        // Update glow effect
        this.glowIntensity += this.glowDirection;
        if (this.glowIntensity >= 1 || this.glowIntensity <= 0.7) {
            this.glowDirection *= -1;
        }

        // Draw marine glow
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size
        );
        gradient.addColorStop(0, `rgba(0, 255, 157, ${0.2 * this.glowIntensity})`);
        gradient.addColorStop(1, 'rgba(0, 255, 157, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw marine sprite with rotation
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = '#00ff9d';
        ctx.beginPath();
        ctx.arc(0, 0, this.size/3, 0, Math.PI * 2);
        ctx.fill();
        // Draw weapon
        ctx.fillRect(this.size/3, -this.size/8, this.size/2, this.size/4);
        ctx.translate(-this.x, -this.y);
        
        // Draw health bar
        const healthBarWidth = 30;
        const healthBarHeight = 4;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - healthBarWidth/2, this.y - 20, healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#00ff9d';
        ctx.fillRect(this.x - healthBarWidth/2, this.y - 20, (this.health/100) * healthBarWidth, healthBarHeight);
        
        ctx.restore();
    }
}

class Enemy {
    constructor() {
        // Spawn from edges
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Top
                this.x = Math.random() * CANVAS_WIDTH;
                this.y = -ENEMY_SIZE;
                break;
            case 1: // Right
                this.x = CANVAS_WIDTH + ENEMY_SIZE;
                this.y = Math.random() * CANVAS_HEIGHT;
                break;
            case 2: // Bottom
                this.x = Math.random() * CANVAS_WIDTH;
                this.y = CANVAS_HEIGHT + ENEMY_SIZE;
                break;
            case 3: // Left
                this.x = -ENEMY_SIZE;
                this.y = Math.random() * CANVAS_HEIGHT;
                break;
        }
        this.health = 100;
        this.size = ENEMY_SIZE;
        this.dying = false;
        this.deathProgress = 0;
    }

    update() {
        if (this.dying) {
            this.deathProgress += 0.1;
            return this.deathProgress >= 1;
        }

        // Find nearest marine
        let nearestMarine = null;
        let minDistance = Infinity;
        for (const marine of squad.marines) {
            const distance = Math.sqrt(
                Math.pow(marine.x - this.x, 2) + 
                Math.pow(marine.y - this.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestMarine = marine;
            }
        }

        // Move towards nearest marine
        if (nearestMarine) {
            const dx = nearestMarine.x - this.x;
            const dy = nearestMarine.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > ENEMY_SPEED) {
                this.x += (dx / distance) * ENEMY_SPEED;
                this.y += (dy / distance) * ENEMY_SPEED;
            }

            // Damage marine if too close
            if (distance < MARINE_SIZE + ENEMY_SIZE) {
                nearestMarine.health -= 0.5;
            }
        }

        return false;
    }

    draw(ctx) {
        ctx.save();
        if (this.dying) {
            ctx.globalAlpha = 1 - this.deathProgress;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1 + this.deathProgress), 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw enemy body
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.size);
            ctx.lineTo(this.x + this.size, this.y);
            ctx.lineTo(this.x, this.y + this.size);
            ctx.lineTo(this.x - this.size, this.y);
            ctx.closePath();
            ctx.fill();
            
            // Draw eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x - this.size/3, this.y - this.size/3, 2, 0, Math.PI * 2);
            ctx.arc(this.x + this.size/3, this.y - this.size/3, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar
            const healthBarWidth = 30;
            const healthBarHeight = 4;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - healthBarWidth/2, this.y - 20, (this.health/100) * healthBarWidth, healthBarHeight);
        }
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Check for collisions with enemies
        for (const enemy of enemies) {
            if (!enemy.dying) {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.x, 2) + 
                    Math.pow(enemy.y - this.y, 2)
                );
                if (distance < ENEMY_SIZE) {
                    enemy.health -= 25;
                    if (enemy.health <= 0) {
                        enemy.dying = true;
                        if (Math.random() < PICKUP_SPAWN_CHANCE) {
                            spawnPickup(enemy.x, enemy.y);
                        }
                    }
                    return true;
                }
            }
        }

        // Remove if out of bounds
        return this.x < 0 || this.x > CANVAS_WIDTH || 
               this.y < 0 || this.y > CANVAS_HEIGHT;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#00ff9d';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 2
        );
        gradient.addColorStop(0, 'rgba(0, 255, 157, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 255, 157, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 10;
        this.pulsePhase = 0;
    }

    update() {
        this.pulsePhase += 0.1;
        
        // Check for marine collection
        for (const marine of squad.marines) {
            const distance = Math.sqrt(
                Math.pow(marine.x - this.x, 2) + 
                Math.pow(marine.y - this.y, 2)
            );
            if (distance < MARINE_SIZE + this.size) {
                if (this.type === PICKUP_TYPES.HEALTH) {
                    marine.health = Math.min(100, marine.health + 30);
                } else {
                    marine.ammo += AMMO_PICKUP_AMOUNT;
                }
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        const pulseSize = this.size * (1 + 0.2 * Math.sin(this.pulsePhase));
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, pulseSize * 2
        );
        const color = this.type === PICKUP_TYPES.HEALTH ? 
            'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 0, 0.3)';
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // Pickup icon
        ctx.fillStyle = this.type === PICKUP_TYPES.HEALTH ? '#ff0000' : '#ffff00';
        ctx.beginPath();
        if (this.type === PICKUP_TYPES.HEALTH) {
            // Cross shape for health
            ctx.fillRect(this.x - pulseSize/4, this.y - pulseSize, pulseSize/2, pulseSize*2);
            ctx.fillRect(this.x - pulseSize, this.y - pulseSize/4, pulseSize*2, pulseSize/2);
        } else {
            // Bullet shape for ammo
            ctx.arc(this.x, this.y, pulseSize/2, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}

class Squad {
    constructor() {
        this.marines = [];
        this.formationSpacing = 30;
        this.init();
    }

    init() {
        // Create initial squad formation
        for (let i = 0; i < SQUAD_SIZE; i++) {
            const marine = new Marine(
                CANVAS_WIDTH / 2 + (i % 2) * this.formationSpacing,
                CANVAS_HEIGHT / 2 + Math.floor(i / 2) * this.formationSpacing
            );
            this.marines.push(marine);
        }
    }

    moveToPosition(x, y) {
        // Calculate formation positions around target
        this.marines.forEach((marine, index) => {
            const angle = (index / SQUAD_SIZE) * Math.PI * 2;
            marine.targetX = x + Math.cos(angle) * this.formationSpacing;
            marine.targetY = y + Math.sin(angle) * this.formationSpacing;
        });
    }

    update() {
        this.marines.forEach(marine => marine.update());
    }

    draw(ctx) {
        this.marines.forEach(marine => marine.draw(ctx));
    }

    getSquadHealth() {
        if (this.marines.length === 0) return 0;
        const totalHealth = this.marines.reduce((sum, marine) => sum + marine.health, 0);
        return Math.round(totalHealth / SQUAD_SIZE); // Use original squad size for consistent percentage
    }

    getTotalAmmo() {
        if (this.marines.length === 0) return 0;
        return this.marines.reduce((sum, marine) => sum + marine.ammo, 0);
    }
}

// Game initialization
function initGame() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    // Initialize squad
    squad = new Squad();

    // Event listeners
    canvas.addEventListener('click', handleClick);
    document.getElementById('startButton').addEventListener('click', startGame);
}

// Game loop
function gameUpdate() {
    if (gameTimer <= 0) {
        endGame(true);
        return;
    }
    gameTimer -= 1/60; // Decrease timer (assuming 60 FPS)

    // Update squad
    squad.update();

    // Update enemies
    enemies = enemies.filter(enemy => !enemy.update());

    // Update bullets
    bullets = bullets.filter(bullet => !bullet.update());

    // Update pickups
    pickups = pickups.filter(pickup => !pickup.update());

    // Spawn enemies
    const now = Date.now();
    if (now - lastSpawnTime > SPAWN_INTERVAL) {
        enemies.push(new Enemy());
        lastSpawnTime = now;
    }

    // Remove dead marines and check for game over
    squad.marines = squad.marines.filter(marine => marine.health > 0);
    if (squad.marines.length === 0) {
        endGame(false);
        return;
    }

    updateHUD();
}

function gameDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid/tiles
    drawGrid();
    
    // Draw bullets
    bullets.forEach(bullet => bullet.draw(ctx));
    
    // Draw pickups
    pickups.forEach(pickup => pickup.draw(ctx));
    
    // Draw enemies
    enemies.forEach(enemy => enemy.draw(ctx));
    
    // Draw squad
    squad.draw(ctx);
}

function drawGrid() {
    // Draw ship layout
    for (let y = 0; y < shipLayout.length; y++) {
        for (let x = 0; x < shipLayout[y].length; x++) {
            const tileType = shipLayout[y][x];
            const tileX = x * TILE_SIZE;
            const tileY = y * TILE_SIZE;

            // Draw different tile types
            switch (tileType) {
                case TILE_TYPES.WALL:
                    ctx.fillStyle = '#2a2a2a';
                    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#3a3a3a';
                    ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                    break;
                case TILE_TYPES.DOOR:
                    ctx.fillStyle = '#4a4a4a';
                    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                    // Add door detail
                    ctx.fillStyle = '#00ff9d';
                    ctx.fillRect(tileX + TILE_SIZE/4, tileY, TILE_SIZE/2, TILE_SIZE);
                    break;
                case TILE_TYPES.FLOOR:
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                    // Add subtle floor pattern
                    ctx.strokeStyle = '#222222';
                    ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                    break;
            }
        }
    }

    // Add ambient lighting effect
    ctx.fillStyle = 'rgba(0, 255, 157, 0.03)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Event handlers
function handleClick(event) {
    if (!gameStarted) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    squad.moveToPosition(x, y);
}

function startGame() {
    gameStarted = true;
    gameTimer = GAME_DURATION;
    enemies = [];
    bullets = [];
    pickups = [];
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameHUD').classList.remove('hidden');
    
    // Start game loop
    gameLoop = setInterval(() => {
        gameUpdate();
        gameDraw();
    }, 1000 / 60);
}

function endGame(victory) {
    gameStarted = false;
    clearInterval(gameLoop);
    
    // Show game over screen
    const message = victory ? 
        'Mission Accomplished! The squad survived!' : 
        'Mission Failed! The squad was eliminated!';
    
    alert(message);
    location.reload(); // Restart game
}

function spawnPickup(x, y) {
    const now = Date.now();
    if (now - lastPickupTime > MIN_PICKUP_INTERVAL && Math.random() < PICKUP_SPAWN_CHANCE) {
        const type = Math.random() < 0.5 ? PICKUP_TYPES.HEALTH : PICKUP_TYPES.AMMO;
        pickups.push(new Pickup(x, y, type));
        lastPickupTime = now;
    }
}

// HUD updates
function updateHUD() {
    const healthElement = document.getElementById('healthValue');
    const ammoElement = document.getElementById('ammoValue');
    
    const squadHealth = squad.getSquadHealth();
    const totalAmmo = squad.getTotalAmmo();
    
    // Format timer
    const minutes = Math.floor(gameTimer / 60);
    const seconds = Math.floor(gameTimer % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update HUD elements
    healthElement.textContent = `${squadHealth}% - ${timeStr}`;
    ammoElement.textContent = totalAmmo;
    
    // Visual feedback for low health/ammo
    healthElement.classList.toggle('low-health', squadHealth < 30);
    ammoElement.classList.toggle('low-ammo', totalAmmo < 10);
}

// Initialize game when page loads
window.addEventListener('load', initGame);