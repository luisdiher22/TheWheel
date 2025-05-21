(function() { // IIFE Start

// Constants
const INITIAL_CREDITS = 100;
const DEFAULT_SPIN_COST = 10;
const MIN_SPINS = 2; // Minimum full rotations for the wheel
const SPIN_DURATION_MS = 3000;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const WHEEL_RADIUS = 200;
const POINTER_OFFSET_DEGREES = 90; // Offset to align the pointer at the top
const PARTICLE_AMOUNT_SMALL_WIN = 20;
const PARTICLE_AMOUNT_BIG_WIN = 50;
const PARTICLE_DURATION_MS = 3000;
const SHAKE_INTENSITY_SMALL = 5;
const SHAKE_DURATION_SMALL_MS = 500;
const SHAKE_INTENSITY_GAME_OVER = 10;
const SHAKE_DURATION_GAME_OVER_MS = 1000;
const SHAKE_INTENSITY_BIG_WIN = 5;
const SHAKE_DURATION_BIG_WIN_MS = 800;
const WIN_MESSAGE_DURATION_MS = 2000;
const BALANCE_UPDATE_ANIMATION_MS = 500;
const ANTI_CLUMP_MAX_ATTEMPTS = 100; // For distributeEvenly function
const THEME_COLOR_PRIMARY_RED_BASE = 52;
const THEME_COLOR_PRIMARY_RED_MULTIPLIER_EFFECT = 20;
const THEME_COLOR_PRIMARY_GREEN_BASE = 152;
const THEME_COLOR_PRIMARY_GREEN_MULTIPLIER_EFFECT = 10;
const THEME_COLOR_PRIMARY_BLUE_BASE = 219;
const THEME_COLOR_PRIMARY_BLUE_MULTIPLIER_EFFECT = 15;
const THEME_COLOR_ACCENT_RED_BASE = 231;
const THEME_COLOR_ACCENT_RED_MULTIPLIER_EFFECT = 5;
const THEME_COLOR_ACCENT_GREEN_BASE = 76;
const THEME_COLOR_ACCENT_GREEN_MULTIPLIER_EFFECT = 5;
const THEME_COLOR_ACCENT_BLUE_BASE = 60;
const THEME_COLOR_ACCENT_BLUE_MULTIPLIER_EFFECT = 5;
const THEME_COLOR_ACCENT_HOVER_RED_DECREASE = 30;
const THEME_COLOR_ACCENT_HOVER_GREEN_DECREASE = 20;
const THEME_COLOR_ACCENT_HOVER_BLUE_DECREASE = 10;
const THEME_COLOR_BACKGROUND_DARKNESS_BASE = 44;
const THEME_COLOR_BACKGROUND_DARKNESS_MULTIPLIER_EFFECT = 3;
const THEME_COLOR_UI_BACKGROUND_DARKNESS_BASE = 52;
const THEME_COLOR_UI_BACKGROUND_DARKNESS_MULTIPLIER_EFFECT = 3;
const BACKGROUND_MUSIC_DELAY_MS = 1000;
const WELCOME_MESSAGE_DELAY_MS = 500;
const XP_PER_SPIN = 10;

// Power-up Definitions
const powerUpsData = [
    {
        id: 'bonusCredits',
        name: 'Credit Stash!',
        description: 'Instantly gain 50 credits.',
        applyEffect: function() {
            updateBalance(50);
            showWinMessage('Gained 50 Credits!');
            playSound(sounds.bigWin); // Use a positive sound
        }
    },
    {
        id: 'freeSpin',
        name: 'Free Spin',
        description: 'Your next spin is free!',
        applyEffect: function() {
            activePowerUps.freeSpins += 1;
            showWinMessage('Next Spin is Free!');
            playSound(sounds.win); // Use a positive sound
        }
    },
    {
        id: 'costHalved',
        name: 'Spin Sale!',
        description: 'Your next 3 spins cost 50% less.',
        applyEffect: function() {
            activePowerUps.costHalvedSpins = 3;
            showWinMessage('Next 3 Spins 50% Off!');
            playSound(sounds.win); // Use a positive sound
        }
    }
];

let activePowerUps = {
    freeSpins: 0,
    costHalvedSpins: 0
};


const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const resultDiv = document.getElementById("result");
const balanceElement = document.getElementById("balance");
const spinHistoryElement = document.getElementById("spinHistory");
const multiplierSlider = document.getElementById("multiplierSlider");
const multiplierValue = document.querySelector(".multiplier-value");
const creditCostElement = document.getElementById("creditCost");
const wheelWrapper = document.getElementById("wheel-wrapper");
const winMessageElement = document.getElementById("win-message");
const particlesContainer = document.getElementById("particles-container");
const toggleSoundBtn = document.getElementById("toggleSound");
const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const xpBarFill = document.getElementById('xp-bar-fill');
const powerupModal = document.getElementById('powerup-modal');
const powerUpChoicesDiv = document.getElementById('powerup-choices'); // Assuming this is the container for buttons

// Game settings
let spinCost = DEFAULT_SPIN_COST; // This is the base cost from multiplier
let credits = INITIAL_CREDITS; // Initialize with constant
let gameOver = false;
let currentMultiplier = 1;
let isSpinning = false;
let soundEnabled = true;
let currentXP = 0;
let currentLevel = 1;
// Forward declaration for calculateXpForLevel, will be defined soon
let xpToNextLevel;


// Sound effects
const sounds = {
    spin: new Audio('/static/sounds/spin.mp3'),
    win: new Audio('/static/sounds/win.mp3'),
    bigWin: new Audio('/static/sounds/big-win.mp3'),
    lose: new Audio('/static/sounds/lose.mp3'),
    click: new Audio('/static/sounds/click.mp3'),
    background: new Audio('/static/sounds/background.mp3')
};

// Initialize sound properties
Object.values(sounds).forEach(sound => {
    sound.volume = 0.5;
});
sounds.background.loop = true;
sounds.background.volume = 0.3;

// Fallback for browsers that don't support audio
for (const key in sounds) {
    sounds[key].onerror = function() {
        console.log(`Error loading sound: ${key}`);
        // Create a dummy play method to avoid errors
        this.play = function() { return Promise.resolve(); };
    };
}


function distributeEvenly(frequencies) {
    frequencies = { ...frequencies }; // <- clone so original stays intact
    const total = Object.values(frequencies).reduce((a, b) => a + b, 0);
    const result = new Array(total);
    const keys = Object.keys(frequencies);

    // Initialize all positions to ensure no undefined values
    // This prevents holes in the distribution if logic below has issues.
    for (let i = 0; i < total; i++) {
        result[i] = "";
    }

    // First pass: Distribute values as evenly as possible.
    // The goal is to place items such that they are spread out,
    // using a step based on the total items and the frequency of each specific item.
    let currentIndex = 0;
    for (let key of keys) {
        const count = frequencies[key];
        const step = Math.floor(total / count);

        for (let i = 0; i < count; i++) {
            result[currentIndex] = key;
            currentIndex = (currentIndex + step) % total;
        }
    }

    // Second pass: Fill any remaining empty spots.
    // This handles cases where the first pass might leave gaps due to rounding.
    // It tries to fill gaps with the most "underrepresented" item at that point.
    for (let i = 0; i < total; i++) {
        if (result[i] === "") {
            // Find the most underrepresented value
            const counts = {};
            keys.forEach(key => counts[key] = 0);

            result.forEach(val => {
                if (val !== "") counts[val]++;
            });

            const minKey = keys.reduce((a, b) =>
                (counts[a] / frequencies[a] < counts[b] / frequencies[b]) ? a : b
            );

            result[i] = minKey;
        }
    }

    // Third pass: Shuffle the array to further randomize distribution.
    // This helps break up any patterns that might have emerged from the deterministic placement.
    // Uses a Fisher-Yates-like shuffle, but with a condition to avoid swapping identical elements
    // if they happen to be picked (though less restrictive now).
    for (let i = result.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        // Less restrictive swap condition to allow more shuffling
        if (result[i] !== result[j]) {
            [result[i], result[j]] = [result[j], result[i]];
        }
    }

    // Final pass: Anti-clumping mechanism.
    // Specifically targets and tries to eliminate adjacent duplicate values.
    // Iteratively checks for and swaps adjacent duplicates with other non-adjacent, non-duplicate-creating values.
    let hasAdjacent = true;
    let maxAttempts = ANTI_CLUMP_MAX_ATTEMPTS; // Prevent infinite loops

    while (hasAdjacent && maxAttempts > 0) {
        hasAdjacent = false;
        maxAttempts--;

        // Check for adjacent duplicates
        for (let i = 0; i < total; i++) {
            const next = (i + 1) % total;
            if (result[i] === result[next]) {
                hasAdjacent = true;

                // Find a non-adjacent position to swap with
                for (let j = 0; j < total; j++) {
                    // Skip adjacent positions (itself, its direct neighbors)
                    if (j === i || j === next || j === (i + total - 1) % total || j === (next + 1) % total) {
                        continue;
                    }

                    // Check if swapping result[next] with result[j] would create new adjacencies for result[next]
                    // at its new position j.
                    const jPrev = (j + total - 1) % total;
                    const jNext = (j + 1) % total;

                    if (result[jPrev] !== result[next] && result[jNext] !== result[next]) {
                        // Safe to swap: result[next] (the duplicate) is swapped with result[j]
                        [result[next], result[j]] = [result[j], result[next]];
                        break; // Break from inner loop to re-evaluate from the start of the outer loop
                    }
                }
            }
        }
    }

    return result;
}
 const sections = distributeEvenly({
    "0": 10, // Number of "0" sections
    "2": 12, // Number of "2" sections
    "5": 8,
    "10": 5,
    "25": 3,
    "50": 2,
    "100": 1,
    "500": 1
});

const colors = sections.map(number => {
    switch (number) {
        case "0": return "#505050";    // Dark Gray
        case "2": return "#6d6d6d";    // Medium Gray
        case "5": return "#4a6fa5";    // Muted Blue
        case "10": return "#5b8a72";   // Muted Green
        case "25": return "#c19a6b";   // Muted Gold
        case "50": return "#8e7b9c";   // Muted Lavender
        case "100": return "#a15c5c";  // Muted Red
        case "500": return "#9c7a54";  // Muted Bronze
        default: return "#555";        // fallback for unexpected values
    }
});


const numSections = sections.length;
const arcSize = (2 * Math.PI) / numSections;

let angle = 0;





function drawWheel() {
    for (let i = 0; i < numSections; i++) {
        const startAngle = i * arcSize;
        const endAngle = startAngle + arcSize;

        ctx.beginPath();
        ctx.moveTo(WHEEL_RADIUS, WHEEL_RADIUS); // Center X, Center Y
        ctx.arc(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS, startAngle, endAngle); // Center X, Center Y, Radius
        ctx.fillStyle = colors[i];
        ctx.fill();

        ctx.save();
        ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS); // Center X, Center Y
        ctx.rotate(startAngle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px 'Segoe UI', sans-serif";
        ctx.fillText(sections[i], WHEEL_RADIUS - 10, 10); // Position text near edge of segment
        ctx.restore();

    }
}

function drawRotatedWheel(rotation) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS); // Center X, Center Y
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-WHEEL_RADIUS, -WHEEL_RADIUS); // Center X, Center Y
    drawWheel();
    ctx.restore();



}



// Particle system for celebrations
function createParticles(amount, colors, duration = PARTICLE_DURATION_MS) {
    if (!particlesContainer) return;

    particlesContainer.innerHTML = '';

    for (let i = 0; i < amount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random position, size, and color
        const size = Math.random() * 10 + 5; // Particle size between 5px and 15px
        const color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = color;
        particle.style.boxShadow = `0 0 ${size/2}px ${color}`;

        // Position near the wheel
        const wheelRect = wheelWrapper.getBoundingClientRect();
        const centerX = wheelRect.left + wheelRect.width / 2;
        const centerY = wheelRect.top + wheelRect.height / 2;

        particle.style.position = 'absolute';
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;

        // Animation properties
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 2;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        const rotateSpeed = (Math.random() - 0.5) * 10;

        // Animate the particle
        particle.animate([
            { 
                transform: 'translate(0, 0) rotate(0deg)', 
                opacity: 1 
            },
            { 
                transform: `translate(${vx * 100}px, ${vy * 100}px) rotate(${rotateSpeed * 360}deg)`, 
                opacity: 0 
            }
        ], {
            duration: Math.random() * 1000 + duration,
            easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
        });

        particlesContainer.appendChild(particle);
    }

    // Clean up particles after animation
    setTimeout(() => {
        particlesContainer.innerHTML = '';
    }, duration + 1000);
}

// Screen shake effect
function shakeScreen(intensity = 5, duration = 500) {
    const body = document.body;
    const startTime = Date.now();

    function shake() {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            const x = (Math.random() - 0.5) * intensity;
            const y = (Math.random() - 0.5) * intensity;
            body.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shake);
        } else {
            body.style.transform = ''; // Reset transform
        }
    }

    shake();
}

// Show win message
function showWinMessage(message, duration = WIN_MESSAGE_DURATION_MS) {
    winMessageElement.textContent = message;
    winMessageElement.classList.remove('hidden');
    winMessageElement.classList.add('show');

    setTimeout(() => {
        winMessageElement.classList.remove('show');
        setTimeout(() => {
            winMessageElement.classList.add('hidden');
        }, BALANCE_UPDATE_ANIMATION_MS); // Use constant for consistency
    }, duration);
}

// Play sound with error handling
function playSound(sound) {
    if (!soundEnabled) return Promise.resolve();

    try {
        // Reset the sound to the beginning
        sound.currentTime = 0;
        return sound.play();
    } catch (error) {
        console.error("Error playing sound:", error);
        return Promise.resolve();
    }
}

function updateBalance(amount) {
    const oldCredits = credits;
    credits += amount;

    // Animate the balance change
    balanceElement.classList.add('updated');
    setTimeout(() => balanceElement.classList.remove('updated'), BALANCE_UPDATE_ANIMATION_MS);

    // Update the display
    balanceElement.textContent = credits;

    // Check if game is over
    if (credits <= 0) {
        gameOver = true;
        spinBtn.disabled = true;
        resultDiv.textContent = "Game Over! You're out of credits.";
        resultDiv.classList.add("game-over");
        playSound(sounds.lose);
        shakeScreen(SHAKE_INTENSITY_GAME_OVER, SHAKE_DURATION_GAME_OVER_MS);
    }
}

function addToHistory(baseResult, totalWinAmount, betMultiplier) {
    // Create a new history entry
    const historyEntry = document.createElement("p");
    historyEntry.textContent = `Spin result: ${totalWinAmount} points (${baseResult} × ${betMultiplier}x bet)`;

    // Add class based on win/lose
    if (totalWinAmount > 0) {
        historyEntry.classList.add('win-entry');
    } else {
        historyEntry.classList.add('lose-entry');
    }

    // If this is the first real entry, clear the placeholder
    if (spinHistoryElement.querySelector("p").textContent === "No spins yet. Start playing!") {
        spinHistoryElement.innerHTML = "";
    }

    // Add the new entry at the top
    spinHistoryElement.insertBefore(historyEntry, spinHistoryElement.firstChild);
}

function spinWheel() {
    // Check if already spinning
    if (isSpinning) return;

    // Check if player has enough credits
    // Check if already spinning
    if (isSpinning) return;

    let actualSpinCost = spinCost; // Base cost for this spin, potentially modified by power-ups
    let isFreeSpin = false;

    if (activePowerUps.freeSpins > 0) {
        activePowerUps.freeSpins--;
        isFreeSpin = true;
        actualSpinCost = 0;
        showWinMessage("Free Spin Used!", 1500); // Shorter message
        // Consider updating a UI element that shows activePowerUps.freeSpins count
    } else if (activePowerUps.costHalvedSpins > 0) {
        activePowerUps.costHalvedSpins--;
        actualSpinCost = spinCost / 2;
        showWinMessage("Half Price Spin Used!", 1500); // Shorter message
         // Consider updating a UI element that shows activePowerUps.costHalvedSpins count
    }

    // Check if player has enough credits for the actualSpinCost
    if (credits < actualSpinCost && !isFreeSpin) { // Free spins don't care about credit check
        resultDiv.textContent = "Not enough credits to spin!";
        resultDiv.classList.add('updated');
        setTimeout(() => resultDiv.classList.remove('updated'), BALANCE_UPDATE_ANIMATION_MS);
        playSound(sounds.lose);
        return;
    }

    // Set spinning state
    isSpinning = true;
    wheelWrapper.classList.add('spinning');
    spinBtn.classList.add('spinning');

    // Play spin sound
    playSound(sounds.spin);
    playSound(sounds.click);

    // Deduct the actual spin cost (could be 0 for free spin)
    if (!isFreeSpin) { // Only deduct if not a free spin
        updateBalance(-actualSpinCost);
    }


    // Calculate a random amount of rotation.
    // Ensures at least MIN_SPINS full turns plus a random portion of another turn.
    const randomExtraSpins = Math.random() * 360; // Random angle for the final position
    const totalRotation = (MIN_SPINS * 360) + randomExtraSpins; // Total degrees to spin
    const animationStartTime = performance.now();

    function animate(currentTime) {
        const elapsedTime = currentTime - animationStartTime;
        const progress = elapsedTime / SPIN_DURATION_MS;

        if (progress < 1) {
            // Apply easing function to make the spin smooth (starts fast, slows down)
            const currentSpinAmount = easeOutCubic(progress) * totalRotation;
            angle = currentSpinAmount; // Update the global angle
            drawRotatedWheel(angle); // Redraw the wheel at the new angle
            requestAnimationFrame(animate); // Continue animation
        } else {
            // --- Spin Finished ---
            isSpinning = false;
            wheelWrapper.classList.remove('spinning');
            spinBtn.classList.remove('spinning');

            // Calculate the final resting position of the wheel.
            // The angle is taken modulo 360 to get the final orientation.
            // POINTER_OFFSET_DEGREES is added to align the "winning" segment with a visual pointer (e.g., at the top).
            const finalAngle = (angle + POINTER_OFFSET_DEGREES) % 360;
            handleSpinResult(finalAngle);
        }
    }

    requestAnimationFrame(animate);
}

// Helper function to process the outcome of the spin
function handleSpinResult(finalAngle) {
    // Determine the winning section index.
    // The wheel is divided into `numSections`. Each section has an `arcSize`.
    // `finalAngle / 360` gives the proportion of the circle rotated.
    // Multiplying by `numSections` gives a raw index.
    // `numSections - ...` is used because the wheel spins clockwise, but sections might be indexed counter-clockwise or from a different reference.
    // The result is taken modulo `numSections` and adjusted to ensure it's a non-negative integer.
    const rawIndex = Math.floor((numSections - (finalAngle / 360) * numSections) % numSections);
    const selectedIndex = (rawIndex + numSections) % numSections; // Ensures non-negative index

    const baseWinAmount = parseInt(sections[selectedIndex]);

    // Calculate the actual win amount based on the current bet multiplier.
    // The spinCost is derived from DEFAULT_SPIN_COST * currentMultiplier.
    const betMultiplier = spinCost / DEFAULT_SPIN_COST;
    const totalWinAmount = Math.round(baseWinAmount * betMultiplier);

    // --- Determine win size and apply appropriate effects ---
    let winSize = ''; // CSS class for styling the result text
    let winMessage = ''; // Special message for larger wins

    if (totalWinAmount === 0) {
        // --- Lose Scenario ---
        resultDiv.textContent = `No win this time! (${baseWinAmount} × ${betMultiplier}x bet)`;
        resultDiv.className = ''; // Reset classes
        resultDiv.classList.add('updated'); // For animation
        playSound(sounds.lose);
    } else if (totalWinAmount <= 25 * betMultiplier) { // Threshold for small win
        // --- Small Win Scenario ---
        winSize = 'win-small';
        resultDiv.textContent = `You won: ${totalWinAmount} points (${baseWinAmount} × ${betMultiplier}x bet)`;
        playSound(sounds.win);
    } else if (totalWinAmount <= 100 * betMultiplier) { // Threshold for medium win
        // --- Medium Win Scenario ---
        winSize = 'win-medium';
        winMessage = 'Nice Win!';
        resultDiv.textContent = `You won: ${totalWinAmount} points (${baseWinAmount} × ${betMultiplier}x bet)`;
        playSound(sounds.win);
        createParticles(PARTICLE_AMOUNT_SMALL_WIN, ['#f1c40f', '#3498db', '#e74c3c']); // Yellow, Blue, Red particles
    } else {
        // --- Big Win Scenario ---
        winSize = 'win-large';
        winMessage = 'BIG WIN!';
        resultDiv.textContent = `You won: ${totalWinAmount} points (${baseWinAmount} × ${betMultiplier}x bet)`;
        playSound(sounds.bigWin);
        createParticles(PARTICLE_AMOUNT_BIG_WIN, ['#f1c40f', '#e74c3c', '#2ecc71', '#9b59b6']); // Yellow, Red, Green, Purple particles
        shakeScreen(SHAKE_INTENSITY_BIG_WIN, SHAKE_DURATION_BIG_WIN_MS);
    }

    // Apply win styling if there was a win
    if (winSize) {
        resultDiv.className = ''; // Reset classes
        resultDiv.classList.add(winSize);
        resultDiv.classList.add('updated');
    }

    // Show win message if applicable
    if (winMessage) {
        showWinMessage(winMessage);
    }

    // Add the winnings to the player's balance
    updateBalance(totalWinAmount);

    // Add to history
    addToHistory(sections[selectedIndex], totalWinAmount, betMultiplier);

    // Award XP
    currentXP += XP_PER_SPIN;
    checkLevelUp();
    updateXpUI();
}

// Calculate XP needed for a given level
function calculateXpForLevel(level) {
    return level * 100;
}

// Update XP and Level UI elements
function updateXpUI() {
    if (levelDisplay) levelDisplay.textContent = `Level: ${currentLevel}`;
    if (xpDisplay) xpDisplay.textContent = `XP: ${currentXP} / ${xpToNextLevel}`;
    if (xpBarFill) {
        const xpPercentage = (currentXP / xpToNextLevel) * 100;
        xpBarFill.style.width = `${xpPercentage}%`;
        // Optional: add text inside the bar
        // xpBarFill.textContent = `${Math.round(xpPercentage)}%`;
    }
}

// Check for level up
function checkLevelUp() {
    while (currentXP >= xpToNextLevel) {
        currentXP -= xpToNextLevel;
        currentLevel++;
        xpToNextLevel = calculateXpForLevel(currentLevel);
        displayPowerUpChoices(); // Show modal instead of console.log
        // Potentially play a level-up sound or show a quick animation here if desired later.
        // If we level up, we immediately update UI and check again in case of multiple level ups
        updateXpUI(); // Update UI to reflect new level and XP requirement before next loop iteration
    }
}

// Display power-up choices in the modal
function displayPowerUpChoices() {
    if (!powerupModal || !powerUpChoicesDiv) return;

    // For now, select the first 3 power-ups.
    // Future: Implement random selection of 3 unique power-ups if powerUpsData.length > 3
    const selectedChoices = powerUpsData.slice(0, 3);

    const choiceButtons = powerUpChoicesDiv.querySelectorAll('.powerup-choice-btn');

    choiceButtons.forEach((button, index) => {
        if (selectedChoices[index]) {
            const powerUp = selectedChoices[index];
            button.querySelector('.powerup-name').textContent = powerUp.name;
            button.querySelector('.powerup-description').textContent = powerUp.description;
            button.dataset.powerupId = powerUp.id;
            button.style.display = ''; // Make sure button is visible
        } else {
            button.style.display = 'none'; // Hide button if not enough power-ups
        }
    });

    powerupModal.classList.remove('hidden');
}

// Handle click on a power-up choice button
function handlePowerUpSelection(event) {
    const button = event.target.closest('.powerup-choice-btn');
    if (!button) return;

    const powerupId = button.dataset.powerupId;
    const selectedPowerUp = powerUpsData.find(p => p.id === powerupId);

    if (selectedPowerUp && selectedPowerUp.applyEffect) {
        selectedPowerUp.applyEffect();
    }

    powerupModal.classList.add('hidden');
    // Optional: Add a small delay or animation before hiding
    // setTimeout(() => powerupModal.classList.add('hidden'), 300);
}


function easeOutCubic(t) {
    return (--t) * t * t + 1;
}

// Function to update theme colors based on multiplier
function updateThemeColors(multiplier) {
    // Calculate color values based on multiplier
    // As multiplier increases, colors shift more towards red
    const redIntensity = Math.min(255, THEME_COLOR_PRIMARY_RED_BASE + (multiplier - 1) * THEME_COLOR_PRIMARY_RED_MULTIPLIER_EFFECT);
    const greenIntensity = Math.max(100, THEME_COLOR_PRIMARY_GREEN_BASE - (multiplier - 1) * THEME_COLOR_PRIMARY_GREEN_MULTIPLIER_EFFECT);
    const blueIntensity = Math.max(100, THEME_COLOR_PRIMARY_BLUE_BASE - (multiplier - 1) * THEME_COLOR_PRIMARY_BLUE_MULTIPLIER_EFFECT);

    // Create new primary color with increased red component
    const newPrimaryColor = `rgb(${redIntensity}, ${greenIntensity}, ${blueIntensity})`;

    // Create new accent color with increased red component
    const accentRedIntensity = Math.min(255, THEME_COLOR_ACCENT_RED_BASE + (multiplier - 1) * THEME_COLOR_ACCENT_RED_MULTIPLIER_EFFECT);
    const accentGreenIntensity = Math.max(50, THEME_COLOR_ACCENT_GREEN_BASE - (multiplier - 1) * THEME_COLOR_ACCENT_GREEN_MULTIPLIER_EFFECT);
    const accentBlueIntensity = Math.max(50, THEME_COLOR_ACCENT_BLUE_BASE - (multiplier - 1) * THEME_COLOR_ACCENT_BLUE_MULTIPLIER_EFFECT);

    const newAccentColor = `rgb(${accentRedIntensity}, ${accentGreenIntensity}, ${accentBlueIntensity})`;
    const newAccentHoverColor = `rgb(${Math.max(150, accentRedIntensity - THEME_COLOR_ACCENT_HOVER_RED_DECREASE)}, ${Math.max(30, accentGreenIntensity - THEME_COLOR_ACCENT_HOVER_GREEN_DECREASE)}, ${Math.max(30, accentBlueIntensity - THEME_COLOR_ACCENT_HOVER_BLUE_DECREASE)})`;

    // Update CSS variables
    document.documentElement.style.setProperty('--primary-color', newPrimaryColor);
    document.documentElement.style.setProperty('--accent-color', newAccentColor);
    document.documentElement.style.setProperty('--accent-hover', newAccentHoverColor);

    // Update background colors for higher multipliers
    if (multiplier >= 5) { // Start changing background at 5x multiplier
        const bgDarkness = Math.max(20, THEME_COLOR_BACKGROUND_DARKNESS_BASE - (multiplier - 5) * THEME_COLOR_BACKGROUND_DARKNESS_MULTIPLIER_EFFECT);
        const uiBgDarkness = Math.max(30, THEME_COLOR_UI_BACKGROUND_DARKNESS_BASE - (multiplier - 5) * THEME_COLOR_UI_BACKGROUND_DARKNESS_MULTIPLIER_EFFECT);

        document.documentElement.style.setProperty('--background-color', `rgb(${bgDarkness}, ${bgDarkness + 12}, ${bgDarkness + 24})`);
        document.documentElement.style.setProperty('--ui-background', `rgb(${uiBgDarkness}, ${uiBgDarkness + 12}, ${uiBgDarkness + 24})`);
    }
}

// Initialize the game
function initGame() {
    xpToNextLevel = calculateXpForLevel(currentLevel); // Initialize here after function is defined
    // Set up event listeners
    spinBtn.addEventListener("click", function() {
        playSound(sounds.click);
        spinWheel();
    });

    if (powerUpChoicesDiv) {
        powerUpChoicesDiv.addEventListener('click', handlePowerUpSelection);
    }

    // Set up multiplier slider
    multiplierSlider.addEventListener("input", function() {
        currentMultiplier = parseInt(this.value);
        multiplierValue.textContent = `${currentMultiplier}x`;

        // Update spin cost
        spinCost = DEFAULT_SPIN_COST * currentMultiplier;
        creditCostElement.innerHTML = `Credit cost: <span class="highlight">${spinCost}</span>`; // Use innerHTML for span

        // Update theme colors based on multiplier
        updateThemeColors(currentMultiplier);

        // Play click sound
        playSound(sounds.click);
    });

    // Set up sound toggle
    toggleSoundBtn.addEventListener("click", function() {
        soundEnabled = !soundEnabled;

        // Update icon
        const icon = this.querySelector('i');
        if (soundEnabled) {
            icon.className = 'fas fa-volume-up';
            sounds.background.play();
        } else {
            icon.className = 'fas fa-volume-mute';
            sounds.background.pause();
        }

        // Play click sound (if sound is now enabled)
        if (soundEnabled) {
            playSound(sounds.click);
        }
    });

    // Initial values
    creditCostElement.innerHTML = `Credit cost: <span class="highlight">${spinCost}</span>`;

    // Initial render
    drawWheel();
    updateXpUI(); // Initial XP UI setup

    // Start background music after a short delay
    setTimeout(() => {
        if (soundEnabled) {
            sounds.background.play().catch(e => console.log("Background music autoplay prevented:", e));
        }
    }, BACKGROUND_MUSIC_DELAY_MS);

    // Add welcome animation message
    setTimeout(() => {
        showWinMessage("Welcome to Wheel of Fortune!");
    }, WELCOME_MESSAGE_DELAY_MS);
}

// Add CSS for particles
const particleStyle = document.createElement('style');
particleStyle.textContent = `
.particle {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 1000;
}
`;
document.head.appendChild(particleStyle);

initGame();

})(); // IIFE End
