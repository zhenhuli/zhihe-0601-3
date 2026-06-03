function calculateRSI(data, period = 14, priceKey = 'close') {
    const result = [];
    const n = data.length;

    if (n < period + 1) {
        for (let i = 0; i < n; i++) {
            result.push({ index: i, value: null, timestamp: data[i]?.timestamp || 0 });
        }
        return result;
    }

    let gains = [];
    let losses = [];

    for (let i = 1; i < n; i++) {
        const change = data[i][priceKey] - data[i - 1][priceKey];
        if (change > 0) {
            gains.push(change);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(change));
        }
    }

    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < n; i++) {
        if (i < period) {
            result.push({ index: i, value: null, timestamp: data[i].timestamp });
            continue;
        }

        if (i === period) {
            let gainSum = 0;
            let lossSum = 0;
            for (let j = 0; j < period; j++) {
                gainSum += gains[j];
                lossSum += losses[j];
            }
            avgGain = gainSum / period;
            avgLoss = lossSum / period;
        } else {
            avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
        }

        let rsi;
        if (avgLoss === 0) {
            rsi = 100;
        } else {
            const rs = avgGain / avgLoss;
            rsi = 100 - (100 / (1 + rs));
        }

        result.push({
            index: i,
            value: parseFloat(rsi.toFixed(4)),
            timestamp: data[i].timestamp
        });
    }

    return result;
}

export default calculateRSI;
