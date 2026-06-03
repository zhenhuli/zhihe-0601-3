import { LayerManager } from './layers.js';
import { TimelineRecorder } from './timelineRecorder.js';

export class ExportImportManager {
    constructor(layerManager, timelineRecorder) {
        this.layerManager = layerManager;
        this.timelineRecorder = timelineRecorder;
        this.version = '1.0.0';
    }

    exportState() {
        const data = {
            version: this.version,
            timestamp: Date.now(),
            type: 'canvas_state',
            layers: this.layerManager.serialize(),
            timeline: this.timelineRecorder.serialize()
        };

        const json = JSON.stringify(data, (key, value) => {
            if (value === undefined) return null;
            return value;
        }, 2);

        return json;
    }

    exportToFile(filename = 'canvas_state.json') {
        try {
            const json = this.exportState();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            return true;
        } catch (e) {
            console.error('Export to file failed:', e);
            return false;
        }
    }

    importState(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.type || data.type !== 'canvas_state') {
                throw new Error('无效的文件格式：不是画布状态文件');
            }

            if (!data.layers) {
                throw new Error('缺少图层数据');
            }

            if (!data.timeline) {
                throw new Error('缺少时间轴数据');
            }

            if (data.version && data.version !== this.version) {
                console.warn(`版本不匹配: 文件版本 ${data.version}, 当前版本 ${this.version}`);
            }

            const validation = this.validateState(data);
            if (!validation.valid) {
                throw new Error('数据验证失败: ' + validation.errors.join(', '));
            }

            const layerManager = LayerManager.deserialize(data.layers);
            const timelineRecorder = TimelineRecorder.deserialize(data.timeline);

            return {
                layerManager,
                timelineRecorder,
                metadata: {
                    version: data.version,
                    timestamp: data.timestamp
                }
            };
        } catch (e) {
            console.error('Import failed:', e);
            throw new Error(`导入失败: ${e.message}`);
        }
    }

    importFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('未选择文件'));
                return;
            }

            if (!file.name.endsWith('.json')) {
                reject(new Error('请选择 .json 文件'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const result = this.importState(e.target.result);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };

            reader.readAsText(file);
        });
    }

    importFromFileInput(inputElement) {
        return new Promise((resolve, reject) => {
            if (!inputElement.files || inputElement.files.length === 0) {
                reject(new Error('未选择文件'));
                return;
            }

            const file = inputElement.files[0];
            this.importFromFile(file).then(resolve).catch(reject);
        });
    }

    exportAsImage(mainCanvas, filename = 'canvas.png', format = 'png', quality = 0.92) {
        try {
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const ext = format === 'jpeg' ? 'jpg' : 'png';

            const dataURL = mainCanvas.toDataURL(mimeType, quality);

            const a = document.createElement('a');
            a.href = dataURL;
            a.download = filename.replace(/\.[^.]+$/, '.' + ext);
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
            }, 100);

            return true;
        } catch (e) {
            console.error('Export image failed:', e);
            return false;
        }
    }

    validateState(data) {
        const errors = [];

        if (!data.version) {
            errors.push('缺少版本号');
        }

        if (!data.layers) {
            errors.push('缺少图层数据');
        } else {
            if (!data.layers.width || !data.layers.height) {
                errors.push('图层尺寸无效');
            }
            if (!data.layers.layers) {
                errors.push('缺少图层定义');
            } else {
                if (!data.layers.layers.background) {
                    errors.push('缺少背景图层');
                }
                if (!data.layers.layers.shape) {
                    errors.push('缺少形状图层');
                }
                if (!data.layers.layers.doodle) {
                    errors.push('缺少涂鸦图层');
                }
            }
        }

        if (!data.timeline) {
            errors.push('缺少时间轴数据');
        } else {
            if (!data.timeline.branches) {
                errors.push('缺少时间轴分支');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    getExportSizeEstimate() {
        try {
            const json = this.exportState();
            const bytes = new Blob([json]).size;

            const units = ['B', 'KB', 'MB', 'GB'];
            let size = bytes;
            let unitIndex = 0;

            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }

            return {
                bytes,
                formatted: `${size.toFixed(2)} ${units[unitIndex]}`,
                events: this.timelineRecorder.getTotalEventCount(),
                branches: this.timelineRecorder.branches.size,
                strokes: this.layerManager.doodleLayer.strokes.length
            };
        } catch (e) {
            console.error('Size estimate failed:', e);
            return {
                bytes: 0,
                formatted: '0 B',
                events: 0,
                branches: 0,
                strokes: 0
            };
        }
    }

    clearAll() {
        this.layerManager.clear();
        this.timelineRecorder.clear();
    }
}
