/**
 * DEVPATH AI Phase Tutor widget.
 * Include this file (plus css/ai-tutor.css) on any roadmap page.
 * Requires the user to be logged in (uses the same JWT stored on login,
 * assumed to be in localStorage under 'devpath_token' — adjust the key
 * below if your login flow stores it under a different name).
 */
(function () {
  const TOKEN_KEY = 'devpath_token'; // adjust if your auth code uses a different localStorage key

  let currentContext = { trackTitle: document.title || 'DEVPATH', phaseTitle: '', phaseTopics: '' };
  let panelEl, messagesEl, inputEl, sendBtn, headerLabelEl;

  function buildWidget() {
    const fab = document.createElement('button');
    fab.className = 'ai-tutor-fab';
    fab.type = 'button';
    fab.title = 'Ask the AI Tutor';
    fab.innerHTML = '🤖';
    fab.addEventListener('click', () => togglePanel());

    const panel = document.createElement('div');
    panel.className = 'ai-tutor-panel';
    panel.innerHTML = `
      <div class="ai-tutor-header">
        <div class="ai-tutor-header-text">
          <strong>AI Phase Tutor</strong>
          <span id="ai-tutor-scope-label">General questions</span>
        </div>
        <button type="button" class="ai-tutor-close" aria-label="Close">✕</button>
      </div>
      <div class="ai-tutor-messages" id="ai-tutor-messages">
        <div class="ai-tutor-msg ai">Hi! Ask me anything about this phase — concepts, resources, or what to focus on next.</div>
      </div>
      <div class="ai-tutor-input-row">
        <input type="text" id="ai-tutor-input" placeholder="Ask a question..." maxlength="1000" />
        <button type="button" id="ai-tutor-send">Ask</button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    panelEl = panel;
    messagesEl = panel.querySelector('#ai-tutor-messages');
    inputEl = panel.querySelector('#ai-tutor-input');
    sendBtn = panel.querySelector('#ai-tutor-send');
    headerLabelEl = panel.querySelector('#ai-tutor-scope-label');

    panel.querySelector('.ai-tutor-close').addEventListener('click', () => panel.classList.remove('open'));
    sendBtn.addEventListener('click', sendQuestion);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendQuestion(); });
  }

  function togglePanel() {
    panelEl.classList.toggle('open');
    if (panelEl.classList.contains('open')) inputEl.focus();
  }

  function openWithContext(trackTitle, phaseTitle, phaseTopics) {
    currentContext = { trackTitle: trackTitle || currentContext.trackTitle, phaseTitle: phaseTitle || '', phaseTopics: phaseTopics || '' };
    headerLabelEl.textContent = phaseTitle ? `Scoped to: ${phaseTitle}` : 'General questions';
    panelEl.classList.add('open');
    inputEl.focus();
  }

  function appendMessage(text, cls) {
    const div = document.createElement('div');
    div.className = `ai-tutor-msg ${cls}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function sendQuestion() {
    const question = inputEl.value.trim();
    if (!question) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      appendMessage('Please log in to ask the AI tutor a question.', 'error');
      return;
    }

    appendMessage(question, 'user');
    inputEl.value = '';
    sendBtn.disabled = true;
    const loadingEl = appendMessage('Thinking…', 'loading');

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          trackTitle: currentContext.trackTitle,
          phaseTitle: currentContext.phaseTitle,
          phaseTopics: currentContext.phaseTopics,
          question
        })
      });
      const data = await res.json();
      loadingEl.remove();
      if (!res.ok) {
        appendMessage(data.error || 'Something went wrong. Please try again.', 'error');
      } else {
        appendMessage(data.answer, 'ai');
      }
    } catch (err) {
      loadingEl.remove();
      appendMessage('Network error — please try again.', 'error');
    } finally {
      sendBtn.disabled = false;
    }
  }

  // Auto-injects an "Ask AI" button into every .phase-card found on the page
  // (shared markup across all DEVPATH roadmap pages: .phase-card > .phase-header h3
  // + .phase-description). No manual editing needed per phase.
  function injectPhaseButtons() {
    document.querySelectorAll('.phase-card').forEach((card) => {
      const header = card.querySelector('.phase-header');
      const titleEl = card.querySelector('.phase-header h3');
      const descEl = card.querySelector('.phase-description');
      const skillTags = Array.from(card.querySelectorAll('.skill-tag')).map(t => t.textContent.trim()).join(', ');
      if (!header || !titleEl) return;

      const title = titleEl.textContent.trim();
      const topics = [descEl ? descEl.textContent.trim() : '', skillTags].filter(Boolean).join(' | ');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-tutor-ask-phase';
      btn.innerHTML = '🤖 Ask AI';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openWithContext(document.title, title, topics);
      });
      header.appendChild(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildWidget();
    injectPhaseButtons();
  });

  // Expose for manual use if needed
  window.DevpathAITutor = { open: openWithContext };
})();
