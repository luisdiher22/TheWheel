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
// const XP_PER_SPIN = 10; // Removed
// const XP_PER_ENEMY_DEFEAT = 50; // Removed
// const ENEMY_ATTACK_DELAY_MS = 1500; // Removed

// Betting and Player Constants
const PAYOUT_RATIOS = {
    "$1": 1,
    "$2": 2,
    "$5": 5,
    "$10": 10,
    "$20": 20,
    "Joker": 40
};
const MIN_BET = 1;
const MAX_BET = 100;
const INITIAL_PLAYER_BALANCE = 100;
const MAX_PLAYERS = 7;
const BET_OUTCOMES = ["$1", "$2", "$5", "$10", "$20", "Joker"]; // Matches wheel sections

// Global game state variables
let players = []; // Array to store player objects
let nextPlayerId = 1;
let isSpinning = false;
let soundEnabled = true;

// DOM Elements
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const resultDiv = document.getElementById("result"); 
const wheelWrapper = document.getElementById("wheel-wrapper");
const winMessageElement = document.getElementById("win-message");
const particlesContainer = document.getElementById("particles-container");
const toggleSoundBtn = document.getElementById("toggleSound");

// New DOM Element References for Betting UI
const playersContainer = document.getElementById('players-container');
const addPlayerBtn = document.getElementById('add-player-btn');
const playerCountSpan = document.getElementById('player-count');
// const minBetDisplay = document.getElementById('min-bet'); // Optional
// const maxBetDisplay = document.getElementById('max-bet'); // Optional

function createPlayerHTML(player) {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-section';
    playerDiv.dataset.playerId = player.id;

    let betOptionsHTML = '';
    BET_OUTCOMES.forEach(outcome => {
        const payoutRatio = getPayoutRatio(outcome); // Helper function to get ratio text
        const displayOutcome = outcome === "Joker" ? "Comodín" : outcome;
        betOptionsHTML += `
            <div class="bet-option">
                <label for="p${player.id}-bet-${outcome.replace('$', '')}">${displayOutcome} (${payoutRatio})</label>
                <input type="number" id="p${player.id}-bet-${outcome.replace('$', '')}" 
                       class="bet-input" data-outcome="${outcome}" min="0" max="${MAX_BET}" placeholder="0">
            </div>
        `;
    });

    // Note: "Remove" button text is in index.html. If it were dynamic here, it would be "Eliminar".
    playerDiv.innerHTML = `
        <h3>Jugador ${player.id} <button class="remove-player-btn" data-player-id="${player.id}">Eliminar</button></h3>
        <p>Saldo: $<span class="player-balance" id="balance-p${player.id}">${player.balance}</span></p>
        <h4>Colocar Apuestas:</h4>
        <div class="betting-options">
            ${betOptionsHTML}
        </div>
        <p>Apuesta Total: $<span class="total-player-bet" id="total-bet-p${player.id}">0</span></p>
    `;
    return playerDiv;
}

function getPayoutRatio(outcome) {
   switch (outcome) {
       case "$1": return "1:1";
       case "$2": return "2:1";
       case "$5": return "5:1";
       case "$10": return "10:1";
       case "$20": return "20:1";
       case "Joker": return "40:1";
       default: return "N/A";
   }
}

function addPlayer() {
    if (players.length >= MAX_PLAYERS) {
        showWinMessage(`Máximo de ${MAX_PLAYERS} jugadores alcanzado.`, 2000);
        return;
    }
    const newPlayer = {
        id: nextPlayerId++,
        name: `Jugador ${nextPlayerId -1}`,
        balance: INITIAL_PLAYER_BALANCE,
        bets: {} 
    };
    players.push(newPlayer);
    const playerElement = createPlayerHTML(newPlayer);
    playersContainer.appendChild(playerElement);
    updatePlayerCount();
    attachBetInputListeners(playerElement, newPlayer.id);
    
    playerElement.querySelector('.remove-player-btn').addEventListener('click', function() {
        removePlayer(newPlayer.id);
    });
    playSound(sounds.click);
}

function removePlayer(playerIdToRemove) {
    players = players.filter(p => p.id !== playerIdToRemove);
    const playerElement = playersContainer.querySelector(`.player-section[data-player-id="${playerIdToRemove}"]`);
    if (playerElement) {
        playersContainer.removeChild(playerElement);
    }
    updatePlayerCount();
    validateAllBetsAndToggleButton(); 
    playSound(sounds.click);
}

function updatePlayerCount() {
    if(playerCountSpan) playerCountSpan.textContent = players.length; // Added null check
    validateAllBetsAndToggleButton(); 
}

function attachBetInputListeners(playerElement, playerId) {
    const betInputs = playerElement.querySelectorAll('.bet-input');
    betInputs.forEach(input => {
        input.addEventListener('input', () => {
            handleBetInputChange(playerId, input.dataset.outcome, parseInt(input.value) || 0, input);
        });
        input.addEventListener('change', () => { 
            handleBetInputChange(playerId, input.dataset.outcome, parseInt(input.value) || 0, input);
        });
    });
}

function handleBetInputChange(playerId, outcome, amount, inputElement) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    if (amount < 0) {
       amount = 0;
       if(inputElement) inputElement.value = amount;
    }
    if (amount > MAX_BET) {
        amount = MAX_BET;
        if(inputElement) inputElement.value = MAX_BET; 
        showWinMessage(`La apuesta máxima por resultado es ${MAX_BET}.`, 1500);
    }
    
    player.bets[outcome] = amount;
    updatePlayerTotalBet(playerId);
    validateAllBetsAndToggleButton(); 
}

function updatePlayerTotalBet(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const totalBetDisplay = document.getElementById(`total-bet-p${playerId}`);
    let totalBet = 0;
    for (const outcomeKey in player.bets) { 
        totalBet += player.bets[outcomeKey];
    }
    if (totalBetDisplay) totalBetDisplay.textContent = totalBet;
    return totalBet; 
}

function updatePlayerBalanceDisplay(playerId, newBalance) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    player.balance = newBalance; 
    const balanceDisplay = document.getElementById(`balance-p${playerId}`);
    if (balanceDisplay) balanceDisplay.textContent = newBalance;
}

function validateAllBetsAndToggleButton() {
    if (!spinBtn) return;
    if (players.length === 0) {
        spinBtn.disabled = true;
        return;
    }

    let allPlayersHaveValidIndividualBets = true;
    let atLeastOnePlayerHasPlacedAnyBet = false;

    for (const player of players) {
        let currentPlayerTotalBet = 0;
        for (const outcomeKey in player.bets) {
             currentPlayerTotalBet += player.bets[outcomeKey];
        }

        if (currentPlayerTotalBet > player.balance) {
            allPlayersHaveValidIndividualBets = false;
        }
        if (currentPlayerTotalBet > 0) {
            atLeastOnePlayerHasPlacedAnyBet = true;
        }
    }

    if (allPlayersHaveValidIndividualBets && atLeastOnePlayerHasPlacedAnyBet) {
        spinBtn.disabled = isSpinning; 
    } else {
        spinBtn.disabled = true;
    }
}

const sounds = {
    spin: new Audio('/static/sounds/spin.mp3'),
    win: new Audio('/static/sounds/win.mp3'), 
    bigWin: new Audio('/static/sounds/big-win.mp3'), 
    lose: new Audio('/static/sounds/lose.mp3'), 
    click: new Audio('/static/sounds/click.mp3'),
    background: new Audio('/static/sounds/background.mp3'),
    // playerAttack: new Audio('/static/sounds/click.mp3'), // Removed
    // playerHeal: new Audio('/static/sounds/win.mp3'),  // Removed
    // enemyAttack: new Audio('/static/sounds/lose.mp3'), // Removed
    // levelUp: new Audio('/static/sounds/win.mp3')  // Removed
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
        const sectionText = sections[i] === "Joker" ? "Comodín" : sections[i];
        ctx.fillText(sectionText, WHEEL_RADIUS - 10, 10); ctx.restore();
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

// Removed updatePlayerHpUI
// Removed updateEnemyHpUI
// Removed showGameOverModal
// Removed hideGameOverModal
// Removed handlePlayerDefeat
// Removed handleEnemyDefeated
// Removed enemyAttack
// Removed restartGame (will be re-added with different logic)

function spinWheel() {
    if (isSpinning || (spinBtn && spinBtn.disabled)) return; 
    
    isSpinning = true; 
    if(wheelWrapper) wheelWrapper.classList.add('spinning'); 
    if(spinBtn) spinBtn.classList.add('spinning');

    document.querySelectorAll('.bet-input').forEach(input => input.disabled = true);
    document.querySelectorAll('.remove-player-btn').forEach(btn => btn.disabled = true);
    if (addPlayerBtn) addPlayerBtn.disabled = true;
    
    if(sounds.spin) playSound(sounds.spin); 
    
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
            const finalAngle = (angle + POINTER_OFFSET_DEGREES) % 360;
            handleSpinResult(finalAngle); 
        }
    }
    requestAnimationFrame(animate);
}

function handleSpinResult(finalAngle) {
    isSpinning = false; 
    if(wheelWrapper) wheelWrapper.classList.remove('spinning'); 
    if(spinBtn) spinBtn.classList.remove('spinning');

    const rawIndex = Math.floor((numSections - (finalAngle / 360) * numSections) % numSections);
    const selectedIndex = (rawIndex + numSections) % numSections; 
    const outcomeString = sections[selectedIndex];
    const displayedOutcome = outcomeString === "Joker" ? "Comodín" : outcomeString;

    if(resultDiv) {
        resultDiv.className = 'updated'; 
        resultDiv.textContent = `Cayó en: ${displayedOutcome}`; 
    }
    if(sounds.win) playSound(sounds.win);

    let overallWin = false;
    let bigWinOccurred = false;

    players.forEach(player => {
        let totalPlayerBet = 0;
        for (const betOutcome in player.bets) {
            totalPlayerBet += player.bets[betOutcome] || 0;
        }

        // Subtract total bet from balance
        player.balance -= totalPlayerBet;

        let playerWinnings = 0;
        // Check if the player bet on the winning outcome
        if (player.bets[outcomeString] && player.bets[outcomeString] > 0) {
            const betAmountOnWinningOutcome = player.bets[outcomeString];
            const payoutRatio = PAYOUT_RATIOS[outcomeString];
            playerWinnings = betAmountOnWinningOutcome * payoutRatio;
            player.balance += playerWinnings;
            overallWin = true; // At least one player won something

            if (playerWinnings > betAmountOnWinningOutcome * 10) { // Arbitrary definition of a "big win"
                bigWinOccurred = true;
            }
            // Visual feedback for the winning player
            const playerSection = document.querySelector(`.player-section[data-player-id="${player.id}"]`);
            if (playerSection) {
                playerSection.classList.add('player-hit');
                shakeScreen(SHAKE_INTENSITY_PLAYER_HIT, SHAKE_DURATION_PLAYER_HIT_MS);
                setTimeout(() => playerSection.classList.remove('player-hit'), SHAKE_DURATION_PLAYER_HIT_MS + 100);
            }
        }
        updatePlayerBalanceDisplay(player.id, player.balance);
    });

    if (bigWinOccurred) {
        showWinMessage(`¡${displayedOutcome}! ¡Gran Victoria!`, WIN_MESSAGE_DURATION_MS * 1.5);
        if(sounds.bigWin) playSound(sounds.bigWin);
        createParticles(PARTICLE_AMOUNT_BIG_WIN, [colors[selectedIndex]], PARTICLE_DURATION_MS * 1.5);
        shakeScreen(SHAKE_INTENSITY_BIG_WIN, SHAKE_DURATION_BIG_WIN_MS);
    } else if (overallWin) {
        showWinMessage(`¡${displayedOutcome}! ¡Ganador!`, WIN_MESSAGE_DURATION_MS);
        if(sounds.win) playSound(sounds.win); // Play win sound again, maybe a different one for general win
        createParticles(PARTICLE_AMOUNT_SMALL_WIN, [colors[selectedIndex]]);
    } else {
        showWinMessage(`${displayedOutcome}. ¡Mejor suerte la próxima vez!`, WIN_MESSAGE_DURATION_MS);
        if(sounds.lose) playSound(sounds.lose);
    }
    
    // Re-enable controls:
    document.querySelectorAll('.bet-input').forEach(input => input.disabled = false);
    document.querySelectorAll('.remove-player-btn').forEach(btn => btn.disabled = false);
    if (addPlayerBtn) addPlayerBtn.disabled = false;
    
    validateAllBetsAndToggleButton(); 
}

// Removed calculateXpForLevel
// Removed updateXpUI
// Removed checkLevelUp
// Removed displayPowerUpChoices
// Removed handlePowerUpSelection

function easeOutCubic(t) { return (--t) * t * t + 1; }

function initGame() {
    // xpToNextLevel = calculateXpForLevel(currentLevel); // Removed
    // updatePlayerHpUI(); updateEnemyHpUI(); updateXpUI(); // Removed
    // if (creditCostElement) creditCostElement.textContent = 'Spin to Attack!'; // Removed
    if (resultDiv) resultDiv.textContent = '¡Gira la rueda!'; // Simplified message
    // if (enemyAttackAnnouncement) enemyAttackAnnouncement.textContent = ''; // Removed

    if (addPlayerBtn) { // Added null check
       addPlayerBtn.addEventListener('click', addPlayer);
    }
    
    // Add 2 players by default
    addPlayer(); // Creates Player 1
    addPlayer(); // Creates Player 2
    
    // updatePlayerCount(); // updatePlayerCount is called within addPlayer, which calls validateAllBetsAndToggleButton
    // validateAllBetsAndToggleButton(); // This is also called by updatePlayerCount via addPlayer

    drawWheel();
    if (spinBtn) { // Ensure spinBtn exists before adding listener
        spinBtn.addEventListener("click", function() {
            playSound(sounds.click); spinWheel();
        });
    }

    if (toggleSoundBtn) { // Added null check
        toggleSoundBtn.addEventListener("click", function() {
            soundEnabled = !soundEnabled;
            const icon = this.querySelector('i');
            if (soundEnabled) {
                icon.className = 'fas fa-volume-up'; 
                if(sounds.background) sounds.background.play().catch(e=>console.warn("BG music autoplay prevented"));
            } else {
                icon.className = 'fas fa-volume-mute'; 
                if(sounds.background) sounds.background.pause();
            }
            if (soundEnabled && sounds.click) playSound(sounds.click);
        });
    }
    setTimeout(() => { 
       if (soundEnabled && sounds.background) {
           sounds.background.play().catch(e => console.warn("BG music autoplay prevented:", e));
       }
    }, BACKGROUND_MUSIC_DELAY_MS);
    setTimeout(() => { 
        if(winMessageElement) showWinMessage("¡Añade hasta 7 jugadores y coloca tus apuestas!"); 
    }, WELCOME_MESSAGE_DELAY_MS);
}

const particleStyle = document.createElement('style');
particleStyle.textContent = `
.particle { position: absolute; border-radius: 50%; pointer-events: none; z-index: 1000; }
`;
document.head.appendChild(particleStyle);

initGame();

})(); // IIFE End
