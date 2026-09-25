# DEVPATH 🚀
### Your Path to Developing Yourself — 12 Career Tracks, Curated Roadmaps & Full-Stack Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-Backend-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![JWT](https://img.shields.io/badge/JWT-Authentication-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DEVPATH is a modern, full-stack career platform designed to help learners and developers master in-demand technology fields through comprehensive 9-phase learning roadmaps, curated resources (English & Arabic), progress tracking, and interactive tools.

---

## ✨ Features

- **12 Comprehensive Career Tracks (108 Total Phases)**:
  1. 🤖 **AI Engineering** — Python, ML Algorithms, Deep Learning, PyTorch, Transformers, MLOps.
  2. 💻 **Full-Stack Development** — HTML/CSS/JS, React, Node.js, Express, SQL/NoSQL, Docker, CI/CD.
  3. 📱 **Mobile App Development** — Flutter, React Native, Dart, State Management, Firebase, App Store publishing.
  4. ☁️ **DevOps & Cloud Engineering** — Linux, Docker, Kubernetes, Terraform, AWS, GitHub Actions.
  5. 🔒 **Cybersecurity & Ethical Hacking** — Network Defense, Linux Administration, Penetration Testing, Burp Suite.
  6. 📊 **Data Analysis & BI** — Excel, SQL, Python (Pandas/NumPy), Power BI, Tableau, Storytelling.
  7. 🎨 **UI/UX Design** — User Research, Wireframing, Figma Mastery, Design Systems, Prototyping.
  8. 🎮 **Game Development** — Unity, Unreal Engine, C#, C++, 3D Math, Shaders, Physics Engines.
  9. ⚡ **Embedded Systems & IoT** — C/C++, Microcontrollers (ARM Cortex/ESP32), RTOS, IoT Protocols.
  10. ⛓️ **Blockchain & Web3** — Cryptography, Solidity, Smart Contracts, Ethereum, Hardhat, DeFi.
  11. 🧠 **Machine Learning Engineering** — Advanced Statistics, Scikit-Learn, TensorFlow, Feature Engineering, Model Serving.
  12. 🧪 **Software Quality Assurance (QA)** — Test Automation, Selenium, Cypress, Playwright, API Testing, Performance Testing.

- **Authentication & Security Ecosystem**:
  - Secure Registration & Sign In with password confirmation and live strength meter.
  - **Email Verification** via 6-digit OTP code or direct magic token link with cooldown resend timer.
  - Cryptographically secure **Forgot Password** and token-based **Password Reset** flow.
  - User Profile settings with personal stats, completed phases tracking, and password changes.

- **Admin Management Portal (`/admin.html`)**:
  - Live metric counters (registered users, submitted inquiries, completed phases).
  - User database table with verification status badges and roles.
  - Inquiries Inbox with one-click direct email reply (`mailto:`).

- **Modern Glassmorphic UI**:
  - Dark-mode aesthetic with custom animations, responsive layouts, and Font Awesome integration.
  - Interactive 3D Vanta.NET canvas background on the landing page.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid), JavaScript (ES6+), Font Awesome, Three.js / Vanta.NET.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL 8.0+ (with zero-config automatic in-memory fallback for instant local testing).
- **Security & Auth**: JSON Web Tokens (JWT), Bcrypt password hashing, Crypto tokens for password reset and email verification.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- Optional: [MySQL](https://www.mysql.com/) (if not running, the application automatically uses in-memory mode)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mohamed-zizo-sketch/Devpath.git
   cd Devpath
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
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

4. **Start the server**:
   ```bash
   node server.js
   ```

5. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🔑 Default Administrator Access

- **Management URL**: `http://localhost:3000/admin.html`
- **Admin Email**: `sci.mohamedabdelaziz01652@alexu.edu.eg`
- **Default Password**: `admin123`

---

## 🌐 Production Deployment

Ready to deploy on Render or Railway with included configuration files:
- `render.yaml`
- `Dockerfile`
- `DEPLOYMENT_GUIDE.md`

---

## 👨‍💻 Author

**Mohamed Abdelaziz**
- 📧 Email: [sci.mohamedabdelaziz01652@alexu.edu.eg](mailto:sci.mohamedabdelaziz01652@alexu.edu.eg)
- 💼 LinkedIn: [Mohamed Abdelaziz](https://www.linkedin.com/in/mohamed--zizo--)
- 🐙 GitHub: [@mohamed-zizo-sketch](https://github.com/mohamed-zizo-sketch)
