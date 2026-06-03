class TrendlineRenderer {
    constructor(chartRenderer, drawingManager) {
        this.chart = chartRenderer;
        this.drawingManager = drawingManager;
        this.ctx = chartRenderer.ctx;

        this.isDrawing = false;
        this.firstPoint = null;
        this.currentMousePos = null;

        this.isDraggingPoint = null;
        this.hoveredTrendline = null;

        this.handleRadius = 8;
    }

    startDrawing() {
        this.isDrawing = true;
        this.firstPoint = null;
    }

    cancelDrawing() {
        this.isDrawing = false;
        this.firstPoint = null;
        this.currentMousePos = null;
    }

    handleCanvasClick(canvasX, canvasY) {
        if (!this.isDrawing) return false;

        const priceRange = this.chart.getVisiblePriceRange();
        const dataCoords = this.chart.canvasToDataCoords(
            canvasX,
            canvasY,
            priceRange.min,
            priceRange.max
        );

        const point = {
            canvasX,
            canvasY,
            x: dataCoords.x,
            y: dataCoords.y
        };

        if (this.firstPoint === null) {
            this.firstPoint = point;
            return true;
        } else {
            const trendline = this.drawingManager.addTrendline(this.firstPoint, point);
            this.cancelDrawing();
            return trendline;
        }
    }

    handleMouseMove(canvasX, canvasY) {
        const priceRange = this.chart.getVisiblePriceRange();

        if (this.isDrawing) {
            this.currentMousePos = { x: canvasX, y: canvasY };
            return true;
        }

        this.hoveredTrendline = this.drawingManager.findNearestTrendline(
            canvasX,
            canvasY,
            this.handleRadius
        );

        if (this.isDraggingPoint) {
            const dataCoords = this.chart.canvasToDataCoords(
                canvasX,
                canvasY,
                priceRange.min,
                priceRange.max
            );

            const newPoint = {
                canvasX,
                canvasY,
                x: dataCoords.x,
                y: dataCoords.y
            };

            this.drawingManager.updateTrendlinePoint(
                this.isDraggingPoint.id,
                this.isDraggingPoint.pointIndex,
                newPoint
            );

            return true;
        }

        return false;
    }

    handleMouseDown(canvasX, canvasY) {
        const nearest = this.drawingManager.findNearestTrendline(
            canvasX,
            canvasY,
            this.handleRadius
        );

        if (nearest) {
            this.isDraggingPoint = nearest;
            return true;
        }

        return false;
    }

    handleMouseUp() {
        this.isDraggingPoint = null;
    }

    render() {
        const priceRange = this.chart.getVisiblePriceRange();
        const bounds = {
            minX: this.chart.viewStart,
            maxX: this.chart.viewStart + this.chart.viewCount,
            minY: priceRange.min,
            maxY: priceRange.max
        };

        for (const drawing of this.drawingManager.getVisibleDrawings()) {
            if (drawing.type === 'trendline') {
                this.drawTrendline(drawing, bounds, priceRange);
            }
        }

        if (this.isDrawing && this.firstPoint && this.currentMousePos) {
            this.drawPendingTrendline(priceRange);
        }
    }

    drawTrendline(trendline, bounds, priceRange) {
        const equation = this.drawingManager.calculateTrendlineEquation(trendline);
        const endpoints = this.getExtendedEndpoints(equation, bounds, priceRange);

        if (endpoints.length >= 2) {
            this.ctx.strokeStyle = trendline.params.color;
            this.ctx.lineWidth = trendline.params.lineWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(endpoints[0].x, endpoints[0].y);
            this.ctx.lineTo(endpoints[1].x, endpoints[1].y);
            this.ctx.stroke();
        }

        for (let i = 0; i < trendline.points.length; i++) {
            const point = trendline.points[i];
            const canvasCoords = this.chart.dataCoordsToCanvas(
                point.x,
                point.y,
                priceRange.min,
                priceRange.max
            );

            point.canvasX = canvasCoords.x;
            point.canvasY = canvasCoords.y;

            this.ctx.fillStyle = trendline.params.color;
            this.ctx.beginPath();
            this.ctx.arc(canvasCoords.x, canvasCoords.y, 5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    drawPendingTrendline(priceRange) {
        if (!this.firstPoint || !this.currentMousePos) return;

        this.ctx.strokeStyle = 'rgba(255, 217, 61, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.firstPoint.canvasX, this.firstPoint.canvasY);
        this.ctx.lineTo(this.currentMousePos.x, this.currentMousePos.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = 'rgba(255, 217, 61, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(this.firstPoint.canvasX, this.firstPoint.canvasY, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    getExtendedEndpoints(equation, bounds, priceRange) {
        const points = [];

        if (equation.type === 'vertical') {
            const topCanvas = this.chart.dataCoordsToCanvas(
                equation.x,
                priceRange.max,
                priceRange.min,
                priceRange.max
            );
            const bottomCanvas = this.chart.dataCoordsToCanvas(
                equation.x,
                priceRange.min,
                priceRange.min,
                priceRange.max
            );
            return [topCanvas, bottomCanvas];
        }

        const yAtStart = equation.getY(bounds.minX);
        const yAtEnd = equation.getY(bounds.maxX);

        if (yAtStart >= priceRange.min && yAtStart <= priceRange.max) {
            const canvasCoords = this.chart.dataCoordsToCanvas(
                bounds.minX,
                yAtStart,
                priceRange.min,
                priceRange.max
            );
            points.push(canvasCoords);
        }

        if (yAtEnd >= priceRange.min && yAtEnd <= priceRange.max) {
            const canvasCoords = this.chart.dataCoordsToCanvas(
                bounds.maxX,
                yAtEnd,
                priceRange.min,
                priceRange.max
            );
            points.push(canvasCoords);
        }

        if (points.length < 2) {
            const xAtBottom = equation.getX(priceRange.min);
            const xAtTop = equation.getX(priceRange.max);

            if (xAtBottom >= bounds.minX && xAtBottom <= bounds.maxX) {
                const canvasCoords = this.chart.dataCoordsToCanvas(
                    xAtBottom,
                    priceRange.min,
                    priceRange.min,
                    priceRange.max
                );
                points.push(canvasCoords);
            }

            if (xAtTop >= bounds.minX && xAtTop <= bounds.maxX) {
                const canvasCoords = this.chart.dataCoordsToCanvas(
                    xAtTop,
                    priceRange.max,
                    priceRange.min,
                    priceRange.max
                );
                points.push(canvasCoords);
            }
        }

        return points.slice(0, 2);
    }

    getTrendlineEquationDisplay(trendline) {
        const equation = this.drawingManager.calculateTrendlineEquation(trendline);
        return equation.equation;
    }
}

export default TrendlineRenderer;
