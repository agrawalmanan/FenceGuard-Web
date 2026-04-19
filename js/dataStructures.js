// ================================================================
// DATA STRUCTURES & ALGORITHMS MODULE
// ================================================================

/**
 * DSA CONCEPTS USED:
 * 1. Circular Buffer (Ring Buffer) - for fixed-size temperature history
 * 2. Priority Queue (Min-Heap) - for event scheduling
 * 3. Queue - for event log (FIFO)
 * 4. Binary Search - for finding threshold crossing points
 * 5. Sliding Window - for moving average calculation
 * 6. Hash Map - for O(1) motor state lookup
 */

// ============ 1. CIRCULAR BUFFER (Ring Buffer) ============
// Used to store last N temperature readings efficiently
// Time: O(1) push, O(1) access | Space: O(N) fixed
class CircularBuffer {
    constructor(capacity) {
        this.capacity = capacity;
        this.buffer = new Array(capacity).fill(null);
        this.head = 0;     // next write position
        this.size = 0;
    }

    push(item) {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity) this.size++;
    }

    // Get all items in chronological order
    toArray() {
        if (this.size === 0) return [];
        const result = [];
        const start = this.size < this.capacity ? 0 : this.head;
        for (let i = 0; i < this.size; i++) {
            const idx = (start + i) % this.capacity;
            result.push(this.buffer[idx]);
        }
        return result;
    }

    // Get last N items
    getLast(n) {
        const arr = this.toArray();
        return arr.slice(Math.max(0, arr.length - n));
    }

    // Get the most recent item
    peek() {
        if (this.size === 0) return null;
        const idx = (this.head - 1 + this.capacity) % this.capacity;
        return this.buffer[idx];
    }

    getSize() {
        return this.size;
    }

    isFull() {
        return this.size === this.capacity;
    }

    clear() {
        this.buffer.fill(null);
        this.head = 0;
        this.size = 0;
    }
}

// ============ 2. MIN-HEAP / PRIORITY QUEUE ============
// Used for scheduling events (alarms, switchovers) by priority
// Time: O(log n) insert, O(log n) extract-min | Space: O(N)
class PriorityQueue {
    constructor(comparator = (a, b) => a.priority - b.priority) {
        this.heap = [];
        this.comparator = comparator;
    }

    push(item) {
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }

    size() {
        return this.heap.length;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    _bubbleUp(idx) {
        while (idx > 0) {
            const parent = Math.floor((idx - 1) / 2);
            if (this.comparator(this.heap[idx], this.heap[parent]) < 0) {
                [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
                idx = parent;
            } else break;
        }
    }

    _sinkDown(idx) {
        const length = this.heap.length;
        while (true) {
            let smallest = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;
            if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            if (smallest !== idx) {
                [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
                idx = smallest;
            } else break;
        }
    }
}

// ============ 3. SLIDING WINDOW for Moving Average ============
// Time: O(1) per update | Space: O(window_size)
class SlidingWindowAverage {
    constructor(windowSize) {
        this.windowSize = windowSize;
        this.window = [];
        this.sum = 0;
    }

    add(value) {
        this.window.push(value);
        this.sum += value;
        if (this.window.length > this.windowSize) {
            this.sum -= this.window.shift();
        }
    }

    getAverage() {
        return this.window.length > 0 ? this.sum / this.window.length : 0;
    }

    getMin() {
        return this.window.length > 0 ? Math.min(...this.window) : 0;
    }

    getMax() {
        return this.window.length > 0 ? Math.max(...this.window) : 0;
    }

    getSize() {
        return this.window.length;
    }

    clear() {
        this.window = [];
        this.sum = 0;
    }
}

// ============ 4. BINARY SEARCH ============
// Find the first index where temperature exceeds threshold in sorted data
// Time: O(log n) | Space: O(1)
function binarySearchThresholdCrossing(tempArray, threshold) {
    let left = 0;
    let right = tempArray.length - 1;
    let result = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (tempArray[mid].temp >= threshold) {
            result = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }
    return result;
}

// Binary search for closest temperature to a target value
function binarySearchClosest(sortedTemps, target) {
    if (sortedTemps.length === 0) return -1;
    let left = 0;
    let right = sortedTemps.length - 1;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (sortedTemps[mid] < target) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    
    if (left > 0 && Math.abs(sortedTemps[left - 1] - target) < Math.abs(sortedTemps[left] - target)) {
        return left - 1;
    }
    return left;
}

// ============ 5. EVENT LOG QUEUE (FIFO) ============
class EventQueue {
    constructor(maxSize = 100) {
        this.queue = [];
        this.maxSize = maxSize;
    }

    enqueue(event) {
        this.queue.push({
            ...event,
            timestamp: new Date(),
            id: Date.now()
        });
        // Keep only last maxSize events
        if (this.queue.length > this.maxSize) {
            this.queue.shift(); // Remove oldest
        }
    }

    dequeue() {
        return this.queue.shift();
    }

    getAll() {
        return [...this.queue].reverse(); // Most recent first
    }

    clear() {
        this.queue = [];
    }

    size() {
        return this.queue.length;
    }

    // Filter events by type - O(n)
    filterByType(type) {
        return this.queue.filter(e => e.type === type);
    }
}

// ============ 6. MOTOR STATE MAP (Hash Map) ============
// O(1) lookup for motor states
class MotorStateMap {
    constructor() {
        this.states = new Map();
    }

    set(motorId, state) {
        this.states.set(motorId, {
            ...state,
            lastUpdated: Date.now()
        });
    }

    get(motorId) {
        return this.states.get(motorId);
    }

    getAll() {
        return Object.fromEntries(this.states);
    }

    isRunning(motorId) {
        const state = this.states.get(motorId);
        return state ? state.status === 'running' : false;
    }
}

// ============ 7. TEMPERATURE STATISTICS ============
// Uses sorting + algorithms for statistical analysis
class TemperatureStatistics {
    
    // Apply simple moving average FIRST, then calculate rate
    // This removes noise before differentiation
    static smoothedRateOfChange(recentReadings, windowSize = 5) {
        if (recentReadings.length < 4) return 0;

        // Split readings into two halves and average each half
        // This is like a "symmetric difference quotient" in calculus
        // Rate ≈ (avg of second half - avg of first half) / time between centers
        const half = Math.floor(recentReadings.length / 2);

        const firstHalf = recentReadings.slice(0, half);
        const secondHalf = recentReadings.slice(half);

        // Average temperature of each half (algebraic mean)
        const avgFirst = firstHalf.reduce((sum, r) => sum + r.temp, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, r) => sum + r.temp, 0) / secondHalf.length;

        // Average time of each half
        const avgTimeFirst = firstHalf.reduce((sum, r) => sum + r.time, 0) / firstHalf.length;
        const avgTimeSecond = secondHalf.reduce((sum, r) => sum + r.time, 0) / secondHalf.length;

        const timeDeltaMs = avgTimeSecond - avgTimeFirst;
        if (timeDeltaMs === 0) return 0;

        // Rate in °C per minute
        return ((avgSecond - avgFirst) / timeDeltaMs) * 60000;
    }

    // Original point-to-point (kept for reference/comparison)
    static rateOfChange(current, previous, timeDeltaMs) {
        if (timeDeltaMs === 0) return 0;
        return ((current - previous) / timeDeltaMs) * 60000;
    }

    // Standard deviation unchanged
    static standardDeviation(values) {
        if (values.length === 0) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
    }

    static median(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    static percentile(values, p) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }
}

// Export for use
window.CircularBuffer = CircularBuffer;
window.PriorityQueue = PriorityQueue;
window.SlidingWindowAverage = SlidingWindowAverage;
window.EventQueue = EventQueue;
window.MotorStateMap = MotorStateMap;
window.TemperatureStatistics = TemperatureStatistics;
window.binarySearchThresholdCrossing = binarySearchThresholdCrossing;
window.binarySearchClosest = binarySearchClosest;