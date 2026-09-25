# DEVPATH — Deployment & Platform Management Guide

## 1. 🔑 Administrator Credentials & Management Page

- **Admin Dashboard URL**: `http://localhost:3000/admin.html` (or `https://<your-domain>/admin.html`)
- **Admin Email**: `sci.mohamedabdelaziz01652@alexu.edu.eg`
- **Default Password**: `admin123`
- **Management Capabilities**:
  - **Live Platform Metrics**: Real-time counters for registered users, submitted inquiries, and completed learning phases.
  - **User Management Table**: View registered users, role permissions (`user` / `admin`), and email verification status badges.
  - **Inquiries Inbox**: Review incoming contact form submissions with a one-click `mailto:` direct email reply button.

---

## 2. 🗄️ Database Architecture & Configuration

- **Database Engine**: MySQL 8.0+ (with zero-configuration automatic fallback to in-memory store if MySQL server is offline).
- **Database Name**: `devpath_db`
- **Configuration** (defined in `.env`):
  ```env
  PORT=3000
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=devpath_db
  DB_PORT=3306
  JWT_SECRET=devpath_secret_jwt_key_2026_super_secure
  ADMIN_EMAIL=sci.mohamedabdelaziz01652@alexu.edu.eg
  ```
- **Schema File**: `database/schema.sql`
- **Database Tables**:
  1. `users`:
     - `id`: INT AUTO_INCREMENT PRIMARY KEY
     - `full_name`: VARCHAR(100)
     - `email`: VARCHAR(150) UNIQUE
     - `password_hash`: VARCHAR(255) (Bcrypt hashed)
     - `role`: ENUM('user', 'admin') DEFAULT 'user'
     - `is_verified`: BOOLEAN DEFAULT FALSE
     - `verification_token`: VARCHAR(255) DEFAULT NULL
     - `verification_code`: VARCHAR(10) DEFAULT NULL (6-digit OTP)
     - `reset_token`: VARCHAR(255) DEFAULT NULL
     - `reset_expires`: TIMESTAMP NULL
     - `created_at` & `updated_at`: TIMESTAMP
  2. `user_progress`:
     - `id`: INT AUTO_INCREMENT PRIMARY KEY
     - `user_id`: INT (Foreign Key -> users.id, ON DELETE CASCADE)
     - `track_id`: VARCHAR(50) (e.g., `fullstack`, `ai`, `mobile`, `devops`, etc.)
     - `phase_number`: INT
     - `completed`: BOOLEAN DEFAULT TRUE
     - `updated_at`: TIMESTAMP
  3. `contact_messages`:
     - `id`: INT AUTO_INCREMENT PRIMARY KEY
     - `name`: VARCHAR(100)
     - `email`: VARCHAR(150)
     - `subject`: VARCHAR(200)
     - `message`: TEXT
     - `is_read`: BOOLEAN DEFAULT FALSE
     - `created_at`: TIMESTAMP

---

## 3. 🔐 Complete Authentication & Verification Ecosystem

1. **User Registration & Login (`SignUp_LogIn_Form.html`)**:
   - 3-panel sliding interface for Login, Registration, and Forgot Password.
   - Interactive password strength bar and show/hide eye toggles.
   - On registration, user is redirected to `verify-email.html`.

2. **Email Verification (`verify-email.html`)**:
   - Dual-mode verification:
     - **6-Digit Code (OTP)**: Auto-tabbing, backspace support, and paste handling.
     - **Direct Magic Link**: Instant verification via `?token=...`.
   - Resend verification code with a 60-second cooldown timer.
   - API Endpoints:
     - `POST /api/auth/verify-email` (body: `{ email, code }` or `{ token }`)
     - `POST /api/auth/resend-verification` (body: `{ email }`)

3. **Forgot & Reset Password (`reset-password.html`)**:
   - Submitting email sends a secure crypto reset token.
   - Password reset page validates token expiry and updates the bcrypt hash.
   - API Endpoints:
     - `POST /api/auth/forgot-password` (body: `{ email }`)
     - `GET /api/auth/verify-reset-token?token=...`
     - `POST /api/auth/reset-password` (body: `{ token, newPassword }`)

4. **User Profile Settings (`profile.html`)**:
   - Allows users to view completed phases across all 12 tracks, update display name, and change account password.

---

## 4. 🌐 Production Deployment on a Live Domain (Free & Easy)

### Recommended Platform: Render.com (100% Free Tier)
1. Push your project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: complete DEVPATH platform with 12 tracks, backend, auth, and email verification"
   git branch -M main
   git remote add origin https://github.com/mohamed-zizo-sketch/final_project.git
   git push -u origin main
   ```
2. Go to [https://render.com](https://render.com) and log in with your GitHub account.
3. Click **New +** > **Web Service**.
4. Select your `final_project` repository.
5. Render will automatically configure the build settings using the provided `render.yaml` or you can manually set:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Click **Deploy Web Service**.
7. In ~2 minutes, your website will be live at:
   `https://devpath-portal.onrender.com` (with free automatic SSL/HTTPS).

### Free Managed Cloud MySQL (Optional)
If you want persistent cloud MySQL instead of the built-in memory storage:
- Create a free instance on [Aiven.io](https://aiven.io/) or [TiDB Cloud](https://tidb.cloud/).
- Add the connection parameters (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) to Render's **Environment** tab.
- The server will automatically create the database and tables upon startup.

### Connecting Your Own Custom Domain
In Render or Railway:
1. Go to **Settings** > **Custom Domains**.
2. Enter your custom domain (e.g. `devpath.tech`, `devpath.org`, or `devpath.com`).
3. Add the displayed `CNAME` or `A` record in your DNS provider (Namecheap, GoDaddy, Cloudflare, etc.).
4. Render automatically provisions and renews free SSL certificates!
