// ================================================================
// MAIN APPLICATION - Ties Everything Together
// ================================================================

let controller;
let renderer;
let updateTimer;
let displayMaxPoints = 60;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    controller = new MotorController();
    renderer = new GraphRenderer();

    // Initialize charts
    renderer.initMotorChart('motor1Chart', 'Motor 1', '#3b82f6');
    renderer.initMotorChart('motor2Chart', 'Motor 2', '#8b5cf6');
    renderer.initCombinedChart('combinedChart');
    renderer.initCoolingChart('coolingChart');
    renderer.initRegressionChart('regressionChart');

    // Set up navigation
    setupNavigation();

    // Set up alert callback
    controller.onAlert = (type, message) => showAlertBanner(type, message);

    // Auto-start
    startSystem();

    console.log('🔋 FenceGuard IoT Motor Monitor initialized');
});

// ============ NAVIGATION ============
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            switchSection(section);
        });
    });
}

function switchSection(sectionId) {
    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

    // Update section
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');

    // Trigger section-specific updates
    if (sectionId === 'algebra') {
        updateMathSection();
    }
}

// ============ SYSTEM CONTROLS ============
// Add at the bottom of your existing startSystem() function

function startSystem() {
    controller.start();

    // Connect to backend
    ApiService.connectWebSocket();

    // Listen for messages from backend
    // (e.g., settings changed from mobile app)
    ApiService.onMessage = (msg) => {
        if (msg.type === 'SETTINGS_UPDATE') {
            Object.keys(msg.data).forEach(key => {
                controller.config[key] = msg.data[key];
            });
            updateUI();
        }
        if (msg.type === 'CONTROL_COMMAND') {
            const { motorId, action } = msg.data;
            manualControl(motorId, action);
        }
    };

    updateTimer = setInterval(() => {
        controller.update();
        updateUI();

        // Push data to backend every tick
        const snap = {
            motor1:          controller.motors[1],
            motor2:          controller.motors[2],
            activeMotor:     controller.activeMotor,
            switchoverCount: controller.switchoverCount,
            uptime:          controller._getUptime?.() || 0,
            healthScore:     controller._getHealthScore?.() || 100,
            fenceActive:     controller.motors[controller.activeMotor].status === 'running',
        };
        ApiService.sendData(snap);

    }, controller.config.updateInterval);
}

function stopSystem() {
    controller.stop();
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = null;
    updateUI();
}

function resetSystem() {
    stopSystem();
    controller.reset();
    
    // Reset charts
    ['motor1Chart', 'motor2Chart', 'combinedChart'].forEach(id => {
        const chart = renderer.getChart(id);
        if (chart) {
            chart.data.labels = [];
            chart.data.datasets.forEach(ds => ds.data = []);
            chart.update();
        }
    });

    updateUI();
    startSystem();
}

// ============ MAIN UI UPDATE ============
function updateUI() {
    updateMotorCard(1);
    updateMotorCard(2);
    updateOverviewStrip();
    updateGraphs();
    updateEventLog();
    updateSwitchoverIndicator();
    updateFenceStatus();
}

function updateMotorCard(motorId) {
    const motor = controller.motors[motorId];
    const prefix = `motor${motorId}`;
    const isActive = motor.status === 'running' || motor.status === 'warning';

    // Card styling
    const card = document.getElementById(`${prefix}Card`);
    card.className = 'motor-card';
    if (motor.status === 'standby') card.classList.add('standby');
    if (motor.status === 'warning') card.classList.add('warning');
    if (motor.status === 'overheated' || motor.status === 'danger') card.classList.add('danger');

    // Gear animation
    const gear = document.getElementById(`${prefix}Gear`);
    gear.className = 'fas fa-cog motor-gear';
    if (isActive) gear.classList.add('spinning');

    // Icon wrapper
    const iconWrapper = document.getElementById(`${prefix}IconWrapper`);
    iconWrapper.className = 'motor-icon-wrapper';
    if (!isActive) iconWrapper.classList.add('standby');

    // Status
    const statusEl = document.getElementById(`${prefix}Status`);
    const statusIndicator = statusEl.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator';

    let statusText = 'STANDBY';
    if (motor.status === 'running') { statusText = 'RUNNING'; statusIndicator.classList.add('running'); statusEl.className = 'motor-status'; }
    else if (motor.status === 'warning') { statusText = 'WARNING'; statusIndicator.classList.add('warning'); statusEl.className = 'motor-status warning'; }
    else if (motor.status === 'overheated') { statusText = 'OVERHEATED'; statusIndicator.classList.add('danger'); statusEl.className = 'motor-status danger'; }
    else if (motor.status === 'cooling') { statusText = 'COOLING'; statusIndicator.classList.add('warning'); statusEl.className = 'motor-status warning'; }
    else { statusIndicator.classList.add('standby'); statusEl.className = 'motor-status standby'; }

    statusEl.querySelector('span').textContent = statusText;

    // Role
    document.getElementById(`${prefix}Role`).textContent =
        controller.activeMotor === motorId ? 'PRIMARY' : 'BACKUP';

    // Temperature number
    const temp = motor.temperature;
    document.getElementById(`${prefix}Temp`).textContent = temp.toFixed(1);

    // Temperature ring (SVG circle)
    const ring = document.getElementById(`${prefix}Ring`);
    const circumference = 2 * Math.PI * 54; // r=54
    const percentage = Math.min(temp / 120, 1);
    ring.style.strokeDashoffset = circumference * (1 - percentage);

    // Ring color based on temperature
    if (temp >= controller.config.criticalThreshold) {
        ring.style.stroke = '#ef4444';
    } else if (temp >= controller.config.warningThreshold) {
        ring.style.stroke = '#f59e0b';
    } else {
        ring.style.stroke = '#10b981';
    }

    // Temperature details
    document.getElementById(`${prefix}Min`).textContent = motor.minTemp.toFixed(1) + '°C';
    document.getElementById(`${prefix}Max`).textContent = motor.maxTemp.toFixed(1) + '°C';
    document.getElementById(`${prefix}Avg`).textContent = controller.getAverageTemp(motorId).toFixed(1) + '°C';

    const rate = controller.getRateOfChange(motorId);
    const rateEl = document.getElementById(`${prefix}Rate`);
    rateEl.textContent = (rate >= 0 ? '+' : '') + rate.toFixed(2) + '°C/min';
    rateEl.style.color = rate > 0 ? '#ef4444' : rate < 0 ? '#10b981' : '#94a3b8';

    const eta = controller.getETAToThreshold(motorId);
    document.getElementById(`${prefix}ETA`).textContent =
        eta !== null ? Math.round(eta) + 's' : 'N/A';

    // Temperature bar
    const barFill = document.getElementById(`${prefix}Bar`);
    const barPercentage = (temp / 120) * 100;
    barFill.style.width = barPercentage + '%';
    barFill.className = 'temp-bar-fill';
    if (temp >= controller.config.criticalThreshold) barFill.classList.add('danger');
    else if (temp >= controller.config.warningThreshold) barFill.classList.add('warning');

    // Threshold marker position
    const threshMarker = document.getElementById(`${prefix}Threshold`);
    threshMarker.style.left = (controller.config.criticalThreshold / 120 * 100) + '%';
    document.getElementById(`${prefix}ThreshLabel`).textContent = controller.config.criticalThreshold;

    // Metrics
    document.getElementById(`${prefix}RPM`).textContent = Math.round(motor.rpm);
    document.getElementById(`${prefix}Current`).textContent = motor.current.toFixed(2);
    document.getElementById(`${prefix}Power`).textContent = motor.power.toFixed(1);

    const minutes = Math.floor(motor.runtime * controller.config.updateInterval / 60000);
    document.getElementById(`${prefix}Runtime`).textContent = minutes + 'm';
}

function updateOverviewStrip() {
    const activeMotor = controller.motors[controller.activeMotor];
    const fenceActive = activeMotor.status === 'running' || activeMotor.status === 'warning';

    document.getElementById('fenceVoltage').textContent = fenceActive ? '5000V' : '0V';
    document.getElementById('systemUptime').textContent = controller.getUptime();
    document.getElementById('switchoverCount').textContent = controller.switchoverCount;
}

function updateGraphs() {
    const history1 = controller.tempHistory1.toArray();
    const history2 = controller.tempHistory2.toArray();

    const labels1 = history1.map(h => h.label);
    const temps1 = history1.map(h => h.temp);
    const labels2 = history2.map(h => h.label);
    const temps2 = history2.map(h => h.temp);

    renderer.updateChart('motor1Chart', labels1, temps1, displayMaxPoints);
    renderer.updateChart('motor2Chart', labels2, temps2, displayMaxPoints);

    // Combined chart
    const maxLen = Math.max(labels1.length, labels2.length);
    const combinedLabels = (labels1.length >= labels2.length ? labels1 : labels2);
    renderer.updateCombinedChart('combinedChart', combinedLabels, temps1, temps2, displayMaxPoints);
}

function updateEventLog() {
    const logEl = document.getElementById('eventLog');
    const events = controller.eventLog.getAll();

    logEl.innerHTML = events.slice(0, 50).map(event => {
        const time = event.timestamp.toLocaleTimeString();
        return `<div class="log-entry ${event.type}">
            <span class="log-time">${time}</span>
            <span class="log-msg">${event.message}</span>
        </div>`;
    }).join('');

    // Auto scroll to top (newest)
    logEl.scrollTop = 0;
}

function updateSwitchoverIndicator() {
    const arrow = document.getElementById('switchArrow');
    const mode = document.getElementById('switchMode');

    const m1 = controller.motors[1];
    const m2 = controller.motors[2];

    if (m1.status === 'warning' || m2.status === 'warning') {
        arrow.classList.add('active');
        mode.textContent = 'ALERT';
        mode.style.color = '#f59e0b';
    } else {
        arrow.classList.remove('active');
        mode.textContent = `Motor ${controller.activeMotor} Active`;
        mode.style.color = '#3b82f6';
    }
}

function updateFenceStatus() {
    const fenceEl = document.getElementById('fenceStatus');
    const dot = fenceEl.querySelector('.status-dot');
    const activeMotor = controller.motors[controller.activeMotor];
    const fenceActive = activeMotor.status === 'running' || activeMotor.status === 'warning';

    if (fenceActive) {
        fenceEl.className = 'fence-status';
        dot.className = 'status-dot active';
        fenceEl.querySelector('span').textContent = 'Fence: ACTIVE';
    } else {
        fenceEl.className = 'fence-status danger';
        dot.className = 'status-dot danger';
        fenceEl.querySelector('span').textContent = 'Fence: DANGER';
    }
}

// ============ ALERT BANNER ============
function showAlertBanner(type, message) {
    const banner = document.getElementById('alertBanner');
    const msgEl = document.getElementById('alertMessage');

    banner.className = `alert-banner show ${type}`;
    msgEl.textContent = message;

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        banner.classList.remove('show');
    }, 5000);
}

function dismissAlert() {
    document.getElementById('alertBanner').classList.remove('show');
}

// ============ MANUAL CONTROLS ============
function manualControl(motorId, action) {
    if (action === 'start') {
        controller.manualStart(motorId);
    } else {
        controller.manualStop(motorId);
    }
    updateUI();
}

// ============ SETTINGS ============
function updateSetting(key, value) {
    value = parseFloat(value);
    switch (key) {
        case 'warning':
            controller.config.warningThreshold = value;
            document.getElementById('warningValue').textContent = value + '°C';
            break;
        case 'critical':
            controller.config.criticalThreshold = value;
            document.getElementById('criticalValue').textContent = value + '°C';
            // Update chart annotations
            ['motor1Chart', 'motor2Chart', 'combinedChart'].forEach(id => {
                renderer.updateThresholdAnnotation(id, value, controller.config.warningThreshold);
            });
            break;
        case 'cooldown':
            controller.config.cooldownTarget = value;
            document.getElementById('cooldownValue').textContent = value + '°C';
            break;
        case 'interval':
            controller.config.updateInterval = value;
            document.getElementById('intervalValue').textContent = value + 'ms';
            // Restart timer with new interval
            if (controller.isRunning) {
                clearInterval(updateTimer);
                updateTimer = setInterval(() => {
                    controller.update();
                    updateUI();
                }, value);
            }
            break;
        case 'heating':
            controller.config.heatingRate = value;
            document.getElementById('heatingValue').textContent = value + 'x';
            break;
        case 'cooling':
            controller.config.coolingRate = value;
            document.getElementById('coolingValue').textContent = value + 'x';
            break;
    }
}

function setTimeRange(motorId, seconds) {
    displayMaxPoints = seconds;
    // Update button states
    const graphCard = document.querySelectorAll('.graph-card')[motorId - 1];
    if (graphCard) {
        graphCard.querySelectorAll('.graph-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
}

function clearLog() {
    controller.eventLog.clear();
    controller.logEvent('info', 'Event log cleared');
    updateEventLog();
}

function exportData() {
    controller.exportCSV();
    controller.logEvent('info', 'Data exported to CSV');
}

// ============ MATH SECTION ============
function updateMathSection() {
    plotCoolingCurve();
    updateRegressionChart();
    updateStateMatrix();
    updateThresholdAnalysis();
}

function plotCoolingCurve() {
    const T0 = parseFloat(document.getElementById('mathT0')?.value || 90);
    const Tenv = parseFloat(document.getElementById('mathTenv')?.value || 25);
    const k = parseFloat(document.getElementById('mathK')?.value || 0.05);

    const curveData = AlgebraEngine.newtonCooling.generateCurve(T0, Tenv, k, 60, 100);
    const labels = curveData.map(d => d.time.toFixed(1));
    const temps = curveData.map(d => d.temp);

    const chart = renderer.getChart('coolingChart');
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = temps;
        chart.update();
    }

    // Calculate results
    const timeToThresh = AlgebraEngine.newtonCooling.timeToReach(T0, Tenv, k, controller.config.criticalThreshold);
    const halfLife = AlgebraEngine.newtonCooling.timeToReach(T0, Tenv, k, (T0 + Tenv) / 2);

    const resultsEl = document.getElementById('coolingResults');
    if (resultsEl) {
        resultsEl.innerHTML = `
            <strong>Results:</strong><br>
            • Initial Temp: ${T0}°C → Ambient: ${Tenv}°C<br>
            • Cooling constant (k): ${k}<br>
            • Time to reach ${controller.config.criticalThreshold}°C: <strong>${timeToThresh.toFixed(1)} min</strong><br>
            • Half-life (reach ${((T0 + Tenv) / 2).toFixed(1)}°C): <strong>${halfLife.toFixed(1)} min</strong><br>
            • Temp at t=5min: <strong>${AlgebraEngine.newtonCooling.temperatureAt(T0, Tenv, k, 5).toFixed(1)}°C</strong><br>
            • Temp at t=10min: <strong>${AlgebraEngine.newtonCooling.temperatureAt(T0, Tenv, k, 10).toFixed(1)}°C</strong>
        `;
    }
}

function updateRegressionChart() {
    const history = controller.tempHistory1.toArray();
    if (history.length < 5) return;

    const recent = history.slice(-30);
    const xValues = recent.map((_, i) => i);
    const yValues = recent.map(h => h.temp);

    const model = AlgebraEngine.linearRegression.fit(xValues, yValues);

    // Actual data points
    const scatterData = xValues.map((x, i) => ({ x, y: yValues[i] }));

    // Regression line (extend beyond data for prediction)
    const extendedX = [...xValues, xValues.length + 5, xValues.length + 10, xValues.length + 15];
    const lineData = extendedX.map(x => ({
        x,
        y: AlgebraEngine.linearRegression.predict(model, x)
    }));

    const chart = renderer.getChart('regressionChart');
    if (chart) {
        chart.data.datasets[0].data = scatterData;
        chart.data.datasets[1].data = lineData;
        chart.update();
    }

    const timeToThresh = AlgebraEngine.linearRegression.timeToThreshold(xValues, yValues, controller.config.criticalThreshold);

    const resultsEl = document.getElementById('regressionResults');
    if (resultsEl) {
        resultsEl.innerHTML = `
            <strong>Linear Regression Results:</strong><br>
            • Equation: T = ${model.slope.toFixed(4)}t + ${model.intercept.toFixed(2)}<br>
            • Slope (rate): <strong>${model.slope.toFixed(4)}°C/tick</strong><br>
            • R² (fit quality): <strong>${model.r2.toFixed(4)}</strong><br>
            • Est. ticks to ${controller.config.criticalThreshold}°C: <strong>${
                timeToThresh.time === Infinity ? 'N/A' : timeToThresh.time.toFixed(1)
            }</strong>
        `;
    }
}

function updateStateMatrix() {
    const m1 = controller.motors[1];
    const m2 = controller.motors[2];

    const stateVector = AlgebraEngine.matrix.createStateVector(m1, m2);
    const transMatrix = AlgebraEngine.matrix.createTransitionMatrix(1, controller.config.heatingRate, controller.config.coolingRate);

    const display = document.getElementById('stateMatrix');
    if (display) {
        display.textContent =
            `State Vector S(t):\n` +
            `┌                    ┐\n` +
            `│  T₁  = ${m1.temperature.toFixed(2).padStart(8)} │\n` +
            `│  T₂  = ${m2.temperature.toFixed(2).padStart(8)} │\n` +
            `│ RPM₁ = ${m1.rpm.toFixed(0).padStart(8)} │\n` +
            `│ RPM₂ = ${m2.rpm.toFixed(0).padStart(8)} │\n` +
            `│  I₁  = ${m1.current.toFixed(2).padStart(8)} │\n` +
            `│  I₂  = ${m2.current.toFixed(2).padStart(8)} │\n` +
            `└                    ┘\n\n` +
            `Motor 1 Efficiency:\n` +
            `  P_in  = V × I = ${controller.config.ratedVoltage} × ${m1.current.toFixed(2)} = ${m1.power.toFixed(1)}W\n` +
            `  P_loss = I²R = ${m1.current.toFixed(2)}² × ${controller.config.motorResistance} = ${(m1.current * m1.current * controller.config.motorResistance).toFixed(1)}W\n` +
            `  η = ${AlgebraEngine.motorEfficiency(controller.config.ratedVoltage, m1.current, controller.config.motorResistance).efficiency.toFixed(1)}%`;
    }
}

function updateThresholdAnalysis() {
    const display = document.getElementById('thresholdAnalysis');
    if (!display) return;

    const m1 = controller.motors[1];
    const m2 = controller.motors[2];
    const thresh = controller.config.criticalThreshold;

    const analysis1 = AlgebraEngine.checkThreshold(m1.temperature, thresh);
    const analysis2 = AlgebraEngine.checkThreshold(m2.temperature, thresh);

    const eta1 = controller.getETAToThreshold(1);
    const eta2 = controller.getETAToThreshold(2);

    display.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div style="padding: 1rem; background: rgba(59,130,246,0.1); border-radius: 8px;">
                <strong style="color: #3b82f6;">Motor 1</strong><br>
                T = ${m1.temperature.toFixed(1)}°C<br>
                Threshold = ${thresh}°C<br>
                Margin = <strong>${analysis1.margin.toFixed(1)}°C</strong><br>
                ${analysis1.percentage.toFixed(1)}% of threshold<br>
                ${analysis1.exceeded ? 
                    '<span style="color:#ef4444;">⚠ T ≥ Threshold (EXCEEDED)</span>' : 
                    '<span style="color:#10b981;">✓ T < Threshold (SAFE)</span>'}
                <br>ETA: ${eta1 !== null ? eta1 + 's' : 'N/A'}
            </div>
            <div style="padding: 1rem; background: rgba(139,92,246,0.1); border-radius: 8px;">
                <strong style="color: #8b5cf6;">Motor 2</strong><br>
                T = ${m2.temperature.toFixed(1)}°C<br>
                Threshold = ${thresh}°C<br>
                Margin = <strong>${analysis2.margin.toFixed(1)}°C</strong><br>
                ${analysis2.percentage.toFixed(1)}% of threshold<br>
                ${analysis2.exceeded ? 
                    '<span style="color:#ef4444;">⚠ T ≥ Threshold (EXCEEDED)</span>' : 
                    '<span style="color:#10b981;">✓ T < Threshold (SAFE)</span>'}
                <br>ETA: ${eta2 !== null ? eta2 + 's' : 'N/A'}
            </div>
        </div>
        <div style="margin-top: 1rem; padding: 0.8rem; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 0.8rem;">
            <strong>Algebraic Decision Rule:</strong><br>
            IF T(motor_active) ≥ ${thresh}°C THEN switch_to(motor_backup)<br>
            IF T(motor_backup) ≤ ${controller.config.cooldownTarget}°C THEN mark_as(READY)
        </div>
    `;
}

// Periodically update math section if visible
setInterval(() => {
    if (document.getElementById('algebra')?.classList.contains('active')) {
        updateRegressionChart();
        updateStateMatrix();
        updateThresholdAnalysis();
    }
}, 3000);