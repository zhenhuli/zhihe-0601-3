import { GestureRecognizer, GestureState } from './gestureRecognizer.js';
import { TransformManager, calculateGestureTransform, snapToGrid } from './transformManager.js';
import { LayerManager, LayerType } from './layers.js';
import { TimelineRecorder } from './timelineRecorder.js';
import { ExportImportManager } from './exportImport.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MAX_RECORD_DURATION = 5 * 60 * 1000;

class CanvasApp {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.layerManager = null;
        this.gestureRecognizer = null;
        this.timelineRecorder = null;
        this.exportManager = null;
        this.transformStartMatrix = null;
        this.isPlaying = false;
        this.isDraggingTimeline = false;
        this.savedDoodleState = null;

        this.init();
    }

    init() {
        this.canvas = document.getElementById('mainCanvas');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.ctx = this.canvas.getContext('2d');

        this.layerManager = new LayerManager(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.layerManager.setMainCanvas(this.canvas);

        this.gestureRecognizer = new GestureRecognizer();

        this.timelineRecorder = new TimelineRecorder(MAX_RECORD_DURATION);
        this.timelineRecorder.setInitialState({
            transformMatrix: this.layerManager.shapeLayer.getTransform()
        });

        this.exportManager = new ExportImportManager(this.layerManager, this.timelineRecorder);

        this.setupGestureHandlers();
        this.setupTimelineHandlers();
        this.setupUIHandlers();

        this.layerManager.render();
        this.updateUI();
    }

    setupGestureHandlers() {
        this.gestureRecognizer.on('drawStart', (data) => this.onDrawStart(data));
        this.gestureRecognizer.on('drawMove', (data) => this.onDrawMove(data));
        this.gestureRecognizer.on('drawEnd', (data) => this.onDrawEnd(data));

        this.gestureRecognizer.on('transformStart', (data) => this.onTransformStart(data));
        this.gestureRecognizer.on('transformMove', (data) => this.onTransformMove(data));
        this.gestureRecognizer.on('transformEnd', (data) => this.onTransformEnd(data));

        this.canvas.addEventListener('mousedown', (e) => this.gestureRecognizer.handleMouseDown(e, this.canvas));
        this.canvas.addEventListener('mousemove', (e) => this.gestureRecognizer.handleMouseMove(e, this.canvas));
        this.canvas.addEventListener('mouseup', (e) => this.gestureRecognizer.handleMouseUp(e, this.canvas));
        this.canvas.addEventListener('mouseleave', (e) => this.gestureRecognizer.handleMouseUp(e, this.canvas));

        this.canvas.addEventListener('touchstart', (e) => this.gestureRecognizer.handleTouchStart(e, this.canvas), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.gestureRecognizer.handleTouchMove(e, this.canvas), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.gestureRecognizer.handleTouchEnd(e, this.canvas), { passive: false });

        document.addEventListener('keydown', (e) => this.gestureRecognizer.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.gestureRecognizer.handleKeyUp(e));
    }

    setupTimelineHandlers() {
        if (this._timelineHandlersBound) {
            this.timelineRecorder.listeners.clear();
        }
        this._timelineHandlersBound = true;

        this.timelineRecorder.on('playbackUpdate', (data) => {
            this.applyReconstructedState(data.state);
            this.updateTimelineUI(data);
        });

        this.timelineRecorder.on('playbackStart', () => {
            this.isPlaying = true;
            this.updatePlaybackButtons();
        });

        this.timelineRecorder.on('playbackStop', () => {
            this.isPlaying = false;
            this.restoreAfterPlayback();
            this.updatePlaybackButtons();
        });

        this.timelineRecorder.on('playbackComplete', () => {
            this.isPlaying = false;
            this.restoreAfterPlayback();
            this.updatePlaybackButtons();
            this.showMessage('回放完成');
        });

        this.timelineRecorder.on('recordingResumed', (data) => {
            this.updateBranchList();
            this.showMessage(`分支已创建: ${data.branch.name}`);
        });

        this.timelineRecorder.on('eventRecorded', (data) => {
            this.updateTimelineProgress();
        });

        this.timelineRecorder.on('branchCreated', () => {
            this.updateBranchList();
        });
    }

    setupUIHandlers() {
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('resetTransformBtn').addEventListener('click', () => this.resetTransform());
        document.getElementById('snapGridToggle').addEventListener('change', (e) => this.toggleSnapGrid(e.target.checked));
        document.getElementById('bgColorPicker').addEventListener('input', (e) => this.setBackgroundColor(e.target.value));

        document.getElementById('brushSize').addEventListener('input', (e) => this.setBrushSize(parseInt(e.target.value)));
        document.getElementById('brushColor').addEventListener('input', (e) => this.setBrushColor(e.target.value));

        document.getElementById('playBtn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopPlaybackAndRestore());
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());

        const timelineSlider = document.getElementById('timelineSlider');
        timelineSlider.addEventListener('mousedown', () => {
            this.isDraggingTimeline = true;
        });
        timelineSlider.addEventListener('mouseup', () => {
            this.isDraggingTimeline = false;
        });
        timelineSlider.addEventListener('input', (e) => {
            this.seekToProgress(parseFloat(e.target.value));
        });

        document.getElementById('playbackSpeed').addEventListener('change', (e) => {
            this.playbackSpeed = parseFloat(e.target.value);
        });

        document.getElementById('exportBtn').addEventListener('click', () => this.exportToJSON());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.importFromJSON(e));

        document.getElementById('exportImageBtn').addEventListener('click', () => this.exportImage());

        document.getElementById('shapeSelect').addEventListener('change', (e) => this.changeShape(e.target.value));
    }

    onDrawStart(data) {
        if (this.isPlaying) {
            this.timelineRecorder.resumeRecording();
        }

        const { point } = data;
        const doodleLayer = this.layerManager.doodleLayer;
        doodleLayer.startStroke(point.x, point.y);

        this.timelineRecorder.recordStrokeStart(
            point.x,
            point.y,
            doodleLayer.brushColor,
            doodleLayer.brushSize
        );

        this.showTouchPoints();
    }

    onDrawMove(data) {
        const { point } = data;
        const doodleLayer = this.layerManager.doodleLayer;
        doodleLayer.addPoint(point.x, point.y);

        this.timelineRecorder.recordStrokePoint(point.x, point.y);

        this.layerManager.render();
        this.showTouchPoints();
    }

    onDrawEnd(data) {
        const doodleLayer = this.layerManager.doodleLayer;
        const stroke = doodleLayer.endStroke();

        if (stroke) {
            this.timelineRecorder.recordStrokeEnd();
        }

        this.layerManager.render();
        this.hideTouchPoints();
    }

    onTransformStart(data) {
        if (this.isPlaying) {
            this.timelineRecorder.resumeRecording();
        }

        this.transformStartMatrix = this.layerManager.shapeLayer.getTransform();
        const { startPoints } = data;
        const centerX = (startPoints[0].x + startPoints[1].x) / 2;
        const centerY = (startPoints[0].y + startPoints[1].y) / 2;

        this.timelineRecorder.recordTransformStart(
            this.transformStartMatrix,
            centerX,
            centerY
        );

        this.showTouchPoints();
        this.updateGestureStatus('transform');
    }

    onTransformMove(data) {
        const { p1Start, p2Start, p1Current, p2Current } = data;

        const transform = calculateGestureTransform(
            p1Start, p2Start, p1Current, p2Current
        );

        let rotation = transform.rotation;
        if (this.layerManager.shapeLayer.snapToGrid) {
            rotation = snapToGrid(rotation);
        }

        const tm = new TransformManager();
        tm.setMatrix(this.transformStartMatrix);
        tm.translate(transform.tx, transform.ty);
        tm.rotate(rotation, transform.centerX, transform.centerY);
        tm.scale(transform.scale, transform.scale, transform.centerX, transform.centerY);

        this.layerManager.shapeLayer.setTransform(tm.getMatrix());
        this.layerManager.renderShapeOnly();
        this.layerManager.render();

        this.timelineRecorder.recordTransformMove(tm.getMatrix());

        this.showTouchPoints();
        this.updateTransformInfo(transform);
    }

    onTransformEnd(data) {
        const finalMatrix = this.layerManager.shapeLayer.getTransform();
        this.timelineRecorder.recordTransformEnd(finalMatrix);

        this.transformStartMatrix = null;
        this.hideTouchPoints();
        this.updateGestureStatus('idle');
        this.clearTransformInfo();
    }

    applyReconstructedState(state) {
        const doodleLayer = this.layerManager.doodleLayer;
        const shapeLayer = this.layerManager.shapeLayer;

        doodleLayer.currentStroke = null;
        doodleLayer.clear();
        state.strokes.forEach(stroke => doodleLayer.drawStroke(stroke));
        doodleLayer.strokes = state.strokes.map(s => ({
            ...s,
            points: [...s.points]
        }));

        shapeLayer.setTransform(state.transformMatrix);

        if (state.currentStroke) {
            doodleLayer.currentStroke = {
                ...state.currentStroke,
                points: [...state.currentStroke.points]
            };
            doodleLayer.drawFullCurrentStroke();
        }

        this.layerManager.render();
    }

    saveCurrentState() {
        this.savedDoodleState = {
            strokes: this.layerManager.doodleLayer.strokes.map(s => ({
                ...s,
                points: [...s.points]
            })),
            currentStroke: this.layerManager.doodleLayer.currentStroke ? {
                ...this.layerManager.doodleLayer.currentStroke,
                points: [...this.layerManager.doodleLayer.currentStroke.points]
            } : null,
            transformMatrix: this.layerManager.shapeLayer.getTransform()
        };
    }

    restoreAfterPlayback() {
        if (!this.savedDoodleState) return;

        const doodleLayer = this.layerManager.doodleLayer;
        const shapeLayer = this.layerManager.shapeLayer;

        doodleLayer.currentStroke = null;
        doodleLayer.clear();
        this.savedDoodleState.strokes.forEach(stroke => doodleLayer.drawStroke(stroke));
        doodleLayer.strokes = this.savedDoodleState.strokes;
        if (this.savedDoodleState.currentStroke) {
            doodleLayer.currentStroke = this.savedDoodleState.currentStroke;
            doodleLayer.drawFullCurrentStroke();
        }
        shapeLayer.setTransform(this.savedDoodleState.transformMatrix);
        shapeLayer.render();

        this.layerManager.render();
        this.savedDoodleState = null;
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.timelineRecorder.stopPlayback();
        } else {
            const duration = this.timelineRecorder.getRecordedDuration();
            if (duration <= 0) {
                this.showMessage('没有可回放的记录');
                return;
            }

            this.saveCurrentState();

            const doodleLayer = this.layerManager.doodleLayer;
            doodleLayer.currentStroke = null;
            doodleLayer.clearStrokes();
            this.layerManager.shapeLayer.resetTransform();
            this.layerManager.render();

            document.getElementById('timelineSlider').value = 0;

            const speed = parseFloat(document.getElementById('playbackSpeed').value) || 1.0;
            this.timelineRecorder.startPlayback(0, null, speed);
        }
    }

    stopPlaybackAndRestore() {
        this.timelineRecorder.stopPlayback();
    }

    stopPlayback() {
        this.timelineRecorder.stopPlayback();
    }

    toggleRecording() {
        if (this.timelineRecorder.isRecording) {
            this.timelineRecorder.pauseRecording();
            document.getElementById('recordBtn').textContent = '⏺ 继续记录';
            document.getElementById('recordBtn').classList.remove('recording');
        } else {
            this.timelineRecorder.resumeRecording();
            document.getElementById('recordBtn').textContent = '⏸ 暂停记录';
            document.getElementById('recordBtn').classList.add('recording');
        }
    }

    seekToProgress(progress) {
        const duration = this.timelineRecorder.getRecordedDuration();
        if (duration <= 0) return;

        const firstEventTime = this.timelineRecorder.getFirstEventTime();
        const targetTime = firstEventTime + progress * duration;

        if (this.isPlaying) {
            this.timelineRecorder.stopPlayback();
        }

        if (!this.savedDoodleState) {
            this.saveCurrentState();
        }

        this.timelineRecorder.seekTo(targetTime);
    }

    clearCanvas() {
        if (confirm('确定要清空画布吗？所有内容将被清除。')) {
            this.layerManager.clear();
            this.timelineRecorder.clear();
            this.timelineRecorder.setInitialState({
                transformMatrix: this.layerManager.shapeLayer.getTransform()
            });
            this.updateUI();
            this.showMessage('画布已清空');
        }
    }

    resetTransform() {
        this.layerManager.shapeLayer.resetTransform();
        this.layerManager.render();
        this.showMessage('形状变换已重置');
    }

    toggleSnapGrid(enabled) {
        this.layerManager.shapeLayer.setSnapToGrid(enabled);
        this.showMessage(enabled ? '已启用对齐网格' : '已关闭对齐网格');
    }

    setBackgroundColor(color) {
        this.layerManager.backgroundLayer.setColor(color);
        this.layerManager.render();
    }

    setBrushSize(size) {
        this.layerManager.doodleLayer.brushSize = size;
        document.getElementById('brushSizeValue').textContent = size + 'px';
    }

    setBrushColor(color) {
        this.layerManager.doodleLayer.brushColor = color;
    }

    changeShape(shapeType) {
        const shapeLayer = this.layerManager.shapeLayer;
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        let shape;
        switch (shapeType) {
            case 'triangle':
                shape = this.createPolygon(cx, cy, 3, 80);
                break;
            case 'square':
                shape = this.createPolygon(cx, cy, 4, 70);
                break;
            case 'pentagon':
                shape = this.createPolygon(cx, cy, 5, 80);
                break;
            case 'hexagon':
                shape = this.createPolygon(cx, cy, 6, 80);
                break;
            case 'star':
            default:
                shape = shapeLayer.createDefaultStar();
                break;
        }

        shapeLayer.setShape(shape);
        shapeLayer.resetTransform();
        this.layerManager.render();
    }

    createPolygon(cx, cy, sides, radius) {
        const vertices = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            vertices.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius
            });
        }

        return {
            type: 'polygon',
            vertices,
            fillStyle: '#4ecdc4',
            strokeStyle: '#26a69a',
            lineWidth: 2,
            centerX: cx,
            centerY: cy
        };
    }

    exportToJSON() {
        try {
            const estimate = this.exportManager.getExportSizeEstimate();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
            const filename = `canvas_${timestamp}.json`;

            const ok = confirm(
                `导出文件大小约 ${estimate.formatted}\n` +
                `包含 ${estimate.events} 个事件，${estimate.strokes} 条笔触，${estimate.branches} 个分支\n` +
                `确定导出？`
            );

            if (!ok) return;

            const success = this.exportManager.exportToFile(filename);
            if (success) {
                this.showMessage('JSON 导出成功');
            } else {
                this.showMessage('导出失败，请重试');
            }
        } catch (e) {
            console.error('Export error:', e);
            alert('导出失败: ' + e.message);
        }
    }

    async importFromJSON(event) {
        try {
            const result = await this.exportManager.importFromFileInput(event.target);

            if (this.isPlaying) {
                this.timelineRecorder.stopPlayback();
            }

            this.timelineRecorder.destroy();

            this.layerManager = result.layerManager;
            this.timelineRecorder = result.timelineRecorder;
            this.exportManager = new ExportImportManager(this.layerManager, this.timelineRecorder);

            this.layerManager.setMainCanvas(this.canvas);
            this.setupTimelineHandlers();

            this.timelineRecorder.setInitialState({
                transformMatrix: this.layerManager.shapeLayer.getTransform()
            });

            this.layerManager.render();
            this.updateUI();
            this.showMessage('导入成功');
        } catch (e) {
            console.error('Import error:', e);
            alert('导入失败: ' + e.message);
        } finally {
            event.target.value = '';
        }
    }

    exportImage() {
        try {
            const format = document.getElementById('imageFormat').value;
            const quality = parseFloat(document.getElementById('imageQuality').value) || 0.92;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');

            const success = this.exportManager.exportAsImage(
                this.canvas,
                `canvas_${timestamp}`,
                format,
                quality
            );

            if (success) {
                this.showMessage('图片导出成功');
            } else {
                this.showMessage('图片导出失败');
            }
        } catch (e) {
            console.error('Image export error:', e);
            alert('图片导出失败: ' + e.message);
        }
    }

    showTouchPoints() {
        const points = this.gestureRecognizer.getActivePoints();
        const overlay = document.getElementById('touchOverlay');
        overlay.innerHTML = '';

        points.forEach((point, index) => {
            const dot = document.createElement('div');
            dot.className = 'touch-point';
            dot.style.left = (point.x - 10) + 'px';
            dot.style.top = (point.y - 10) + 'px';
            dot.textContent = index + 1;
            overlay.appendChild(dot);
        });
    }

    hideTouchPoints() {
        document.getElementById('touchOverlay').innerHTML = '';
    }

    updateGestureStatus(status) {
        const statusEl = document.getElementById('gestureStatus');
        switch (status) {
            case 'transform':
                statusEl.textContent = '双指变换中';
                statusEl.className = 'gesture-status transforming';
                break;
            case 'drawing':
                statusEl.textContent = '涂鸦中';
                statusEl.className = 'gesture-status drawing';
                break;
            default:
                statusEl.textContent = '空闲';
                statusEl.className = 'gesture-status idle';
        }
    }

    updateTransformInfo(transform) {
        document.getElementById('scaleInfo').textContent = (transform.scale * 100).toFixed(1) + '%';
        document.getElementById('rotationInfo').textContent = (transform.rotation * 180 / Math.PI).toFixed(1) + '°';
    }

    clearTransformInfo() {
        document.getElementById('scaleInfo').textContent = '100%';
        document.getElementById('rotationInfo').textContent = '0°';
    }

    updateTimelineUI(data) {
        if (!this.isDraggingTimeline) {
            document.getElementById('timelineSlider').value = data.progress;
        }
        document.getElementById('timeDisplay').textContent = this.formatTime(data.elapsed);
    }

    updateTimelineProgress() {
        const duration = this.timelineRecorder.getRecordedDuration();
        const maxDuration = this.timelineRecorder.maxDuration;

        document.getElementById('recordedTime').textContent = this.formatTime(duration);
        document.getElementById('totalTime').textContent = this.formatTime(maxDuration);

        if (!this.isPlaying && !this.isDraggingTimeline) {
            document.getElementById('timelineSlider').value = 1;
        }
    }

    updatePlaybackButtons() {
        document.getElementById('playBtn').textContent = this.isPlaying ? '⏸ 暂停' : '▶ 播放';
        if (this.isPlaying) {
            document.getElementById('gestureStatus').textContent = '回放中';
            document.getElementById('gestureStatus').className = 'gesture-status drawing';
        } else {
            document.getElementById('gestureStatus').textContent = '空闲';
            document.getElementById('gestureStatus').className = 'gesture-status idle';
        }
    }

    updateBranchList() {
        const branches = this.timelineRecorder.getBranchList();
        const container = document.getElementById('branchList');
        container.innerHTML = '';

        branches.forEach(branch => {
            const div = document.createElement('div');
            div.className = 'branch-item' + (branch.id === this.timelineRecorder.currentBranch.id ? ' active' : '');
            div.innerHTML = `
                <span>${branch.name}</span>
                <span class="branch-info">${this.formatTime(branch.duration)} / ${branch.eventCount}事件</span>
            `;
            div.addEventListener('click', () => {
                this.timelineRecorder.switchToBranch(branch.id);
                this.updateBranchList();
            });
            container.appendChild(div);
        });
    }

    updateUI() {
        this.updateTimelineProgress();
        this.updatePlaybackButtons();
        this.updateBranchList();
        this.updateGestureStatus('idle');
        this.clearTransformInfo();

        document.getElementById('snapGridToggle').checked = this.layerManager.shapeLayer.snapToGrid;
        document.getElementById('bgColorPicker').value = this.layerManager.backgroundLayer.color;
        document.getElementById('brushSize').value = this.layerManager.doodleLayer.brushSize;
        document.getElementById('brushSizeValue').textContent = this.layerManager.doodleLayer.brushSize + 'px';
        document.getElementById('brushColor').value = this.layerManager.doodleLayer.brushColor;
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'toast-message';
        msg.textContent = text;
        document.body.appendChild(msg);

        setTimeout(() => msg.classList.add('show'), 10);
        setTimeout(() => {
            msg.classList.remove('show');
            setTimeout(() => msg.remove(), 300);
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.canvasApp = new CanvasApp();
});
