/**
 * data.js — Shared data layer (used by both public.js and admin.js)
 * Handles localStorage read/write and data helpers.
 */

const DSA = (() => {
    const STORAGE_KEY = 'jb_dsa_v2';
    const PWD_KEY = 'jb_dsa_pwd';
    const SESSION_KEY = 'jb_dsa_session';

    const DEFAULT_PWD = 'jb123'; // change via admin panel

    // ── COLORS ──
    const COLORS = [
        { id: 'purple', hex: '#7c6aff' },
        { id: 'cyan', hex: '#22d3ee' },
        { id: 'pink', hex: '#f471b5' },
        { id: 'orange', hex: '#fb923c' },
        { id: 'green', hex: '#4ade80' },
        { id: 'yellow', hex: '#facc15' },
        { id: 'red', hex: '#f87171' },
        { id: 'teal', hex: '#2dd4bf' },
    ];

    const EMOJIS = ['🔢', '🔗', '🌲', '📊', '🔄', '🔍', '💡', '🧩', '📐', '⚡', '🎯', '🧠', '🗺️', '🛠️', '🏆', '📝', '🔺', '⭕', '🔵', '📌'];

    // ── STATE ──
    let state = { sections: [] };

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) state = JSON.parse(raw);
        } catch { state = { sections: [] }; }
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function getState() { return state; }

    // ── PASSWORD ──
    function getPassword() {
        return localStorage.getItem(PWD_KEY) || DEFAULT_PWD;
    }
    function setPassword(pwd) {
        localStorage.setItem(PWD_KEY, pwd);
    }
    function checkPassword(pwd) {
        return pwd === getPassword();
    }
    function setSession() {
        sessionStorage.setItem(SESSION_KEY, '1');
    }
    function hasSession() {
        return sessionStorage.getItem(SESSION_KEY) === '1';
    }
    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    // ── HELPERS ──
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
    function getColor(id) {
        return COLORS.find(c => c.id === id)?.hex || COLORS[0].hex;
    }
    function isValidUrl(str) {
        try { return str && !!new URL(str); } catch { return false; }
    }
    function esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── STATS ──
    function computeStats() {
        const sections = state.sections.length;
        let topics = 0, done = 0;
        state.sections.forEach(s => {
            topics += s.topics.length;
            done += s.topics.filter(t => t.done).length;
        });
        return { sections, topics, done, pending: topics - done };
    }

    // ── SECTION CRUD ──
    function addSection({ title, emoji, color, desc }) {
        const s = { id: uid(), title, emoji: emoji || '📌', color: color || 'purple', desc: desc || '', topics: [] };
        state.sections.push(s);
        save();
        return s;
    }
    function updateSection(id, fields) {
        const s = state.sections.find(s => s.id === id);
        if (!s) return;
        Object.assign(s, fields);
        save();
    }
    function deleteSection(id) {
        state.sections = state.sections.filter(s => s.id !== id);
        save();
    }
    function getSection(id) { return state.sections.find(s => s.id === id); }

    // ── TOPIC CRUD ──
    function addTopic(sectionId, { name, difficulty, link, noteLink, notes }) {
        const section = getSection(sectionId);
        if (!section) return;
        const t = { id: uid(), name, difficulty: difficulty || 'Easy', link: link || '', noteLink: noteLink || '', notes: notes || '', done: false };
        section.topics.push(t);
        save();
        return t;
    }
    function updateTopic(sectionId, topicId, fields) {
        const section = getSection(sectionId);
        if (!section) return;
        const t = section.topics.find(t => t.id === topicId);
        if (!t) return;
        Object.assign(t, fields);
        save();
    }
    function deleteTopic(sectionId, topicId) {
        const section = getSection(sectionId);
        if (!section) return;
        section.topics = section.topics.filter(t => t.id !== topicId);
        save();
    }
    function toggleDone(sectionId, topicId, done) {
        updateTopic(sectionId, topicId, { done });
    }

    // Public API
    return {
        load, save, getState,
        getPassword, setPassword, checkPassword,
        setSession, hasSession, clearSession,
        uid, getColor, isValidUrl, esc,
        computeStats,
        addSection, updateSection, deleteSection, getSection,
        addTopic, updateTopic, deleteTopic, toggleDone,
        COLORS, EMOJIS,
    };
})();
