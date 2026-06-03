export const EventType = {
    STROKE_START: 'stroke_start',
    STROKE_POINT: 'stroke_point',
    STROKE_END: 'stroke_end',
    TRANSFORM_START: 'transform_start',
    TRANSFORM_MOVE: 'transform_move',
    TRANSFORM_END: 'transform_end',
    BRANCH_POINT: 'branch_point'
};

let globalSequence = 0;

export class TimelineEvent {
    constructor(type, data, timestamp = null, sequence = null) {
        this.id = 'evt_' + Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.data = data;
        this.timestamp = timestamp || Date.now();
        this.sequence = sequence !== null ? sequence : ++globalSequence;
        this.branchId = null;
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            data: this.data,
            timestamp: this.timestamp,
            sequence: this.sequence,
            branchId: this.branchId
        };
    }

    static deserialize(data) {
        const event = new TimelineEvent(data.type, data.data, data.timestamp, data.sequence);
        event.id = data.id;
        event.branchId = data.branchId;
        if (data.sequence && data.sequence > globalSequence) {
            globalSequence = data.sequence;
        }
        return event;
    }
}

export class TimelineBranch {
    constructor(name, parentEventId = null, startTime = null) {
        this.id = 'branch_' + Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.parentEventId = parentEventId;
        this.startTime = startTime || Date.now();
        this.events = [];
    }

    addEvent(event) {
        event.branchId = this.id;
        this.events.push(event);
        return event;
    }

    getEventsUpToIndex(maxIndex) {
        if (maxIndex < 0) return [];
        return this.events.slice(0, maxIndex + 1);
    }

    getEventsBeforeTime(timestamp) {
        const result = [];
        for (let i = 0; i < this.events.length; i++) {
            if (this.events[i].timestamp <= timestamp) {
                result.push(this.events[i]);
            } else {
                break;
            }
        }
        return result;
    }

    findEventIndexAtTime(timestamp) {
        let lo = 0, hi = this.events.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.events[mid].timestamp <= timestamp) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo - 1;
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            parentEventId: this.parentEventId,
            startTime: this.startTime,
            events: this.events.map(e => e.serialize())
        };
    }

    static deserialize(data) {
        const branch = new TimelineBranch(data.name, data.parentEventId, data.startTime);
        branch.id = data.id;
        branch.events = data.events.map(e => TimelineEvent.deserialize(e));
        return branch;
    }
}

export class TimelineRecorder {
    constructor(maxDuration = 5 * 60 * 1000) {
        this.maxDuration = maxDuration;
        this.branches = new Map();
        this.currentBranch = null;
        this.isPlaying = false;
        this.isRecording = true;
        this.playbackOffset = 0;
        this.lastPlaybackIndex = -1;
        this.initialState = null;
        this.listeners = new Map();
        this.cleanupInterval = null;
        this.animationFrameId = null;
        this.init();
    }

    init() {
        this.currentBranch = new TimelineBranch('main', null, Date.now());
        this.branches.set(this.currentBranch.id, this.currentBranch);
        this.startCleanup();
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

    setInitialState(state) {
        this.initialState = { ...state, timestamp: Date.now() };
    }

    recordEvent(type, data) {
        if (!this.isRecording || !this.currentBranch) return null;

        const event = new TimelineEvent(type, { ...data });
        this.currentBranch.addEvent(event);

        this.emit('eventRecorded', {
            event,
            branch: this.currentBranch,
            playbackTime: this.getRecordedDuration()
        });

        return event;
    }

    recordStrokeStart(x, y, color, size) {
        return this.recordEvent(EventType.STROKE_START, { x, y, color, size });
    }

    recordStrokePoint(x, y) {
        return this.recordEvent(EventType.STROKE_POINT, { x, y });
    }

    recordStrokeEnd() {
        return this.recordEvent(EventType.STROKE_END, {});
    }

    recordTransformStart(matrix, centerX, centerY) {
        return this.recordEvent(EventType.TRANSFORM_START, {
            matrix: [...matrix],
            centerX,
            centerY
        });
    }

    recordTransformMove(matrix) {
        return this.recordEvent(EventType.TRANSFORM_MOVE, {
            matrix: [...matrix]
        });
    }

    recordTransformEnd(matrix) {
        return this.recordEvent(EventType.TRANSFORM_END, {
            matrix: [...matrix]
        });
    }

    createBranchAtTime(branchName, timestamp) {
        const branch = new TimelineBranch(branchName, null, timestamp);
        this.branches.set(branch.id, branch);

        const branchEvent = new TimelineEvent(EventType.BRANCH_POINT, {
            branchId: branch.id,
            branchName: branchName,
            timestamp: timestamp
        }, timestamp);

        this.currentBranch.addEvent(branchEvent);

        this.emit('branchCreated', {
            branch,
            parentBranch: this.currentBranch,
            timestamp
        });

        return branch;
    }

    switchToBranch(branchId) {
        if (!this.branches.has(branchId)) return false;

        this.stopPlayback();
        this.currentBranch = this.branches.get(branchId);
        this.playbackOffset = this.getBranchDuration(branchId);

        this.emit('branchSwitched', { branch: this.currentBranch });
        return true;
    }

    getFirstEventTime() {
        if (!this.currentBranch || this.currentBranch.events.length === 0) {
            return this.currentBranch ? this.currentBranch.startTime : Date.now();
        }
        return this.currentBranch.events[0].timestamp;
    }

    getLastEventTime() {
        if (!this.currentBranch || this.currentBranch.events.length === 0) {
            return this.currentBranch ? this.currentBranch.startTime : Date.now();
        }
        return this.currentBranch.events[this.currentBranch.events.length - 1].timestamp;
    }

    getBranchDuration(branchId = null) {
        const branch = branchId ? this.branches.get(branchId) : this.currentBranch;
        if (!branch || branch.events.length === 0) return 0;

        return branch.events[branch.events.length - 1].timestamp - branch.events[0].timestamp;
    }

    getRecordedDuration() {
        return this.getBranchDuration();
    }

    getEventCount() {
        if (!this.currentBranch) return 0;
        return this.currentBranch.events.length;
    }

    seekTo(timestamp) {
        const branch = this.currentBranch;
        if (!branch || branch.events.length === 0) {
            this.emit('playbackUpdate', {
                timestamp,
                state: { strokes: [], currentStroke: null, transformMatrix: [1, 0, 0, 1, 0, 0] },
                progress: 0,
                elapsed: 0
            });
            return { strokes: [], currentStroke: null, transformMatrix: [1, 0, 0, 1, 0, 0] };
        }

        const eventIndex = branch.findEventIndexAtTime(timestamp);
        const events = eventIndex >= 0 ? branch.getEventsUpToIndex(eventIndex) : [];
        const state = this.reconstructState(events);

        const firstTime = branch.events[0].timestamp;
        const lastTime = branch.events[branch.events.length - 1].timestamp;
        const duration = lastTime - firstTime;
        const elapsed = Math.max(0, timestamp - firstTime);
        const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;

        this.playbackOffset = elapsed;
        this.lastPlaybackIndex = eventIndex;

        this.emit('playbackUpdate', {
            timestamp,
            state,
            progress,
            elapsed,
            eventIndex,
            totalEvents: branch.events.length
        });

        return state;
    }

    reconstructState(events) {
        const state = {
            strokes: [],
            currentStroke: null,
            transformMatrix: [1, 0, 0, 1, 0, 0],
            transformStartMatrix: null
        };

        if (this.initialState) {
            state.transformMatrix = [...this.initialState.transformMatrix];
        }

        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            switch (event.type) {
                case EventType.STROKE_START:
                    if (state.currentStroke) {
                        state.currentStroke.endTime = event.timestamp;
                        state.strokes.push({
                            ...state.currentStroke,
                            points: [...state.currentStroke.points]
                        });
                    }
                    state.currentStroke = {
                        points: [{ x: event.data.x, y: event.data.y, time: event.timestamp }],
                        color: event.data.color,
                        size: event.data.size,
                        startTime: event.timestamp
                    };
                    break;

                case EventType.STROKE_POINT:
                    if (state.currentStroke) {
                        state.currentStroke.points.push({
                            x: event.data.x,
                            y: event.data.y,
                            time: event.timestamp
                        });
                    }
                    break;

                case EventType.STROKE_END:
                    if (state.currentStroke) {
                        state.currentStroke.endTime = event.timestamp;
                        state.strokes.push({
                            ...state.currentStroke,
                            points: [...state.currentStroke.points]
                        });
                        state.currentStroke = null;
                    }
                    break;

                case EventType.TRANSFORM_START:
                    state.transformStartMatrix = [...event.data.matrix];
                    break;

                case EventType.TRANSFORM_MOVE:
                case EventType.TRANSFORM_END:
                    state.transformMatrix = [...event.data.matrix];
                    break;
            }
        }

        return state;
    }

    startPlayback(fromTime = 0, toTime = null, speed = 1.0) {
        if (this.isPlaying) return;

        const branch = this.currentBranch;
        if (!branch || branch.events.length === 0) return;

        this.isPlaying = true;
        this.isRecording = false;
        this.lastPlaybackIndex = -1;

        const firstEventTime = branch.events[0].timestamp;
        const lastEventTime = branch.events[branch.events.length - 1].timestamp;
        const duration = lastEventTime - firstEventTime;

        if (duration <= 0) {
            this.isPlaying = false;
            return;
        }

        const startOffset = fromTime;
        const endOffset = toTime != null ? toTime : duration;
        const realStartTime = Date.now();

        this.playbackOffset = startOffset;

        this.seekTo(firstEventTime + startOffset);

        const animate = () => {
            if (!this.isPlaying) return;

            const realElapsed = Date.now() - realStartTime;
            this.playbackOffset = Math.min(startOffset + realElapsed * speed, endOffset);

            const absoluteTime = firstEventTime + this.playbackOffset;
            this.seekTo(absoluteTime);

            if (this.playbackOffset >= endOffset) {
                this.isPlaying = false;
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                this.emit('playbackComplete', {});
                return;
            }

            this.animationFrameId = requestAnimationFrame(animate);
        };

        this.emit('playbackStart', { fromTime: startOffset, toTime: endOffset, speed });
        this.animationFrameId = requestAnimationFrame(animate);
    }

    stopPlayback() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.emit('playbackStop', { offset: this.playbackOffset });
    }

    resumeRecording() {
        this.stopPlayback();

        const currentTime = this.getFirstEventTime() + this.playbackOffset;
        const allEvents = this.currentBranch.events;
        const eventsAfter = allEvents.filter(e => e.timestamp > currentTime);

        if (eventsAfter.length > 0) {
            const branch = this.createBranchAtTime(
                `branch_${this.branches.size}`,
                currentTime
            );
            this.currentBranch = branch;
            this.emit('recordingResumed', { branch, currentTime });
        }

        this.isRecording = true;
        this.emit('recordingStart', {});
    }

    pauseRecording() {
        this.isRecording = false;
        this.emit('recordingPause', {});
    }

    getStartTime() {
        return this.getFirstEventTime();
    }

    getProgress() {
        const duration = this.getRecordedDuration();
        if (duration <= 0) return 0;
        return Math.min(1, Math.max(0, this.playbackOffset / duration));
    }

    cleanupOldEvents() {
        const now = Date.now();
        const cutoff = now - this.maxDuration;

        this.branches.forEach(branch => {
            while (branch.events.length > 0 && branch.events[0].timestamp < cutoff) {
                branch.events.shift();
            }
        });

        this.emit('cleanup', { cutoff, remainingEvents: this.getTotalEventCount() });
    }

    startCleanup() {
        if (this.cleanupInterval) return;
        this.cleanupInterval = setInterval(() => this.cleanupOldEvents(), 30000);
    }

    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    getTotalEventCount() {
        let count = 0;
        this.branches.forEach(branch => {
            count += branch.events.length;
        });
        return count;
    }

    getBranchList() {
        return Array.from(this.branches.values()).map(branch => ({
            id: branch.id,
            name: branch.name,
            parentEventId: branch.parentEventId,
            startTime: branch.startTime,
            eventCount: branch.events.length,
            duration: this.getBranchDuration(branch.id)
        }));
    }

    clear() {
        this.stopPlayback();
        this.branches.clear();
        this.initialState = null;
        this.playbackOffset = 0;
        this.lastPlaybackIndex = -1;
        this.init();
        this.emit('cleared', {});
    }

    serialize() {
        return {
            maxDuration: this.maxDuration,
            initialState: this.initialState,
            currentBranchId: this.currentBranch ? this.currentBranch.id : null,
            branches: Array.from(this.branches.values()).map(b => b.serialize())
        };
    }

    static deserialize(data) {
        const recorder = new TimelineRecorder(data.maxDuration);
        recorder.branches.clear();

        data.branches.forEach(bData => {
            const branch = TimelineBranch.deserialize(bData);
            recorder.branches.set(branch.id, branch);
        });

        if (data.currentBranchId && recorder.branches.has(data.currentBranchId)) {
            recorder.currentBranch = recorder.branches.get(data.currentBranchId);
        }

        recorder.initialState = data.initialState;
        return recorder;
    }

    destroy() {
        this.stopPlayback();
        this.stopCleanup();
        this.listeners.clear();
    }
}
