// Ensure this file is properly linked in index.html after this subtask.

// Constants for simulation - these should mirror wheel.js or be passed in if configurable
const SIM_SECTORES = ["$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1", "$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2", "$5","$5","$5","$5","$5","$5","$5", "$10","$10","$10","$10", "$20","$20", "Joker","Joker"];
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
 * Simulates a single round of betting for a list of simulated players.
 * @param {Array<Object>} simPlayers - Array of simulated player objects. 
 *                                    Each object should have:
 *                                    { nombre: string, apuesta_a: string, monto: number }
 * @returns {Object} An object summarizing the results, mapping player names to their gain/loss for the round.
 *                   Example: { "SimPlayer1": 20, "SimPlayer2": -10 }
 */
function simular_jugada(simPlayers) {
    const resultadoGiro = simular_giro();
    const resumenRonda = {};

    simPlayers.forEach(jugador => {
        let ganancia = 0;
        if (jugador.apuesta_a === resultadoGiro) {
            ganancia = jugador.monto * (SIM_PAYOUT_RATIOS[resultadoGiro] || 0);
        } else {
            ganancia = -jugador.monto;
        }
        resumenRonda[jugador.nombre] = ganancia;
    });
    return resumenRonda;
}

/**
 * Runs the Monte Carlo simulation for a given number of repetitions.
 * @param {number} repetitions - The number of simulation rounds to run.
 * @param {Array<Object>} simPlayers - Array of simulated player objects.
 * @returns {Object} An object mapping player names to their average gain/loss over all repetitions.
 *                   Example: { "SimPlayer1": 1.5, "SimPlayer2": -0.8 }
 */
function runMonteCarloSimulation(repetitions, simPlayers) {
    const gananciasTotales = {};
    simPlayers.forEach(jugador => {
        gananciasTotales[jugador.nombre] = 0;
    });

    for (let i = 0; i < repetitions; i++) {
        const resultadoJugada = simular_jugada(simPlayers);
        for (const nombreJugador in resultadoJugada) {
            if (gananciasTotales.hasOwnProperty(nombreJugador)) {
                gananciasTotales[nombreJugador] += resultadoJugada[nombreJugador];
            }
        }
    }

    const promedioGanancias = {};
    simPlayers.forEach(jugador => {
        promedioGanancias[jugador.nombre] = gananciasTotales[jugador.nombre] / repetitions;
    });

    return promedioGanancias;
}

// Example of how to potentially export or make functions available if using modules later,
// or they will be global if this script is directly included.
// For now, direct script inclusion will make these functions globally accessible.
// self.MonteCarlo = { simular_giro, simular_jugada, runMonteCarloSimulation };
