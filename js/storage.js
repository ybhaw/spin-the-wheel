const ADJECTIVES = [
    'swift',
    'bright',
    'calm',
    'bold',
    'eager',
    'fresh',
    'grand',
    'happy',
    'keen',
    'lively',
    'merry',
    'noble',
    'proud',
    'quick',
    'sharp',
    'vivid',
    'warm',
    'cosmic',
    'stellar',
    'lunar',
    'solar',
    'golden',
    'silver',
    'crimson',
];

const NOUNS = [
    'wheel',
    'spinner',
    'picker',
    'team',
    'standup',
    'choice',
    'raffle',
    'meeting',
    'squad',
    'group',
    'circle',
    'spark',
    'wave',
    'breeze',
    'flame',
    'storm',
    'cloud',
    'river',
    'mountain',
    'forest',
    'ocean',
    'star',
    'comet',
    'orbit',
];

const STORAGE_PREFIX = 'spinwheel:';

export class StorageManager {
    constructor() {
        this.currentTitle = null;
    }

    generateRandomTitle() {
        const randomArray = new Uint32Array(2);
        crypto.getRandomValues(randomArray);

        const adjective = ADJECTIVES[randomArray[0] % ADJECTIVES.length];
        const noun = NOUNS[randomArray[1] % NOUNS.length];

        return `${adjective}-${noun}`;
    }

    slugify(title) {
        if (!title) return '';

        return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    getStorageKey(title) {
        return `${STORAGE_PREFIX}${this.slugify(title)}`;
    }

    getTitleFromHash() {
        const hash = window.location.hash;
        if (!hash || hash === '#') return null;

        try {
            return decodeURIComponent(hash.slice(1));
        } catch {
            return hash.slice(1);
        }
    }

    setHashFromTitle(title) {
        const slugified = this.slugify(title);
        if (slugified) {
            const newHash = `#${slugified}`;
            if (window.location.hash !== newHash) {
                history.replaceState(null, '', newHash);
            }
        }
    }

    loadState(title) {
        try {
            const key = this.getStorageKey(title);
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('Failed to load state from localStorage:', e);
        }
        return null;
    }

    saveState(title, state) {
        try {
            const key = this.getStorageKey(title);
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save state to localStorage:', e);
        }
    }

    initializeTitle() {
        let title = this.getTitleFromHash();

        if (!title) {
            title = this.generateRandomTitle();
            this.setHashFromTitle(title);
        }

        this.currentTitle = title;
        return title;
    }
}
