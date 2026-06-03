function calculateSMA(data, period, priceKey = 'close') {
    const result = [];
    const n = data.length;

    for (let i = 0; i < n; i++) {
        if (i < period - 1) {
            result.push({ index: i, value: null, timestamp: data[i].timestamp });
            continue;
        }

        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
            sum += data[j][priceKey];
        }

        const sma = sum / period;
        result.push({
            index: i,
            value: parseFloat(sma.toFixed(4)),
            timestamp: data[i].timestamp
        });
    }

    return result;
}

export default calculateSMA;
