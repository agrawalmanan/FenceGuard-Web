// ================================================================
// GRAPH RENDERER - Chart.js Configuration
// ================================================================

class GraphRenderer {
    constructor() {
        this.charts = {};
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(42, 58, 78, 0.3)' }
                },
                y: {
                    ticks: { color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(42, 58, 78, 0.3)' }
                }
            }
        };
    }

    initMotorChart(canvasId, motorLabel, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        // Set canvas height
        ctx.parentElement.style.height = '250px';

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: `${motorLabel} Temperature (°C)`,
                        data: [],
                        borderColor: color,
                        backgroundColor: color + '20',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    annotation: {
                        annotations: {
                            thresholdLine: {
                                type: 'line',
                                yMin: 75,
                                yMax: 75,
                                borderColor: '#ef4444',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    display: true,
                                    content: 'Threshold',
                                    position: 'end',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    font: { size: 10 }
                                }
                            },
                            warningLine: {
                                type: 'line',
                                yMin: 60,
                                yMax: 60,
                                borderColor: '#f59e0b',
                                borderWidth: 1,
                                borderDash: [3, 3],
                                label: {
                                    display: true,
                                    content: 'Warning',
                                    position: 'start',
                                    backgroundColor: '#f59e0b',
                                    color: '#fff',
                                    font: { size: 9 }
                                }
                            }
                        }
                    }
                },
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 120,
                        title: {
                            display: true,
                            text: 'Temperature (°C)',
                            color: '#64748b',
                            font: { size: 10 }
                        }
                    },
                    x: {
                        ...this.defaultOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#64748b',
                            font: { size: 10 }
                        }
                    }
                }
            }
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    initCombinedChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        ctx.parentElement.style.height = '300px';

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Motor 1 (°C)',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f620',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    },
                    {
                        label: 'Motor 2 (°C)',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf620',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    annotation: {
                        annotations: {
                            thresholdLine: {
                                type: 'line',
                                yMin: 75,
                                yMax: 75,
                                borderColor: '#ef4444',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    display: true,
                                    content: 'Critical Threshold',
                                    position: 'end',
                                    backgroundColor: '#ef444499',
                                    color: '#fff',
                                    font: { size: 10 }
                                }
                            }
                        }
                    }
                },
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 120
                    }
                }
            }
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    updateChart(chartId, labels, data, maxPoints = 60) {
        const chart = this.charts[chartId];
        if (!chart) return;

        chart.data.labels = labels.slice(-maxPoints);
        chart.data.datasets[0].data = data.slice(-maxPoints);
        chart.update('none');
    }

    updateCombinedChart(chartId, labels, data1, data2, maxPoints = 60) {
        const chart = this.charts[chartId];
        if (!chart) return;

        chart.data.labels = labels.slice(-maxPoints);
        chart.data.datasets[0].data = data1.slice(-maxPoints);
        chart.data.datasets[1].data = data2.slice(-maxPoints);
        chart.update('none');
    }

    updateThresholdAnnotation(chartId, threshold, warningThreshold) {
        const chart = this.charts[chartId];
        if (!chart || !chart.options.plugins.annotation) return;

        const annotations = chart.options.plugins.annotation.annotations;
        if (annotations.thresholdLine) annotations.thresholdLine.yMin = annotations.thresholdLine.yMax = threshold;
        if (annotations.warningLine) annotations.warningLine.yMin = annotations.warningLine.yMax = warningThreshold;
        chart.update('none');
    }

    // Cooling curve chart for Math section
    initCoolingChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        ctx.parentElement.style.height = '300px';

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Cooling Curve T(t)',
                    data: [],
                    borderColor: '#06b6d4',
                    backgroundColor: '#06b6d420',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 1,
                    borderWidth: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        title: { display: true, text: 'Temperature (°C)', color: '#64748b' }
                    },
                    x: {
                        ...this.defaultOptions.scales.x,
                        title: { display: true, text: 'Time (minutes)', color: '#64748b' }
                    }
                }
            }
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    // Regression chart
    initRegressionChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        ctx.parentElement.style.height = '300px';

        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Actual Temperatures',
                        data: [],
                        backgroundColor: '#3b82f6',
                        pointRadius: 3
                    },
                    {
                        label: 'Regression Line',
                        data: [],
                        borderColor: '#ef4444',
                        type: 'line',
                        pointRadius: 0,
                        borderWidth: 2,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: this.defaultOptions
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    getChart(id) {
        return this.charts[id];
    }
}

window.GraphRenderer = GraphRenderer;