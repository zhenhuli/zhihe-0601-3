import { TransformManager } from './transformManager.js';

export const LayerType = {
    BACKGROUND: 'background',
    SHAPE: 'shape',
    DOODLE: 'doodle'
};

export class BaseLayer {
    constructor(width, height, type) {
        this.width = width;
        this.height = height;
        this.type = type;
        this.visible = true;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    getImageData() {
        return this.ctx.getImageData(0, 0, this.width, this.height);
    }

    putImageData(imageData) {
        this.ctx.putImageData(imageData, 0, 0);
    }

    toDataURL() {
        return this.canvas.toDataURL();
    }

    resize(width, height) {
        const imageData = this.getImageData();
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.putImageData(imageData);
    }

    serialize() {
        return {
            type: this.type,
            width: this.width,
            height: this.height,
            visible: this.visible,
            dataURL: this.toDataURL()
        };
    }
}

export class BackgroundLayer extends BaseLayer {
    constructor(width, height) {
        super(width, height, LayerType.BACKGROUND);
        this.color = '#f5f5f5';
        this.fillBackground();
    }

    fillBackground() {
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    setColor(color) {
        this.color = color;
        this.fillBackground();
    }

    render(mainCtx) {
        if (!this.visible) return;
        mainCtx.drawImage(this.canvas, 0, 0);
    }

    serialize() {
        return {
            ...super.serialize(),
            color: this.color
        };
    }

    static deserialize(data) {
        const layer = new BackgroundLayer(data.width, data.height);
        layer.color = data.color;
        layer.visible = data.visible;
        layer.fillBackground();
        return layer;
    }
}

export class ShapeLayer extends BaseLayer {
    constructor(width, height) {
        super(width, height, LayerType.SHAPE);
        this.transform = new TransformManager();
        this.shape = this.createDefaultStar();
        this.snapToGrid = false;
        this.snapAngle = Math.PI / 12;
    }

    createDefaultStar() {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const outerRadius = 80;
        const innerRadius = 40;
        const points = 5;
        const vertices = [];

        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            vertices.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius
            });
        }

        return {
            type: 'star',
            vertices,
            fillStyle: '#ff6b6b',
            strokeStyle: '#c0392b',
            lineWidth: 2,
            centerX: cx,
            centerY: cy
        };
    }

    setShape(shape) {
        this.shape = { ...shape };
        this.render();
    }

    setSnapToGrid(enabled) {
        this.snapToGrid = enabled;
    }

    setTransform(matrix) {
        this.transform.setMatrix(matrix);
    }

    getTransform() {
        return this.transform.getMatrix();
    }

    applyTransform(matrix) {
        this.transform.matrix = this.transform.multiply(matrix, this.transform.matrix);
    }

    resetTransform() {
        this.transform.reset();
    }

    render() {
        this.clear();

        if (!this.shape || !this.shape.vertices || this.shape.vertices.length < 3) return;

        const ctx = this.ctx;
        ctx.save();

        this.transform.applyToContext(ctx);

        ctx.beginPath();
        ctx.moveTo(this.shape.vertices[0].x, this.shape.vertices[0].y);
        for (let i = 1; i < this.shape.vertices.length; i++) {
            ctx.lineTo(this.shape.vertices[i].x, this.shape.vertices[i].y);
        }
        ctx.closePath();

        if (this.shape.fillStyle) {
            ctx.fillStyle = this.shape.fillStyle;
            ctx.fill();
        }

        if (this.shape.strokeStyle) {
            ctx.strokeStyle = this.shape.strokeStyle;
            ctx.lineWidth = this.shape.lineWidth || 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    renderTo(mainCtx) {
        if (!this.visible) return;
        mainCtx.drawImage(this.canvas, 0, 0);
    }

    serialize() {
        return {
            ...super.serialize(),
            shape: this.shape,
            transformMatrix: this.transform.getMatrix(),
            snapToGrid: this.snapToGrid,
            snapAngle: this.snapAngle
        };
    }

    static deserialize(data) {
        const layer = new ShapeLayer(data.width, data.height);
        layer.shape = data.shape;
        layer.transform.setMatrix(data.transformMatrix);
        layer.snapToGrid = data.snapToGrid;
        layer.snapAngle = data.snapAngle;
        layer.visible = data.visible;
        layer.render();
        return layer;
    }
}

export class DoodleLayer extends BaseLayer {
    constructor(width, height) {
        super(width, height, LayerType.DOODLE);
        this.strokes = [];
        this.currentStroke = null;
        this.brushSize = 3;
        this.brushColor = '#333333';
    }

    startStroke(x, y) {
        this.currentStroke = {
            points: [{ x, y, time: Date.now() }],
            color: this.brushColor,
            size: this.brushSize,
            startTime: Date.now()
        };
    }

    addPoint(x, y) {
        if (!this.currentStroke) return;
        this.currentStroke.points.push({ x, y, time: Date.now() });
        this.drawCurrentStroke();
    }

    endStroke() {
        if (!this.currentStroke) return null;
        this.currentStroke.endTime = Date.now();
        const completedStroke = { ...this.currentStroke };
        this.strokes.push(completedStroke);
        this.currentStroke = null;
        return completedStroke;
    }

    drawCurrentStroke() {
        if (!this.currentStroke || this.currentStroke.points.length < 2) return;

        const ctx = this.ctx;
        const points = this.currentStroke.points;
        const idx = points.length - 1;

        ctx.strokeStyle = this.currentStroke.color;
        ctx.lineWidth = this.currentStroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(points[idx - 1].x, points[idx - 1].y);
        ctx.lineTo(points[idx].x, points[idx].y);
        ctx.stroke();
    }

    drawFullCurrentStroke() {
        if (!this.currentStroke || this.currentStroke.points.length < 2) return;

        const ctx = this.ctx;
        const points = this.currentStroke.points;

        ctx.strokeStyle = this.currentStroke.color;
        ctx.lineWidth = this.currentStroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }

    drawStroke(stroke) {
        if (!stroke.points || stroke.points.length < 2) return;

        const ctx = this.ctx;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    }

    redrawAll() {
        this.clear();
        this.strokes.forEach(stroke => this.drawStroke(stroke));
    }

    clearStrokes() {
        this.strokes = [];
        this.currentStroke = null;
        this.clear();
    }

    setStrokes(strokes) {
        this.strokes = [...strokes];
        this.redrawAll();
    }

    addStroke(stroke) {
        this.strokes.push(stroke);
        this.drawStroke(stroke);
    }

    renderTo(mainCtx) {
        if (!this.visible) return;
        mainCtx.drawImage(this.canvas, 0, 0);
    }

    serialize() {
        return {
            ...super.serialize(),
            strokes: this.strokes.map(s => ({
                ...s,
                points: s.points.map(p => ({ x: p.x, y: p.y, time: p.time }))
            })),
            brushSize: this.brushSize,
            brushColor: this.brushColor
        };
    }

    static deserialize(data) {
        const layer = new DoodleLayer(data.width, data.height);
        layer.strokes = (data.strokes || []).map(s => ({
            ...s,
            points: (s.points || []).map(p => ({ x: p.x, y: p.y, time: p.time }))
        }));
        layer.brushSize = data.brushSize || 3;
        layer.brushColor = data.brushColor || '#333333';
        layer.visible = data.visible;
        layer.redrawAll();
        return layer;
    }
}

export class LayerManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.layers = new Map();
        this.mainCanvas = null;
        this.mainCtx = null;
        this.init();
    }

    init() {
        this.backgroundLayer = new BackgroundLayer(this.width, this.height);
        this.shapeLayer = new ShapeLayer(this.width, this.height);
        this.doodleLayer = new DoodleLayer(this.width, this.height);

        this.layers.set(LayerType.BACKGROUND, this.backgroundLayer);
        this.layers.set(LayerType.SHAPE, this.shapeLayer);
        this.layers.set(LayerType.DOODLE, this.doodleLayer);
    }

    setMainCanvas(canvas) {
        this.mainCanvas = canvas;
        this.mainCtx = canvas.getContext('2d');
    }

    getLayer(type) {
        return this.layers.get(type);
    }

    render() {
        if (!this.mainCtx) return;

        this.mainCtx.clearRect(0, 0, this.width, this.height);
        this.backgroundLayer.render(this.mainCtx);
        this.shapeLayer.render();
        this.shapeLayer.renderTo(this.mainCtx);
        this.doodleLayer.renderTo(this.mainCtx);
    }

    renderShapeOnly() {
        if (!this.mainCtx) return;
        this.shapeLayer.render();
    }

    clear() {
        this.backgroundLayer.clear();
        this.backgroundLayer.fillBackground();
        this.shapeLayer.clear();
        this.shapeLayer.resetTransform();
        this.doodleLayer.clearStrokes();
        this.render();
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.layers.forEach(layer => layer.resize(width, height));
        if (this.mainCanvas) {
            this.mainCanvas.width = width;
            this.mainCanvas.height = height;
        }
        this.render();
    }

    serialize() {
        return {
            width: this.width,
            height: this.height,
            layers: {
                background: this.backgroundLayer.serialize(),
                shape: this.shapeLayer.serialize(),
                doodle: this.doodleLayer.serialize()
            }
        };
    }

    static deserialize(data) {
        const manager = new LayerManager(data.width, data.height);
        manager.backgroundLayer = BackgroundLayer.deserialize(data.layers.background);
        manager.shapeLayer = ShapeLayer.deserialize(data.layers.shape);
        manager.doodleLayer = DoodleLayer.deserialize(data.layers.doodle);

        manager.layers.set(LayerType.BACKGROUND, manager.backgroundLayer);
        manager.layers.set(LayerType.SHAPE, manager.shapeLayer);
        manager.layers.set(LayerType.DOODLE, manager.doodleLayer);

        return manager;
    }
}
