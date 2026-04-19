// ============================================================
// API Service — connects web dashboard to backend
// ============================================================

const ApiService = {
    BASE_URL: 'http://192.168.56.1:3000/api',
    WS_URL:   'ws://192.168.56.1:3000',
    ws:       null,
    onMessage: null,

    // ── WebSocket connection ──────────────────────────────────
    connectWebSocket() {
        this.ws = new WebSocket(this.WS_URL);

        this.ws.onopen = () => {
            console.log('Connected to FenceGuard backend');
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (this.onMessage) this.onMessage(msg);
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('WS disconnected, reconnecting in 3s...');
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onerror = (err) => {
            console.error('WS error:', err);
        };
    },

    // ── Send data to backend ──────────────────────────────────
    async sendData(payload) {
        try {
            await fetch(`${this.BASE_URL}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            // Backend offline — continue running locally
            console.warn('Backend offline:', err.message);
        }
    },

    // ── Log event ─────────────────────────────────────────────
    async logEvent(type, message, motorId = null) {
        try {
            await fetch(`${this.BASE_URL}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, message, motorId }),
            });
        } catch (err) {
            console.warn('Event log failed:', err.message);
        }
    },

    // ── Log switchover ────────────────────────────────────────
    async logSwitchover(fromMotor, toMotor, temperature, count) {
        try {
            await fetch(`${this.BASE_URL}/switchovers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromMotor, toMotor, temperature, count }),
            });
        } catch (err) {
            console.warn('Switchover log failed:', err.message);
        }
    },

    // ── Get history ───────────────────────────────────────────
    async getHistory(minutes = 10) {
        try {
            const res = await fetch(`${this.BASE_URL}/history?minutes=${minutes}`);
            return await res.json();
        } catch (err) {
            return [];
        }
    },

    // ── Get stats ─────────────────────────────────────────────
    async getStats() {
        try {
            const res = await fetch(`${this.BASE_URL}/stats`);
            return await res.json();
        } catch (err) {
            return {};
        }
    },

    // ── Get settings from server ──────────────────────────────
    async getSettings() {
        try {
            const res = await fetch(`${this.BASE_URL}/settings`);
            return await res.json();
        } catch (err) {
            return null;
        }
    },

    // ── Push settings to server ───────────────────────────────
    async updateSettings(settings) {
        try {
            await fetch(`${this.BASE_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
        } catch (err) {
            console.warn('Settings sync failed:', err.message);
        }
    },
};

window.ApiService = ApiService;