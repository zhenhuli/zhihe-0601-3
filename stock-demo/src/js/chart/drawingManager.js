class DrawingManager {
    constructor() {
        this.drawings = new Map();
        this.nextId = 1;
    }

    addTrendline(p1, p2, params = {}) {
        const id = `trendline_${this.nextId++}`;
        const trendline = {
            id,
            type: 'trendline',
            points: [p1, p2],
            params: {
                color: params.color || '#ffd93d',
                lineWidth: params.lineWidth || 2,
                visible: true,
                ...params
            }
        };

        this.drawings.set(id, trendline);
        return trendline;
    }

    removeDrawing(id) {
        return this.drawings.delete(id);
    }

    getDrawing(id) {
        return this.drawings.get(id);
    }

    getAllDrawings() {
        return Array.from(this.drawings.values());
    }

    getVisibleDrawings() {
        return this.getAllDrawings().filter(d => d.params.visible);
    }

    toggleDrawing(id) {
        const drawing = this.drawings.get(id);
        if (drawing) {
            drawing.params.visible = !drawing.params.visible;
            return drawing.params.visible;
        }
        return false;
    }

    updateTrendlinePoint(id, pointIndex, newPoint) {
        const drawing = this.drawings.get(id);
        if (drawing && drawing.type === 'trendline' && pointIndex < 2) {
            drawing.points[pointIndex] = newPoint;
            return true;
        }
        return false;
    }

    calculateTrendlineEquation(trendline) {
        const [p1, p2] = trendline.points;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        if (dx === 0) {
            return {
                type: 'vertical',
                x: p1.x,
                equation: `x = ${p1.x.toFixed(2)}`
            };
        }

        const slope = dy / dx;
        const intercept = p1.y - slope * p1.x;

        return {
            type: 'linear',
            slope,
            intercept,
            equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
            getY: (x) => slope * x + intercept,
            getX: (y) => (y - intercept) / slope
        };
    }

    getTrendlineEndpoints(trendline, bounds) {
        const equation = this.calculateTrendlineEquation(trendline);
        const points = [];

        if (equation.type === 'vertical') {
            points.push(
                { x: equation.x, y: bounds.minY },
                { x: equation.x, y: bounds.maxY }
            );
        } else {
            const yAtMinX = equation.getY(bounds.minX);
            const yAtMaxX = equation.getY(bounds.maxX);

            if (yAtMinY >= bounds.minY && yAtMinY <= bounds.maxY) {
                points.push({ x: bounds.minX, y: yAtMinY });
            }
            if (yAtMaxY >= bounds.minY && yAtMaxY <= bounds.maxY) {
                points.push({ x: bounds.maxX, y: yAtMaxY });
            }

            if (points.length < 2) {
                const xAtMinY = equation.getX(bounds.minY);
                const xAtMaxY = equation.getX(bounds.maxY);

                if (xAtMinY >= bounds.minX && xAtMinY <= bounds.maxX) {
                    points.push({ x: xAtMinY, y: bounds.minY });
                }
                if (xAtMaxY >= bounds.minX && xAtMaxY <= bounds.maxX) {
                    points.push({ x: xAtMaxY, y: bounds.maxY });
                }
            }
        }

        return points.slice(0, 2);
    }

    findNearestTrendline(mouseX, mouseY, threshold = 10) {
        let nearest = null;
        let minDistance = Infinity;

        for (const drawing of this.getVisibleDrawings()) {
            if (drawing.type !== 'trendline') continue;

            for (let i = 0; i < drawing.points.length; i++) {
                const point = drawing.points[i];
                const distance = Math.sqrt(
                    Math.pow(mouseX - point.canvasX, 2) +
                    Math.pow(mouseY - point.canvasY, 2)
                );

                if (distance < threshold && distance < minDistance) {
                    minDistance = distance;
                    nearest = {
                        id: drawing.id,
                        pointIndex: i,
                        drawing
                    };
                }
            }
        }

        return nearest;
    }

    clear() {
        this.drawings.clear();
    }
}

export default DrawingManager;
