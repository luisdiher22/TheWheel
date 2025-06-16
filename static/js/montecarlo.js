// Ensure this file is properly linked in index.html after this subtask.

const DEFAULT_SPINS_PER_REPETITION = 100;
const DEFAULT_INITIAL_CAPITAL = 1000;

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to be shuffled.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Constants for simulation - these should mirror wheel.js or be passed in if configurable
const SIM_SECTORES = ["$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1", "$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2", "$5","$5","$5","$5","$5","$5","$5", "$10","$10","$10","$10", "$20","$20", "Joker","Joker"];
shuffleArray(SIM_SECTORES); // Shuffle the sectors array upon initialization

// Payout ratios, consistent with wheel.js
const SIM_PAYOUT_RATIOS = {
    "$1": 1,
    "$2": 2,
    "$5": 5,
    "$10": 10,
    "$20": 20,
    "Joker": 40 
};

/**
 * Simulates a single spin of the roulette wheel.
 * @returns {string} The outcome of the spin (e.g., "$1", "Joker").
 */
function simular_giro() {
    return SIM_SECTORES[Math.floor(Math.random() * SIM_SECTORES.length)];
}

/**
 * Simulates a single round of betting for a list of simulated players, updating their capital.
 * @param {string} winningSector - The sector that won the spin.
 * @param {Array<Object>} simPlayers - Array of simulated player objects.
 *                                    Each object should have:
 *                                    { nombre: string, apuesta_a: string, monto: number, currentCapital: number, bankruptThisRepetition: boolean }
 * @returns {Object} An object containing playerGains (gain/loss for each player for the round) and the winningSector.
 *                   Example: { playerGains: { "SimPlayer1": 20, "SimPlayer2": -10 }, winningSector: "$1" }
 */
function simular_jugada(winningSector, simPlayers) {
    const playerGains = {};

    simPlayers.forEach(jugador => {
        if (jugador.bankruptThisRepetition || jugador.currentCapital <= 0) {
            playerGains[jugador.nombre] = 0; // No gain or loss if bankrupt or no capital
            if (!jugador.bankruptThisRepetition && jugador.currentCapital <= 0) {
                jugador.bankruptThisRepetition = true; // Mark as bankrupt for this repetition
            }
            return; // Skip betting if bankrupt
        }

        let gainLoss = 0;
        if (jugador.currentCapital < jugador.monto) {
            // Not enough capital to make the full bet, could be handled differently (e.g., bet all-in or skip)
            // For now, we assume they can't bet if they can't cover the amount.
            gainLoss = 0; // Or mark as unable to bet for this spin
        } else if (jugador.apuesta_a === winningSector) {
            gainLoss = jugador.monto * (SIM_PAYOUT_RATIOS[winningSector] || 0);
        } else {
            gainLoss = -jugador.monto;
        }

        jugador.currentCapital += gainLoss;
        playerGains[jugador.nombre] = gainLoss;

        if (jugador.currentCapital <= 0) {
            jugador.bankruptThisRepetition = true; // Mark as bankrupt for this repetition
        }
    });

    return { playerGains, winningSector };
}

/**
 * Runs the Monte Carlo simulation for a given number of repetitions and spins per repetition.
 * @param {number} repetitions - The number of simulation repetitions to run.
 * @param {Array<Object>} inputPlayers - Array of player configuration objects.
 *                                     Example: { nombre: "SimPlayer1", apuesta_a: "$1", monto: 10, initialCapital: 1000 }
 * @param {number} spins_per_repetition - The number of spins for each repetition.
 * @returns {Object} An object containing all collected simulation data.
 */
function runMonteCarloSimulation(repetitions, inputPlayers, spins_per_repetition = DEFAULT_SPINS_PER_REPETITION) {
    const spinOutcomes = [];
    const capitalEvolution = {};
    const finalCapitals = {};
    const bankruptcies = {};
    const totalGains = {}; // For calculating averageGainLoss

    // Initialize data structures for each player
    inputPlayers.forEach(playerConfig => {
        const playerName = playerConfig.nombre;
        capitalEvolution[playerName] = [];
        finalCapitals[playerName] = [];
        bankruptcies[playerName] = { count: 0, spinsWhenBankrupt: [] }; // Renamed field
        totalGains[playerName] = 0;
    });

    for (let rep = 0; rep < repetitions; rep++) {
        // Create simulation players for this repetition with initial capital
        const simPlayersThisRepetition = inputPlayers.map(pConfig => {
            const initialCap = pConfig.initialCapital !== undefined ? pConfig.initialCapital : DEFAULT_INITIAL_CAPITAL;
            return {
                ...pConfig, // Spread original player config (name, apuesta_a, monto)
                initialCapital: initialCap, // Set determined initial capital
                currentCapital: initialCap, // Start with this capital for the repetition
                bankruptThisRepetition: false, // Reset bankruptcy status for the new repetition
            };
        });

        // Initialize capital evolution for this repetition
        simPlayersThisRepetition.forEach(player => {
            capitalEvolution[player.nombre].push([]); // new array for this repetition's capital evolution
        });

        for (let spin = 0; spin < spins_per_repetition; spin++) {
            const winningSector = simular_giro();
            spinOutcomes.push(winningSector);

            // Pass only simPlayersThisRepetition to simular_jugada
            const roundResult = simular_jugada(winningSector, simPlayersThisRepetition);

            simPlayersThisRepetition.forEach(player => {
                const playerName = player.nombre;
                // Record capital after this spin
                capitalEvolution[playerName][rep].push(player.currentCapital);
                // Bankruptcy state (bankruptThisRepetition) is updated by simular_jugada
                // We will determine the spin of bankruptcy at the end of the repetition
            });
        } // End of spins for one repetition

        // After all spins in a repetition
        simPlayersThisRepetition.forEach(player => {
            const playerName = player.nombre;
            finalCapitals[playerName].push(player.currentCapital);
            totalGains[playerName] += (player.currentCapital - player.initialCapital);

            if (player.bankruptThisRepetition) {
                bankruptcies[playerName].count++;
                let spinOfBankruptcyThisRep = spins_per_repetition; // Default if not found (should not happen if bankruptThisRepetition is true)
                // Find the first spin in this repetition where capital was <= 0
                const capitalHistoryForRep = capitalEvolution[playerName][rep];
                for (let s = 0; s < capitalHistoryForRep.length; s++) {
                    if (capitalHistoryForRep[s] <= 0) {
                        spinOfBankruptcyThisRep = s + 1; // Spin numbers are 1-indexed
                        break;
                    }
                }
                bankruptcies[playerName].spinsWhenBankrupt.push(spinOfBankruptcyThisRep);
            }
        });
    } // End of repetitions

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
        playerStats: calculatePlayerStatistics(finalCapitals) // New addition
    };
}

/**
 * Calculates statistical metrics for an array of numerical values.
 * @param {Array<number>} arrayOfValues - The array of numbers.
 * @returns {Object} An object containing mean, variance, and stdDev.
 */
function calculateStatisticalMetrics(arrayOfValues) {
    const n = arrayOfValues.length;
    if (n === 0) {
        return { mean: 0, variance: 0, stdDev: 0 };
    }

    const mean = arrayOfValues.reduce((acc, val) => acc + val, 0) / n;

    if (n < 2) { // Variance and StdDev are 0 if less than 2 elements
        return { mean: mean, variance: 0, stdDev: 0 };
    }

    const variance = arrayOfValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n; // Population variance (N)
    const stdDev = Math.sqrt(variance);

    return { mean, variance, stdDev };
}

/**
 * Calculates statistical metrics for each player's final capital.
 * @param {Object} finalCapitals - Object where keys are player names and values are arrays of their final capital from each repetition.
 *                                 Example: { "Player1": [1200, 850, ...], "Player2": [...] }
 * @returns {Object} An object where keys are player names and values are objects with mean, variance, and stdDev of their final capitals.
 *                   Example: { "Player1": { mean: M, variance: V, stdDev: SD }, ... }
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
 * Calculates the frequency of each sector from a list of spin outcomes.
 * @param {Array<string>} spinOutcomes - A flat list of spin results (e.g., ["$1", "Joker", "$1"]).
 * @returns {Object} An object where keys are sector names and values are their counts.
 *                   Example: {"$1": 2, "Joker": 1}
 */
function calculateSectorFrequencies(spinOutcomes) {
    const frequencies = {};
    for (const outcome of spinOutcomes) {
        frequencies[outcome] = (frequencies[outcome] || 0) + 1;
    }
    return frequencies;
}

// Example of how to potentially export or make functions available if using modules later,
// or they will be global if this script is directly included.
// For now, direct script inclusion will make these functions globally accessible.
// self.MonteCarlo = { simular_giro, simular_jugada, runMonteCarloSimulation };
