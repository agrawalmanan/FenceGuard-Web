// ================================================================
// TEMPERATURE SIMULATOR
// ================================================================
// Simulates realistic DC motor temperature behavior

class TemperatureSimulator {
    constructor() {
        this.ambientTemp = 25;
        this.maxTemp = 120;
    }

    simulateRunning(currentTemp, heatingMultiplier = 3) {
        // Heating component — motor generates heat proportional to load
        const baseHeating = 0.3 * heatingMultiplier;
        const randomFactor = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
        const heating = baseHeating * randomFactor;

        // Natural cooling (Newton's Law)
        // OLD: 0.02 * tempDiff  ← too aggressive, overtakes heating at ~50°C
        // NEW: 0.008 * tempDiff ← balanced so motor always net-heats when running
        const tempDiff = currentTemp - this.ambientTemp;
        const coolingCoeff = 0.008; // reduced from 0.02
        const cooling = coolingCoeff * tempDiff;

        // Small sensor noise
        const noise = (Math.random() - 0.5) * 0.2;

        const newTemp = currentTemp + heating - cooling + noise;
        return Math.min(this.maxTemp, Math.max(this.ambientTemp, newTemp));
    }

    simulateCooling(currentTemp, coolingMultiplier = 2) {
        // When motor is OFF, cooling dominates (higher coefficient)
        const k = 0.04 * coolingMultiplier; // higher than running-state cooling
        const tempDiff = currentTemp - this.ambientTemp;
        const cooling = k * tempDiff;
        const noise = (Math.random() - 0.5) * 0.1;

        return Math.max(this.ambientTemp, currentTemp - cooling + noise);
    }

    // Simulate RPM based on motor state
    simulateRPM(isRunning, currentRPM, maxRPM = 3000) {
        if (isRunning) {
            // Ramp up: RPM increases towards max (first-order system response)
            const diff = maxRPM - currentRPM;
            const rampRate = 0.1;
            const noise = (Math.random() - 0.5) * 20;
            return Math.min(maxRPM, currentRPM + diff * rampRate + noise);
        } else {
            // Ramp down: RPM decreases towards 0
            const decayRate = 0.15;
            return Math.max(0, currentRPM * (1 - decayRate) + (Math.random() - 0.5) * 5);
        }
    }

    // Simulate current draw: I = V/R + load_factor
    // When temperature increases, resistance increases → current behavior changes
    simulateCurrent(isRunning, temperature, ratedCurrent = 5) {
        if (!isRunning) return 0;
        // Temperature coefficient of resistance (algebra: linear relationship)
        // R(T) = R_0 * (1 + α * (T - T_0))
        const alpha = 0.004; // temperature coefficient for copper
        const resistanceFactor = 1 + alpha * (temperature - this.ambientTemp);
        const baseCurrent = ratedCurrent / resistanceFactor;
        const noise = (Math.random() - 0.5) * 0.2;
        return Math.max(0, baseCurrent + noise);
    }

    // Calculate power: P = V * I (algebraic relationship)
    calculatePower(voltage, current) {
        return voltage * current;
    }
}

window.TemperatureSimulator = TemperatureSimulator;