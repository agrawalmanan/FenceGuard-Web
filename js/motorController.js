// ================================================================
// MOTOR CONTROLLER - Core Logic
// ================================================================

class MotorController {
    constructor() {
        // Configuration
        this.config = {
            warningThreshold: 60,
            criticalThreshold: 75,
            cooldownTarget: 35,
            updateInterval: 1000,
            heatingRate: 3,
            coolingRate: 2,
            maxRPM: 3000,
            ratedCurrent: 5,
            ratedVoltage: 24,
            motorResistance: 1.2
        };

        // Motor states
        this.motors = {
            1: this.createMotorState(1),
            2: this.createMotorState(2)
        };

        // Initialize Motor 1 as running, Motor 2 as standby
        this.motors[1].status = 'running';
        this.motors[2].status = 'standby';
        this.activeMotor = 1;

        // Data structures
        this.tempHistory1 = new CircularBuffer(600);  // 10 minutes of data at 1/sec
        this.tempHistory2 = new CircularBuffer(600);
        this.slidingAvg1 = new SlidingWindowAverage(10);
        this.slidingAvg2 = new SlidingWindowAverage(10);
        this.eventLog = new EventQueue(200);
        this.motorStateMap = new MotorStateMap();
        this.alertQueue = new PriorityQueue();

        // Statistics
        this.switchoverCount = 0;
        this.switchoverHistory = [];
        this.systemStartTime = null;
        this.isRunning = false;

        // Simulator
        this.simulator = new TemperatureSimulator();
    }

    createMotorState(id) {
        return {
            id: id,
            status: 'standby', // 'running', 'standby', 'warning', 'overheated', 'cooling'
            temperature: 25,
            rpm: 0,
            current: 0,
            power: 0,
            minTemp: 25,
            maxTemp: 25,
            runtime: 0,       // in seconds
            lastSwitchTime: null
        };
    }

    // Main update cycle - called every tick
    update() {
        if (!this.isRunning) return;

        const now = Date.now();
        const timeLabel = new Date().toLocaleTimeString();

        // Update each motor
        for (const id of [1, 2]) {
            const motor = this.motors[id];
            const isActive = motor.status === 'running' || motor.status === 'warning';

            // Simulate temperature
            if (isActive) {
                motor.temperature = this.simulator.simulateRunning(
                    motor.temperature, this.config.heatingRate
                );
                motor.runtime++;
            } else if (motor.status === 'cooling' || motor.status === 'overheated' || motor.status === 'standby') {
                motor.temperature = this.simulator.simulateCooling(
                    motor.temperature, this.config.coolingRate
                );
            }

            // Simulate RPM and Current
            motor.rpm = this.simulator.simulateRPM(isActive, motor.rpm, this.config.maxRPM);
            motor.current = this.simulator.simulateCurrent(isActive, motor.temperature, this.config.ratedCurrent);
            motor.power = this.simulator.calculatePower(this.config.ratedVoltage, motor.current);

            // Update statistics
            motor.minTemp = Math.min(motor.minTemp, motor.temperature);
            motor.maxTemp = Math.max(motor.maxTemp, motor.temperature);

            // Record temperature
            const tempRecord = { temp: motor.temperature, time: now, label: timeLabel };
            if (id === 1) {
                this.tempHistory1.push(tempRecord);
                this.slidingAvg1.add(motor.temperature);
            } else {
                this.tempHistory2.push(tempRecord);
                this.slidingAvg2.add(motor.temperature);
            }

            // Update motor state map
            this.motorStateMap.set(id, { ...motor });

            // Check thresholds (algebraic inequality)
            this.checkMotorThresholds(id);
        }

        // Check if cooled motor can become standby
        this.checkCooldownComplete();
    }

    checkMotorThresholds(motorId) {
        const motor = this.motors[motorId];
        const threshold = AlgebraEngine.checkThreshold(
            motor.temperature, this.config.criticalThreshold
        );

        if (motor.status === 'running' || motor.status === 'warning') {
            // Warning zone
            if (motor.temperature >= this.config.warningThreshold && motor.temperature < this.config.criticalThreshold) {
                if (motor.status !== 'warning') {
                    motor.status = 'warning';
                    this.logEvent('warning', `Motor ${motorId}: Temperature WARNING at ${motor.temperature.toFixed(1)}°C`);
                    this.showAlert('warning', `Motor ${motorId} approaching critical temperature! (${motor.temperature.toFixed(1)}°C)`);
                }
            }

            // Critical - SWITCHOVER
            if (threshold.exceeded) {
                this.performSwitchover(motorId);
            }
        }
    }

    performSwitchover(overheatedMotorId) {
        const otherMotorId = overheatedMotorId === 1 ? 2 : 1;
        const overheated = this.motors[overheatedMotorId];
        const backup = this.motors[otherMotorId];

        // Check if backup is ready
        if (backup.status === 'overheated' || backup.status === 'cooling') {
            if (backup.temperature >= this.config.cooldownTarget + 10) {
                this.logEvent('danger', `CRITICAL: Backup motor ${otherMotorId} still cooling! Temp: ${backup.temperature.toFixed(1)}°C`);
                this.showAlert('danger', `CRITICAL: Both motors overheated! Fence may be compromised!`);
                // Still switch but log the danger
            }
        }

        // Shut down overheated motor
        overheated.status = 'overheated';
        this.logEvent('danger', `Motor ${overheatedMotorId}: OVERHEATED at ${overheated.temperature.toFixed(1)}°C - SHUTTING DOWN`);

        // Start backup motor
        backup.status = 'running';
        this.activeMotor = otherMotorId;
        this.logEvent('success', `Motor ${otherMotorId}: ACTIVATED as replacement`);

        // Record switchover
        this.switchoverCount++;
        this.switchoverHistory.push({
            time: new Date(),
            from: overheatedMotorId,
            to: otherMotorId,
            temperature: overheated.temperature,
            count: this.switchoverCount
        });

        this.showAlert('warning', `Switchover #${this.switchoverCount}: Motor ${overheatedMotorId} → Motor ${otherMotorId}`);

        // Add to priority queue for tracking
        this.alertQueue.push({
            priority: 1,
            type: 'switchover',
            motorId: overheatedMotorId,
            time: Date.now()
        });
    }

    checkCooldownComplete() {
        for (const id of [1, 2]) {
            const motor = this.motors[id];
            if (motor.status === 'overheated' || motor.status === 'cooling') {
                if (motor.temperature <= this.config.cooldownTarget) {
                    motor.status = 'standby';
                    motor.minTemp = motor.temperature;
                    motor.maxTemp = motor.temperature;
                    this.logEvent('success', `Motor ${id}: Cooled down to ${motor.temperature.toFixed(1)}°C - READY as backup`);
                } else {
                    motor.status = 'cooling';
                }
            }
        }
    }

    // Calculate rate of change for a motor
    getRateOfChange(motorId) {
        const history = motorId === 1 ? this.tempHistory1 : this.tempHistory2;

    // Use last 10 readings instead of 5 — more data = less noise impact
        const recent = history.getLast(10);
        if (recent.length < 4) return 0;

    // Use smoothed rate (half-split averaging method)
        return TemperatureStatistics.smoothedRateOfChange(recent);
    }

    // Estimate time to threshold using linear regression (algebra)
    getETAToThreshold(motorId) {
        const history = motorId === 1 ? this.tempHistory1 : this.tempHistory2;
        const recent = history.getLast(20);
        if (recent.length < 5) return null;

        const motor = this.motors[motorId];
        if (motor.status !== 'running' && motor.status !== 'warning') return null;

        const xValues = recent.map((r, i) => i);
        const yValues = recent.map(r => r.temp);

        const result = AlgebraEngine.linearRegression.timeToThreshold(
            xValues, yValues, this.config.criticalThreshold
        );

        if (result.time === Infinity || result.time < 0) return null;

        // Convert from data points to seconds
        const secondsLeft = (result.time - xValues.length) * (this.config.updateInterval / 1000);
        return Math.max(0, secondsLeft);
    }

    // Get average temperature
    getAverageTemp(motorId) {
        const avg = motorId === 1 ? this.slidingAvg1 : this.slidingAvg2;
        return avg.getAverage();
    }

    // Manual control
    manualStart(motorId) {
        const motor = this.motors[motorId];
        const otherId = motorId === 1 ? 2 : 1;

        motor.status = 'running';
        this.motors[otherId].status = 'standby';
        this.activeMotor = motorId;
        this.logEvent('info', `Manual: Motor ${motorId} started, Motor ${otherId} set to standby`);
    }

    manualStop(motorId) {
        const motor = this.motors[motorId];
        motor.status = 'standby';
        this.logEvent('info', `Manual: Motor ${motorId} stopped`);
    }

    // Event logging
    logEvent(type, message) {
        this.eventLog.enqueue({ type, message });
    }

    showAlert(type, message) {
        // Will be handled by app.js
        if (this.onAlert) this.onAlert(type, message);
    }

    // Start system
    start() {
        this.isRunning = true;
        this.systemStartTime = Date.now();
        this.motors[1].status = 'running';
        this.motors[2].status = 'standby';
        this.activeMotor = 1;
        this.logEvent('success', 'System STARTED - Motor 1 active, Motor 2 on standby');
    }

    // Stop system
    stop() {
        this.isRunning = false;
        this.motors[1].status = 'standby';
        this.motors[2].status = 'standby';
        this.logEvent('info', 'System STOPPED');
    }

    // Reset
    reset() {
        this.stop();
        this.motors[1] = this.createMotorState(1);
        this.motors[2] = this.createMotorState(2);
        this.tempHistory1.clear();
        this.tempHistory2.clear();
        this.slidingAvg1.clear();
        this.slidingAvg2.clear();
        this.eventLog.clear();
        this.switchoverCount = 0;
        this.switchoverHistory = [];
        this.systemStartTime = null;
        this.logEvent('info', 'System RESET');
    }

    // Export data as CSV
    exportCSV() {
        const history1 = this.tempHistory1.toArray();
        const history2 = this.tempHistory2.toArray();
        const maxLen = Math.max(history1.length, history2.length);

        let csv = 'Time,Motor1_Temp,Motor2_Temp\n';
        for (let i = 0; i < maxLen; i++) {
            const time = (history1[i] || history2[i])?.label || '';
            const t1 = history1[i]?.temp.toFixed(2) || '';
            const t2 = history2[i]?.temp.toFixed(2) || '';
            csv += `${time},${t1},${t2}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `motor_data_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Get system uptime string
    getUptime() {
        if (!this.systemStartTime) return '00:00:00';
        const elapsed = Math.floor((Date.now() - this.systemStartTime) / 1000);
        const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    // Calculate system health score
    getHealthScore() {
        let score = 100;

        for (const id of [1, 2]) {
            const motor = this.motors[id];
            if (motor.status === 'overheated') score -= 30;
            if (motor.status === 'warning') score -= 15;
            if (motor.temperature > this.config.warningThreshold) {
                score -= (motor.temperature - this.config.warningThreshold) * 0.5;
            }
        }

        // Deduct for many switchovers
        score -= this.switchoverCount * 2;

        return Math.max(0, Math.min(100, Math.round(score)));
    }
}

window.MotorController = MotorController;