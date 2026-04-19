// ================================================================
// ALGEBRA & MATHEMATICS ENGINE
// ================================================================

/**
 * ALGEBRA CONCEPTS:
 * 1. Newton's Law of Cooling - Exponential decay (differential equations → algebra)
 * 2. Linear Regression - Least squares method (y = mx + b)
 * 3. Matrix operations - State representation
 * 4. Linear Interpolation - Temperature estimation
 * 5. Algebraic inequality - Threshold comparison
 * 6. Polynomial curve fitting
 * 7. Rate equations - dT/dt calculations
 */

const AlgebraEngine = {

    // ============ 1. NEWTON'S LAW OF COOLING ============
    // T(t) = T_env + (T_0 - T_env) * e^(-kt)
    // This is a key algebraic model: exponential decay
    newtonCooling: {
        // Calculate temperature at time t
        temperatureAt(T0, Tenv, k, t) {
            return Tenv + (T0 - Tenv) * Math.exp(-k * t);
        },

        // Solve for time to reach target temperature
        // Algebraic manipulation: t = -ln((T_target - T_env) / (T_0 - T_env)) / k
        timeToReach(T0, Tenv, k, Ttarget) {
            if (T0 === Tenv || Ttarget <= Tenv) return Infinity;
            const ratio = (Ttarget - Tenv) / (T0 - Tenv);
            if (ratio <= 0) return Infinity;
            return -Math.log(ratio) / k;
        },

        // Estimate k from two data points
        // k = -ln((T2 - Tenv) / (T1 - Tenv)) / (t2 - t1)
        estimateK(T1, T2, Tenv, deltaT) {
            if (deltaT === 0 || T1 === Tenv) return 0;
            const ratio = (T2 - Tenv) / (T1 - Tenv);
            if (ratio <= 0 || ratio >= 1) return 0;
            return -Math.log(ratio) / deltaT;
        },

        // Generate cooling curve data points
        generateCurve(T0, Tenv, k, duration, steps = 100) {
            const data = [];
            for (let i = 0; i <= steps; i++) {
                const t = (duration / steps) * i;
                data.push({
                    time: t,
                    temp: this.temperatureAt(T0, Tenv, k, t)
                });
            }
            return data;
        }
    },

    // ============ 2. LINEAR REGRESSION ============
    // Least Squares: ŷ = β₀ + β₁x
    // β₁ = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
    // β₀ = ȳ - β₁x̄
    linearRegression: {
        fit(xValues, yValues) {
            const n = xValues.length;
            if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

            // Calculate means (algebraic average)
            const xMean = xValues.reduce((a, b) => a + b, 0) / n;
            const yMean = yValues.reduce((a, b) => a + b, 0) / n;

            // Calculate slope (β₁) using algebraic formula
            let numerator = 0;
            let denominator = 0;
            for (let i = 0; i < n; i++) {
                const xDiff = xValues[i] - xMean;
                const yDiff = yValues[i] - yMean;
                numerator += xDiff * yDiff;
                denominator += xDiff * xDiff;
            }

            const slope = denominator !== 0 ? numerator / denominator : 0;
            const intercept = yMean - slope * xMean;

            // R² (coefficient of determination)
            let ssRes = 0, ssTot = 0;
            for (let i = 0; i < n; i++) {
                const predicted = slope * xValues[i] + intercept;
                ssRes += Math.pow(yValues[i] - predicted, 2);
                ssTot += Math.pow(yValues[i] - yMean, 2);
            }
            const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

            return { slope, intercept, r2 };
        },

        // Predict y for given x: y = mx + b (fundamental algebra)
        predict(model, x) {
            return model.slope * x + model.intercept;
        },

        // Solve for x given y: x = (y - b) / m (algebraic rearrangement)
        solveForX(model, y) {
            if (model.slope === 0) return Infinity;
            return (y - model.intercept) / model.slope;
        },

        // Predict time to threshold
        timeToThreshold(xValues, yValues, threshold) {
            const model = this.fit(xValues, yValues);
            if (model.slope <= 0) return { time: Infinity, model };
            const time = this.solveForX(model, threshold);
            return { time, model };
        }
    },

    // ============ 3. MATRIX OPERATIONS ============
    // State vector representation for the dual-motor system
    matrix: {
        // Create state vector
        createStateVector(motor1, motor2) {
            return [
                [motor1.temperature],
                [motor2.temperature],
                [motor1.rpm],
                [motor2.rpm],
                [motor1.current],
                [motor2.current]
            ];
        },

        // Matrix multiplication: C = A × B
        multiply(A, B) {
            const rowsA = A.length;
            const colsA = A[0].length;
            const colsB = B[0].length;
            const C = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));

            for (let i = 0; i < rowsA; i++) {
                for (let j = 0; j < colsB; j++) {
                    for (let k = 0; k < colsA; k++) {
                        C[i][j] += A[i][k] * B[k][j];
                    }
                }
            }
            return C;
        },

        // Matrix-vector addition: C = A + B
        add(A, B) {
            return A.map((row, i) => row.map((val, j) => val + B[i][j]));
        },

        // Scalar multiplication
        scalarMultiply(matrix, scalar) {
            return matrix.map(row => row.map(val => val * scalar));
        },

        // Transition matrix for state update
        // S(t+1) = A * S(t) + B * u(t)
        // A models natural behavior, B models control inputs
        createTransitionMatrix(dt, heatingRate, coolingRate) {
            // Simplified linear state transition
            return [
                [1, 0, 0, 0, 0, 0],  // T1 depends on T1
                [0, 1, 0, 0, 0, 0],  // T2 depends on T2
                [0, 0, 0.99, 0, 0, 0], // RPM1 slight decay
                [0, 0, 0, 0.99, 0, 0], // RPM2 slight decay
                [0, 0, 0, 0, 1, 0],    // I1
                [0, 0, 0, 0, 0, 1]     // I2
            ];
        },

        // Format matrix for display
        toString(matrix) {
            return matrix.map(row =>
                '│ ' + row.map(v =>
                    (typeof v === 'number' ? v.toFixed(2) : v).toString().padStart(8)
                ).join(' ') + ' │'
            ).join('\n');
        }
    },

    // ============ 4. LINEAR INTERPOLATION ============
    // f(x) = y1 + (y2 - y1) * (x - x1) / (x2 - x1)
    lerp(x1, y1, x2, y2, x) {
        if (x2 === x1) return y1;
        return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    },

    // ============ 5. ALGEBRAIC INEQUALITIES ============
    // Motor switches when T(t) >= Threshold
    checkThreshold(temperature, threshold) {
        return {
            exceeded: temperature >= threshold,
            margin: threshold - temperature,
            percentage: (temperature / threshold) * 100
        };
    },

    // ============ 6. HEATING MODEL ============
    // T(t) = T_ambient + P*R * (1 - e^(-t/τ))
    // P = power dissipated, R = thermal resistance, τ = thermal time constant
    heatingModel: {
        temperatureAt(Tambient, power, thermalResistance, timeConstant, t) {
            const Tsteady = Tambient + power * thermalResistance;
            return Tambient + (Tsteady - Tambient) * (1 - Math.exp(-t / timeConstant));
        },

        steadyStateTemp(Tambient, power, thermalResistance) {
            return Tambient + power * thermalResistance;
        }
    },

    // ============ 7. MOTOR EFFICIENCY ============
    // η = (P_out / P_in) × 100
    // P_in = V × I
    // P_out = P_in - P_loss
    // P_loss = I² × R (Joule heating - quadratic algebra)
    motorEfficiency(voltage, current, resistance) {
        const Pinput = voltage * current;
        const Ploss = current * current * resistance; // I²R - quadratic
        const Poutput = Math.max(0, Pinput - Ploss);
        const efficiency = Pinput > 0 ? (Poutput / Pinput) * 100 : 0;
        return {
            input: Pinput,
            output: Poutput,
            loss: Ploss,
            efficiency: efficiency
        };
    },

    // ============ 8. POLYNOMIAL FITTING ============
    // For more complex temperature curves: T(t) = a₀ + a₁t + a₂t²
    quadraticFit(xValues, yValues) {
        const n = xValues.length;
        if (n < 3) return { a: 0, b: 0, c: 0 };

        // Using normal equations (matrix algebra):
        // [Σxᵢ⁴  Σxᵢ³  Σxᵢ²] [a]   [Σxᵢ²yᵢ]
        // [Σxᵢ³  Σxᵢ²  Σxᵢ ] [b] = [Σxᵢyᵢ ]
        // [Σxᵢ²  Σxᵢ   n   ] [c]   [Σyᵢ   ]

        let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0;
        let sy = 0, sxy = 0, sx2y = 0;

        for (let i = 0; i < n; i++) {
            const x = xValues[i], y = yValues[i];
            sx += x; sx2 += x*x; sx3 += x*x*x; sx4 += x*x*x*x;
            sy += y; sxy += x*y; sx2y += x*x*y;
        }

        // Solve using Cramer's rule (algebraic determinants)
        const D = sx4*(sx2*n - sx*sx) - sx3*(sx3*n - sx*sx2) + sx2*(sx3*sx - sx2*sx2);
        if (Math.abs(D) < 1e-10) return { a: 0, b: 0, c: 0 };

        const Da = sx2y*(sx2*n - sx*sx) - sx3*(sxy*n - sy*sx) + sx2*(sxy*sx - sy*sx2);
        const Db = sx4*(sxy*n - sy*sx) - sx2y*(sx3*n - sx*sx2) + sx2*(sx3*sy - sx2*sxy);
        const Dc = sx4*(sx2*sy - sx*sxy) - sx3*(sx3*sy - sx*sx2y) + sx2y*(sx3*sx - sx2*sx2);

        return { a: Da/D, b: Db/D, c: Dc/D };
    }
};

window.AlgebraEngine = AlgebraEngine;