(function() { // IIFE Inicio

let capitalEvolutionChart = null; // Para mantener la instancia del gráfico de evolución de capital
let finalCapitalHistogramChart = null; // Para mantener la instancia del gráfico de histograma

// Constantes para dibujar la ruleta (si se mantiene la ruleta visual para la simulación)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const WHEEL_RADIUS = 200;
// const POINTER_OFFSET_DEGREES = 90; // Puede no ser necesario si el giro es puramente visual o no interactivo

// Elementos del DOM
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
// const wheelWrapper = document.getElementById("wheel-wrapper"); // Mantener si se desean efectos visuales en el contenedor

// Elementos del DOM para el Modo de Simulación (asumiendo que aún están en index.html)
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

// Sectores de la ruleta, colores y constantes derivadas se definirán en initApp
// después de asegurar que SIM_SECTORES esté disponible.
let sections = [];
let colors = [];
let numSections = 0;
let arcSize = 0;

function drawWheel() {
    if (!ctx || numSections === 0) return; // Asegurar que el contexto del canvas y los sectores estén disponibles
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Limpiar canvas antes de dibujar
    for (let i = 0; i < numSections; i++) {
        const startAngle = i * arcSize;
        const endAngle = startAngle + arcSize;
        ctx.beginPath();
        ctx.moveTo(WHEEL_RADIUS, WHEEL_RADIUS);
        ctx.arc(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS, startAngle, endAngle);
        ctx.fillStyle = colors[i]; // Usar el array de colores generado dinámicamente
        ctx.fill();

        ctx.save();
        ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS);
        ctx.rotate(startAngle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px 'Segoe UI', sans-serif";
        const sectionText = sections[i] === "Joker" ? "Comodín" : sections[i]; // Usar el array de sectores dinámico
        ctx.fillText(sectionText, WHEEL_RADIUS - 10, 10);
        ctx.restore();
    }
}

let currentWheelAngle = 0; // Mantener registro del ángulo visual de la ruleta

function drawRotatedWheel(rotation) {
   if (!ctx || numSections === 0) return; // Asegurar que el contexto del canvas y los sectores estén disponibles
   ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
   ctx.save();
   ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS);
   ctx.rotate(rotation * Math.PI / 180); // Convertir grados a radianes
   ctx.translate(-WHEEL_RADIUS, -WHEEL_RADIUS);
   drawWheel();
   ctx.restore();
}

function easeOutCubic(t) { return (--t) * t * t + 1; }

function animateVisualSpin(duration = 3000) {
    const totalRotation = (2 * 360) + (Math.random() * 360); // Ejemplo: 2 a 3 giros completos
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
            // Opcionalmente, asegurar que se detenga en un ángulo limpio o el ángulo aleatorio final.
            // currentWheelAngle = totalRotation;
            // drawRotatedWheel(currentWheelAngle);
        }
    }
    requestAnimationFrame(spinStep);
}


function initApp() {
    // Inicializar sectores y variables relacionadas desde SECTORES_SIMULACION
    if (typeof SECTORES_SIMULACION !== 'undefined' && Array.isArray(SECTORES_SIMULACION)) {
        sections = [...SECTORES_SIMULACION]; // Usar una copia de SECTORES_SIMULACION
        numSections = sections.length;
        arcSize = (2 * Math.PI) / numSections;
        colors = sections.map(value => { // Regenerar colores basados en SECTORES_SIMULACION
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
        // Opcionalmente, proveer sectores de respaldo por defecto o mostrar un error en el canvas
        sections = ["Error"];
        numSections = 1;
        arcSize = 2 * Math.PI;
        colors = ["#FF0000"]; // Color rojo para error
    }

    drawWheel(); // Dibujo inicial de la ruleta

    if (runSimBtn) {
        runSimBtn.addEventListener('click', () => {
            const repetitions = parseInt(simRepetitionsInput.value);
            if (isNaN(repetitions) || repetitions <= 0) {
                simResultsDisplay.innerHTML = "<p style='color: red;'>Por favor, introduce un número válido de repeticiones.</p>";
                return;
            }

            const simPlayers = [];
            // Jugador 1
            if (simP1BetType.value && simP1BetAmount.value) {
                const p1Amount = parseInt(simP1BetAmount.value);
                if (p1Amount > 0) {
                    simPlayers.push({ nombre: "Jugador Simulado 1", apuesta_a: simP1BetType.value, monto: p1Amount });
                } else if (p1Amount <= 0 && simP1BetType.value !== "$1") { // Permitir $1 por defecto para el tipo si el monto es inválido
                     simResultsDisplay.innerHTML = `<p style='color: red;'>Monto de apuesta inválido para Jugador Simulado 1.</p>`;
                     return;
                }
            }
            // Jugador 2
            if (simP2BetType.value && simP2BetAmount.value) {
                const p2Amount = parseInt(simP2BetAmount.value);
                if (p2Amount > 0) {
                    simPlayers.push({ nombre: "Jugador Simulado 2", apuesta_a: simP2BetType.value, monto: p2Amount });
                } else if (p2Amount <= 0 && simP2BetType.value !== "$1") {
                     simResultsDisplay.innerHTML = `<p style='color: red;'>Monto de apuesta inválido para Jugador Simulado 2.</p>`;
                     return;
                }
            }
            // Jugador 3
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

            const animationDuration = 3000; // Duración de la animación del giro en ms
            animateVisualSpin(animationDuration);

            // runMonteCarloSimulation está disponible globalmente desde montecarlo.js
            // Asegurar que montecarlo.js se cargue antes que este script en index.html
            try {
                // Asumiendo que simPlayers ya están validados y creados
                // La función runMonteCarloSimulation ahora espera que initialCapital sea parte de los objetos de jugador si se desea
                // Por ahora, este ejemplo procederá sin añadir initialCapital aquí,
                // basándose en los valores por defecto en montecarlo.js, o asumiendo que no es crítico para esta parte de la visualización.
                // Para ser completo, se podrían añadir entradas de initialCapital en el HTML y pasarlas aquí.
                const simPlayersWithPotentialCapital = simPlayers.map(p => ({
                     ...p,
                    // ejemplo: initialCapital: parseInt(document.getElementById(`simP${p.nombre.slice(-1)}Capital`).value) || 1000
                    // Por ahora, omitimos esto y dejamos que montecarlo.js maneje los valores por defecto si es necesario por su lógica.
                }));


                const results = ejecutarSimulacionMontecarlo(repetitions, simPlayersWithPotentialCapital);
                const totalSpins = results.resultadosDeGiros.length;

                // Mostrar resultados después de un retraso para permitir que se vea la animación
                setTimeout(() => {
                    // Mostrar ganancia/pérdida promedio
                    let resultsHTML = `<h4>Resultados de la Simulación (${repetitions} repeticiones, ${totalSpins} giros totales):</h4>`;
                    if (results.gananciaPerdidaPromedio) {
                        for (const playerName in results.gananciaPerdidaPromedio) {
                            resultsHTML += `<p>${playerName}: Ganancia/Pérdida Promedio por Repetición = ${results.gananciaPerdidaPromedio[playerName].toFixed(2)}</p>`;
                        }
                    } else {
                        resultsHTML += "<p>No se calcularon ganancias promedio.</p>";
                    }
                    simResultsDisplay.innerHTML = resultsHTML;

                    // Mostrar frecuencias de sectores
                    if (results.frecuenciasSector) {
                        displaySectorFrequencies(results.frecuenciasSector, totalSpins);
                    }

                    // Mostrar gráfico de evolución de capital
                    if (results.evolucionCapital && results.girosPorRepeticion) {
                        // Comprobar si hay datos de jugadores para mostrar
                        const playerNames = Object.keys(results.evolucionCapital);
                        if (playerNames.length > 0 && results.evolucionCapital[playerNames[0]].length > 0) {
                             displayCapitalEvolutionChart(results.evolucionCapital, results.girosPorRepeticion);
                        } else {
                            // Manejar caso sin datos de evolución de capital (ej., limpiar gráfico anterior o mostrar mensaje)
                            if (capitalEvolutionChart) {
                                capitalEvolutionChart.destroy();
                                capitalEvolutionChart = null;
                            }
                             // Opcionalmente: document.getElementById('capital-evolution-chart-container').innerHTML += "<p>No hay datos de evolución de capital para mostrar para la primera repetición.</p>";
                        }
                    }

                    // Mostrar estadísticas de jugadores
                    if (results.estadisticasJugador) {
                        displayPlayerStatistics(results.estadisticasJugador);
                    }

                    // Mostrar histograma de capital final
                    if (results.capitalesFinales) {
                        displayFinalCapitalHistogram(results.capitalesFinales);
                    }

                    // Mostrar resultados de simulación de bancarrota
                    if (results.bancarrotas) {
                        const totalRepetitions = parseInt(simRepetitionsInput.value); // Obtener total de repeticiones desde la entrada
                        displayBankrollSimulationResults(results.bancarrotas, totalRepetitions);
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

    // Asegurar que la sección de Montecarlo esté visible (ya manejado por el cambio en index.html, pero bueno por robustez)
    if (monteCarloSection) {
        // monteCarloSection.style.display = 'block'; // No es estrictamente necesario si CSS/HTML lo maneja
    } else {
        console.error("Sección de Monte Carlo (monteCarloSection) no encontrada.");
    }
}

// Asegurar que el DOM esté completamente cargado antes de inicializar
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

    // Usar SECTORES_SIMULACION (disponible globalmente desde montecarlo.js) para obtener todos los nombres de sectores únicos
    // Esto asegura que todos los sectores definidos se listen, incluso si su frecuencia es 0.
    const uniqueSectors = [...new Set(SECTORES_SIMULACION)]; // Depende de que SECTORES_SIMULACION esté disponible globalmente

    contentHTML += "<table><thead><tr><th>Sector</th><th>Conteos</th><th>Porcentaje</th></tr></thead><tbody>";

    uniqueSectors.sort((a, b) => { // Opcional: ordenar sectores para una visualización consistente
        if (a === "Joker") return 1; // Comodín al final
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
    const r = Math.floor(Math.random() * 200); // Evitar colores muy claros para mejor visibilidad
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
    const chartCanvas = container.querySelector('canvas'); // Obtener canvas dentro del contenedor
    const noDataMessage = container.querySelector('.no-data-message');

    if (!chartCanvas || !noDataMessage) {
        console.error("Canvas element or no-data-message not found within 'capital-evolution-chart-container'.");
        return;
    }
    const ctx = chartCanvas.getContext('2d');

    if (capitalEvolutionChart) {
        capitalEvolutionChart.destroy(); // Destruir instancia de gráfico existente
        capitalEvolutionChart = null; // Asegurar que se restablezca
    }

    // Ocultar mensaje de no-datos por defecto, mostrar si es necesario
    noDataMessage.style.display = 'none';
    chartCanvas.style.display = 'block'; // Mostrar canvas por defecto

    const labels = Array.from({ length: spinsPerRepetition }, (_, i) => i + 1); // Números de giro [1, 2, ..., spinsPerRepetition]
    const datasets = [];

    for (const playerName in capitalEvolutionData) {
        if (capitalEvolutionData.hasOwnProperty(playerName)) {
            // Asegurar que haya datos para la primera repetición de este jugador
            if (capitalEvolutionData[playerName] && capitalEvolutionData[playerName][0]) {
                datasets.push({
                    label: playerName,
                    data: capitalEvolutionData[playerName][0], // Datos para la primera repetición
                    fill: false,
                    borderColor: getRandomColor(),
                    tension: 0.1
                });
            }
        }
    }

    if (datasets.length === 0) {
        // console.log("No hay datos disponibles para el gráfico de evolución de capital (primera repetición).");
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height); // Limpiar canvas
        noDataMessage.style.display = 'block'; // Mostrar mensaje de no-datos
        chartCanvas.style.display = 'none'; // Ocultar canvas
        return; // No crear un gráfico vacío
    }

    capitalEvolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true, // Quizás quieras establecer esto a false si tienes necesidades específicas de tamaño para el contenedor
            animation: {
                duration: 500 // Opcional: añadir una animación sutil
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Número de Giro'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Capital'
                    },
                    beginAtZero: false // El capital puede ser negativo si las apuestas pueden llevar a deudas, o comenzar desde 0
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

    let contentHTML = ""; // Comenzar con una cadena vacía, el encabezado ya está en index.html

    if (Object.keys(playerStats).length === 0) {
        contentHTML = "<p>No hay estadísticas de jugadores para mostrar.</p>";
    } else {
        for (const playerName in playerStats) {
            if (playerStats.hasOwnProperty(playerName)) {
                const stats = playerStats[playerName];
                contentHTML += `<div class="player-stat">`;
                contentHTML += `<strong>${playerName}:</strong><ul>`;
                contentHTML += `<li>Media del Capital Final: ${stats.media.toFixed(2)}</li>`;
                contentHTML += `<li>Varianza del Capital Final: ${stats.varianza.toFixed(2)}</li>`;
                contentHTML += `<li>Desv. Estándar del Capital Final: ${stats.desvEstandar.toFixed(2)}</li>`;
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
        finalCapitalHistogramChart = null; // Asegurar que se restablezca
    }

    // Ocultar mensaje de no-datos por defecto, mostrar si es necesario
    noDataMessage.style.display = 'none';
    chartCanvas.style.display = 'block'; // Mostrar canvas por defecto

    const playerNames = Object.keys(finalCapitalsData);
    if (playerNames.length === 0) {
        // console.log("No hay datos de jugador disponibles para el histograma.");
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        noDataMessage.style.display = 'block';
        chartCanvas.style.display = 'none';
        return;
    }

    const firstPlayerName = playerNames[0]; // Usando datos del primer jugador
    const values = finalCapitalsData[firstPlayerName];

    if (!values || values.length === 0) {
        // console.log(`No hay datos de capital final para ${firstPlayerName}.`);
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        noDataMessage.style.display = 'block';
        chartCanvas.style.display = 'none';
        return;
    }

    // Lógica de agrupamiento (binning)
    const numBins = 15;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    if (minValue === maxValue) {
        // Manejar caso de valor único: un solo grupo centrado en el valor
        const binLabels = [`${minValue.toFixed(0)}`];
        const binCounts = [values.length];
        finalCapitalHistogramChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: `Distribución del Capital Final para ${firstPlayerName}`,
                    data: binCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            }, // Nota: Faltaban opciones aquí en el fragmento original para el caso de valor único, deberían ser similares al gráfico principal
            options: { // Añadiendo opciones similares por consistencia
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: { title: { display: true, text: 'Rangos de Capital Final' } },
                    y: { title: { display: true, text: 'Frecuencia (Número de Repeticiones)' }, beginAtZero: true }
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
        // Para el último grupo, asegurar que incluya maxValue
        if (i === numBins - 1) {
            binLabels.push(`${binStart.toFixed(0)} - ${maxValue.toFixed(0)}`);
        } else {
            binLabels.push(`${binStart.toFixed(0)} - ${binEnd.toFixed(0)}`);
        }
    }

    for (const value of values) {
        if (value === maxValue) {
            binCounts[numBins - 1]++; // maxValue va en el último grupo
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
                label: `Distribución del Capital Final para ${firstPlayerName}`, // This was already translated in the previous diff, keeping it.
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
                    title: { display: true, text: 'Rangos de Capital Final' },
                    ticks: {
                        maxRotation: 70, // Rotar etiquetas si se superponen
                        minRotation: 45
                    }
                },
                y: {
                    title: { display: true, text: 'Frecuencia (Número de Repeticiones)' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true, // Verdadero por defecto, pero es bueno ser explícito
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

    let contentHTML = ""; // Comenzar con una cadena vacía, el encabezado ya está en index.html

    if (Object.keys(bankruptciesData).length === 0 || totalRepetitions <= 0) {
        contentHTML = "<p>No hay datos de simulación de bancarrota para mostrar o número de repeticiones inválido.</p>";
    } else {
        for (const playerName in bankruptciesData) {
            if (bankruptciesData.hasOwnProperty(playerName)) {
                const data = bankruptciesData[playerName];
                const bankruptcyCount = data.conteo; // Updated
                const bankruptcyPercentage = (bankruptcyCount / totalRepetitions * 100).toFixed(2);

                contentHTML += `<div class="bankroll-stat">`;
                contentHTML += `<strong>${playerName}:</strong><ul>`;
                contentHTML += `<li>Veces en Bancarrota: ${bankruptcyCount} (de ${totalRepetitions} repeticiones)</li>`;
                contentHTML += `<li>Porcentaje de Bancarrota: ${bankruptcyPercentage}%</li>`;

                if (data.girosEnBancarrota && data.girosEnBancarrota.length > 0) { // Updated
                    const averageSpinsSurvived = data.girosEnBancarrota.reduce((acc, val) => acc + val, 0) / data.girosEnBancarrota.length; // Updated
                    contentHTML += `<li>Promedio de Giros Sobrevividos (en bancarrotas): ${averageSpinsSurvived.toFixed(1)} giros</li>`;
                } else if (bankruptcyCount > 0) {
                    // Este caso podría ocurrir si count es positivo pero spinsWhenBankrupt está vacío (no debería suceder con la lógica actual)
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


})(); // IIFE Fin
