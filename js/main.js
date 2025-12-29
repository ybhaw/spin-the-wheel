import { Wheel } from './wheel.js';
import { AudioManager } from './audio.js';
import { StorageManager } from './storage.js';

class SpinTheWheelApp {
    constructor() {
        this.wheel = null;
        this.audio = new AudioManager();
        this.storage = new StorageManager();
        this.currentWinner = null;
        this.currentTitle = null;
        this.toastTimeout = null;
        this.sidebarResize = { active: false, startX: 0, startWidth: 0 };

        this.init();
    }

    init() {
        // Cache DOM elements
        this.el = {
            wheelCanvas: document.getElementById('wheel-canvas'),
            wheelContainer: document.querySelector('.wheel-container'),
            namesInput: document.getElementById('names-input'),
            titleInput: document.getElementById('title-input'),
            spinBtn: document.getElementById('spin-btn'),
            soundEnabled: document.getElementById('sound-enabled'),
            removeWinner: document.getElementById('remove-winner'),
            colorScheme: document.getElementById('color-scheme'),
            backgroundImageInput: document.getElementById('background-image-input'),
            backgroundImageFile: document.getElementById('background-image-file'),
            backgroundImageClear: document.getElementById('background-image-clear'),
            spinTimeSlider: document.getElementById('spin-time-slider'),
            spinTimeDisplay: document.getElementById('spin-time-display'),
            spinTimeInput: document.getElementById('spin-time-input'),
            settingsToggle: document.getElementById('settings-toggle'),
            settingsSection: document.querySelector('.settings-section'),
            toast: document.getElementById('winner-toast'),
            toastWinnerName: document.getElementById('toast-winner-name'),
            sidebar: document.getElementById('sidebar'),
            sidebarCollapseBtn: document.getElementById('sidebar-collapse-btn'),
            sidebarExpandBtn: document.getElementById('sidebar-expand-btn'),
            sidebarResizeHandle: document.getElementById('sidebar-resize-handle'),
        };

        // Initialize wheel with callbacks
        this.wheel = new Wheel(this.el.wheelCanvas, {
            onSegmentChange: () => this.audio.playTick(),
            onSpinEnd: (winner) => this.onSpinEnd(winner),
            onSpinStart: () => this.onSpinStart(),
        });

        // Initialize audio on first click
        document.addEventListener('click', () => this.audio.init(), { once: true });

        this.setupEventListeners();
        this.loadFromStorage();
    }

    setupEventListeners() {
        const { el } = this;

        // Names input
        el.namesInput.addEventListener('input', () => {
            this.updateWheel();
            this.save();
        });

        // Spin triggers
        el.spinBtn.addEventListener('click', () => this.spin());
        el.wheelCanvas.addEventListener('click', () => this.spin());
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.wheel.isSpinning) {
                e.preventDefault();
                this.spin();
            }
        });

        // Settings
        el.soundEnabled.addEventListener('change', (e) => {
            this.audio.setEnabled(e.target.checked);
            this.save();
        });

        el.removeWinner.addEventListener('change', () => this.save());

        el.colorScheme.addEventListener('change', () => {
            this.wheel.setColorScheme(el.colorScheme.value);
            this.save();
        });

        el.settingsToggle.addEventListener('click', () => {
            el.settingsSection.classList.toggle('collapsed');
            this.save();
        });

        // Spin time controls
        el.spinTimeSlider.addEventListener('input', () => {
            const value = parseInt(el.spinTimeSlider.value, 10);
            el.spinTimeInput.value = value;
            this.updateSpinTime(value);
            this.save();
        });

        el.spinTimeInput.addEventListener('input', () => {
            const value = Math.max(0, Math.min(3600000, parseInt(el.spinTimeInput.value, 10) || 0));
            el.spinTimeInput.value = value;
            el.spinTimeSlider.value = Math.min(value, 5000);
            this.updateSpinTime(value);
            this.save();
        });

        // Background image
        el.backgroundImageInput.addEventListener('change', () => {
            this.setBackgroundImage(el.backgroundImageInput.value);
            this.save();
        });

        el.backgroundImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new window.FileReader();
                reader.onload = (event) => {
                    this.setBackgroundImage(event.target.result);
                    this.save();
                };
                reader.readAsDataURL(file);
            }
        });

        el.backgroundImageClear.addEventListener('click', () => {
            this.setBackgroundImage('');
            el.backgroundImageFile.value = '';
            this.save();
        });

        // Title
        el.titleInput.addEventListener('input', () => {
            const newTitle = this.storage.slugify(el.titleInput.value);
            if (newTitle && newTitle !== this.currentTitle) {
                this.storage.setHashFromTitle(newTitle);
            }
        });

        el.titleInput.addEventListener('blur', () => this.finalizeTitle());
        el.titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.titleInput.blur();
            }
        });

        window.addEventListener('hashchange', () => this.onHashChange());

        // Sidebar collapse/expand
        el.sidebarCollapseBtn.addEventListener('click', () => {
            el.sidebar.classList.add('collapsed');
            el.sidebarExpandBtn.classList.remove('hidden');
            this.save();
        });

        el.sidebarExpandBtn.addEventListener('click', () => {
            el.sidebar.classList.remove('collapsed');
            el.sidebarExpandBtn.classList.add('hidden');
            this.save();
        });

        // Sidebar resize
        const startResize = (clientX) => {
            this.sidebarResize = {
                active: true,
                startX: clientX,
                startWidth: el.sidebar.offsetWidth,
            };
            el.sidebar.classList.add('resizing');
            el.sidebarResizeHandle.classList.add('active');
            document.body.classList.add('resizing');
        };

        const onResize = (clientX) => {
            if (!this.sidebarResize.active) return;
            const newWidth = Math.max(
                200,
                this.sidebarResize.startWidth + (clientX - this.sidebarResize.startX)
            );
            el.sidebar.style.width = newWidth + 'px';
        };

        const stopResize = () => {
            if (!this.sidebarResize.active) return;
            this.sidebarResize.active = false;
            el.sidebar.classList.remove('resizing');
            el.sidebarResizeHandle.classList.remove('active');
            document.body.classList.remove('resizing');
            this.save();
        };

        el.sidebarResizeHandle.addEventListener('mousedown', (e) => startResize(e.clientX));
        el.sidebarResizeHandle.addEventListener('touchstart', (e) =>
            startResize(e.touches[0].clientX)
        );
        document.addEventListener('mousemove', (e) => onResize(e.clientX));
        document.addEventListener(
            'touchmove',
            (e) => this.sidebarResize.active && onResize(e.touches[0].clientX)
        );
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
    }

    // ===== Core Actions =====

    updateWheel() {
        const names = this.getNames();
        this.wheel.createWheel(names);
        this.el.spinBtn.disabled = names.length < 2;
    }

    spin() {
        if (this.getNames().length < 2) return;
        this.audio.init();
        this.wheel.spin();
    }

    onSpinStart() {
        this.el.spinBtn.disabled = true;
        this.wheel.clearHighlight();
        this.hideToast();
    }

    onSpinEnd(winner) {
        this.currentWinner = winner;
        this.el.spinBtn.disabled = false;

        this.audio.playWin();
        this.wheel.highlightWinner(winner);
        this.showToast(winner);

        if (this.el.removeWinner.checked) {
            setTimeout(() => this.removeWinner(), 2500);
        }
    }

    removeWinner() {
        if (!this.currentWinner) return;

        const names = this.getNames();
        const index = names.indexOf(this.currentWinner);
        if (index > -1) {
            names.splice(index, 1);
            this.el.namesInput.value = names.join('\n');
            this.updateWheel();
            this.save();
        }
        this.currentWinner = null;
    }

    // ===== UI Helpers =====

    getNames() {
        return this.el.namesInput.value
            .split('\n')
            .map((n) => n.trim())
            .filter((n) => n.length > 0);
    }

    updateSpinTime(ms) {
        this.el.spinTimeDisplay.textContent = ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms';
        this.wheel.setSpinDuration(ms);
    }

    setBackgroundImage(url) {
        const trimmed = url?.trim() || '';
        this.el.wheelContainer.style.backgroundImage = trimmed ? `url('${trimmed}')` : '';
        this.el.backgroundImageInput.value = trimmed;
    }

    showToast(winner) {
        if (this.toastTimeout) window.clearTimeout(this.toastTimeout);

        this.el.toastWinnerName.textContent = winner;
        this.el.toast.classList.remove('hidden');
        this.el.toast.classList.add('visible');

        this.toastTimeout = setTimeout(() => this.hideToast(), 4000);
    }

    hideToast() {
        this.el.toast.classList.remove('visible');
        this.el.toast.classList.add('hidden');
    }

    // ===== State Management =====

    applyState(state) {
        if (!state) return;

        const { el } = this;

        if (state.names !== undefined) {
            el.namesInput.value = state.names;
        }

        if (state.soundEnabled !== undefined) {
            el.soundEnabled.checked = state.soundEnabled;
            this.audio.setEnabled(state.soundEnabled);
        }

        if (state.removeWinner !== undefined) {
            el.removeWinner.checked = state.removeWinner;
        }

        if (state.colorScheme !== undefined) {
            el.colorScheme.value = state.colorScheme;
            this.wheel.setColorScheme(state.colorScheme);
        }

        if (state.spinTime !== undefined) {
            el.spinTimeInput.value = state.spinTime;
            el.spinTimeSlider.value = Math.min(state.spinTime, 5000);
            this.updateSpinTime(state.spinTime);
        }

        if (state.settingsCollapsed) {
            el.settingsSection.classList.add('collapsed');
        } else {
            el.settingsSection.classList.remove('collapsed');
        }

        if (state.sidebarCollapsed) {
            el.sidebar.classList.add('collapsed');
            el.sidebarExpandBtn.classList.remove('hidden');
        } else {
            el.sidebar.classList.remove('collapsed');
            el.sidebarExpandBtn.classList.add('hidden');
        }

        if (state.sidebarWidth && !state.sidebarCollapsed) {
            el.sidebar.style.width = state.sidebarWidth + 'px';
        }

        this.setBackgroundImage(state.backgroundImage || '');
    }

    save() {
        if (!this.currentTitle) return;

        const { el } = this;
        this.storage.saveState(this.currentTitle, {
            names: el.namesInput.value,
            soundEnabled: el.soundEnabled.checked,
            removeWinner: el.removeWinner.checked,
            colorScheme: el.colorScheme.value,
            spinTime: parseInt(el.spinTimeInput.value, 10) || 5000,
            settingsCollapsed: el.settingsSection.classList.contains('collapsed'),
            sidebarCollapsed: el.sidebar.classList.contains('collapsed'),
            sidebarWidth: el.sidebar.offsetWidth,
            backgroundImage: el.backgroundImageInput.value,
        });
    }

    loadFromStorage() {
        this.currentTitle = this.storage.initializeTitle();
        this.el.titleInput.value = this.currentTitle;

        const savedState = this.storage.loadState(this.currentTitle);
        this.applyState(savedState);
        this.updateWheel();
    }

    finalizeTitle() {
        let newTitle = this.storage.slugify(this.el.titleInput.value);

        if (!newTitle) {
            newTitle = this.storage.generateRandomTitle();
            this.el.titleInput.value = newTitle;
        }

        if (newTitle !== this.currentTitle) {
            this.currentTitle = newTitle;
            this.storage.setHashFromTitle(newTitle);

            const savedState = this.storage.loadState(newTitle);
            if (savedState) {
                this.applyState(savedState);
                this.updateWheel();
            } else {
                this.setBackgroundImage('');
            }
            this.save();
        }
    }

    onHashChange() {
        const hashTitle = this.storage.getTitleFromHash();

        if (hashTitle && hashTitle !== this.currentTitle) {
            this.currentTitle = hashTitle;
            this.el.titleInput.value = hashTitle;

            const savedState = this.storage.loadState(hashTitle);
            if (savedState) {
                this.applyState(savedState);
            } else {
                this.setBackgroundImage('');
            }
            this.updateWheel();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new SpinTheWheelApp());
