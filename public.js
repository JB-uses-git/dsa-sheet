/**
 * public.js — Read-only public roadmap page
 */

DSA.load();

function renderPublic() {
  const { sections } = DSA.getState();
  const stats = DSA.computeStats();

  document.getElementById('pSections').textContent = stats.sections;
  document.getElementById('pTopics').textContent = stats.topics;
  document.getElementById('pDone').textContent = stats.done;
  const pct = stats.topics > 0 ? Math.round((stats.done / stats.topics) * 100) : 0;
  document.getElementById('pPct').textContent = pct + '%';
  document.getElementById('pubPct').textContent = pct + '%';
  document.getElementById('pubGlobalFill').style.width = pct + '%';

  const container = document.getElementById('pubSections');
  const empty = document.getElementById('pubEmpty');
  container.innerHTML = '';

  if (sections.length === 0) {
    empty.style.display = 'flex'; return;
  }
  empty.style.display = 'none';

  sections.forEach((section, idx) => {
    const total = section.topics.length;
    const done = section.topics.filter(t => t.done).length;
    const barPct = total > 0 ? Math.round((done / total) * 100) : 0;
    const color = DSA.getColor(section.color);

    const el = document.createElement('div');
    el.className = 'pub-section';
    el.style.animationDelay = `${idx * 0.07}s`;

    el.innerHTML = `
      <div class="pub-sec-head">
        <div class="pub-sec-accent" style="background:${color}"></div>
        <div class="pub-sec-head-content">
          <div class="pub-sec-left">
            <span class="pub-sec-emoji">${DSA.esc(section.emoji || '📌')}</span>
            <div>
              <div class="pub-sec-title">${DSA.esc(section.title)}</div>
              ${section.desc ? `<div class="pub-sec-desc">${DSA.esc(section.desc)}</div>` : ''}
            </div>
          </div>
          <div class="pub-sec-right">
            <span class="pub-sec-counter">${done} / ${total}</span>
            <div class="pub-sec-count-bar">
              <div class="pub-sec-count-fill" style="width:${barPct}%; background:${color}"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="pub-topics">
        ${section.topics.length === 0
        ? `<p style="padding:14px 20px;font-size:.78rem;color:var(--t4);text-align:center">No topics yet.</p>`
        : section.topics.map((t, i) => buildTopicRow(t, i)).join('')}
      </div>
    `;

    container.appendChild(el);
  });

  // Bind notes toggles after rendering
  container.querySelectorAll('.js-notes-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(`pnotes-${btn.dataset.tid}`);
      if (!panel) return;
      const open = panel.classList.toggle('open');
      btn.textContent = open ? '↑' : '↓';
    });
  });
}

function buildTopicRow(topic, idx) {
  const hasLink = DSA.isValidUrl(topic.link);
  const hasNoteLink = DSA.isValidUrl(topic.noteLink);
  const hasNotes = topic.notes && topic.notes.trim().length > 0;

  return `
    <div class="pub-topic ${topic.done ? 'solv' : ''}">
      <span class="pub-topic-idx">${String(idx + 1).padStart(2, '0')}</span>
      <span class="pub-topic-name">${DSA.esc(topic.name)}</span>
      <div class="pub-topic-links">
        ${hasLink ? `<a href="${DSA.esc(topic.link)}"     class="pub-link pub-link-prob" target="_blank" rel="noopener">Problem ↗</a>` : ''}
        ${hasNoteLink ? `<a href="${DSA.esc(topic.noteLink)}" class="pub-link pub-link-sol"  target="_blank" rel="noopener">Solution ↗</a>` : ''}
        ${hasNotes ? `<button class="pub-link pub-notes-btn js-notes-toggle" data-tid="${topic.id}">Notes ↓</button>` : ''}
      </div>
    </div>
    ${hasNotes ? `<div class="pub-notes-panel" id="pnotes-${topic.id}">${DSA.esc(topic.notes)}</div>` : ''}
  `;
}

renderPublic();

// Auto-update when admin saves changes in another tab
window.addEventListener('storage', e => {
  if (e.key === 'jb_dsa_v2') {
    DSA.load();
    renderPublic();
  }
});
