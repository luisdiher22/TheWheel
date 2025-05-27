(function() { // IIFE Start

// Constants
const MIN_SPINS = 2; 
const SPIN_DURATION_MS = 3000;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const WHEEL_RADIUS = 200;
const POINTER_OFFSET_DEGREES = 90; 
const PARTICLE_AMOUNT_SMALL_WIN = 20;
const PARTICLE_AMOUNT_BIG_WIN = 50;
const PARTICLE_DURATION_MS = 3000;
const SHAKE_INTENSITY_GAME_OVER = 10; 
const SHAKE_DURATION_GAME_OVER_MS = 1000; 
const SHAKE_INTENSITY_BIG_WIN = 5;
const SHAKE_DURATION_BIG_WIN_MS = 800;
const SHAKE_INTENSITY_PLAYER_HIT = 7; 
const SHAKE_DURATION_PLAYER_HIT_MS = 400; 
const WIN_MESSAGE_DURATION_MS = 2000;
const BALANCE_UPDATE_ANIMATION_MS = 500; 
const ANTI_CLUMP_MAX_ATTEMPTS = 100; 
const BACKGROUND_MUSIC_DELAY_MS = 1000;
const WELCOME_MESSAGE_DELAY_MS = 500;
const XP_PER_SPIN = 10; 
const XP_PER_ENEMY_DEFEAT = 50;
const ENEMY_ATTACK_DELAY_MS = 1500; 

const PLAYER_MAX_HP = 100;
let playerHP = PLAYER_MAX_HP;
const ENEMY_MAX_HP = 80;
let enemyHP = ENEMY_MAX_HP;
const enemyAttackPattern = ['light', 'medium', 'light', 'heavy']; 
const enemyAttackValues = { light: 5, medium: 10, heavy: 20 };
let currentEnemyAttackIndex = 0;

const powerUpsData = [
    {
        id: 'bonusCredits', 
        name: 'Healing Potion!', 
        description: 'Heal for 25 HP.',
        applyEffect: function() {
            if (gameOver) return;
            playerHP = Math.min(PLAYER_MAX_HP, playerHP + 25);
            updatePlayerHpUI();
            showWinMessage('Healed 25 HP!');
            playSound(sounds.playerHeal); 
        }
    },
    {
        id: 'freeHit', 
        name: 'Quick Strike!', 
        description: 'Attack without an immediate enemy counter-attack!',
        applyEffect: function() {
            if (gameOver) return;
            activePowerUps.freeHitTurns += 1; 
            showWinMessage('Quick Strike Ready!'); 
            playSound(sounds.win); 
        }
    },
    {
        id: 'damageBoost', 
        name: 'Damage Boost!', 
        description: 'Your next 3 attacks deal 50% more damage.',
        applyEffect: function() {
            if (gameOver) return;
            activePowerUps.damageBoostTurns = 3; 
            showWinMessage('Damage Boost for 3 turns!'); 
            playSound(sounds.win); 
        }
    }
];

let activePowerUps = {
    damageBoostTurns: 0, 
    freeHitTurns: 0, 
};

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const resultDiv = document.getElementById("result"); 
const creditCostElement = document.getElementById("creditCost"); 
const wheelWrapper = document.getElementById("wheel-wrapper");
const winMessageElement = document.getElementById("win-message");
const particlesContainer = document.getElementById("particles-container");
const toggleSoundBtn = document.getElementById("toggleSound");
const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const xpBarFill = document.getElementById('xp-bar-fill');
const powerupModal = document.getElementById('powerup-modal');
const powerUpChoicesDiv = document.getElementById('powerup-choices'); 
const playerHpText = document.getElementById('player-hp-text');
const playerHpBarFill = document.getElementById('player-hp-bar-fill');
const enemyHpText = document.getElementById('enemy-hp-text');
const enemyHpBarFill = document.getElementById('enemy-hp-bar-fill');
const enemyImagePlaceholder = document.getElementById('enemy-image-placeholder'); 
const enemyAttackAnnouncement = document.getElementById('enemy-attack-announcement');
const gameOverModal = document.getElementById('game-over-modal');
const restartGameBtn = document.getElementById('restart-game-btn');

let gameOver = false; 
let isSpinning = false;
let soundEnabled = true;
let currentXP = 0;
let currentLevel = 1;
let xpToNextLevel;

const sounds = {
    spin: new Audio('/static/sounds/spin.mp3'),
    win: new Audio('/static/sounds/win.mp3'), 
    bigWin: new Audio('/static/sounds/big-win.mp3'), 
    lose: new Audio('/static/sounds/lose.mp3'), 
    click: new Audio('/static/sounds/click.mp3'),
    background: new Audio('/static/sounds/background.mp3'),
    playerAttack: new Audio('/static/sounds/click.mp3'), 
    playerHeal: new Audio('/static/sounds/win.mp3'), 
    enemyAttack: new Audio('/static/sounds/lose.mp3'),
    levelUp: new Audio('/static/sounds/win.mp3') 
};

Object.values(sounds).forEach(sound => { sound.volume = 0.5; });
sounds.background.loop = true; sounds.background.volume = 0.3;
for (const key in sounds) {
    sounds[key].onerror = function() {
        console.log(`Error loading sound: ${key}`);
        this.play = function() { return Promise.resolve(); };
    };
}

function distributeEvenly(frequencies) {
    frequencies = { ...frequencies }; 
    const total = Object.values(frequencies).reduce((a, b) => a + b, 0);
    const result = new Array(total);
    const keys = Object.keys(frequencies);
    for (let i = 0; i < total; i++) result[i] = "";
    let currentIndex = 0;
    for (let key of keys) {
        const count = frequencies[key];
        const step = Math.floor(total / count);
        for (let i = 0; i < count; i++) {
            result[currentIndex] = key;
            currentIndex = (currentIndex + step) % total;
        }
    }
    for (let i = 0; i < total; i++) {
        if (result[i] === "") {
            const counts = {};
            keys.forEach(key => counts[key] = 0);
            result.forEach(val => { if (val !== "") counts[val]++; });
            const minKey = keys.reduce((a, b) => (counts[a] / frequencies[a] < counts[b] / frequencies[b]) ? a : b);
            result[i] = minKey;
        }
    }
    for (let i = result.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        if (result[i] !== result[j]) [result[i], result[j]] = [result[j], result[i]];
    }
    let hasAdjacent = true;
    let maxAttempts = ANTI_CLUMP_MAX_ATTEMPTS; 
    while (hasAdjacent && maxAttempts > 0) {
        hasAdjacent = false; maxAttempts--;
        for (let i = 0; i < total; i++) {
            const next = (i + 1) % total;
            if (result[i] === result[next]) {
                hasAdjacent = true;
                for (let j = 0; j < total; j++) {
                    if (j === i || j === next || j === (i + total - 1) % total || j === (next + 1) % total) continue;
                    const jPrev = (j + total - 1) % total;
                    const jNext = (j + 1) % total;
                    if (result[jPrev] !== result[next] && result[jNext] !== result[next]) {
                        [result[next], result[j]] = [result[j], result[next]];
                        break; 
                    }
                }
            }
        }
    }
    return result;
}

 const sections = distributeEvenly({
    "$1": 24,
    "$2": 15,
    "$5": 7,
    "$10": 4,
    "$20": 2,
    "Joker": 2
});

const colors = sections.map(value => {
    switch (value) {
        case "$1":
            return "#aec6cf"; // Pastel Blue
        case "$2":
            return "#77dd77"; // Pastel Green
        case "$5":
            return "#fdfd96"; // Pastel Yellow
        case "$10":
            return "#ffb347"; // Pastel Orange
        case "$20":
            return "#ff6961"; // Pastel Red
        case "Joker":
            return "#c3aed6"; // Pastel Purple
        default:
            return "#555"; // Default fallback color
    }
});

const numSections = sections.length;
const arcSize = (2 * Math.PI) / numSections;
let angle = 0;

function drawWheel() {
    for (let i = 0; i < numSections; i++) {
        const startAngle = i * arcSize;
        const endAngle = startAngle + arcSize;
        ctx.beginPath(); ctx.moveTo(WHEEL_RADIUS, WHEEL_RADIUS);
        ctx.arc(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS, startAngle, endAngle);
        ctx.fillStyle = colors[i]; ctx.fill();
        ctx.save(); ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS);
        ctx.rotate(startAngle + arcSize / 2); ctx.textAlign = "right";
        ctx.fillStyle = "#fff"; ctx.font = "bold 16px 'Segoe UI', sans-serif";
        ctx.fillText(sections[i], WHEEL_RADIUS - 10, 10); ctx.restore();
    }
}

function drawRotatedWheel(rotation) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save(); ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS);
    ctx.rotate(rotation * Math.PI / 180); ctx.translate(-WHEEL_RADIUS, -WHEEL_RADIUS);
    drawWheel(); ctx.restore();
}

function createParticles(amount, particleColors, duration = PARTICLE_DURATION_MS) {
    if (!particlesContainer) return;
    particlesContainer.innerHTML = '';
    for (let i = 0; i < amount; i++) {
        const particle = document.createElement('div'); particle.className = 'particle';
        const size = Math.random() * 10 + 5;
        const color = particleColors[Math.floor(Math.random() * particleColors.length)];
        particle.style.width = `${size}px`; particle.style.height = `${size}px`;
        particle.style.backgroundColor = color; particle.style.boxShadow = `0 0 ${size/2}px ${color}`;
        const wheelRect = wheelWrapper.getBoundingClientRect();
        const centerX = wheelRect.left + wheelRect.width / 2; const centerY = wheelRect.top + wheelRect.height / 2;
        particle.style.position = 'absolute'; particle.style.left = `${centerX}px`; particle.style.top = `${centerY}px`;
        const pAngle = Math.random() * Math.PI * 2; const velocity = Math.random() * 5 + 2;
        const vx = Math.cos(pAngle) * velocity; const vy = Math.sin(pAngle) * velocity;
        const rotateSpeed = (Math.random() - 0.5) * 10;
        particle.animate([
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${vx * 100}px, ${vy * 100}px) rotate(${rotateSpeed * 360}deg)`, opacity: 0 }
        ], { duration: Math.random() * 1000 + duration, easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)' });
        particlesContainer.appendChild(particle);
    }
    setTimeout(() => { particlesContainer.innerHTML = ''; }, duration + 1000);
}

function shakeScreen(intensity = 5, duration = 500) {
    const body = document.body; const startTime = Date.now();
    function shake() {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            const x = (Math.random() - 0.5) * intensity; const y = (Math.random() - 0.5) * intensity;
            body.style.transform = `translate(${x}px, ${y}px)`; requestAnimationFrame(shake);
        } else { body.style.transform = ''; }
    }
    shake();
}

function showWinMessage(message, duration = WIN_MESSAGE_DURATION_MS) {
    if (!winMessageElement) return;
    winMessageElement.textContent = message;
    winMessageElement.classList.remove('hidden'); winMessageElement.classList.add('show');
    setTimeout(() => {
        winMessageElement.classList.remove('show');
        setTimeout(() => { winMessageElement.classList.add('hidden'); }, BALANCE_UPDATE_ANIMATION_MS); 
    }, duration);
}

function playSound(sound) {
    if (!soundEnabled || !sound) return Promise.resolve();
    try { sound.currentTime = 0; return sound.play(); } 
    catch (error) { console.error("Error playing sound:", error); return Promise.resolve(); }
}

function updatePlayerHpUI() {
    if (playerHpText) playerHpText.textContent = `HP: ${playerHP} / ${PLAYER_MAX_HP}`;
    if (playerHpBarFill) {
        const playerHpPercentage = (playerHP / PLAYER_MAX_HP) * 100;
        playerHpBarFill.style.width = `${Math.max(0, playerHpPercentage)}%`;
    }
}

function updateEnemyHpUI() {
    if (enemyHpText) enemyHpText.textContent = `HP: ${enemyHP} / ${ENEMY_MAX_HP}`;
    if (enemyHpBarFill) {
        const enemyHpPercentage = (enemyHP / ENEMY_MAX_HP) * 100;
        enemyHpBarFill.style.width = `${Math.max(0, enemyHpPercentage)}%`;
    }
}

function showGameOverModal() {
    if (!gameOverModal) return;
    const messageElement = gameOverModal.querySelector('#game-over-message');
    const titleElement = gameOverModal.querySelector('#game-over-title');
    if (playerHP <= 0) {
        titleElement.textContent = "Game Over!";
        messageElement.textContent = "You have been defeated!";
    } else if (enemyHP <= 0) {
        titleElement.textContent = "Victory!";
        messageElement.textContent = "Enemy vanquished! A new foe appears..."; 
    }
    gameOverModal.classList.remove('hidden');
}

function hideGameOverModal() {
    if (gameOverModal) gameOverModal.classList.add('hidden');
}

function handlePlayerDefeat() {
    gameOver = true;
    playSound(sounds.lose); 
    shakeScreen(SHAKE_INTENSITY_GAME_OVER, SHAKE_DURATION_GAME_OVER_MS);
    showGameOverModal(); 
    spinBtn.disabled = true;
}

function handleEnemyDefeated() {
    playSound(sounds.bigWin);
    createParticles(PARTICLE_AMOUNT_BIG_WIN, ['#f1c40f', '#2ecc71']); 
    showWinMessage("Enemy Defeated! Bonus XP!", 2500);
    
    currentXP += XP_PER_ENEMY_DEFEAT; 
    updateXpUI(); 
    
    enemyHP = ENEMY_MAX_HP; 
    updateEnemyHpUI();
    currentEnemyAttackIndex = 0;
    if(enemyAttackAnnouncement) enemyAttackAnnouncement.textContent = "A new challenger approaches!";
    
    checkLevelUp(); 

    if (powerupModal.classList.contains('hidden') && playerHP > 0 && !gameOver) { 
        spinBtn.disabled = false; 
    } else if (gameOver) { 
        spinBtn.disabled = true;
    }
}

function enemyAttack() { 
    if (gameOver) {
        spinBtn.disabled = true; 
        return;
    }

    const attackType = enemyAttackPattern[currentEnemyAttackIndex];
    const damageDealtByEnemy = enemyAttackValues[attackType];
    
    if(enemyAttackAnnouncement) enemyAttackAnnouncement.textContent = `Enemy prepares ${attackType} attack...`;
    
    setTimeout(() => {
        if (gameOver) return; 

        playerHP = Math.max(0, playerHP - damageDealtByEnemy);
        updatePlayerHpUI();
        playSound(sounds.enemyAttack);
        shakeScreen(SHAKE_INTENSITY_PLAYER_HIT, SHAKE_DURATION_PLAYER_HIT_MS);
        
        if(enemyAttackAnnouncement) enemyAttackAnnouncement.textContent = `Enemy used ${attackType} and dealt ${damageDealtByEnemy} damage!`;
        
        currentEnemyAttackIndex = (currentEnemyAttackIndex + 1) % enemyAttackPattern.length;

        if (playerHP <= 0) {
            handlePlayerDefeat();
        } else {
            if (!powerupModal.classList.contains('hidden')) {
                 spinBtn.disabled = true; 
            } else {
                 spinBtn.disabled = false; 
            }
        }
    }, ENEMY_ATTACK_DELAY_MS); 
}

function restartGame() {
    gameOver = false;
    playerHP = PLAYER_MAX_HP;
    enemyHP = ENEMY_MAX_HP; 
    currentLevel = 1; 
    currentXP = 0;
    xpToNextLevel = calculateXpForLevel(currentLevel);
    currentEnemyAttackIndex = 0;
    activePowerUps = { freeHitTurns: 0, damageBoostTurns: 0 };

    updatePlayerHpUI(); 
    updateEnemyHpUI(); 
    updateXpUI();
    hideGameOverModal();
    if(resultDiv) resultDiv.textContent = 'Spin the wheel to start combat!'; 
    if(enemyAttackAnnouncement) enemyAttackAnnouncement.textContent = '';
    if(winMessageElement) winMessageElement.classList.add('hidden'); 
    
    spinBtn.disabled = false;
    playSound(sounds.click); 
}

function spinWheel() {
    if (isSpinning || gameOver) return;
    isSpinning = true;
    wheelWrapper.classList.add('spinning'); spinBtn.classList.add('spinning');
    spinBtn.disabled = true; 
    if(enemyAttackAnnouncement) enemyAttackAnnouncement.textContent = ''; 
    resultDiv.textContent = ''; 

    playSound(sounds.spin); playSound(sounds.click);
    const randomExtraSpins = Math.random() * 360; 
    const totalRotation = (MIN_SPINS * 360) + randomExtraSpins; 
    const animationStartTime = performance.now();
    function animate(currentTime) {
        const elapsedTime = currentTime - animationStartTime;
        const progress = elapsedTime / SPIN_DURATION_MS;
        if (progress < 1) {
            const currentSpinAmount = easeOutCubic(progress) * totalRotation;
            angle = currentSpinAmount; drawRotatedWheel(angle); requestAnimationFrame(animate); 
        } else {
            isSpinning = false;
            wheelWrapper.classList.remove('spinning'); spinBtn.classList.remove('spinning');
            const finalAngle = (angle + POINTER_OFFSET_DEGREES) % 360;
            handleSpinResult(finalAngle); 
        }
    }
    requestAnimationFrame(animate);
}

function handleSpinResult(finalAngle) {
    if (gameOver && !isSpinning) { 
        spinBtn.disabled = true; 
        return;
    }

    const rawIndex = Math.floor((numSections - (finalAngle / 360) * numSections) % numSections);
    const selectedIndex = (rawIndex + numSections) % numSections;
    const outcomeString = sections[selectedIndex]; 

    resultDiv.className = 'updated'; 
    let damageDealt = 0;
    let message = "";
    let playerActionSound = sounds.playerAttack; 

    if (outcomeString.includes("Heal")) {
        const healAmount = parseInt(outcomeString.split(" ")[1]);
        playerHP = Math.min(PLAYER_MAX_HP, playerHP + healAmount);
        updatePlayerHpUI();
        message = `You used Heal and recovered ${healAmount} HP!`;
        playerActionSound = sounds.playerHeal; 
        createParticles(PARTICLE_AMOUNT_SMALL_WIN, ['#2ecc71', '#27ae60']); 
    } else {
        damageDealt = parseInt(outcomeString);
        if (isNaN(damageDealt)) damageDealt = 0; 

        if (damageDealt === 0) {
            message = "You missed!";
            playerActionSound = sounds.lose; 
        } else {
            let actualDamage = damageDealt;
            if (activePowerUps.damageBoostTurns > 0) {
                actualDamage = Math.round(actualDamage * 1.5);
                activePowerUps.damageBoostTurns--;
                showWinMessage(`Damage Boost! ${actualDamage} DMG! (${activePowerUps.damageBoostTurns} left)`, 1500);
            }
            
            enemyHP = Math.max(0, enemyHP - actualDamage);
            updateEnemyHpUI();
            message = `You dealt ${actualDamage} damage!`;
            
            if (actualDamage >= 30) { 
                 createParticles(PARTICLE_AMOUNT_BIG_WIN, ['#c0392b', '#e74c3c', '#f1c40f']);
                 shakeScreen(SHAKE_INTENSITY_BIG_WIN, SHAKE_DURATION_BIG_WIN_MS);
                 playerActionSound = sounds.bigWin;
            } else if (actualDamage >= 20) { 
                 createParticles(PARTICLE_AMOUNT_BIG_WIN, ['#e74c3c', '#d35400']); 
                 shakeScreen(SHAKE_INTENSITY_SMALL, SHAKE_DURATION_SMALL_MS);
            } else if (actualDamage > 0) { 
                 createParticles(PARTICLE_AMOUNT_SMALL_WIN, ['#f1c40f', '#e67e22']);
            }
        }
    }
    resultDiv.textContent = message;
    playSound(playerActionSound);

    currentXP += XP_PER_SPIN;
    updateXpUI(); 
    
    if (enemyHP <= 0) {
        handleEnemyDefeated(); 
    } else {
        checkLevelUp(); 
        if (powerupModal.classList.contains('hidden')) { 
            if (activePowerUps.freeHitTurns > 0) {
                activePowerUps.freeHitTurns--;
                showWinMessage("Quick Strike! Enemy doesn't counter.", WIN_MESSAGE_DURATION_MS);
                if (!gameOver) spinBtn.disabled = false; 
            } else {
                enemyAttack(); 
            }
        }
    }
}

function calculateXpForLevel(level) { return level * 100; }

function updateXpUI() {
    if (levelDisplay) levelDisplay.textContent = `Level: ${currentLevel}`;
    if (xpDisplay) xpDisplay.textContent = `XP: ${currentXP} / ${xpToNextLevel}`;
    if (xpBarFill) {
        const xpPercentage = xpToNextLevel > 0 ? (currentXP / xpToNextLevel) * 100 : 0;
        xpBarFill.style.width = `${Math.max(0, Math.min(100,xpPercentage))}%`;
    }
}

function checkLevelUp() {
    if (currentXP >= xpToNextLevel && !gameOver && enemyHP > 0 ) { 
        currentXP -= xpToNextLevel;
        currentLevel++;
        xpToNextLevel = calculateXpForLevel(currentLevel);
        playSound(sounds.levelUp); 
        updateXpUI(); 
        displayPowerUpChoices(); 
    } else if (currentXP >= xpToNextLevel && !gameOver && enemyHP <= 0) {
        currentXP -= xpToNextLevel;
        currentLevel++;
        xpToNextLevel = calculateXpForLevel(currentLevel);
        playSound(sounds.levelUp); 
        updateXpUI();
    }
}

function displayPowerUpChoices() {
    if (!powerupModal || !powerUpChoicesDiv) return;
    const selectedChoices = powerUpsData.slice(0, 3); 
    const choiceButtons = powerUpChoicesDiv.querySelectorAll('.powerup-choice-btn');
    choiceButtons.forEach((button, index) => {
        if (selectedChoices[index]) {
            const powerUp = selectedChoices[index];
            button.querySelector('.powerup-name').textContent = powerUp.name;
            button.querySelector('.powerup-description').textContent = powerUp.description;
            button.dataset.powerupId = powerUp.id; button.style.display = ''; 
        } else { button.style.display = 'none'; }
    });
    powerupModal.classList.remove('hidden');
    spinBtn.disabled = true; 
}

function handlePowerUpSelection(event) {
    const button = event.target.closest('.powerup-choice-btn');
    if (!button) return;
    const powerupId = button.dataset.powerupId;
    const selectedPowerUp = powerUpsData.find(p => p.id === powerupId);
    if (selectedPowerUp && selectedPowerUp.applyEffect) {
        selectedPowerUp.applyEffect();
    }
    powerupModal.classList.add('hidden');

    if (gameOver) { 
        spinBtn.disabled = true;
        return;
    }
    
    if (enemyHP > 0) { 
        if (activePowerUps.freeHitTurns > 0) { 
             showWinMessage("Quick Strike from power-up! Enemy skips turn.", WIN_MESSAGE_DURATION_MS);
             activePowerUps.freeHitTurns--; 
             if (!gameOver) spinBtn.disabled = false;
        } else {
            enemyAttack();
        }
    } else if (!gameOver) { 
         spinBtn.disabled = false;
    }
}

function easeOutCubic(t) { return (--t) * t * t + 1; }

function initGame() {
    xpToNextLevel = calculateXpForLevel(currentLevel); 
    updatePlayerHpUI(); updateEnemyHpUI(); updateXpUI(); 
    if (creditCostElement) creditCostElement.textContent = 'Spin to Attack!'; 
    if (resultDiv) resultDiv.textContent = 'Spin the wheel to start combat!';
    if (enemyAttackAnnouncement) enemyAttackAnnouncement.textContent = '';

    spinBtn.addEventListener("click", function() {
        if (gameOver) return; 
        playSound(sounds.click); spinWheel();
    });

    if (powerUpChoicesDiv) powerUpChoicesDiv.addEventListener('click', handlePowerUpSelection);
    if(restartGameBtn) restartGameBtn.addEventListener('click', restartGame);
    
    toggleSoundBtn.addEventListener("click", function() {
        soundEnabled = !soundEnabled;
        const icon = this.querySelector('i');
        if (soundEnabled) {
            icon.className = 'fas fa-volume-up'; sounds.background.play().catch(e=>console.warn("BG music autoplay prevented"));
        } else {
            icon.className = 'fas fa-volume-mute'; sounds.background.pause();
        }
        if (soundEnabled) playSound(sounds.click);
    });

    drawWheel();
    setTimeout(() => {
        if (soundEnabled) sounds.background.play().catch(e => console.warn("BG music autoplay prevented:", e));
    }, BACKGROUND_MUSIC_DELAY_MS);
    setTimeout(() => { showWinMessage("Welcome to the Arena!"); }, WELCOME_MESSAGE_DELAY_MS);
}

const particleStyle = document.createElement('style');
particleStyle.textContent = `
.particle { position: absolute; border-radius: 50%; pointer-events: none; z-index: 1000; }
`;
document.head.appendChild(particleStyle);

initGame();

})(); // IIFE End
