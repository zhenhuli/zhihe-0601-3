import calculateSMA from './sma.js';
import calculateEMA from './ema.js';
import calculateRSI from './rsi.js';

class IndicatorManager {
    constructor() {
        this.indicators = new Map();
        this.calculators = {
            sma: calculateSMA,
            ema: calculateEMA,
            rsi: calculateRSI
        };
    }

    addIndicator(id, type, params = {}) {
        const indicator = {
            id,
            type,
            params: {
                period: params.period || 14,
                color: params.color || '#ff6b6b',
                lineWidth: params.lineWidth || 2,
                visible: true,
                ...params
            },
            data: null,
            lastCalculated: 0
        };

        this.indicators.set(id, indicator);
        return indicator;
    }

    removeIndicator(id) {
        return this.indicators.delete(id);
    }

    getIndicator(id) {
        return this.indicators.get(id);
    }

    getAllIndicators() {
        return Array.from(this.indicators.values());
    }

    getVisibleIndicators() {
        return this.getAllIndicators().filter(ind => ind.params.visible);
    }

    toggleIndicator(id) {
        const indicator = this.indicators.get(id);
        if (indicator) {
            indicator.params.visible = !indicator.params.visible;
            return indicator.params.visible;
        }
        return false;
    }

    calculate(type, data, period) {
        const calculator = this.calculators[type];
        if (!calculator) {
            throw new Error(`Unknown indicator type: ${type}`);
        }
        return calculator(data, period);
    }

    calculateAll(data, force = false) {
        const results = {};

        for (const [id, indicator] of this.indicators) {
            if (!indicator.params.visible && !force) continue;

            const result = this.calculate(
                indicator.type,
                data,
                indicator.params.period
            );

            indicator.data = result;
            results[id] = result;
        }

        return results;
    }

    calculateForRange(data, startIndex, endIndex) {
        const extendedStart = Math.max(0, startIndex - 200);
        const extendedData = data.slice(extendedStart, endIndex + 1);
        const results = {};

        for (const [id, indicator] of this.indicators) {
            if (!indicator.params.visible) continue;

            const fullResult = this.calculate(
                indicator.type,
                extendedData,
                indicator.params.period
            );

            const offset = startIndex - extendedStart;
            const rangeResult = fullResult.slice(offset);

            results[id] = rangeResult.map((item, idx) => ({
                ...item,
                index: startIndex + idx
            }));
        }

        return results;
    }

    getRSIIndicators() {
        return this.getVisibleIndicators().filter(ind => ind.type === 'rsi');
    }

    getMainChartIndicators() {
        return this.getVisibleIndicators().filter(ind => ind.type !== 'rsi');
    }
}

export default IndicatorManager;
