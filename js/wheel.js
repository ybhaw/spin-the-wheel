import * as THREE from 'three';
import chroma from 'chroma-js';

const COLOR_SCALES = [
    'Spectral',
    'RdYlGn',
    'RdYlBu',
    'RdBu',
    'PiYG',
    'PRGn',
    'BrBG',
    'Set1',
    'Set2',
    'Set3',
    'Pastel1',
    'Pastel2',
    'Paired',
    'Dark2',
    'Accent',
    'Viridis',
    'Plasma',
    'Inferno',
    'Magma',
    'Turbo',
    'YlOrRd',
    'YlGnBu',
    'PuBuGn',
    'Blues',
    'Greens',
    'Oranges',
    'Purples',
    'Reds',
    'Greys',
];

export class Wheel {
    constructor(container, callbacks = {}) {
        this.container = container;
        this.names = [];
        this.segments = [];
        this.wheelGroup = null;
        this.colorScheme = 'Spectral';

        // Spin state (merged from Spinner)
        this.isSpinning = false;
        this.currentAngle = 0;
        this.spinGeneration = 0;
        this.lastSegmentIndex = -1;
        this.spinDuration = 5000;

        // Callbacks
        this.onSegmentChange = callbacks.onSegmentChange || (() => {});
        this.onSpinEnd = callbacks.onSpinEnd || (() => {});
        this.onSpinStart = callbacks.onSpinStart || (() => {});

        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera (orthographic for flat 2D look)
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const viewSize = 4.5;
        this.camera = new THREE.OrthographicCamera(
            (-viewSize * aspect) / 2,
            (viewSize * aspect) / 2,
            viewSize / 2,
            -viewSize / 2,
            0.1,
            100
        );
        this.camera.position.set(0, 0, 5);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.scene.add(new THREE.AmbientLight(0xffffff, 1));

        // Wheel group
        this.wheelGroup = new THREE.Group();
        this.scene.add(this.wheelGroup);

        // Pointer (fixed, doesn't rotate)
        this.addPointer();

        // Resize handling
        this.resizeObserver = new window.ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);

        // Render loop
        this.animate();
    }

    // ===== Wheel Creation =====

    createWheel(names) {
        this.names = names.filter((n) => n.trim());
        this.clearWheelGroup();

        if (this.names.length === 0) return;

        const segmentCount = this.names.length;
        const anglePerSegment = (Math.PI * 2) / segmentCount;
        const radius = 1.8;

        for (let i = 0; i < segmentCount; i++) {
            const startAngle = i * anglePerSegment;
            const endAngle = (i + 1) * anglePerSegment;
            const color = new THREE.Color(this.getSegmentColor(i, segmentCount));

            // Segment shape
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.absarc(0, 0, radius, startAngle, endAngle, false);
            shape.lineTo(0, 0);

            const mesh = new THREE.Mesh(
                new THREE.ShapeGeometry(shape),
                new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
            );
            this.wheelGroup.add(mesh);

            // Text label
            const textSprite = this.createTextLabel(
                this.names[i],
                startAngle,
                endAngle,
                radius,
                color
            );

            this.segments.push({
                mesh,
                name: this.names[i],
                startAngle,
                endAngle,
                color,
                textSprite,
                originalScale: { x: 0.9, y: 0.225 },
            });
        }

        this.addSegmentBorders(segmentCount, radius);
        this.addOuterRing(radius);
        this.addCenterHub();
    }

    clearWheelGroup() {
        while (this.wheelGroup.children.length > 0) {
            const child = this.wheelGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((m) => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            this.wheelGroup.remove(child);
        }
        this.segments = [];
    }

    getSegmentColor(index, total) {
        const scaleName = COLOR_SCALES.includes(this.colorScheme) ? this.colorScheme : 'Spectral';
        const scale = chroma.scale(scaleName).mode('lch');
        const t = total > 1 ? index / (total - 1) : 0.5;
        return scale(t).hex();
    }

    setColorScheme(scheme) {
        this.colorScheme = scheme;
        if (this.names.length > 0) {
            this.createWheel(this.names);
        }
    }

    // ===== Text Labels =====

    createTextLabel(text, startAngle, endAngle, radius, bgColor) {
        const midAngle = (startAngle + endAngle) / 2;
        const textRadius = radius * 0.55;

        // Canvas for text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Text color based on background luminance
        const luminance = bgColor.r * 0.299 + bgColor.g * 0.587 + bgColor.b * 0.114;
        const textColor = luminance > 0.5 ? '#000000' : '#ffffff';

        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = textColor;
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Truncate long text
        let displayText = text;
        const maxWidth = canvas.width - 20;
        while (ctx.measureText(displayText).width > maxWidth && displayText.length > 3) {
            displayText = displayText.slice(0, -1);
        }
        if (displayText !== text) displayText += '...';

        ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: texture, transparent: true })
        );
        sprite.position.set(Math.cos(midAngle) * textRadius, Math.sin(midAngle) * textRadius, 0.01);
        sprite.scale.set(0.9, 0.225, 1);

        // Rotate for readability
        let rotation = midAngle;
        if (midAngle > Math.PI / 2 && midAngle < (Math.PI * 3) / 2) {
            rotation = midAngle + Math.PI;
        }
        sprite.material.rotation = rotation;

        this.wheelGroup.add(sprite);
        return sprite;
    }

    // ===== Visual Elements =====

    addSegmentBorders(segmentCount, radius) {
        const material = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });

        for (let i = 0; i < segmentCount; i++) {
            const angle = (i / segmentCount) * Math.PI * 2;
            const points = [
                new THREE.Vector3(0, 0, 0.001),
                new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.001),
            ];
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
            this.wheelGroup.add(line);
        }
    }

    addOuterRing(radius) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius, radius + 0.08, 64),
            new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide })
        );
        ring.position.z = 0.001;
        this.wheelGroup.add(ring);
    }

    addCenterHub() {
        const hub = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 32),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        hub.position.z = 0.02;
        this.wheelGroup.add(hub);

        const highlight = new THREE.Mesh(
            new THREE.CircleGeometry(0.12, 32),
            new THREE.MeshBasicMaterial({ color: 0xfeca57 })
        );
        highlight.position.z = 0.03;
        this.wheelGroup.add(highlight);
    }

    addPointer() {
        const wheelRadius = 1.8;
        const outerRingWidth = 0.08;
        const pointerWidth = 0.35;
        const pointerHeight = 0.35;

        // Main pointer
        const pointerShape = new THREE.Shape();
        pointerShape.moveTo(0, 0);
        pointerShape.lineTo(pointerWidth, pointerHeight / 2);
        pointerShape.lineTo(pointerWidth, -pointerHeight / 2);
        pointerShape.lineTo(0, 0);

        const pointer = new THREE.Mesh(
            new THREE.ShapeGeometry(pointerShape),
            new THREE.MeshBasicMaterial({ color: 0xfeca57, side: THREE.DoubleSide })
        );
        pointer.position.set(wheelRadius + outerRingWidth - 0.02, 0, 0.05);
        this.scene.add(pointer);

        // Highlight
        const highlightShape = new THREE.Shape();
        highlightShape.moveTo(0.08, 0);
        highlightShape.lineTo(pointerWidth - 0.02, pointerHeight / 2 - 0.08);
        highlightShape.lineTo(pointerWidth - 0.02, -(pointerHeight / 2 - 0.08));
        highlightShape.lineTo(0.08, 0);

        const pointerHighlight = new THREE.Mesh(
            new THREE.ShapeGeometry(highlightShape),
            new THREE.MeshBasicMaterial({ color: 0xf9ca24, side: THREE.DoubleSide })
        );
        pointerHighlight.position.set(wheelRadius + outerRingWidth - 0.02, 0, 0.06);
        this.scene.add(pointerHighlight);
    }

    // ===== Winner Highlighting =====

    highlightWinner(winnerName) {
        this.segments.forEach((seg) => {
            if (seg.textSprite) {
                seg.textSprite.scale.set(seg.originalScale.x, seg.originalScale.y, 1);
            }
        });

        const winner = this.segments.find((seg) => seg.name === winnerName);
        if (winner?.textSprite) {
            winner.textSprite.scale.set(
                winner.originalScale.x * 1.15,
                winner.originalScale.y * 1.15,
                1
            );
        }
    }

    clearHighlight() {
        this.segments.forEach((seg) => {
            if (seg.textSprite) {
                seg.textSprite.scale.set(seg.originalScale.x, seg.originalScale.y, 1);
            }
        });
    }

    // ===== Spin Animation (merged from Spinner) =====

    spin() {
        if (this.segments.length === 0) return;

        this.spinGeneration++;
        const thisGeneration = this.spinGeneration;

        if (!this.isSpinning) {
            this.onSpinStart();
        }
        this.isSpinning = true;

        // Random winner using crypto
        const segmentCount = this.segments.length;
        const randomArray = new Uint32Array(3);
        crypto.getRandomValues(randomArray);

        const winnerIndex = randomArray[0] % segmentCount;
        const segmentAngle = (Math.PI * 2) / segmentCount;

        // Random spins (5-8)
        const spins = 5 + (randomArray[1] / 0xffffffff) * 3;

        // Target angle to land on winner
        const segmentMidAngle = winnerIndex * segmentAngle + segmentAngle / 2;
        const offsetWithinSegment = (randomArray[2] / 0xffffffff - 0.5) * segmentAngle * 0.6;
        const targetAngle =
            this.currentAngle +
            spins * Math.PI * 2 +
            (Math.PI * 2 - segmentMidAngle + offsetWithinSegment);

        const startAngle = this.currentAngle;
        const totalRotation = targetAngle - startAngle;
        const startTime = performance.now();

        const animate = (currentTime) => {
            if (thisGeneration !== this.spinGeneration) return;

            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / this.spinDuration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart

            this.currentAngle = startAngle + totalRotation * eased;
            this.wheelGroup.rotation.z = this.currentAngle;

            // Check segment change for tick sound
            const currentSegmentIndex = this.getCurrentSegmentIndex();
            if (currentSegmentIndex !== this.lastSegmentIndex) {
                this.lastSegmentIndex = currentSegmentIndex;
                this.onSegmentChange(currentSegmentIndex);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                this.onSpinEnd(this.getWinnerAtCurrentAngle());
            }
        };

        requestAnimationFrame(animate);
    }

    setSpinDuration(ms) {
        this.spinDuration = ms;
    }

    getCurrentSegmentIndex() {
        if (this.segments.length === 0) return -1;
        const segmentAngle = (Math.PI * 2) / this.segments.length;
        let normalizedAngle = -this.currentAngle % (Math.PI * 2);
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
        return Math.floor(normalizedAngle / segmentAngle);
    }

    getWinnerAtCurrentAngle() {
        if (this.segments.length === 0) return null;

        let normalizedAngle = -this.currentAngle % (Math.PI * 2);
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

        for (const segment of this.segments) {
            if (normalizedAngle >= segment.startAngle && normalizedAngle < segment.endAngle) {
                return segment.name;
            }
        }
        return this.segments[0].name;
    }

    getSegmentCount() {
        return this.segments.length;
    }

    // ===== Resize & Render =====

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width <= 0 || height <= 0) return;

        const aspect = width / height;
        const viewSize = 4.5;

        this.camera.left = (-viewSize * aspect) / 2;
        this.camera.right = (viewSize * aspect) / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.renderer.dispose();
    }
}
