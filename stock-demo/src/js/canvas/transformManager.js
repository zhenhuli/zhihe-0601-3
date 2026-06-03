export class TransformManager {
    constructor() {
        this.matrix = this.createIdentity();
    }

    createIdentity() {
        return [1, 0, 0, 1, 0, 0];
    }

    multiply(a, b) {
        const [a0, a1, a2, a3, a4, a5] = a;
        const [b0, b1, b2, b3, b4, b5] = b;
        return [
            a0 * b0 + a2 * b1,
            a1 * b0 + a3 * b1,
            a0 * b2 + a2 * b3,
            a1 * b2 + a3 * b3,
            a0 * b4 + a2 * b5 + a4,
            a1 * b4 + a3 * b5 + a5
        ];
    }

    translate(tx, ty) {
        const translation = [1, 0, 0, 1, tx, ty];
        this.matrix = this.multiply(translation, this.matrix);
        return this;
    }

    rotate(angle, cx = 0, cy = 0) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rotation = [cos, sin, -sin, cos, cx - cx * cos + cy * sin, cy - cx * sin - cy * cos];
        this.matrix = this.multiply(rotation, this.matrix);
        return this;
    }

    scale(sx, sy, cx = 0, cy = 0) {
        const scaling = [sx, 0, 0, sy, cx - cx * sx, cy - cy * sy];
        this.matrix = this.multiply(scaling, this.matrix);
        return this;
    }

    transformPoint(x, y) {
        const [m0, m1, m2, m3, m4, m5] = this.matrix;
        return [
            m0 * x + m2 * y + m4,
            m1 * x + m3 * y + m5
        ];
    }

    inverseTransformPoint(x, y) {
        const inv = this.inverse(this.matrix);
        const [m0, m1, m2, m3, m4, m5] = inv;
        return [
            m0 * x + m2 * y + m4,
            m1 * x + m3 * y + m5
        ];
    }

    inverse(matrix) {
        const [a, b, c, d, e, f] = matrix;
        const det = a * d - b * c;
        if (Math.abs(det) < 1e-10) {
            return this.createIdentity();
        }
        const invDet = 1 / det;
        return [
            d * invDet,
            -b * invDet,
            -c * invDet,
            a * invDet,
            (c * f - d * e) * invDet,
            (b * e - a * f) * invDet
        ];
    }

    setMatrix(matrix) {
        this.matrix = [...matrix];
        return this;
    }

    getMatrix() {
        return [...this.matrix];
    }

    reset() {
        this.matrix = this.createIdentity();
        return this;
    }

    decompose() {
        const [a, b, c, d, tx, ty] = this.matrix;
        const sx = Math.sqrt(a * a + b * b);
        const sy = Math.sqrt(c * c + d * d);
        const angle = Math.atan2(b, a);
        return { tx, ty, rotation: angle, scaleX: sx, scaleY: sy };
    }

    applyToContext(ctx) {
        const [a, b, c, d, e, f] = this.matrix;
        ctx.transform(a, b, c, d, e, f);
    }

    clone() {
        const tm = new TransformManager();
        tm.matrix = [...this.matrix];
        return tm;
    }
}

export function calculateGestureTransform(p1Start, p2Start, p1Current, p2Current) {
    const dx1 = p2Start.x - p1Start.x;
    const dy1 = p2Start.y - p1Start.y;
    const dx2 = p2Current.x - p1Current.x;
    const dy2 = p2Current.y - p1Current.y;

    const startDist = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const currentDist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const scale = startDist > 0 ? currentDist / startDist : 1;

    const startAngle = Math.atan2(dy1, dx1);
    const currentAngle = Math.atan2(dy2, dx2);
    const rotation = currentAngle - startAngle;

    const centerX = (p1Start.x + p2Start.x) / 2;
    const centerY = (p1Start.y + p2Start.y) / 2;
    const currentCenterX = (p1Current.x + p2Current.x) / 2;
    const currentCenterY = (p1Current.y + p2Current.y) / 2;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const scaledCenterX = centerX * scale;
    const scaledCenterY = centerY * scale;
    const rotatedX = scaledCenterX * cos - scaledCenterY * sin;
    const rotatedY = scaledCenterX * sin + scaledCenterY * cos;

    const tx = currentCenterX - rotatedX;
    const ty = currentCenterY - rotatedY;

    return {
        scale,
        rotation,
        tx,
        ty,
        centerX,
        centerY
    };
}

export function snapToGrid(angle, gridSize = Math.PI / 12) {
    return Math.round(angle / gridSize) * gridSize;
}
