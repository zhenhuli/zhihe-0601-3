export const GestureState = {
    IDLE: 'idle',
    DRAWING: 'drawing',
    TRANSFORMING: 'transforming',
    CONFLICT: 'conflict'
};

export const GestureType = {
    NONE: 'none',
    DRAW: 'draw',
    TRANSFORM: 'transform'
};

export class GestureRecognizer {
    constructor() {
        this.state = GestureState.IDLE;
        this.activePoints = new Map();
        this.startPoints = new Map();
        this.transformStartMatrix = null;
        this.currentGesture = GestureType.NONE;
        this.shiftPressed = false;
        this.simulatedPointId = 'simulated_second_point';
        this.simulatedOffset = { x: 50, y: 50 };
        this.minDistanceThreshold = 5;
        this.minAngleThreshold = 0.02;
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Shift') {
            this.shiftPressed = true;
            if (this.activePoints.size === 1 && this.state === GestureState.DRAWING) {
                this.promoteToTransform();
            }
        }
    }

    handleKeyUp(e) {
        if (e.key === 'Shift') {
            this.shiftPressed = false;
            if (this.activePoints.has(this.simulatedPointId)) {
                this.activePoints.delete(this.simulatedPointId);
                this.startPoints.delete(this.simulatedPointId);
                if (this.activePoints.size === 1 && this.state === GestureState.TRANSFORMING) {
                    this.demoteToDrawing();
                }
            }
        }
    }

    getCanvasCoords(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleMouseDown(e, canvas) {
        const point = this.getCanvasCoords(e, canvas);
        const pointId = 'mouse';
        const now = Date.now();

        if (this.shiftPressed && this.activePoints.size === 0) {
            this.activePoints.set(pointId, { ...point, time: now });
            this.startPoints.set(pointId, { ...point, time: now });

            const simulatedPoint = {
                x: point.x + this.simulatedOffset.x,
                y: point.y + this.simulatedOffset.y,
                time: now
            };
            this.activePoints.set(this.simulatedPointId, { ...simulatedPoint });
            this.startPoints.set(this.simulatedPointId, { ...simulatedPoint });

            this.startTransform();
        } else if (this.shiftPressed && this.activePoints.size === 1) {
            this.activePoints.set(pointId, { ...point, time: now });
            this.startPoints.set(pointId, { ...point, time: now });

            const [firstId] = this.activePoints.keys();
            const firstPoint = this.activePoints.get(firstId);
            this.simulatedOffset = {
                x: firstPoint.x - point.x,
                y: firstPoint.y - point.y
            };

            this.startTransform();
        } else {
            this.activePoints.set(pointId, { ...point, time: now });
            this.startPoints.set(pointId, { ...point, time: now });

            if (this.activePoints.size === 1) {
                this.startDrawing(point);
            }
        }
    }

    handleMouseMove(e, canvas) {
        const point = this.getCanvasCoords(e, canvas);
        const pointId = 'mouse';

        if (!this.activePoints.has(pointId)) return;

        const now = Date.now();
        this.activePoints.set(pointId, { ...point, time: now });

        if (this.shiftPressed && this.state === GestureState.DRAWING) {
            this.promoteToTransform();
        }

        if (this.shiftPressed && this.activePoints.has(this.simulatedPointId)) {
            const simulatedPoint = {
                x: point.x + this.simulatedOffset.x,
                y: point.y + this.simulatedOffset.y,
                time: now
            };
            this.activePoints.set(this.simulatedPointId, { ...simulatedPoint });
        }

        this.updateGesture();
    }

    handleMouseUp(e, canvas) {
        const pointId = 'mouse';

        if (!this.activePoints.has(pointId)) return;

        const endPoint = this.getCanvasCoords(e, canvas);

        if (this.state === GestureState.DRAWING) {
            this.endDrawing(endPoint);
        } else if (this.state === GestureState.TRANSFORMING) {
            this.endTransform();
        }

        this.activePoints.delete(pointId);
        this.startPoints.delete(pointId);

        if (this.activePoints.has(this.simulatedPointId)) {
            this.activePoints.delete(this.simulatedPointId);
            this.startPoints.delete(this.simulatedPointId);
        }

        this.resetState();
    }

    handleTouchStart(e, canvas) {
        e.preventDefault();
        const now = Date.now();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const point = this.getCanvasCoords(touch, canvas);
            const pointId = `touch_${touch.identifier}`;

            this.activePoints.set(pointId, { ...point, time: now });
            this.startPoints.set(pointId, { ...point, time: now });
        }

        if (this.activePoints.size === 1) {
            const [firstId] = this.activePoints.keys();
            const point = this.activePoints.get(firstId);
            this.startDrawing(point);
        } else if (this.activePoints.size >= 2) {
            this.startTransform();
        }
    }

    handleTouchMove(e, canvas) {
        e.preventDefault();
        const now = Date.now();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const point = this.getCanvasCoords(touch, canvas);
            const pointId = `touch_${touch.identifier}`;

            if (this.activePoints.has(pointId)) {
                this.activePoints.set(pointId, { ...point, time: now });
            }
        }

        if (this.activePoints.size >= 2 && this.state === GestureState.DRAWING) {
            this.promoteToTransform();
        }

        this.updateGesture();
    }

    handleTouchEnd(e, canvas) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pointId = `touch_${touch.identifier}`;
            this.activePoints.delete(pointId);
            this.startPoints.delete(pointId);
        }

        if (this.state === GestureState.DRAWING && this.activePoints.size === 0) {
            const endPoint = this.getCanvasCoords(e.changedTouches[0], canvas);
            this.endDrawing(endPoint);
            this.resetState();
        } else if (this.state === GestureState.TRANSFORMING) {
            if (this.activePoints.size === 0) {
                this.endTransform();
                this.resetState();
            } else if (this.activePoints.size === 1) {
                this.demoteToDrawing();
            }
        }
    }

    startDrawing(point) {
        this.state = GestureState.DRAWING;
        this.currentGesture = GestureType.DRAW;
        this.emit('drawStart', { point });
    }

    startTransform() {
        this.state = GestureState.TRANSFORMING;
        this.currentGesture = GestureType.TRANSFORM;
        const points = Array.from(this.activePoints.values());
        this.emit('transformStart', {
            points,
            startPoints: Array.from(this.startPoints.values())
        });
    }

    promoteToTransform() {
        this.endDrawing(null, true);
        this.startTransform();
    }

    demoteToDrawing() {
        this.endTransform();
        const [firstId] = this.activePoints.keys();
        const point = this.activePoints.get(firstId);
        this.startDrawing(point);
    }

    updateGesture() {
        if (this.state === GestureState.DRAWING) {
            const [pointId] = this.activePoints.keys();
            const point = this.activePoints.get(pointId);
            this.emit('drawMove', { point });
        } else if (this.state === GestureState.TRANSFORMING && this.activePoints.size >= 2) {
            const activePoints = Array.from(this.activePoints.values());
            const startPoints = Array.from(this.startPoints.values());

            const p1Start = startPoints[0];
            const p2Start = startPoints[1];
            const p1Current = activePoints[0];
            const p2Current = activePoints[1];

            const hasMoved = this.hasSignificantMovement(p1Start, p1Current) ||
                           this.hasSignificantMovement(p2Start, p2Current);

            if (hasMoved) {
                this.emit('transformMove', {
                    p1Start,
                    p2Start,
                    p1Current,
                    p2Current,
                    points: activePoints
                });
            }
        }
    }

    endDrawing(endPoint, interrupted = false) {
        this.emit('drawEnd', { point: endPoint, interrupted });
    }

    endTransform() {
        const points = Array.from(this.activePoints.values());
        this.emit('transformEnd', { points });
    }

    resetState() {
        this.state = GestureState.IDLE;
        this.currentGesture = GestureType.NONE;
        this.activePoints.clear();
        this.startPoints.clear();
    }

    hasSignificantMovement(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy) > this.minDistanceThreshold;
    }

    getActivePoints() {
        return Array.from(this.activePoints.values());
    }

    getStartPoints() {
        return Array.from(this.startPoints.values());
    }

    getState() {
        return this.state;
    }

    getGestureType() {
        return this.currentGesture;
    }

    isDrawing() {
        return this.state === GestureState.DRAWING;
    }

    isTransforming() {
        return this.state === GestureState.TRANSFORMING;
    }

    detectConflict() {
        if (this.activePoints.size > 2) {
            return true;
        }
        return false;
    }
}
