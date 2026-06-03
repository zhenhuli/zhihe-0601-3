import DataGenerator from './dataGenerator.js';
import IndicatorManager from './indicators/index.js';
import ChartRenderer from './chart/chartRenderer.js';
import DrawingManager from './chart/drawingManager.js';
import TrendlineRenderer from './chart/trendlineRenderer.js';

class StockApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.priceDisplay = document.getElementById('priceDisplay');
        this.timeDisplay = document.getElementById('timeDisplay');

        this.dataGenerator = new DataGenerator({
            maxHistory: 500,
            initialPrice: 100,
            volatility: 0.015,
            trend: 0
        });

        this.indicatorManager = new IndicatorManager();
        this.drawingManager = new DrawingManager();

        this.chartRenderer = new ChartRenderer(this.canvas);
        this.trendlineRenderer = new TrendlineRenderer(this.chartRenderer, this.drawingManager);

        window.__chartState = {
            indicators: this.indicatorManager.indicators
        };

        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.indicatorIdCounter = 1;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.dataGenerator.start();
        this.setupDataSubscription();
        this.updateIndicatorList();
        this.updateDrawingList();
        this.animationLoop();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        document.getElementById('addIndicatorBtn').addEventListener('click', () => this.addIndicator());
        document.getElementById('indicatorWidth').addEventListener('input', (e) => {
            document.getElementById('widthValue').textContent = e.target.value;
        });

        document.getElementById('drawTrendlineBtn').addEventListener('click', () => this.startTrendlineDrawing());
        document.getElementById('cancelDrawBtn').addEventListener('click', () => this.cancelTrendlineDrawing());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportImage());
    }

    setupDataSubscription() {
        this.dataGenerator.subscribe((candle, allData) => {
            this.updatePriceDisplay(candle.close);
            this.updateTimeDisplay(candle.timestamp);
            this.chartRenderer.setData(allData);
            this.recalculateIndicators();
        });

        setTimeout(() => {
            const allData = this.dataGenerator.getData();
            this.chartRenderer.setData(allData);
            const dataLen = allData.length;
            this.chartRenderer.setView(Math.max(0, dataLen - 50), 50);
            this.recalculateIndicators();
        }, 100);
    }

    updatePriceDisplay(price) {
        this.priceDisplay.textContent = `$${price.toFixed(2)}`;
    }

    updateTimeDisplay(timestamp) {
        const date = new Date(timestamp);
        this.timeDisplay.textContent = date.toLocaleTimeString();
    }

    recalculateIndicators() {
        const allData = this.dataGenerator.getData();
        if (allData.length === 0) return;

        const startIndex = this.chartRenderer.viewStart;
        const endIndex = Math.min(
            allData.length,
            this.chartRenderer.viewStart + this.chartRenderer.viewCount + 200
        );

        const indicatorData = this.indicatorManager.calculateForRange(
            allData,
            Math.max(0, startIndex - 200),
            endIndex
        );

        this.chartRenderer.setIndicatorData(indicatorData);
    }

    addIndicator() {
        const type = document.getElementById('indicatorType').value;
        const period = parseInt(document.getElementById('indicatorPeriod').value);
        const color = document.getElementById('indicatorColor').value;
        const lineWidth = parseInt(document.getElementById('indicatorWidth').value);

        const id = `${type}_${this.indicatorIdCounter++}`;

        this.indicatorManager.addIndicator(id, type, {
            period,
            color,
            lineWidth,
            visible: true
        });

        this.recalculateIndicators();
        this.updateIndicatorList();
    }

    removeIndicator(id) {
        this.indicatorManager.removeIndicator(id);
        this.recalculateIndicators();
        this.updateIndicatorList();
    }

    toggleIndicator(id) {
        this.indicatorManager.toggleIndicator(id);
        this.recalculateIndicators();
        this.updateIndicatorList();
    }

    updateIndicatorList() {
        const container = document.getElementById('indicatorList');
        const indicators = this.indicatorManager.getAllIndicators();

        if (indicators.length === 0) {
            container.innerHTML = '<div style="color:#666;font-size:0.8rem;">暂无指标</div>';
            return;
        }

        container.innerHTML = indicators.map(ind => {
            const typeNames = {
                sma: 'SMA',
                ema: 'EMA',
                rsi: 'RSI'
            };
            const name = typeNames[ind.type] || ind.type;
            const opacity = ind.params.visible ? 1 : 0.5;

            return `
                <div class="indicator-item" style="opacity: ${opacity}">
                    <div class="indicator-header">
                        <span class="indicator-name">
                            <span class="color-dot" style="background: ${ind.params.color}"></span>
                            ${name}(${ind.params.period})
                        </span>
                        <div class="indicator-actions">
                            <button class="btn btn-small btn-primary" onclick="app.toggleIndicator('${ind.id}')">
                                ${ind.params.visible ? '隐藏' : '显示'}
                            </button>
                            <button class="btn btn-small btn-danger" onclick="app.removeIndicator('${ind.id}')">删除</button>
                        </div>
                    </div>
                    <div class="indicator-info">
                        线宽: ${ind.params.lineWidth}px
                    </div>
                </div>
            `;
        }).join('');
    }

    startTrendlineDrawing() {
        this.trendlineRenderer.startDrawing();
        this.canvas.classList.add('drawing-mode');
        document.getElementById('drawTrendlineBtn').style.display = 'none';
        document.getElementById('cancelDrawBtn').style.display = 'inline-block';
    }

    cancelTrendlineDrawing() {
        this.trendlineRenderer.cancelDrawing();
        this.canvas.classList.remove('drawing-mode');
        document.getElementById('drawTrendlineBtn').style.display = 'inline-block';
        document.getElementById('cancelDrawBtn').style.display = 'none';
    }

    removeDrawing(id) {
        this.drawingManager.removeDrawing(id);
        this.updateDrawingList();
    }

    toggleDrawing(id) {
        this.drawingManager.toggleDrawing(id);
        this.updateDrawingList();
    }

    updateDrawingList() {
        const container = document.getElementById('drawingList');
        const drawings = this.drawingManager.getAllDrawings();

        if (drawings.length === 0) {
            container.innerHTML = '<div style="color:#666;font-size:0.8rem;">暂无绘图对象</div>';
            return;
        }

        container.innerHTML = drawings.map(drawing => {
            const opacity = drawing.params.visible ? 1 : 0.5;
            const equation = drawing.type === 'trendline'
                ? this.drawingManager.calculateTrendlineEquation(drawing).equation
                : '';

            return `
                <div class="drawing-item" style="opacity: ${opacity}">
                    <div class="drawing-header">
                        <span class="drawing-name">
                            <span class="color-dot" style="background: ${drawing.params.color}"></span>
                            趋势线
                        </span>
                        <div class="drawing-actions">
                            <button class="btn btn-small btn-primary" onclick="app.toggleDrawing('${drawing.id}')">
                                ${drawing.params.visible ? '隐藏' : '显示'}
                            </button>
                            <button class="btn btn-small btn-danger" onclick="app.removeDrawing('${drawing.id}')">删除</button>
                        </div>
                    </div>
                    <div class="drawing-info">
                        ${equation}
                    </div>
                </div>
            `;
        }).join('');
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleMouseDown(e) {
        const coords = this.getCanvasCoords(e);

        if (this.trendlineRenderer.isDrawing) {
            return;
        }

        const handled = this.trendlineRenderer.handleMouseDown(coords.x, coords.y);
        if (handled) {
            this.isDraggingTrendline = true;
            return;
        }

        this.isPanning = true;
        this.lastMouseX = coords.x;
        this.lastMouseY = coords.y;
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        const coords = this.getCanvasCoords(e);

        const handled = this.trendlineRenderer.handleMouseMove(coords.x, coords.y);

        if (this.isPanning) {
            const deltaX = coords.x - this.lastMouseX;
            this.chartRenderer.pan(deltaX);
            this.lastMouseX = coords.x;
            this.lastMouseY = coords.y;
            this.recalculateIndicators();
        } else if (!this.trendlineRenderer.isDrawing) {
            const hoverIndex = this.chartRenderer.getCandleIndexFromX(coords.x);
            this.chartRenderer.hoverIndex = hoverIndex;
            this.chartRenderer.requestRender();
        }
    }

    handleMouseUp(e) {
        this.isPanning = false;
        this.isDraggingTrendline = false;
        this.trendlineRenderer.handleMouseUp();
        this.canvas.style.cursor = 'grab';
        this.updateDrawingList();
    }

    handleMouseLeave(e) {
        this.isPanning = false;
        this.isDraggingTrendline = false;
        this.trendlineRenderer.handleMouseUp();
        this.chartRenderer.hoverIndex = -1;
        this.chartRenderer.requestRender();
    }

    handleWheel(e) {
        e.preventDefault();

        const coords = this.getCanvasCoords(e);
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

        this.chartRenderer.zoom(coords.x, zoomFactor);
        this.recalculateIndicators();
    }

    handleClick(e) {
        const coords = this.getCanvasCoords(e);

        if (this.trendlineRenderer.isDrawing) {
            const result = this.trendlineRenderer.handleCanvasClick(coords.x, coords.y);
            if (result && typeof result === 'object' && result.id) {
                this.cancelTrendlineDrawing();
                this.updateDrawingList();
            } else if (result === true) {
            }
        }
    }

    exportImage() {
        this.chartRenderer.exportImage();
    }

    animationLoop() {
        this.chartRenderer.render();
        this.trendlineRenderer.render();
        requestAnimationFrame(() => this.animationLoop());
    }
}

const app = new StockApp();
window.app = app;

export default app;
