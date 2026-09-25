/* ============================================
   DEVPATH — Roadmap Progress Tracker
   ============================================ */

const ProgressTracker = {
  trackId: null,
  completedPhases: new Set(),

  init() {
    // Detect track ID from body attribute or page filename
    const bodyTrack = document.body.getAttribute('data-track');
    if (bodyTrack) {
      this.trackId = bodyTrack;
    } else {
      const path = window.location.pathname;
      const file = path.substring(path.lastIndexOf('/') + 1);
      this.trackId = file.replace('_roadmap.html', '').replace('roadmap.html', 'ai');
    }

    this.renderProgressBar();
    this.setupPhaseCheckboxes();
    this.loadProgress();
  },

  renderProgressBar() {
    const hero = document.querySelector('.roadmap-hero');
    if (!hero) return;

    const barContainer = document.createElement('div');
    barContainer.className = 'container progress-tracker-widget';
    barContainer.style.maxWidth = '900px';
    barContainer.style.margin = '0 auto var(--space-2xl)';
    barContainer.innerHTML = `
      <div class="glass-card" style="padding: var(--space-lg); border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-bars-progress" style="color: var(--accent-cyan);"></i> Your Learning Progress
          </span>
          <span id="progressPercentageText" style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">0% Completed</span>
        </div>
        <div style="height: 10px; width: 100%; background: rgba(255, 255, 255, 0.08); border-radius: var(--radius-full); overflow: hidden; position: relative;">
          <div id="progressBarFill" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-yellow)); border-radius: var(--radius-full); transition: width 0.4s ease;"></div>
        </div>
        <div id="progressStatusHint" style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; display: flex; justify-content: space-between;">
          <span id="phasesCompletedCount">0 of 9 phases completed</span>
          <span>Click checkboxes below to mark phases complete</span>
        </div>
      </div>
    `;

    hero.parentNode.insertBefore(barContainer, hero.nextSibling);
  },

  setupPhaseCheckboxes() {
    const phases = document.querySelectorAll('.timeline-phase');
    phases.forEach((phaseEl, index) => {
      const phaseNum = index + 1;
      const header = phaseEl.querySelector('.phase-header');
      if (!header) return;

      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-outline phase-toggle-btn';
      btn.dataset.phase = phaseNum;
      btn.style.marginLeft = 'auto';
      btn.style.padding = '6px 14px';
      btn.style.fontSize = '0.78rem';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'all 0.25s ease';
      btn.innerHTML = `<i class="fa-regular fa-circle"></i> Mark Done`;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePhase(phaseNum);
      });

      header.appendChild(btn);
    });
  },

  async loadProgress() {
    const token = typeof Auth !== 'undefined' ? Auth.getToken() : localStorage.getItem('devpath_token');

    if (token) {
      try {
        const res = await fetch(`/api/progress/${this.trackId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          this.completedPhases = new Set(data.completedPhases);
          this.updateUI();
          return;
        }
      } catch (e) {
        console.warn('Backend progress fetch failed, using local storage fallback');
      }
    }

    // Fallback to local storage
    const local = localStorage.getItem(`devpath_progress_${this.trackId}`);
    if (local) {
      try {
        this.completedPhases = new Set(JSON.parse(local));
      } catch (e) {}
    }
    this.updateUI();
  },

  async togglePhase(phaseNum) {
    const isCompleted = !this.completedPhases.has(phaseNum);

    if (isCompleted) {
      this.completedPhases.add(phaseNum);
    } else {
      this.completedPhases.delete(phaseNum);
    }

    this.updateUI();

    // Save locally
    localStorage.setItem(
      `devpath_progress_${this.trackId}`,
      JSON.stringify(Array.from(this.completedPhases))
    );

    // Save to backend if authenticated
    const token = typeof Auth !== 'undefined' ? Auth.getToken() : localStorage.getItem('devpath_token');
    if (token) {
      try {
        await fetch('/api/progress/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            trackId: this.trackId,
            phaseNumber: phaseNum,
            completed: isCompleted
          })
        });
      } catch (err) {
        console.error('Failed to sync progress to cloud:', err);
      }
    }
  },

  updateUI() {
    const totalPhases = document.querySelectorAll('.timeline-phase').length || 9;
    const count = this.completedPhases.size;
    const percentage = Math.round((count / totalPhases) * 100);

    const fill = document.getElementById('progressBarFill');
    const text = document.getElementById('progressPercentageText');
    const countText = document.getElementById('phasesCompletedCount');

    if (fill) fill.style.width = `${percentage}%`;
    if (text) text.textContent = `${percentage}% Completed`;
    if (countText) countText.textContent = `${count} of ${totalPhases} phases completed`;

    // Update buttons & phase card styles
    document.querySelectorAll('.timeline-phase').forEach((phaseEl, idx) => {
      const phaseNum = idx + 1;
      const isDone = this.completedPhases.has(phaseNum);
      const btn = phaseEl.querySelector('.phase-toggle-btn');
      const card = phaseEl.querySelector('.phase-card');

      if (btn) {
        if (isDone) {
          btn.className = 'btn btn-sm btn-primary phase-toggle-btn';
          btn.style.backgroundColor = 'var(--accent-green)';
          btn.style.borderColor = 'var(--accent-green)';
          btn.style.color = '#03032d';
          btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Completed`;
        } else {
          btn.className = 'btn btn-sm btn-outline phase-toggle-btn';
          btn.style.backgroundColor = 'transparent';
          btn.style.borderColor = 'var(--accent-cyan)';
          btn.style.color = 'var(--accent-cyan)';
          btn.innerHTML = `<i class="fa-regular fa-circle"></i> Mark Done`;
        }
      }

      if (card) {
        if (isDone) {
          card.style.borderColor = 'rgba(52, 211, 153, 0.4)';
          card.style.background = 'rgba(52, 211, 153, 0.05)';
        } else {
          card.style.borderColor = 'var(--glass-border)';
          card.style.background = 'var(--bg-card)';
        }
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ProgressTracker.init();
});
