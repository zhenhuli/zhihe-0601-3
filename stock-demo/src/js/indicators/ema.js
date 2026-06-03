function calculateEMA(data, period, priceKey = 'close') {
    const result = [];
    const n = data.length;
    const multiplier = 2 / (period + 1);

    let ema = null;

    for (let i = 0; i < n; i++) {
        if (i < period - 1) {
            result.push({ index: i, value: null, timestamp: data[i].timestamp });
            continue;
        }

        if (i === period - 1) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[j][priceKey];
            }
            ema = sum / period;
        } else {
            ema = (data[i][priceKey] - ema) * multiplier + ema;
        }

        result.push({
            index: i,
            value: parseFloat(ema.toFixed(4)),
            timestamp: data[i].timestamp
        });
    }

    return result;
}

export default calculateEMA;
