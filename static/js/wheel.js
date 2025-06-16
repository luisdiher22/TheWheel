(function() { // IIFE Start

let capitalEvolutionChart = null; // To hold the chart instance
let finalCapitalHistogramChart = null; // To hold the histogram chart instance

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
                // Assuming simPlayers are already validated and created
                // The runMonteCarloSimulation function now expects initialCapital to be part of player objects if desired
                // For now, this example will proceed without adding initialCapital here,
                // relying on defaults in montecarlo.js, or assuming it's not critical for this display part.
                // To be complete, one might add initialCapital inputs in the HTML and pass them here.
                const simPlayersWithPotentialCapital = simPlayers.map(p => ({
                     ...p,
                    // example: initialCapital: parseInt(document.getElementById(`simP${p.nombre.slice(-1)}Capital`).value) || 1000
                    // For now, we omit this and let montecarlo.js handle defaults if needed by its logic.
                }));


                const results = runMonteCarloSimulation(repetitions, simPlayersWithPotentialCapital);
                const totalSpins = results.spinOutcomes.length;

                // Display results after a delay to allow animation to be seen
                setTimeout(() => {
                    // Display average gain/loss
                    let resultsHTML = `<h4>Resultados de la Simulación (${repetitions} repeticiones, ${totalSpins} giros totales):</h4>`;
                    if (results.averageGainLoss) {
                        for (const playerName in results.averageGainLoss) {
                            resultsHTML += `<p>${playerName}: Ganancia/Pérdida Promedio por Repetición = ${results.averageGainLoss[playerName].toFixed(2)}</p>`;
                        }
                    } else {
                        resultsHTML += "<p>No se calcularon ganancias promedio.</p>";
                    }
                    simResultsDisplay.innerHTML = resultsHTML;

                    // Display sector frequencies
                    if (results.sectorFrequencies) {
                        displaySectorFrequencies(results.sectorFrequencies, totalSpins);
                    }

                    // Display capital evolution chart
                    if (results.capitalEvolution && results.spins_per_repetition) {
                        // Check if there's any player data to display
                        const playerNames = Object.keys(results.capitalEvolution);
                        if (playerNames.length > 0 && results.capitalEvolution[playerNames[0]].length > 0) {
                             displayCapitalEvolutionChart(results.capitalEvolution, results.spins_per_repetition);
                        } else {
                            // Handle case with no capital evolution data (e.g., clear previous chart or show message)
                            if (capitalEvolutionChart) {
                                capitalEvolutionChart.destroy();
                                capitalEvolutionChart = null;
                            }
                             // Optionally: document.getElementById('capital-evolution-chart-container').innerHTML += "<p>No capital evolution data to display for the first repetition.</p>";
                        }
                    }

                    // Display player statistics
                    if (results.playerStats) {
                        displayPlayerStatistics(results.playerStats);
                    }

                    // Display final capital histogram
                    if (results.finalCapitals) {
                        displayFinalCapitalHistogram(results.finalCapitals);
                    }

                    // Display bankroll simulation results
                    if (results.bankruptcies) {
                        const totalRepetitions = parseInt(simRepetitionsInput.value); // Get total repetitions from input
                        displayBankrollSimulationResults(results.bankruptcies, totalRepetitions);
                    }

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


function displaySectorFrequencies(sectorFrequencies, totalSpins) {
    const displayDiv = document.getElementById('sector-probabilities-display');
    if (!displayDiv) {
        console.error("Elemento 'sector-probabilities-display' no encontrado.");
        return;
    }

    let contentHTML = "<h5>Frecuencias de Sectores:</h5>";
    if (totalSpins === 0) {
        contentHTML += "<p>No se realizaron giros.</p>";
        displayDiv.innerHTML = contentHTML;
        return;
    }

    // Use SIM_SECTORES (globally available from montecarlo.js) to get all unique sector names
    // This ensures all defined sectors are listed, even if their frequency is 0.
    const uniqueSectors = [...new Set(SIM_SECTORES)]; // Relies on SIM_SECTORES being globally available

    contentHTML += "<table><thead><tr><th>Sector</th><th>Conteos</th><th>Porcentaje</th></tr></thead><tbody>";

    uniqueSectors.sort((a, b) => { // Optional: sort sectors for consistent display
        if (a === "Joker") return 1; // Joker last
        if (b === "Joker") return -1;
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
    });

    for (const sectorName of uniqueSectors) {
        const count = sectorFrequencies[sectorName] || 0;
        const percentage = (count / totalSpins * 100).toFixed(2);
        const displayName = sectorName === "Joker" ? "Comodín" : sectorName;
        contentHTML += `<tr><td>${displayName}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    }

    contentHTML += "</tbody></table>";
    displayDiv.innerHTML = contentHTML;
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 200); // Avoid very light colors for better visibility
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgb(${r},${g},${b})`;
}

function displayCapitalEvolutionChart(capitalEvolutionData, spinsPerRepetition) {
    const container = document.getElementById('capital-evolution-chart-container');
    if (!container) {
        console.error("Container 'capital-evolution-chart-container' not found.");
        return;
    }
    const chartCanvas = container.querySelector('canvas'); // Get canvas within container
    const noDataMessage = container.querySelector('.no-data-message');

    if (!chartCanvas || !noDataMessage) {
        console.error("Canvas element or no-data-message not found within 'capital-evolution-chart-container'.");
        return;
    }
    const ctx = chartCanvas.getContext('2d');

    if (capitalEvolutionChart) {
        capitalEvolutionChart.destroy(); // Destroy existing chart instance
        capitalEvolutionChart = null; // Ensure it's reset
    }

    // Hide no-data message by default, show if needed
    noDataMessage.style.display = 'none';
    chartCanvas.style.display = 'block'; // Show canvas by default

    const labels = Array.from({ length: spinsPerRepetition }, (_, i) => i + 1); // Spin numbers [1, 2, ..., spinsPerRepetition]
    const datasets = [];

    for (const playerName in capitalEvolutionData) {
        if (capitalEvolutionData.hasOwnProperty(playerName)) {
            // Ensure there's data for the first repetition for this player
            if (capitalEvolutionData[playerName] && capitalEvolutionData[playerName][0]) {
                datasets.push({
                    label: playerName,
                    data: capitalEvolutionData[playerName][0], // Data for the first repetition
                    fill: false,
                    borderColor: getRandomColor(),
                    tension: 0.1
                });
            }
        }
    }

    if (datasets.length === 0) {
        // console.log("No data available for capital evolution chart (first repetition).");
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height); // Clear canvas
        noDataMessage.style.display = 'block'; // Show no-data message
        chartCanvas.style.display = 'none'; // Hide canvas
        return; // Don't create an empty chart
    }

    capitalEvolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true, // You might want to set this to false if you have specific sizing needs for the container
            animation: {
                duration: 500 // Optional: add a subtle animation
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Spin Number'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Capital'
                    },
                    beginAtZero: false // Capital can be negative if bets can lead to debt, or start from 0
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}


function displayPlayerStatistics(playerStats) {
    const displayDiv = document.getElementById('player-statistics-display');
    if (!displayDiv) {
        console.error("Elemento 'player-statistics-display' no encontrado.");
        return;
    }

    let contentHTML = ""; // Start with an empty string, the heading is already in index.html

    if (Object.keys(playerStats).length === 0) {
        contentHTML = "<p>No hay estadísticas de jugadores para mostrar.</p>";
    } else {
        for (const playerName in playerStats) {
            if (playerStats.hasOwnProperty(playerName)) {
                const stats = playerStats[playerName];
                contentHTML += `<div class="player-stat">`;
                contentHTML += `<strong>${playerName}:</strong><ul>`;
                contentHTML += `<li>Media del Capital Final: ${stats.mean.toFixed(2)}</li>`;
                contentHTML += `<li>Varianza del Capital Final: ${stats.variance.toFixed(2)}</li>`;
                contentHTML += `<li>Desv. Estándar del Capital Final: ${stats.stdDev.toFixed(2)}</li>`;
                contentHTML += `</ul></div>`;
            }
        }
    }
    displayDiv.innerHTML = contentHTML;
}


function displayFinalCapitalHistogram(finalCapitalsData) {
    const container = document.getElementById('final-capital-histogram-container');
    if (!container) {
        console.error("Container 'final-capital-histogram-container' not found.");
        return;
    }
    const chartCanvas = container.querySelector('canvas');
    const noDataMessage = container.querySelector('.no-data-message');

    if (!chartCanvas || !noDataMessage) {
        console.error("Canvas element or no-data-message not found within 'final-capital-histogram-container'.");
        return;
    }
    const ctx = chartCanvas.getContext('2d');

    if (finalCapitalHistogramChart) {
        finalCapitalHistogramChart.destroy();
        finalCapitalHistogramChart = null; // Ensure it's reset
    }

    // Hide no-data message by default, show if needed
    noDataMessage.style.display = 'none';
    chartCanvas.style.display = 'block'; // Show canvas by default

    const playerNames = Object.keys(finalCapitalsData);
    if (playerNames.length === 0) {
        // console.log("No player data available for histogram.");
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        noDataMessage.style.display = 'block';
        chartCanvas.style.display = 'none';
        return;
    }

    const firstPlayerName = playerNames[0]; // Using data for the first player
    const values = finalCapitalsData[firstPlayerName];

    if (!values || values.length === 0) {
        // console.log(`No final capital data for ${firstPlayerName}.`);
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        noDataMessage.style.display = 'block';
        chartCanvas.style.display = 'none';
        return;
    }

    // Binning logic
    const numBins = 15;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    if (minValue === maxValue) {
        // Handle single value case: one bin centered at the value
        const binLabels = [`${minValue.toFixed(0)}`];
        const binCounts = [values.length];
        finalCapitalHistogramChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: `Final Capital Distribution for ${firstPlayerName}`,
                    data: binCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            }, // Note: Options were missing here in the original snippet for single value case, should be similar to main chart
            options: { // Adding similar options for consistency
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: { title: { display: true, text: 'Final Capital Bins' } },
                    y: { title: { display: true, text: 'Frequency (Number of Repetitions)' }, beginAtZero: true }
                },
                plugins: { legend: { display: true, position: 'top' } }
            }
        });
        return;
    }

    const binWidth = (maxValue - minValue) / numBins;
    const binCounts = Array(numBins).fill(0);
    const binLabels = [];

    for (let i = 0; i < numBins; i++) {
        const binStart = minValue + i * binWidth;
        const binEnd = minValue + (i + 1) * binWidth;
        // For the last bin, make sure it includes maxValue
        if (i === numBins - 1) {
            binLabels.push(`${binStart.toFixed(0)} - ${maxValue.toFixed(0)}`);
        } else {
            binLabels.push(`${binStart.toFixed(0)} - ${binEnd.toFixed(0)}`);
        }
    }

    for (const value of values) {
        if (value === maxValue) {
            binCounts[numBins - 1]++; // maxValue goes into the last bin
        } else {
            const binIndex = Math.floor((value - minValue) / binWidth);
            if (binIndex >= 0 && binIndex < numBins) {
                binCounts[binIndex]++;
            }
        }
    }

    finalCapitalHistogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: `Final Capital Distribution for ${firstPlayerName}`,
                data: binCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    title: { display: true, text: 'Final Capital Bins' },
                    ticks: {
                        maxRotation: 70, // Rotate labels if they overlap
                        minRotation: 45
                    }
                },
                y: {
                    title: { display: true, text: 'Frequency (Number of Repetitions)' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true, // True by default, but good to be explicit
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}


function displayBankrollSimulationResults(bankruptciesData, totalRepetitions) {
    const displayDiv = document.getElementById('bankroll-simulation-display');
    if (!displayDiv) {
        console.error("Elemento 'bankroll-simulation-display' no encontrado.");
        return;
    }

    let contentHTML = ""; // Start with an empty string, heading is in index.html

    if (Object.keys(bankruptciesData).length === 0 || totalRepetitions <= 0) {
        contentHTML = "<p>No hay datos de simulación de bancarrota para mostrar o número de repeticiones inválido.</p>";
    } else {
        for (const playerName in bankruptciesData) {
            if (bankruptciesData.hasOwnProperty(playerName)) {
                const data = bankruptciesData[playerName];
                const bankruptcyCount = data.count;
                const bankruptcyPercentage = (bankruptcyCount / totalRepetitions * 100).toFixed(2);

                contentHTML += `<div class="bankroll-stat">`;
                contentHTML += `<strong>${playerName}:</strong><ul>`;
                contentHTML += `<li>Veces en Bancarrota: ${bankruptcyCount} (de ${totalRepetitions} repeticiones)</li>`;
                contentHTML += `<li>Porcentaje de Bancarrota: ${bankruptcyPercentage}%</li>`;

                if (data.spinsWhenBankrupt && data.spinsWhenBankrupt.length > 0) {
                    const averageSpinsSurvived = data.spinsWhenBankrupt.reduce((acc, val) => acc + val, 0) / data.spinsWhenBankrupt.length;
                    contentHTML += `<li>Promedio de Giros Sobrevividos (en bancarrotas): ${averageSpinsSurvived.toFixed(1)} giros</li>`;
                } else if (bankruptcyCount > 0) {
                    // This case might occur if count is positive but spinsWhenBankrupt is empty (shouldn't happen with current logic)
                    contentHTML += `<li>Promedio de Giros Sobrevividos: N/A (datos incompletos)</li>`;
                } else {
                    contentHTML += `<li>Promedio de Giros Sobrevividos: N/A (nunca quebró)</li>`;
                }
                contentHTML += `</ul></div>`;
            }
        }
    }
    displayDiv.innerHTML = contentHTML;
}


})(); // IIFE End
