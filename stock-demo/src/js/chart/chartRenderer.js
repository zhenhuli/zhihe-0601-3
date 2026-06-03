class ChartRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;

        this.padding = {
            top: 40,
            right: 60,
            bottom: 30,
            left: 10
        };

        this.rsiHeight = 120;
        this.rsiPadding = 20;

        this.data = [];
        this.indicatorData = {};

        this.viewStart = 0;
        this.viewCount = 50;
        this.minViewCount = 10;
        this.maxViewCount = 200;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartViewStart = 0;

        this.hoverIndex = -1;

        this.animationFrameId = null;
        this.pendingRender = false;
        this.lastRenderTime = 0;
        this.throttleTime = 16;

        this.candleWidthRatio = 0.7;

        this.resize();
        this.setupEvents();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);

        this.width = rect.width;
        this.height = rect.height;

        this.mainChartTop = this.padding.top;
        this.mainChartBottom = this.height - this.padding.bottom - this.rsiHeight - this.rsiPadding;
        this.mainChartHeight = this.mainChartBottom - this.mainChartTop;

        this.rsiChartTop = this.height - this.padding.bottom - this.rsiHeight;
        this.rsiChartBottom = this.height - this.padding.bottom;

        this.requestRender();
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());
    }

    setData(data) {
        this.data = data;
        this.clampView();
        this.requestRender();
    }

    setIndicatorData(indicatorData) {
        this.indicatorData = indicatorData;
        this.requestRender();
    }

    clampView() {
        const maxStart = Math.max(0, this.data.length - this.viewCount);
        this.viewStart = Math.min(this.viewStart, maxStart);
        this.viewStart = Math.max(0, this.viewStart);
    }

    setView(viewStart, viewCount) {
        this.viewStart = Math.max(0, viewStart);
        this.viewCount = Math.max(this.minViewCount, Math.min(this.maxViewCount, viewCount));
        this.clampView();
        this.requestRender();
    }

    pan(delta) {
        const candleWidth = this.getCandleWidth();
        const candlesToMove = Math.round(delta / candleWidth);
        this.setView(this.viewStart - candlesToMove, this.viewCount);
    }

    zoom(centerX, factor) {
        const oldViewCount = this.viewCount;
        const newViewCount = Math.round(this.viewCount * factor);

        const candleWidth = this.getCandleWidth();
        const chartWidth = this.width - this.padding.left - this.padding.right;
        const centerCandleOffset = (centerX - this.padding.left) / chartWidth;
        const centerCandleIndex = this.viewStart + Math.floor(centerCandleOffset * this.viewCount);

        const newStart = centerCandleIndex - Math.floor(centerCandleOffset * newViewCount);

        this.setView(newStart, newViewCount);
    }

    getCandleWidth() {
        const chartWidth = this.width - this.padding.left - this.padding.right;
        return chartWidth / this.viewCount;
    }

    getCandleX(index) {
        const candleWidth = this.getCandleWidth();
        const relativeIndex = index - this.viewStart;
        return this.padding.left + relativeIndex * candleWidth + candleWidth / 2;
    }

    getCandleIndexFromX(x) {
        const candleWidth = this.getCandleWidth();
        const relativeIndex = Math.floor((x - this.padding.left) / candleWidth);
        return this.viewStart + relativeIndex;
    }

    priceToY(price, minPrice, maxPrice, top, bottom) {
        if (maxPrice === minPrice) return (top + bottom) / 2;
        const range = maxPrice - minPrice;
        return bottom - ((price - minPrice) / range) * (bottom - top);
    }

    yToPrice(y, minPrice, maxPrice, top, bottom) {
        if (maxPrice === minPrice) return (minPrice + maxPrice) / 2;
        const range = maxPrice - minPrice;
        return minPrice + ((bottom - y) / (bottom - top)) * range;
    }

    getVisiblePriceRange() {
        const visibleData = this.data.slice(this.viewStart, this.viewStart + this.viewCount);
        if (visibleData.length === 0) return { min: 0, max: 100 };

        let min = Infinity;
        let max = -Infinity;

        for (const candle of visibleData) {
            min = Math.min(min, candle.low);
            max = Math.max(max, candle.high);
        }

        for (const [id, indicator] of Object.entries(this.indicatorData)) {
            if (id.includes('rsi')) continue;
            for (const point of indicator) {
                if (point.value !== null && point.index >= this.viewStart && point.index < this.viewStart + this.viewCount) {
                    min = Math.min(min, point.value);
                    max = Math.max(max, point.value);
                }
            }
        }

        const padding = (max - min) * 0.1;
        return { min: min - padding, max: max + padding };
    }

    getVisibleData() {
        return this.data.slice(this.viewStart, this.viewStart + this.viewCount);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawBackground() {
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGrid(minPrice, maxPrice, isRSI = false) {
        const top = isRSI ? this.rsiChartTop : this.mainChartTop;
        const bottom = isRSI ? this.rsiChartBottom : this.mainChartBottom;
        const left = this.padding.left;
        const right = this.width - this.padding.right;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const ratio = i / gridLines;
            const y = top + (bottom - top) * ratio;

            this.ctx.beginPath();
            this.ctx.moveTo(left, y);
            this.ctx.lineTo(right, y);
            this.ctx.stroke();

            let value;
            if (isRSI) {
                value = Math.round(100 - ratio * 100);
            } else {
                value = this.yToPrice(y, minPrice, maxPrice, top, bottom);
            }

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                isRSI ? value.toString() : value.toFixed(2),
                right + 5,
                y + 3
            );
        }

        const candleWidth = this.getCandleWidth();
        const verticalStep = Math.max(1, Math.floor(this.viewCount / 5));

        for (let i = 0; i < this.viewCount; i += verticalStep) {
            const x = left + i * candleWidth;

            this.ctx.beginPath();
            this.ctx.moveTo(x, top);
            this.ctx.lineTo(x, bottom);
            this.ctx.stroke();

            const dataIndex = this.viewStart + i;
            if (dataIndex < this.data.length && !isRSI) {
                const date = new Date(this.data[dataIndex].timestamp);
                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.font = '10px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(timeStr, x, bottom + 15);
            }
        }
    }

    drawCandles(minPrice, maxPrice) {
        const visibleData = this.getVisibleData();
        const candleWidth = this.getCandleWidth() * this.candleWidthRatio;
        const bodyWidth = Math.max(1, candleWidth * 0.8);

        visibleData.forEach((candle, i) => {
            const absoluteIndex = this.viewStart + i;
            const x = this.getCandleX(absoluteIndex);

            const isUp = candle.close >= candle.open;
            const color = isUp ? '#26a69a' : '#ef5350';

            const highY = this.priceToY(candle.high, minPrice, maxPrice, this.mainChartTop, this.mainChartBottom);
            const lowY = this.priceToY(candle.low, minPrice, maxPrice, this.mainChartTop, this.mainChartBottom);
            const openY = this.priceToY(candle.open, minPrice, maxPrice, this.mainChartTop, this.mainChartBottom);
            const closeY = this.priceToY(candle.close, minPrice, maxPrice, this.mainChartTop, this.mainChartBottom);

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, highY);
            this.ctx.lineTo(x, lowY);
            this.ctx.stroke();

            this.ctx.fillStyle = color;
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));
            this.ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
        });
    }

    drawIndicators(minPrice, maxPrice) {
        for (const [id, indicator] of Object.entries(this.indicatorData)) {
            if (id.includes('rsi')) continue;

            const indicatorConfig = window.__chartState?.indicators?.get?.(id);
            if (!indicatorConfig || !indicatorConfig.params.visible) continue;

            this.ctx.strokeStyle = indicatorConfig.params.color;
            this.ctx.lineWidth = indicatorConfig.params.lineWidth;
            this.ctx.beginPath();

            let started = false;
            for (const point of indicator) {
                if (point.value === null) continue;
                if (point.index < this.viewStart || point.index >= this.viewStart + this.viewCount) continue;

                const x = this.getCandleX(point.index);
                const y = this.priceToY(point.value, minPrice, maxPrice, this.mainChartTop, this.mainChartBottom);

                if (!started) {
                    this.ctx.moveTo(x, y);
                    started = true;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }

    drawRSI() {
        const rsiIndicators = Object.entries(this.indicatorData).filter(([id]) => id.includes('rsi'));
        if (rsiIndicators.length === 0) return;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;

        const overboughtY = this.priceToY(70, 0, 100, this.rsiChartTop, this.rsiChartBottom);
        const oversoldY = this.priceToY(30, 0, 100, this.rsiChartTop, this.rsiChartBottom);
        const midY = this.priceToY(50, 0, 100, this.rsiChartTop, this.rsiChartBottom);

        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, overboughtY);
        this.ctx.lineTo(this.width - this.padding.right, overboughtY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, oversoldY);
        this.ctx.lineTo(this.width - this.padding.right, oversoldY);
        this.ctx.stroke();

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, midY);
        this.ctx.lineTo(this.width - this.padding.right, midY);
        this.ctx.stroke();

        for (const [id, indicator] of rsiIndicators) {
            const indicatorConfig = window.__chartState?.indicators?.get?.(id);
            if (!indicatorConfig || !indicatorConfig.params.visible) continue;

            this.ctx.strokeStyle = indicatorConfig.params.color;
            this.ctx.lineWidth = indicatorConfig.params.lineWidth;
            this.ctx.beginPath();

            let started = false;
            for (const point of indicator) {
                if (point.value === null) continue;
                if (point.index < this.viewStart || point.index >= this.viewStart + this.viewCount) continue;

                const x = this.getCandleX(point.index);
                const y = this.priceToY(point.value, 0, 100, this.rsiChartTop, this.rsiChartBottom);

                if (!started) {
                    this.ctx.moveTo(x, y);
                    started = true;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.padding.left, this.rsiChartTop, this.width - this.padding.left - this.padding.right, this.rsiHeight);

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('RSI', this.padding.left + 5, this.rsiChartTop + 15);
    }

    drawHoverLine(minPrice, maxPrice) {
        if (this.hoverIndex < this.viewStart || this.hoverIndex >= this.viewStart + this.viewCount) return;
        if (this.hoverIndex >= this.data.length) return;

        const x = this.getCandleX(this.hoverIndex);
        const candle = this.data[this.hoverIndex];

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(x, this.mainChartTop);
        this.ctx.lineTo(x, this.mainChartBottom);
        this.ctx.stroke();

        if (this.rsiHeight > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.rsiChartTop);
            this.ctx.lineTo(x, this.rsiChartBottom);
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);

        const infoBox = document.getElementById('chartInfo');
        if (infoBox) {
            const date = new Date(candle.timestamp);
            const dateStr = date.toLocaleString();
            infoBox.innerHTML = `
                <div>时间: ${dateStr}</div>
                <div>开: <span style="color:#4ecdc4">${candle.open.toFixed(2)}</span></div>
                <div>高: <span style="color:#26a69a">${candle.high.toFixed(2)}</span></div>
                <div>低: <span style="color:#ef5350">${candle.low.toFixed(2)}</span></div>
                <div>收: <span style="color:${candle.close >= candle.open ? '#26a69a' : '#ef5350'}">${candle.close.toFixed(2)}</span></div>
            `;
        }
    }

    render() {
        this.pendingRender = false;
        this.lastRenderTime = performance.now();

        if (this.data.length === 0) return;

        const priceRange = this.getVisiblePriceRange();

        this.clear();
        this.drawBackground();
        this.drawGrid(priceRange.min, priceRange.max);
        this.drawGrid(0, 100, true);
        this.drawCandles(priceRange.min, priceRange.max);
        this.drawIndicators(priceRange.min, priceRange.max);
        this.drawRSI();
        this.drawHoverLine(priceRange.min, priceRange.max);
    }

    requestRender() {
        if (this.pendingRender) return;

        const now = performance.now();
        const timeSinceLastRender = now - this.lastRenderTime;

        if (timeSinceLastRender >= this.throttleTime) {
            this.render();
        } else {
            this.pendingRender = true;
            setTimeout(() => {
                if (this.pendingRender) {
                    this.render();
                }
            }, this.throttleTime - timeSinceLastRender);
        }
    }

    exportImage() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `stock-chart-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    canvasToDataCoords(canvasX, canvasY, minPrice, maxPrice) {
        const index = this.getCandleIndexFromX(canvasX);
        const price = this.yToPrice(canvasY, minPrice, maxPrice, this.mainChartTop, this.mainChartBottom);
        return { index, price, x: index, y: price };
    }

    dataCoordsToCanvas(index, price, minPrice, maxPrice) {
        const x = this.getCandleX(Math.round(index));
        const y = this.priceToY(price, minPrice, maxPrice, this.mainChartTop, this.mainChartBottom);
        return { x, y };
    }
}

export default ChartRenderer;
