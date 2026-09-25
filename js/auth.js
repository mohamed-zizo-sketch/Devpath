/* ============================================
   DEVPATH — Client Authentication Manager
   ============================================ */

const Auth = {
  TOKEN_KEY: 'devpath_token',
  USER_KEY: 'devpath_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.updateNavbar();
  },

  saveLocalAccount(account) {
    try {
      const accounts = JSON.parse(localStorage.getItem('devpath_local_accounts') || '[]');
      const cleanEmail = account.email.trim().toLowerCase();
      const existing = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
      if (existing >= 0) {
        accounts[existing] = { ...accounts[existing], ...account, email: cleanEmail };
      } else {
        accounts.push({ ...account, email: cleanEmail });
      }
      localStorage.setItem('devpath_local_accounts', JSON.stringify(accounts));
    } catch (e) {}
  },

  getLocalAccount(email) {
    try {
      const accounts = JSON.parse(localStorage.getItem('devpath_local_accounts') || '[]');
      const cleanEmail = email.trim().toLowerCase();
      return accounts.find(a => a.email.toLowerCase() === cleanEmail);
    } catch (e) {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.href = './index.html';
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  updateNavbar() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;

    const user = this.getUser();
    const existingUserSection = navMenu.querySelector('.nav-user-section');
    if (existingUserSection) existingUserSection.remove();

    const signinBtn = navMenu.querySelector('.nav-btn');

    if (user && this.getToken()) {
      if (signinBtn) signinBtn.style.display = 'none';

      const userSection = document.createElement('div');
      userSection.className = 'nav-user-section';
      userSection.style.display = 'inline-flex';
      userSection.style.alignItems = 'center';
      userSection.style.gap = '10px';
      userSection.style.marginLeft = '8px';

      const adminLink = user.role === 'admin'
        ? `<a href="./admin.html" class="nav-link" style="color: var(--accent-yellow); font-weight: 600;"><i class="fa-solid fa-gauge-high"></i> Admin</a>`
        : '';

      userSection.innerHTML = `
        ${adminLink}
        <a href="./profile.html" class="nav-link user-profile-link" title="My Profile & Settings" style="color: var(--accent-cyan); font-size: 0.9rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
          <i class="fa-solid fa-circle-user" style="font-size: 1.15rem;"></i> ${user.full_name.split(' ')[0]}
        </a>
        <button id="navLogoutBtn" class="btn btn-sm btn-outline" title="Sign Out" style="padding: 6px 12px; font-size: 0.8rem; border-color: rgba(248, 113, 113, 0.4); color: #f87171;">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      `;

      navMenu.appendChild(userSection);

      const logoutBtn = document.getElementById('navLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to sign out?')) {
            Auth.logout();
          }
        });
      }
    } else {
      if (signinBtn) signinBtn.style.display = 'inline-block';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.updateNavbar();
});
