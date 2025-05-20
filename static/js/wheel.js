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

// Game settings
let spinCost = 10;
let credits = parseInt(balanceElement.textContent);
let gameOver = false;
let currentMultiplier = 1;
let isSpinning = false;
let soundEnabled = true;

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
    for (let i = 0; i < total; i++) {
        result[i] = "";
    }

    // First pass: distribute values evenly
    let currentIndex = 0;
    for (let key of keys) {
        const count = frequencies[key];
        const step = Math.floor(total / count);

        for (let i = 0; i < count; i++) {
            result[currentIndex] = key;
            currentIndex = (currentIndex + step) % total;
        }
    }

    // Second pass: fill any remaining empty spots
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

    // Improved anti-clump shuffle to ensure good distribution
    for (let i = result.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        // Less restrictive swap condition to allow more shuffling
        if (result[i] !== result[j]) {
            [result[i], result[j]] = [result[j], result[i]];
        }
    }

    // Final pass: specifically eliminate adjacent duplicates
    let hasAdjacent = true;
    let maxAttempts = 100; // Prevent infinite loops

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
                    // Skip adjacent positions
                    if (j === i || j === next || j === (i + total - 1) % total || j === (next + 1) % total) {
                        continue;
                    }

                    // Check if swap would create new adjacency
                    const jPrev = (j + total - 1) % total;
                    const jNext = (j + 1) % total;

                    if (result[jPrev] !== result[next] && result[jNext] !== result[next]) {
                        // Safe to swap
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
    "0": 10,
    "2": 12,
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
        ctx.moveTo(200, 200);
        ctx.arc(200, 200, 200, startAngle, endAngle);
        ctx.fillStyle = colors[i];
        ctx.fill();

        ctx.save();
        ctx.translate(200, 200);
        ctx.rotate(startAngle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px 'Segoe UI', sans-serif";
        ctx.fillText(sections[i], 190, 10);
        ctx.restore();

    }
}

function drawRotatedWheel(rotation) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-200, -200);
    drawWheel();
    ctx.restore();



}



// Particle system for celebrations
function createParticles(amount, colors, duration = 3000) {
    if (!particlesContainer) return;

    particlesContainer.innerHTML = '';

    for (let i = 0; i < amount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random position, size, and color
        const size = Math.random() * 10 + 5;
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
            body.style.transform = '';
        }
    }

    shake();
}

// Show win message
function showWinMessage(message, duration = 2000) {
    winMessageElement.textContent = message;
    winMessageElement.classList.remove('hidden');
    winMessageElement.classList.add('show');

    setTimeout(() => {
        winMessageElement.classList.remove('show');
        setTimeout(() => {
            winMessageElement.classList.add('hidden');
        }, 500);
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
    setTimeout(() => balanceElement.classList.remove('updated'), 500);

    // Update the display
    balanceElement.textContent = credits;

    // Check if game is over
    if (credits <= 0) {
        gameOver = true;
        spinBtn.disabled = true;
        resultDiv.textContent = "Game Over! You're out of credits.";
        resultDiv.classList.add("game-over");
        playSound(sounds.lose);
        shakeScreen(10, 1000);
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
    if (credits < spinCost) {
        resultDiv.textContent = "Not enough credits to spin!";
        resultDiv.classList.add('updated');
        setTimeout(() => resultDiv.classList.remove('updated'), 500);
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

    // Deduct the spin cost
    updateBalance(-spinCost);

    const randomSpin = Math.random() * 360 + 720; // Spin at least 2 full turns
    const duration = 3000; // 3 seconds
    const start = performance.now();

    function animate(time) {
        const progress = (time - start) / duration;
        if (progress < 1) {
            const currentSpin = easeOutCubic(progress) * randomSpin;
            angle = currentSpin;
            drawRotatedWheel(angle);
            requestAnimationFrame(animate);
        } else {
            // End spinning state
            isSpinning = false;
            wheelWrapper.classList.remove('spinning');
            spinBtn.classList.remove('spinning');

            const finalAngle = (angle + 90) % 360; // Offset to align with top
            const index = Math.floor((numSections - (finalAngle / 360) * numSections) % numSections);
            const selectedIndex = (index + numSections) % numSections; // Ensure non-negative
            const baseWinAmount = parseInt(sections[selectedIndex]);

            // Calculate bet multiplier (bet amount / 10)
            const betMultiplier = spinCost / 10;
            const totalWinAmount = Math.round(baseWinAmount * betMultiplier);

            // Determine win size and apply appropriate effects
            let winSize = '';
            let winMessage = '';

            if (totalWinAmount === 0) {
                // Lose
                resultDiv.textContent = `No win this time! (${baseWinAmount} × ${betMultiplier}x bet)`;
                resultDiv.className = ''; // Reset classes
                resultDiv.classList.add('updated');
                playSound(sounds.lose);
            } else if (totalWinAmount <= 25 * betMultiplier) {
                // Small win
                winSize = 'win-small';
                resultDiv.textContent = `You won: ${totalWinAmount} points (${baseWinAmount} × ${betMultiplier}x bet)`;
                playSound(sounds.win);
            } else if (totalWinAmount <= 100 * betMultiplier) {
                // Medium win
                winSize = 'win-medium';
                winMessage = 'Nice Win!';
                resultDiv.textContent = `You won: ${totalWinAmount} points (${baseWinAmount} × ${betMultiplier}x bet)`;
                playSound(sounds.win);
                createParticles(20, ['#f1c40f', '#3498db', '#e74c3c']);
            } else {
                // Big win
                winSize = 'win-large';
                winMessage = 'BIG WIN!';
                resultDiv.textContent = `You won: ${totalWinAmount} points (${baseWinAmount} × ${betMultiplier}x bet)`;
                playSound(sounds.bigWin);
                createParticles(50, ['#f1c40f', '#e74c3c', '#2ecc71', '#9b59b6']);
                shakeScreen(5, 800);
            }

            // Apply win styling
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
        }
    }

    requestAnimationFrame(animate);
}



function easeOutCubic(t) {
    return (--t) * t * t + 1;
}

// Function to update theme colors based on multiplier
function updateThemeColors(multiplier) {
    // Calculate color values based on multiplier
    // As multiplier increases, colors shift more towards red
    const redIntensity = Math.min(255, 52 + (multiplier - 1) * 20); // 52 is the base red value in #3498db
    const greenIntensity = Math.max(100, 152 - (multiplier - 1) * 10); // 152 is the base green value in #3498db
    const blueIntensity = Math.max(100, 219 - (multiplier - 1) * 15); // 219 is the base blue value in #3498db

    // Create new primary color with increased red component
    const newPrimaryColor = `rgb(${redIntensity}, ${greenIntensity}, ${blueIntensity})`;

    // Create new accent color with increased red component
    const accentRedIntensity = Math.min(255, 231 + (multiplier - 1) * 5); // 231 is the base red value in #e74c3c
    const accentGreenIntensity = Math.max(50, 76 - (multiplier - 1) * 5); // 76 is the base green value in #e74c3c
    const accentBlueIntensity = Math.max(50, 60 - (multiplier - 1) * 5); // 60 is the base blue value in #e74c3c

    const newAccentColor = `rgb(${accentRedIntensity}, ${accentGreenIntensity}, ${accentBlueIntensity})`;
    const newAccentHoverColor = `rgb(${Math.max(150, accentRedIntensity - 30)}, ${Math.max(30, accentGreenIntensity - 20)}, ${Math.max(30, accentBlueIntensity - 10)})`;

    // Update CSS variables
    document.documentElement.style.setProperty('--primary-color', newPrimaryColor);
    document.documentElement.style.setProperty('--accent-color', newAccentColor);
    document.documentElement.style.setProperty('--accent-hover', newAccentHoverColor);

    // Update background colors for higher multipliers
    if (multiplier >= 5) {
        const bgDarkness = Math.max(20, 44 - (multiplier - 5) * 3); // 44 is the base value in #2c3e50
        const uiBgDarkness = Math.max(30, 52 - (multiplier - 5) * 3); // 52 is the base value in #34495e

        document.documentElement.style.setProperty('--background-color', `rgb(${bgDarkness}, ${bgDarkness + 12}, ${bgDarkness + 24})`);
        document.documentElement.style.setProperty('--ui-background', `rgb(${uiBgDarkness}, ${uiBgDarkness + 12}, ${uiBgDarkness + 24})`);
    }
}

// Initialize the game
function initGame() {
    // Set up event listeners
    spinBtn.addEventListener("click", function() {
        playSound(sounds.click);
        spinWheel();
    });

    // Set up multiplier slider
    multiplierSlider.addEventListener("input", function() {
        currentMultiplier = parseInt(this.value);
        multiplierValue.textContent = `${currentMultiplier}x`;

        // Update spin cost
        spinCost = 10 * currentMultiplier;
        creditCostElement.textContent = `Credit cost: <span class="highlight">${spinCost}</span>`;

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

    // Start background music
    setTimeout(() => {
        if (soundEnabled) {
            sounds.background.play().catch(e => console.log("Background music autoplay prevented:", e));
        }
    }, 1000);

    // Add welcome animation
    setTimeout(() => {
        showWinMessage("Welcome to Wheel of Fortune!");
    }, 500);
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
