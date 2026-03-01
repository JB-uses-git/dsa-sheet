/**
 * admin.js — Admin panel logic (password-gated full CRUD)
 */

/* inject shake keyframe */
const _ks = document.createElement('style');
_ks.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}`;
document.head.appendChild(_ks);

DSA.load();

/* ══════════════════════════════════════════
   PASSWORD GATE
══════════════════════════════════════════ */
const gateEl = document.getElementById('gate');
const wrapEl = document.getElementById('adminWrap');
const gateInput = document.getElementById('gateInput');
const gateError = document.getElementById('gateError');

function unlock() {
    if (DSA.checkPassword(gateInput.value)) {
        DSA.setSession();
        gateEl.style.display = 'none';
        wrapEl.style.display = 'block';
        renderAdmin();
    } else {
        gateError.textContent = 'Incorrect password.';
        gateError.style.animation = 'none';
        requestAnimationFrame(() => { gateError.style.animation = 'shake .38s ease'; });
        gateInput.value = '';
        gateInput.focus();
    }
}

if (DSA.hasSession()) {
    gateEl.style.display = 'none';
    wrapEl.style.display = 'block';
}
document.getElementById('gateBtn').addEventListener('click', unlock);
gateInput.addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
document.getElementById('lockBtn').addEventListener('click', () => { DSA.clearSession(); location.reload(); });

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let selectedColor = DSA.COLORS[0].id;
let editSectionId = null;
let editTopicCtx = null;
let deleteCtx = null;

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
function renderAdmin() {
    const { sections } = DSA.getState();
    const grid = document.getElementById('admGrid');
    const empty = document.getElementById('admEmpty');
    grid.innerHTML = '';

    const stats = DSA.computeStats();
    document.getElementById('aSections').textContent = stats.sections;
    document.getElementById('aTopics').textContent = stats.topics;
    document.getElementById('aDone').textContent = stats.done;
    document.getElementById('aPending').textContent = stats.pending;
    const pct = stats.topics > 0 ? Math.round((stats.done / stats.topics) * 100) : 0;
    document.getElementById('admPct').textContent = pct + '%';
    document.getElementById('admBar').style.width = pct + '%';

    if (sections.length === 0) {
        empty.style.display = 'flex'; grid.style.display = 'none'; return;
    }
    empty.style.display = 'none'; grid.style.display = 'grid';
    sections.forEach((s, idx) => grid.appendChild(buildCard(s, idx)));
}

function buildCard(section, idx) {
    const total = section.topics.length;
    const done = section.topics.filter(t => t.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const color = DSA.getColor(section.color);

    const card = document.createElement('div');
    card.className = 'adm-card';
    card.dataset.id = section.id;
    card.style.animationDelay = `${idx * 0.04}s`;

    card.innerHTML = `
    <div class="adm-card-head">
      <div class="adm-card-top">
        <div class="adm-card-meta">
          <div class="adm-card-col" style="background:${color}"></div>
          <span class="adm-card-emoji">${DSA.esc(section.emoji || '📌')}</span>
          <div class="adm-card-info">
            <div class="adm-card-title" title="${DSA.esc(section.title)}">${DSA.esc(section.title)}</div>
            ${section.desc ? `<div class="adm-card-desc">${DSA.esc(section.desc)}</div>` : ''}
          </div>
        </div>
        <div class="adm-card-acts">
          <button class="btn btn-icon js-edit-sec" data-id="${section.id}" title="Edit">✏</button>
          <button class="btn btn-icon js-del-sec"  data-id="${section.id}" title="Delete">✕</button>
        </div>
      </div>
      <div class="adm-card-prog">
        <div class="adm-card-prog-track">
          <div class="adm-card-prog-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="adm-card-prog-lbl">${done}/${total}</span>
      </div>
    </div>
    <div class="adm-topics" id="adm-topics-${section.id}">
      ${section.topics.length === 0
            ? `<p class="adm-no-topics">No topics yet.</p>`
            : section.topics.map(t => buildTopicHTML(t, section.id)).join('')}
    </div>
    <div class="adm-card-foot">
      <button class="adm-add-topic js-add-topic" data-sid="${section.id}">+ Add topic</button>
    </div>
  `;

    card.querySelector('.js-edit-sec').addEventListener('click', () => openEditSection(section.id));
    card.querySelector('.js-del-sec').addEventListener('click', () => openDelete('section', section.id));
    card.querySelector('.js-add-topic').addEventListener('click', () => openAddTopic(section.id));

    card.querySelectorAll('.js-check').forEach(cb => {
        cb.addEventListener('change', e => {
            DSA.toggleDone(e.target.dataset.sid, e.target.dataset.tid, e.target.checked);
            refreshCardProg(section.id);
            refreshStatsBar();
        });
    });
    card.querySelectorAll('.js-edit-topic').forEach(btn =>
        btn.addEventListener('click', () => openEditTopic(btn.dataset.sid, btn.dataset.tid)));
    card.querySelectorAll('.js-del-topic').forEach(btn =>
        btn.addEventListener('click', () => openDelete('topic', btn.dataset.sid, btn.dataset.tid)));

    // Notes expand toggle
    card.querySelectorAll('.js-notes-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const panel = card.querySelector(`#anotes-${btn.dataset.tid}`);
            if (!panel) return;
            const open = panel.classList.toggle('open');
            btn.textContent = open ? '↑' : '↓';
        });
    });

    return card;
}

function buildTopicHTML(t, sectionId) {
    const hasLink = DSA.isValidUrl(t.link);
    const hasNote = DSA.isValidUrl(t.noteLink);
    const hasNotes = t.notes && t.notes.trim().length > 0;

    return `
    <div class="adm-topic ${t.done ? 'done' : ''}" data-tid="${t.id}">
      <input type="checkbox" class="adm-check js-check" ${t.done ? 'checked' : ''}
        data-sid="${sectionId}" data-tid="${t.id}" />
      <div class="adm-topic-info">
        <div class="adm-topic-name">${DSA.esc(t.name)}</div>
        <div class="adm-topic-sub">
          ${hasLink ? `<a href="${DSA.esc(t.link)}" class="adm-topic-link adm-link-prob" target="_blank" rel="noopener">Problem ↗</a>` : ''}
          ${hasNote ? `<a href="${DSA.esc(t.noteLink)}" class="adm-topic-link adm-link-sol" target="_blank" rel="noopener">Solution ↗</a>` : ''}
        </div>
      </div>
      <div class="adm-topic-acts">
        ${hasNotes ? `<button class="btn btn-icon js-notes-toggle" data-tid="${t.id}" title="View notes">↓</button>` : ''}
        <button class="btn btn-icon js-edit-topic" data-sid="${sectionId}" data-tid="${t.id}" title="Edit">✏</button>
        <button class="btn btn-icon js-del-topic"  data-sid="${sectionId}" data-tid="${t.id}" title="Delete">✕</button>
      </div>
    </div>
    ${hasNotes ? `<div class="adm-notes-panel" id="anotes-${t.id}">${DSA.esc(t.notes)}</div>` : ''}
  `;
}

function refreshCardProg(sectionId) {
    const section = DSA.getSection(sectionId);
    if (!section) return;
    const card = document.querySelector(`.adm-card[data-id="${sectionId}"]`);
    if (!card) return;
    const total = section.topics.length;
    const done = section.topics.filter(t => t.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    card.querySelector('.adm-card-prog-fill').style.width = pct + '%';
    card.querySelector('.adm-card-prog-lbl').textContent = `${done}/${total}`;
}

function refreshStatsBar() {
    const stats = DSA.computeStats();
    document.getElementById('aSections').textContent = stats.sections;
    document.getElementById('aTopics').textContent = stats.topics;
    document.getElementById('aDone').textContent = stats.done;
    document.getElementById('aPending').textContent = stats.pending;
    const pct = stats.topics > 0 ? Math.round((stats.done / stats.topics) * 100) : 0;
    document.getElementById('admPct').textContent = pct + '%';
    document.getElementById('admBar').style.width = pct + '%';
}

/* ══════════════════════════════════════════
   SECTION MODAL
══════════════════════════════════════════ */
function openAddSection() {
    editSectionId = null;
    document.getElementById('sectionModalTitle').textContent = 'Add section';
    document.getElementById('sectionTitle').value = '';
    document.getElementById('sectionEmoji').value = '';
    document.getElementById('sectionDesc').value = '';
    selectedColor = DSA.COLORS[0].id; syncColorPicker();
    openModal('sectionModal');
    setTimeout(() => document.getElementById('sectionTitle').focus(), 80);
}
function openEditSection(id) {
    editSectionId = id;
    const s = DSA.getSection(id);
    if (!s) return;
    document.getElementById('sectionModalTitle').textContent = 'Edit section';
    document.getElementById('sectionTitle').value = s.title;
    document.getElementById('sectionEmoji').value = s.emoji || '';
    document.getElementById('sectionDesc').value = s.desc || '';
    selectedColor = s.color || DSA.COLORS[0].id; syncColorPicker();
    openModal('sectionModal');
    setTimeout(() => document.getElementById('sectionTitle').focus(), 80);
}
function saveSection() {
    const title = document.getElementById('sectionTitle').value.trim();
    if (!title) { shakeInput('sectionTitle'); return; }
    const fields = {
        title,
        emoji: document.getElementById('sectionEmoji').value.trim() || '📌',
        color: selectedColor,
        desc: document.getElementById('sectionDesc').value.trim()
    };
    if (editSectionId) DSA.updateSection(editSectionId, fields);
    else DSA.addSection(fields);
    closeModal('sectionModal'); renderAdmin();
}

/* ══════════════════════════════════════════
   TOPIC MODAL
══════════════════════════════════════════ */
function openAddTopic(sectionId) {
    editTopicCtx = { sectionId, topicId: null };
    document.getElementById('topicModalTitle').textContent = 'Add topic';
    ['topicName', 'topicLink', 'topicNoteLink', 'topicNotes'].forEach(id =>
        document.getElementById(id).value = '');
    openModal('topicModal');
    setTimeout(() => document.getElementById('topicName').focus(), 80);
}
function openEditTopic(sectionId, topicId) {
    editTopicCtx = { sectionId, topicId };
    const t = DSA.getSection(sectionId)?.topics.find(t => t.id === topicId);
    if (!t) return;
    document.getElementById('topicModalTitle').textContent = 'Edit topic';
    document.getElementById('topicName').value = t.name || '';
    document.getElementById('topicLink').value = t.link || '';
    document.getElementById('topicNoteLink').value = t.noteLink || '';
    document.getElementById('topicNotes').value = t.notes || '';
    openModal('topicModal');
    setTimeout(() => document.getElementById('topicName').focus(), 80);
}
function saveTopic() {
    const name = document.getElementById('topicName').value.trim();
    if (!name) { shakeInput('topicName'); return; }
    const fields = {
        name,
        link: document.getElementById('topicLink').value.trim(),
        noteLink: document.getElementById('topicNoteLink').value.trim(),
        notes: document.getElementById('topicNotes').value.trim(),
    };
    const { sectionId, topicId } = editTopicCtx;
    if (topicId) DSA.updateTopic(sectionId, topicId, fields);
    else DSA.addTopic(sectionId, fields);
    closeModal('topicModal'); renderAdmin();
}

/* ══════════════════════════════════════════
   DELETE MODAL
══════════════════════════════════════════ */
function openDelete(type, sectionId, topicId) {
    deleteCtx = { type, sectionId, topicId };
    if (type === 'section') {
        const s = DSA.getSection(sectionId);
        document.getElementById('deleteMsg').textContent =
            `Delete "${s?.title}"? All ${s?.topics.length || 0} topics will be removed.`;
    } else {
        const t = DSA.getSection(sectionId)?.topics.find(t => t.id === topicId);
        document.getElementById('deleteMsg').textContent = `Delete topic "${t?.name}"? This cannot be undone.`;
    }
    openModal('deleteModal');
}
function confirmDelete() {
    if (!deleteCtx) return;
    const { type, sectionId, topicId } = deleteCtx;
    if (type === 'section') DSA.deleteSection(sectionId);
    else DSA.deleteTopic(sectionId, topicId);
    closeModal('deleteModal'); renderAdmin();
}

/* ══════════════════════════════════════════
   PASSWORD MODAL
══════════════════════════════════════════ */
function openPwdModal() {
    ['pwdCurrent', 'pwdNew', 'pwdConfirm'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pwdError').textContent = '';
    openModal('pwdModal');
}
function savePwd() {
    const curr = document.getElementById('pwdCurrent').value;
    const newPwd = document.getElementById('pwdNew').value;
    const confirm = document.getElementById('pwdConfirm').value;
    const errEl = document.getElementById('pwdError');
    if (!DSA.checkPassword(curr)) { errEl.textContent = 'Current password is incorrect.'; return; }
    if (newPwd.length < 4) { errEl.textContent = 'New password must be at least 4 characters.'; return; }
    if (newPwd !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
    DSA.setPassword(newPwd);
    closeModal('pwdModal');
    showToast('Password updated');
}

/* ══════════════════════════════════════════
   MODAL UTIL
══════════════════════════════════════════ */
function openModal(id) {
    const el = document.getElementById(id);
    el.style.display = 'flex';
    requestAnimationFrame(() => el.classList.add('open'));
    el._bd = e => { if (e.target === el) closeModal(id); };
    el.addEventListener('click', el._bd);
}
function closeModal(id) {
    const el = document.getElementById(id);
    el.classList.add('closing');
    if (el._bd) el.removeEventListener('click', el._bd);
    setTimeout(() => { el.classList.remove('open', 'closing'); el.style.display = 'none'; }, 200);
}

/* ══════════════════════════════════════════
   PICKER SYNC
══════════════════════════════════════════ */
function syncColorPicker() {
    document.querySelectorAll('.color-swatch').forEach(sw =>
        sw.classList.toggle('sel', sw.dataset.color === selectedColor));
}
function syncEmojiPicker(val) {
    document.querySelectorAll('.emoji-btn').forEach(btn =>
        btn.classList.toggle('sel', btn.dataset.emoji === val));
}

/* ══════════════════════════════════════════
   BUILD PICKERS
══════════════════════════════════════════ */
function buildColorPicker() {
    const cp = document.getElementById('colorPicker');
    DSA.COLORS.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'color-swatch'; sw.style.background = c.hex;
        sw.dataset.color = c.id; sw.title = c.id;
        sw.addEventListener('click', () => { selectedColor = c.id; syncColorPicker(); });
        cp.appendChild(sw);
    });
}
function buildEmojiPresets() {
    const ep = document.getElementById('emojiPresets');
    DSA.EMOJIS.forEach(em => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'emoji-btn';
        btn.textContent = em; btn.dataset.emoji = em;
        btn.addEventListener('click', () => {
            document.getElementById('sectionEmoji').value = em;
            syncEmojiPicker(em);
        });
        ep.appendChild(btn);
    });
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg) {
    let t = document.getElementById('_toast');
    if (!t) {
        t = document.createElement('div'); t.id = '_toast';
        t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:var(--bg-panel);border:1px solid var(--bdr-hi);color:var(--t2);
      font-size:.8rem;font-weight:500;padding:9px 20px;border-radius:var(--r4);
      box-shadow:var(--shadow-md);z-index:500;transition:opacity .3s ease;pointer-events:none;
      letter-spacing:-0.01em;`;
        document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

/* ══════════════════════════════════════════
   INPUT SHAKE
══════════════════════════════════════════ */
function shakeInput(id) {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--hard)';
    el.style.boxShadow = '0 0 0 3px rgba(248,113,113,.12)';
    el.style.animation = 'none';
    requestAnimationFrame(() => { el.style.animation = 'shake .38s ease'; });
    setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; el.style.animation = ''; }, 600);
    el.focus();
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function initEvents() {
    document.getElementById('addSectionBtn').addEventListener('click', openAddSection);
    document.getElementById('admEmptyBtn').addEventListener('click', openAddSection);

    document.getElementById('closeSectionModal').addEventListener('click', () => closeModal('sectionModal'));
    document.getElementById('cancelSectionModal').addEventListener('click', () => closeModal('sectionModal'));
    document.getElementById('saveSectionBtn').addEventListener('click', saveSection);

    document.getElementById('closeTopicModal').addEventListener('click', () => closeModal('topicModal'));
    document.getElementById('cancelTopicModal').addEventListener('click', () => closeModal('topicModal'));
    document.getElementById('saveTopicBtn').addEventListener('click', saveTopic);

    document.getElementById('closeDeleteModal').addEventListener('click', () => closeModal('deleteModal'));
    document.getElementById('cancelDeleteModal').addEventListener('click', () => closeModal('deleteModal'));
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    document.getElementById('closePwdModal').addEventListener('click', () => closeModal('pwdModal'));
    document.getElementById('cancelPwdModal').addEventListener('click', () => closeModal('pwdModal'));
    document.getElementById('savePwdBtn').addEventListener('click', savePwd);

    document.getElementById('sectionEmoji').addEventListener('input', e => syncEmojiPicker(e.target.value.trim()));

    // Double-click logo → change password
    document.getElementById('admLogoBtn').addEventListener('dblclick', openPwdModal);

    // Keyboard in modals
    [['sectionModal', saveSection], ['topicModal', saveTopic]].forEach(([id, fn]) => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal(id);
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); fn(); }
        });
    });
    document.getElementById('deleteModal').addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmDelete();
        if (e.key === 'Escape') closeModal('deleteModal');
    });
    document.getElementById('pwdModal').addEventListener('keydown', e => {
        if (e.key === 'Enter') savePwd();
        if (e.key === 'Escape') closeModal('pwdModal');
    });
}

buildColorPicker();
buildEmojiPresets();
initEvents();
if (DSA.hasSession()) renderAdmin();
