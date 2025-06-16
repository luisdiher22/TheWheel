// Asegúrate de que este archivo esté correctamente enlazado en index.html después de esta subtarea.

const DEFAULT_SPINS_PER_REPETITION = 100;
const DEFAULT_INITIAL_CAPITAL = 1000;

/**
 * Mezcla un array en el lugar usando el algoritmo Fisher-Yates.
 * @param {Array} array - El array a ser mezclado.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Constantes para la simulación - deben reflejar wheel.js o ser configurables si se pasan como parámetros.
const SIM_SECTORES = ["$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1", "$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2", "$5","$5","$5","$5","$5","$5","$5", "$10","$10","$10","$10", "$20","$20", "Joker","Joker"];
shuffleArray(SIM_SECTORES); // Mezcla el array de sectores al inicializar.

// Tasas de pago, consistentes con wheel.js.
const SIM_PAYOUT_RATIOS = {
    "$1": 1,
    "$2": 2,
    "$5": 5,
    "$10": 10,
    "$20": 20,
    "Joker": 40 
};

/**
 * Simula un único giro de la ruleta.
 * @returns {string} El resultado del giro (ej., "$1", "Joker").
 */
function simular_giro() {
    return SIM_SECTORES[Math.floor(Math.random() * SIM_SECTORES.length)];
}

/**
 * Simula una única ronda de apuestas para una lista de jugadores simulados, actualizando su capital.
 * @param {string} winningSector - El sector que ganó el giro.
 * @param {Array<Object>} simPlayers - Array de objetos de jugadores simulados.
 *                                    Cada objeto debe tener:
 *                                    { nombre: string, apuesta_a: string, monto: number, currentCapital: number, bankruptThisRepetition: boolean }
 * @returns {Object} Un objeto que contiene playerGains (ganancia/pérdida para cada jugador en la ronda) y winningSector.
 *                   Ejemplo: { playerGains: { "SimPlayer1": 20, "SimPlayer2": -10 }, winningSector: "$1" }
 */
function simular_jugada(winningSector, simPlayers) {
    const playerGains = {};

    simPlayers.forEach(jugador => {
        if (jugador.bankruptThisRepetition || jugador.currentCapital <= 0) {
            playerGains[jugador.nombre] = 0; // Sin ganancia ni pérdida si está en bancarrota o no tiene capital.
            if (!jugador.bankruptThisRepetition && jugador.currentCapital <= 0) {
                jugador.bankruptThisRepetition = true; // Marcar como en bancarrota para esta repetición.
            }
            return; // Omitir apuesta si está en bancarrota.
        }

        let gainLoss = 0;
        if (jugador.currentCapital < jugador.monto) {
            // Capital insuficiente para realizar la apuesta completa, podría manejarse de otra manera (ej., apostar todo o saltar).
            // Por ahora, asumimos que no pueden apostar si no pueden cubrir el monto.
            gainLoss = 0; // O marcar como incapaz de apostar para este giro.
        } else if (jugador.apuesta_a === winningSector) {
            gainLoss = jugador.monto * (SIM_PAYOUT_RATIOS[winningSector] || 0);
        } else {
            gainLoss = -jugador.monto;
        }

        jugador.currentCapital += gainLoss;
        playerGains[jugador.nombre] = gainLoss;

        if (jugador.currentCapital <= 0) {
            jugador.bankruptThisRepetition = true; // Marcar como en bancarrota para esta repetición.
        }
    });

    return { playerGains, winningSector };
}

/**
 * Ejecuta la simulación de Montecarlo para un número dado de repeticiones y giros por repetición.
 * @param {number} repetitions - El número de repeticiones de la simulación a ejecutar.
 * @param {Array<Object>} inputPlayers - Array de objetos de configuración de jugadores.
 *                                     Ejemplo: { nombre: "SimPlayer1", apuesta_a: "$1", monto: 10, initialCapital: 1000 }
 * @param {number} spins_per_repetition - El número de giros para cada repetición.
 * @returns {Object} Un objeto que contiene todos los datos de simulación recolectados.
 */
function runMonteCarloSimulation(repetitions, inputPlayers, spins_per_repetition = DEFAULT_SPINS_PER_REPETITION) {
    const spinOutcomes = [];
    const capitalEvolution = {};
    const finalCapitals = {};
    const bankruptcies = {};
    const totalGains = {}; // Para calcular averageGainLoss.

    // Inicializar estructuras de datos para cada jugador.
    inputPlayers.forEach(playerConfig => {
        const playerName = playerConfig.nombre;
        capitalEvolution[playerName] = [];
        finalCapitals[playerName] = [];
        bankruptcies[playerName] = { count: 0, spinsWhenBankrupt: [] }; // Campo renombrado.
        totalGains[playerName] = 0;
    });

    for (let rep = 0; rep < repetitions; rep++) {
        // Crear jugadores de simulación para esta repetición con capital inicial.
        const simPlayersThisRepetition = inputPlayers.map(pConfig => {
            const initialCap = pConfig.initialCapital !== undefined ? pConfig.initialCapital : DEFAULT_INITIAL_CAPITAL;
            return {
                ...pConfig, // Expandir configuración original del jugador (nombre, apuesta_a, monto).
                initialCapital: initialCap, // Establecer capital inicial determinado.
                currentCapital: initialCap, // Comenzar con este capital para la repetición.
                bankruptThisRepetition: false, // Restablecer estado de bancarrota para la nueva repetición.
            };
        });

        // Inicializar evolución del capital para esta repetición.
        simPlayersThisRepetition.forEach(player => {
            capitalEvolution[player.nombre].push([]); // nuevo array para la evolución del capital de esta repetición.
        });

        for (let spin = 0; spin < spins_per_repetition; spin++) {
            const winningSector = simular_giro();
            spinOutcomes.push(winningSector);

            // Pasar solo simPlayersThisRepetition a simular_jugada.
            const roundResult = simular_jugada(winningSector, simPlayersThisRepetition);

            simPlayersThisRepetition.forEach(player => {
                const playerName = player.nombre;
                // Registrar capital después de este giro.
                capitalEvolution[playerName][rep].push(player.currentCapital);
                // El estado de bancarrota (bankruptThisRepetition) es actualizado por simular_jugada.
                // Determinaremos el giro de la bancarrota al final de la repetición.
            });
        } // Fin de los giros para una repetición.

        // Después de todos los giros en una repetición.
        simPlayersThisRepetition.forEach(player => {
            const playerName = player.nombre;
            finalCapitals[playerName].push(player.currentCapital);
            totalGains[playerName] += (player.currentCapital - player.initialCapital);

            if (player.bankruptThisRepetition) {
                bankruptcies[playerName].count++;
                let spinOfBankruptcyThisRep = spins_per_repetition; // Valor por defecto si no se encuentra (no debería ocurrir si bankruptThisRepetition es verdadero).
                // Encontrar el primer giro en esta repetición donde el capital fue <= 0.
                const capitalHistoryForRep = capitalEvolution[playerName][rep];
                for (let s = 0; s < capitalHistoryForRep.length; s++) {
                    if (capitalHistoryForRep[s] <= 0) {
                        spinOfBankruptcyThisRep = s + 1; // Los números de giro son indexados desde 1.
                        break;
                    }
                }
                bankruptcies[playerName].spinsWhenBankrupt.push(spinOfBankruptcyThisRep);
            }
        });
    } // Fin de las repeticiones.

    const averageGainLoss = {};
    inputPlayers.forEach(playerConfig => {
        const playerName = playerConfig.nombre;
        averageGainLoss[playerName] = totalGains[playerName] / repetitions;
    });

    const sectorFrequencies = calculateSectorFrequencies(spinOutcomes);

    return {
        spinOutcomes,
        capitalEvolution,
        finalCapitals,
        bankruptcies,
        averageGainLoss,
        sectorFrequencies,
        spins_per_repetition: spins_per_repetition,
        playerStats: calculatePlayerStatistics(finalCapitals) // Nueva adición.
    };
}

/**
 * Calcula métricas estadísticas para un array de valores numéricos.
 * @param {Array<number>} arrayOfValues - El array de números.
 * @returns {Object} Un objeto que contiene media, varianza y desviación estándar.
 */
function calculateStatisticalMetrics(arrayOfValues) {
    const n = arrayOfValues.length;
    if (n === 0) {
        return { mean: 0, variance: 0, stdDev: 0 };
    }

    const mean = arrayOfValues.reduce((acc, val) => acc + val, 0) / n;

    if (n < 2) { // Varianza y Desv. Estándar son 0 si hay menos de 2 elementos.
        return { mean: mean, variance: 0, stdDev: 0 };
    }

    const variance = arrayOfValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n; // Varianza poblacional (N).
    const stdDev = Math.sqrt(variance);

    return { mean, variance, stdDev };
}

/**
 * Calcula métricas estadísticas para el capital final de cada jugador.
 * @param {Object} finalCapitals - Objeto donde las claves son nombres de jugadores y los valores son arrays de su capital final de cada repetición.
 *                                 Ejemplo: { "Player1": [1200, 850, ...], "Player2": [...] }
 * @returns {Object} Un objeto donde las claves son nombres de jugadores y los valores son objetos con media, varianza y desviación estándar de sus capitales finales.
 *                   Ejemplo: { "Player1": { mean: M, variance: V, stdDev: SD }, ... }
 */
function calculatePlayerStatistics(finalCapitals) {
    const playerStats = {};
    for (const playerName in finalCapitals) {
        if (finalCapitals.hasOwnProperty(playerName)) {
            playerStats[playerName] = calculateStatisticalMetrics(finalCapitals[playerName]);
        }
    }
    return playerStats;
}

/**
 * Calcula la frecuencia de cada sector a partir de una lista de resultados de giros.
 * @param {Array<string>} spinOutcomes - Una lista plana de resultados de giros (ej., ["$1", "Joker", "$1"]).
 * @returns {Object} Un objeto donde las claves son nombres de sectores y los valores son sus conteos.
 *                   Ejemplo: {"$1": 2, "Joker": 1}
 */
function calculateSectorFrequencies(spinOutcomes) {
    const frequencies = {};
    for (const outcome of spinOutcomes) {
        frequencies[outcome] = (frequencies[outcome] || 0) + 1;
    }
    return frequencies;
}

// Ejemplo de cómo exportar o hacer disponibles las funciones si se usan módulos más adelante,
// o serán globales si este script se incluye directamente.
// Por ahora, la inclusión directa del script hará que estas funciones sean accesibles globalmente.
// self.MonteCarlo = { simular_giro, simular_jugada, runMonteCarloSimulation };
