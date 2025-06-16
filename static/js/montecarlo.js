// Asegúrate de que este archivo esté correctamente enlazado en index.html después de esta subtarea.

const GIROS_POR_REPETICION_PREDETERMINADO = 100;
const CAPITAL_INICIAL_PREDETERMINADO = 1000;

/**
 * Mezcla un array en el lugar usando el algoritmo Fisher-Yates.
 * @param {Array} unArray - El array a ser mezclado.
 */
function mezclarArray(unArray) {
    for (let i = unArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unArray[i], unArray[j]] = [unArray[j], unArray[i]];
    }
}

// Constantes para la simulación - deben reflejar wheel.js o ser configurables si se pasan como parámetros.
const SECTORES_SIMULACION = ["$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1","$1", "$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2","$2", "$5","$5","$5","$5","$5","$5","$5", "$10","$10","$10","$10", "$20","$20", "Joker","Joker"];
mezclarArray(SECTORES_SIMULACION); // Mezcla el array de sectores al inicializar.

// Tasas de pago, consistentes con wheel.js.
const TASAS_DE_PAGO_SIMULACION = {
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
function simular_giro() { // Nombre de función existente, se mantiene por coherencia con llamadas externas.
    return SECTORES_SIMULACION[Math.floor(Math.random() * SECTORES_SIMULACION.length)];
}

/**
 * Simula una única ronda de apuestas para una lista de jugadores simulados, actualizando su capital.
 * @param {string} sectorGanador - El sector que ganó el giro.
 * @param {Array<Object>} jugadoresSimulados - Array de objetos de jugadores simulados.
 *                                    Cada objeto debe tener:
 *                                    { nombre: string, apuesta_a: string, monto: number, currentCapital: number, bankruptThisRepetition: boolean }
 * @returns {Object} Un objeto que contiene gananciasJugador (ganancia/pérdida para cada jugador en la ronda) y sectorGanador.
 *                   Ejemplo: { gananciasJugador: { "SimPlayer1": 20, "SimPlayer2": -10 }, sectorGanador: "$1" }
 */
function simular_jugada(sectorGanador, jugadoresSimulados) { // Nombre de función existente, se mantiene.
    const gananciasJugador = {};

    jugadoresSimulados.forEach(jugador => {
        if (jugador.bankruptThisRepetition || jugador.currentCapital <= 0) {
            gananciasJugador[jugador.nombre] = 0; // Sin ganancia ni pérdida si está en bancarrota o no tiene capital.
            if (!jugador.bankruptThisRepetition && jugador.currentCapital <= 0) {
                jugador.bankruptThisRepetition = true; // Marcar como en bancarrota para esta repetición.
            }
            return; // Omitir apuesta si está en bancarrota.
        }

        let gananciaPerdida = 0;
        if (jugador.currentCapital < jugador.monto) {
            // Capital insuficiente para realizar la apuesta completa, podría manejarse de otra manera (ej., apostar todo o saltar).
            // Por ahora, asumimos que no pueden apostar si no pueden cubrir el monto.
            gananciaPerdida = 0; // O marcar como incapaz de apostar para este giro.
        } else if (jugador.apuesta_a === sectorGanador) {
            gananciaPerdida = jugador.monto * (TASAS_DE_PAGO_SIMULACION[sectorGanador] || 0);
        } else {
            gananciaPerdida = -jugador.monto;
        }

        jugador.currentCapital += gananciaPerdida;
        gananciasJugador[jugador.nombre] = gananciaPerdida;

        if (jugador.currentCapital <= 0) {
            jugador.bankruptThisRepetition = true; // Marcar como en bancarrota para esta repetición.
        }
    });

    return { gananciasJugador, sectorGanador };
}

/**
 * Ejecuta la simulación de Montecarlo para un número dado de repeticiones y giros por repetición.
 * @param {number} repeticiones - El número de repeticiones de la simulación a ejecutar.
 * @param {Array<Object>} jugadoresEntrada - Array de objetos de configuración de jugadores.
 *                                     Ejemplo: { nombre: "SimPlayer1", apuesta_a: "$1", monto: 10, initialCapital: 1000 }
 * @param {number} girosPorRepeticion - El número de giros para cada repetición.
 * @returns {Object} Un objeto que contiene todos los datos de simulación recolectados.
 */
function ejecutarSimulacionMontecarlo(repeticiones, jugadoresEntrada, girosPorRepeticion = GIROS_POR_REPETICION_PREDETERMINADO) {
    const resultadosDeGiros = [];
    const evolucionCapital = {};
    const capitalesFinales = {};
    const bancarrotas = {};
    const gananciasTotales = {}; // Para calcular gananciaPerdidaPromedio.

    // Inicializar estructuras de datos para cada jugador.
    jugadoresEntrada.forEach(configJugador => {
        const nombreJugador = configJugador.nombre;
        evolucionCapital[nombreJugador] = [];
        capitalesFinales[nombreJugador] = [];
        bancarrotas[nombreJugador] = { conteo: 0, girosEnBancarrota: [] };
        gananciasTotales[nombreJugador] = 0;
    });

    for (let rep = 0; rep < repeticiones; rep++) {
        // Crear jugadores de simulación para esta repetición con capital inicial.
        const jugadoresSimuladosEstaRepeticion = jugadoresEntrada.map(confJ => {
            const capitalInicialLocal = confJ.initialCapital !== undefined ? confJ.initialCapital : CAPITAL_INICIAL_PREDETERMINADO;
            return {
                ...confJ, // Expandir configuración original del jugador (nombre, apuesta_a, monto).
                initialCapital: capitalInicialLocal, // Establecer capital inicial determinado.
                currentCapital: capitalInicialLocal, // Comenzar con este capital para la repetición.
                bankruptThisRepetition: false, // Restablecer estado de bancarrota para la nueva repetición.
            };
        });

        // Inicializar evolución del capital para esta repetición.
        jugadoresSimuladosEstaRepeticion.forEach(jugador => {
            evolucionCapital[jugador.nombre].push([]); // nuevo array para la evolución del capital de esta repetición.
        });

        for (let spin = 0; spin < girosPorRepeticion; spin++) {
            const sectorGanadorGiro = simular_giro();
            resultadosDeGiros.push(sectorGanadorGiro);

            // Pasar solo jugadoresSimuladosEstaRepeticion a simular_jugada.
            const resultadoRonda = simular_jugada(sectorGanadorGiro, jugadoresSimuladosEstaRepeticion);

            jugadoresSimuladosEstaRepeticion.forEach(jugador => {
                const nombreJugador = jugador.nombre;
                // Registrar capital después de este giro.
                evolucionCapital[nombreJugador][rep].push(jugador.currentCapital);
                // El estado de bancarrota (bankruptThisRepetition) es actualizado por simular_jugada.
                // Determinaremos el giro de la bancarrota al final de la repetición.
            });
        } // Fin de los giros para una repetición.

        // Después de todos los giros en una repetición.
        jugadoresSimuladosEstaRepeticion.forEach(jugador => {
            const nombreJugador = jugador.nombre;
            capitalesFinales[nombreJugador].push(jugador.currentCapital);
            gananciasTotales[nombreJugador] += (jugador.currentCapital - jugador.initialCapital);

            if (jugador.bankruptThisRepetition) {
                bancarrotas[nombreJugador].conteo++;
                let giroDeBancarrotaEstaRep = girosPorRepeticion; // Valor por defecto si no se encuentra (no debería ocurrir si bankruptThisRepetition es verdadero).
                // Encontrar el primer giro en esta repetición donde el capital fue <= 0.
                const historialCapitalParaRep = evolucionCapital[nombreJugador][rep];
                for (let s = 0; s < historialCapitalParaRep.length; s++) {
                    if (historialCapitalParaRep[s] <= 0) {
                        giroDeBancarrotaEstaRep = s + 1; // Los números de giro son indexados desde 1.
                        break;
                    }
                }
                bancarrotas[nombreJugador].girosEnBancarrota.push(giroDeBancarrotaEstaRep);
            }
        });
    } // Fin de las repeticiones.

    const gananciaPerdidaPromedio = {};
    jugadoresEntrada.forEach(configJugador => {
        const nombreJugador = configJugador.nombre;
        gananciaPerdidaPromedio[nombreJugador] = gananciasTotales[nombreJugador] / repeticiones;
    });

    const frecuenciasDeSector = calcularFrecuenciasSector(resultadosDeGiros);

    return {
        resultadosDeGiros: resultadosDeGiros,
        evolucionCapital: evolucionCapital,
        capitalesFinales: capitalesFinales,
        bancarrotas: bancarrotas,
        gananciaPerdidaPromedio: gananciaPerdidaPromedio,
        frecuenciasSector: frecuenciasDeSector,
        girosPorRepeticion: girosPorRepeticion, // Clave en el objeto de retorno
        estadisticasJugador: calcularEstadisticasJugador(capitalesFinales)
    };
}

/**
 * Calcula métricas estadísticas para un array de valores numéricos.
 * @param {Array<number>} arrayDeValores - El array de números.
 * @returns {Object} Un objeto que contiene media, varianza y desviación estándar.
 */
function calcularMetricasEstadisticas(arrayDeValores) {
    const n = arrayDeValores.length;
    if (n === 0) {
        return { media: 0, varianza: 0, desvEstandar: 0 };
    }

    const media = arrayDeValores.reduce((acc, val) => acc + val, 0) / n;

    if (n < 2) { // Varianza y Desv. Estándar son 0 si hay menos de 2 elementos.
        return { media: media, varianza: 0, desvEstandar: 0 };
    }

    const varianza = arrayDeValores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / n; // Varianza poblacional (N).
    const desvEstandar = Math.sqrt(varianza);

    return { media, varianza, desvEstandar };
}

/**
 * Calcula métricas estadísticas para el capital final de cada jugador.
 * @param {Object} capitalesFinales - Objeto donde las claves son nombres de jugadores y los valores son arrays de su capital final de cada repetición.
 *                                 Ejemplo: { "Player1": [1200, 850, ...], "Player2": [...] }
 * @returns {Object} Un objeto donde las claves son nombres de jugadores y los valores son objetos con media, varianza y desviación estándar de sus capitales finales.
 *                   Ejemplo: { "Player1": { media: M, varianza: V, desvEstandar: SD }, ... }
 */
function calcularEstadisticasJugador(capitalesFinales) {
    const estadisticasJugadorLocal = {};
    for (const nombreJugador in capitalesFinales) {
        if (capitalesFinales.hasOwnProperty(nombreJugador)) {
            estadisticasJugadorLocal[nombreJugador] = calcularMetricasEstadisticas(capitalesFinales[nombreJugador]);
        }
    }
    return estadisticasJugadorLocal;
}

/**
 * Calcula la frecuencia de cada sector a partir de una lista de resultados de giros.
 * @param {Array<string>} resultadosDeGiros - Una lista plana de resultados de giros (ej., ["$1", "Joker", "$1"]).
 * @returns {Object} Un objeto donde las claves son nombres de sectores y los valores son sus conteos.
 *                   Ejemplo: {"$1": 2, "Joker": 1}
 */
function calcularFrecuenciasSector(resultadosDeGiros) {
    const frecuencias = {};
    for (const resultado of resultadosDeGiros) {
        frecuencias[resultado] = (frecuencias[resultado] || 0) + 1;
    }
    return frecuencias;
}

// Ejemplo de cómo exportar o hacer disponibles las funciones si se usan módulos más adelante,
// o serán globales si este script se incluye directamente.
// Por ahora, la inclusión directa del script hará que estas funciones sean accesibles globalmente.
// self.MonteCarlo = { simular_giro, simular_jugada, ejecutarSimulacionMontecarlo }; // Actualizado nombre de función
