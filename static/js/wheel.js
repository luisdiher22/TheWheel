(function() { // IIFE Start

// Constants for wheel drawing (if visual wheel is kept for simulation)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const WHEEL_RADIUS = 200;
// const POINTER_OFFSET_DEGREES = 90; // May not be needed if spin is purely visual or not interactive

// DOM Elements
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
// const wheelWrapper = document.getElementById("wheel-wrapper"); // Keep if visual effects on wrapper are desired

// Simulation Mode DOM Elements (assuming these are still in index.html)
const monteCarloSection = document.getElementById('monte-carlo-section');
const simRepetitionsInput = document.getElementById('simRepetitions');
const runSimBtn = document.getElementById('runSimBtn');
const simResultsDisplay = document.getElementById('simulation-results-display');
const simP1BetType = document.getElementById('simP1BetType');
const simP1BetAmount = document.getElementById('simP1BetAmount');
const simP2BetType = document.getElementById('simP2BetType');
const simP2BetAmount = document.getElementById('simP2BetAmount');
const simP3BetType = document.getElementById('simP3BetType');
const simP3BetAmount = document.getElementById('simP3BetAmount');

// Wheel sectors, colors, and derived constants will be defined in initApp
// after ensuring SIM_SECTORES is available.
let sections = [];
let colors = [];
let numSections = 0;
let arcSize = 0;

function drawWheel() {
    if (!ctx || numSections === 0) return; // Ensure canvas context and sections are available
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear canvas before drawing
    for (let i = 0; i < numSections; i++) {
        const startAngle = i * arcSize;
        const endAngle = startAngle + arcSize;
        ctx.beginPath();
        ctx.moveTo(WHEEL_RADIUS, WHEEL_RADIUS);
        ctx.arc(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS, startAngle, endAngle);
        ctx.fillStyle = colors[i]; // Use the dynamically generated colors array
        ctx.fill();

        ctx.save();
        ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS);
        ctx.rotate(startAngle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px 'Segoe UI', sans-serif";
        const sectionText = sections[i] === "Joker" ? "Comodín" : sections[i]; // Use the dynamic sections array
        ctx.fillText(sectionText, WHEEL_RADIUS - 10, 10);
        ctx.restore();
    }
}

let currentWheelAngle = 0; // Keep track of the wheel's visual angle

function drawRotatedWheel(rotation) {
   if (!ctx || numSections === 0) return; // Ensure canvas context and sections are available
   ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
   ctx.save();
   ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS);
   ctx.rotate(rotation * Math.PI / 180); // Convert degrees to radians
   ctx.translate(-WHEEL_RADIUS, -WHEEL_RADIUS);
   drawWheel();
   ctx.restore();
}

function easeOutCubic(t) { return (--t) * t * t + 1; }

function animateVisualSpin(duration = 3000) {
    const totalRotation = (2 * 360) + (Math.random() * 360); // Example: 2 to 3 full spins
    const animationStartTime = performance.now();

    function spinStep(currentTime) {
        const elapsedTime = currentTime - animationStartTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easedProgress = easeOutCubic(progress);

        currentWheelAngle = easedProgress * totalRotation;
        drawRotatedWheel(currentWheelAngle);

        if (progress < 1) {
            requestAnimationFrame(spinStep);
        } else {
            // Optionally, ensure it stops at a clean angle or the final random angle.
            // currentWheelAngle = totalRotation;
            // drawRotatedWheel(currentWheelAngle);
        }
    }
    requestAnimationFrame(spinStep);
}


function initApp() {
    // Initialize sections and related variables from SIM_SECTORES
    if (typeof SIM_SECTORES !== 'undefined' && Array.isArray(SIM_SECTORES)) {
        sections = [...SIM_SECTORES]; // Use a copy of SIM_SECTORES
        numSections = sections.length;
        arcSize = (2 * Math.PI) / numSections;
        colors = sections.map(value => { // Regenerate colors based on SIM_SECTORES
            switch (value) {
                case "$1": return "#aec6cf"; // Pastel Blue
                case "$2": return "#77dd77"; // Pastel Green
                case "$5": return "#fdfd96"; // Pastel Yellow
                case "$10": return "#ffb347"; // Pastel Orange
                case "$20": return "#ff6961"; // Pastel Red
                case "Joker": return "#c3aed6"; // Pastel Purple
                default: return "#555";
            }
        });
    } else {
        console.error("SIM_SECTORES is not defined or not an array. Wheel cannot be initialized.");
        // Optionally, provide default fallback sections or display an error on the canvas
        sections = ["Error"];
        numSections = 1;
        arcSize = 2 * Math.PI;
        colors = ["#FF0000"]; // Red color for error
    }

    drawWheel(); // Initial drawing of the wheel

    if (runSimBtn) {
        runSimBtn.addEventListener('click', () => {
            const repetitions = parseInt(simRepetitionsInput.value);
            if (isNaN(repetitions) || repetitions <= 0) {
                simResultsDisplay.innerHTML = "<p style='color: red;'>Por favor, introduce un número válido de repeticiones.</p>";
                return;
            }

            const simPlayers = [];
            // Player 1
            if (simP1BetType.value && simP1BetAmount.value) {
                const p1Amount = parseInt(simP1BetAmount.value);
                if (p1Amount > 0) {
                    simPlayers.push({ nombre: "Jugador Simulado 1", apuesta_a: simP1BetType.value, monto: p1Amount });
                } else if (p1Amount <= 0 && simP1BetType.value !== "$1") { // Allow $1 default for type if amount is invalid
                     simResultsDisplay.innerHTML = `<p style='color: red;'>Monto de apuesta inválido para Jugador Simulado 1.</p>`;
                     return;
                }
            }
            // Player 2
            if (simP2BetType.value && simP2BetAmount.value) {
                const p2Amount = parseInt(simP2BetAmount.value);
                if (p2Amount > 0) {
                    simPlayers.push({ nombre: "Jugador Simulado 2", apuesta_a: simP2BetType.value, monto: p2Amount });
                } else if (p2Amount <= 0 && simP2BetType.value !== "$1") {
                     simResultsDisplay.innerHTML = `<p style='color: red;'>Monto de apuesta inválido para Jugador Simulado 2.</p>`;
                     return;
                }
            }
            // Player 3
            if (simP3BetType.value && simP3BetAmount.value) {
                const p3Amount = parseInt(simP3BetAmount.value);
                if (p3Amount > 0) {
                    simPlayers.push({ nombre: "Jugador Simulado 3", apuesta_a: simP3BetType.value, monto: p3Amount });
                } else if (p3Amount <= 0 && simP3BetType.value !== "$1") {
                     simResultsDisplay.innerHTML = `<p style='color: red;'>Monto de apuesta inválido para Jugador Simulado 3.</p>`;
                     return;
                }
            }
            
            if (simPlayers.length === 0) {
                simResultsDisplay.innerHTML = "<p style='color: orange;'>No se han configurado apuestas para la simulación.</p>";
                return;
            }

            const animationDuration = 3000; // Duration of the spin animation in ms
            animateVisualSpin(animationDuration);

            // runMonteCarloSimulation is globally available from montecarlo.js
            // Ensure montecarlo.js is loaded before this script in index.html
            try {
                const results = runMonteCarloSimulation(repetitions, simPlayers);

                // Display results after a delay to allow animation to be seen
                setTimeout(() => {
                    let resultsHTML = "<h4>Resultados de la Simulación (" + repetitions + " repeticiones):</h4>";
                    for (const playerName in results) {
                        resultsHTML += `<p>${playerName}: Ganancia/Pérdida Promedio por Giro = ${results[playerName].toFixed(2)}</p>`;
                    }
                    simResultsDisplay.innerHTML = resultsHTML;
                }, animationDuration);

            } catch (error) {
                console.error("Error during Monte Carlo Simulation:", error);
                simResultsDisplay.innerHTML = "<p style='color: red;'>Ocurrió un error durante la simulación. Ver consola.</p>";
            }
        });
    } else {
        console.error("Boton de simulación (runSimBtn) no encontrado.");
    }

    // Ensure Monte Carlo section is visible (already handled by index.html change, but good for robustness)
    if (monteCarloSection) {
        // monteCarloSection.style.display = 'block'; // Not strictly needed if CSS/HTML handles it
    } else {
        console.error("Sección de Monte Carlo (monteCarloSection) no encontrada.");
    }
}

// Ensure the DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', initApp);

})(); // IIFE End
