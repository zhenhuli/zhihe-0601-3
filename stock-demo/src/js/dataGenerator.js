class DataGenerator {
    constructor(options = {}) {
        this.maxHistory = options.maxHistory || 500;
        this.updateInterval = options.updateInterval || 1000;
        this.data = [];
        this.listeners = [];
        this.intervalId = null;
        this.currentPrice = options.initialPrice || 100;
        this.volatility = options.volatility || 0.02;
        this.trend = options.trend || 0;
    }

    generateCandle(timestamp) {
        const change = (Math.random() - 0.5 + this.trend) * this.volatility * this.currentPrice;
        const open = this.currentPrice;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * this.volatility * this.currentPrice * 0.5;
        const low = Math.min(open, close) - Math.random() * this.volatility * this.currentPrice * 0.5;
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        this.currentPrice = close;

        return {
            timestamp,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume
        };
    }

    generateInitialData(count) {
        const now = Date.now();
        const interval = this.updateInterval;

        for (let i = count - 1; i >= 0; i--) {
            const timestamp = now - i * interval;
            const candle = this.generateCandle(timestamp);
            this.data.push(candle);
        }
    }

    start() {
        if (this.intervalId) return;

        this.generateInitialData(200);

        this.intervalId = setInterval(() => {
            const timestamp = Date.now();
            const candle = this.generateCandle(timestamp);
            this.data.push(candle);

            if (this.data.length > this.maxHistory) {
                this.data.shift();
            }

            this.notifyListeners(candle);
        }, this.updateInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notifyListeners(candle) {
        this.listeners.forEach(callback => callback(candle, this.data));
    }

    getData() {
        return [...this.data];
    }

    getDataRange(startIndex, endIndex) {
        return this.data.slice(Math.max(0, startIndex), Math.min(this.data.length, endIndex));
    }

    getLatestPrice() {
        return this.data.length > 0 ? this.data[this.data.length - 1].close : 0;
    }
}

export default DataGenerator;
