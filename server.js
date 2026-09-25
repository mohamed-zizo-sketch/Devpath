const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'devpath_secret_jwt_key_2026_super_secure';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Database engine & pool references
let dbType = 'mock'; // 'postgres', 'mysql', or 'mock'
let pgPool = null;
let mysqlPool = null;
let useMockDb = true;

// Unified database query adapter (works seamlessly on PostgreSQL, MySQL, and Mock)
const dbPool = {
  async query(sql, params = []) {
    if (dbType === 'postgres' && pgPool) {
      let pgSql = sql;
      if (pgSql.includes('ON DUPLICATE KEY UPDATE completed = VALUES(completed)')) {
        pgSql = pgSql.replace(
          'ON DUPLICATE KEY UPDATE completed = VALUES(completed)',
          'ON CONFLICT (user_id, track_id, phase_number) DO UPDATE SET completed = EXCLUDED.completed'
        );
      }
      const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
      if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }
      let paramIdx = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIdx++}`);

      const result = await pgPool.query(pgSql, params);
      const rows = result.rows || [];
      if (isInsert) {
        rows.insertId = rows.length > 0 && rows[0].id ? rows[0].id : null;
      }
      return [rows, result.fields];
    } else if (dbType === 'mysql' && mysqlPool) {
      return await mysqlPool.query(sql, params);
    } else {
      throw new Error('Database not connected');
    }
  }
};

// Mock in-memory storage fallback if cloud database is not active
const mockDb = {
  users: [
    {
      id: 1,
      full_name: 'Admin Mohamed',
      email: (process.env.ADMIN_EMAIL || 'sci.mohamedabdelaziz01652@alexu.edu.eg').toLowerCase(),
      password_hash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      is_verified: true,
      verification_token: null,
      verification_code: null,
      reset_token: null,
      reset_expires: null,
      created_at: new Date()
    }
  ],
  user_progress: [],
  contact_messages: []
};

// Auto-persist mock database to writable disk location (/tmp on Vercel/Linux, root on Windows)
const MOCK_DB_FILE = path.join(process.platform === 'win32' ? __dirname : '/tmp', 'devpath_mock_db.json');

function loadMockDb() {
  try {
    if (fs.existsSync(MOCK_DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(MOCK_DB_FILE, 'utf8'));
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        mockDb.users = data.users;
        mockDb.user_progress = data.user_progress || [];
        mockDb.contact_messages = data.contact_messages || [];
      }
    }
  } catch (e) {}
}

function saveMockDb() {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(mockDb, null, 2), 'utf8');
  } catch (e) {}
}

loadMockDb();

// Database Initialization (Auto-detects PostgreSQL or MySQL with automatic tables migration)
async function initDatabase() {
  const pgConnUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.STORAGE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  const isPgConfigured = pgConnUrl || process.env.PGHOST || process.env.POSTGRES_HOST;


  // 1. Try PostgreSQL first (Vercel Postgres, Neon, Supabase, Railway)
  if (isPgConfigured) {
    try {
      console.log('🔄 Attempting PostgreSQL connection...');
      const poolConfig = pgConnUrl
        ? { connectionString: pgConnUrl, ssl: { rejectUnauthorized: false } }
        : {
            host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
            user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
            password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
            database: process.env.PGDATABASE || process.env.POSTGRES_DATABASE || 'devpath_db',
            port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10),
            ssl: { rejectUnauthorized: false }
          };

      pgPool = new PgPool(poolConfig);
      await pgPool.query('SELECT NOW()');

      // Create PostgreSQL tables
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          is_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255) DEFAULT NULL,
          verification_code VARCHAR(10) DEFAULT NULL,
          reset_token VARCHAR(255) DEFAULT NULL,
          reset_expires TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_progress (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          track_id VARCHAR(50) NOT NULL,
          phase_number INT NOT NULL,
          completed BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_track_phase UNIQUE (user_id, track_id, phase_number)
        );

        CREATE TABLE IF NOT EXISTS contact_messages (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL,
          subject VARCHAR(200) DEFAULT 'General Inquiry',
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed admin user in PostgreSQL
      const adminEmail = (process.env.ADMIN_EMAIL || 'sci.mohamedabdelaziz01652@alexu.edu.eg').toLowerCase();
      const adminCheck = await pgPool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
      if (adminCheck.rows.length === 0) {
        const adminHash = await bcrypt.hash('admin123', 10);
        await pgPool.query(
          'INSERT INTO users (full_name, email, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, $5)',
          ['Admin Mohamed', adminEmail, adminHash, 'admin', true]
        );
        console.log(`[Database] Seeded initial admin account in PostgreSQL: ${adminEmail}`);
      }

      dbType = 'postgres';
      useMockDb = false;
      console.log('✅ Connected to PostgreSQL Database successfully!');
      return;
    } catch (pgErr) {
      console.warn('⚠️ PostgreSQL connection failed:', pgErr.message);
    }
  }

  // 2. Try MySQL next
  if (process.env.DB_HOST) {
    try {
      const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '3306', 10)
      };

      const connection = await mysql.createConnection(dbConfig);
      const dbName = process.env.DB_NAME || 'devpath_db';
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await connection.end();

      mysqlPool = mysql.createPool({
        ...dbConfig,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('user', 'admin') DEFAULT 'user',
          is_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255) DEFAULT NULL,
          verification_code VARCHAR(10) DEFAULT NULL,
          reset_token VARCHAR(255) DEFAULT NULL,
          reset_expires TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_progress (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          track_id VARCHAR(50) NOT NULL,
          phase_number INT NOT NULL,
          completed BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_track_phase (user_id, track_id, phase_number),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS contact_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL,
          subject VARCHAR(200) DEFAULT 'General Inquiry',
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const adminEmail = (process.env.ADMIN_EMAIL || 'sci.mohamedabdelaziz01652@alexu.edu.eg').toLowerCase();
      const [existingAdmin] = await mysqlPool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
      if (existingAdmin.length === 0) {
        const adminHash = await bcrypt.hash('admin123', 10);
        await mysqlPool.query(
          'INSERT INTO users (full_name, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
          ['Admin Mohamed', adminEmail, adminHash, 'admin', 1]
        );
      }

      dbType = 'mysql';
      useMockDb = false;
      console.log('✅ Connected to MySQL Database successfully!');
      return;
    } catch (mysqlErr) {
      console.warn('⚠️ MySQL connection failed:', mysqlErr.message);
    }
  }

  // 3. Fallback to mock storage
  dbType = 'mock';
  useMockDb = true;
  console.log('ℹ️ Running in persistent file/mock storage mode.');
}

// Authentication Middlewares
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  }
  next();
}

// Favicon Routes
app.get(['/favicon.ico', '/favicon.svg'], (req, res) => {
  const svgPath = path.join(__dirname, 'images', 'favicon.svg');
  const icoPath = path.join(__dirname, 'favicon.ico');
  if (fs.existsSync(svgPath)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.sendFile(svgPath);
  }
  if (fs.existsSync(icoPath)) {
    return res.sendFile(icoPath);
  }
  res.status(204).end();
});

app.get('/images/favicon.svg', (req, res) => {
  const svgPath = path.join(__dirname, 'images', 'favicon.svg');
  if (fs.existsSync(svgPath)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.sendFile(svgPath);
  }
  res.status(404).end();
});

// ----------------- API ROUTES ----------------- //

// 1. Health check & DB Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    database: useMockDb ? 'in-memory-fallback' : 'mysql',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug-files', (req, res) => {
  const fs = require('fs');
  res.json({
    cwd: process.cwd(),
    dirname: __dirname,
    filesInCwd: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : [],
    filesInDirname: fs.existsSync(__dirname) ? fs.readdirSync(__dirname) : []
  });
});

// 2. Register (with email verification code & token generation)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const isAdminEmail = cleanEmail === (process.env.ADMIN_EMAIL || 'sci.mohamedabdelaziz01652@alexu.edu.eg').toLowerCase();
    const role = isAdminEmail ? 'admin' : 'user';

    // Generate 6-digit verification code and token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const isVerified = isAdminEmail ? true : false;

    if (!useMockDb && dbPool) {
      const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email is already registered' });
      }

      const [result] = await dbPool.query(
        'INSERT INTO users (full_name, email, password_hash, role, is_verified, verification_token, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [full_name.trim(), cleanEmail, passwordHash, role, isVerified ? 1 : 0, verificationToken, verificationCode]
      );

      const userId = result.insertId;
      const token = jwt.sign({ id: userId, email: cleanEmail, role, full_name: full_name.trim(), is_verified: isVerified }, JWT_SECRET, { expiresIn: '7d' });

      console.log(`\n📧 [Email Verification Sent]`);
      console.log(`To: ${cleanEmail}`);
      console.log(`Code: ${verificationCode}`);
      console.log(`Link: http://localhost:${PORT}/verify-email.html?email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}\n`);

      return res.status(201).json({
        message: 'User registered successfully. Please verify your email.',
        token,
        user: { id: userId, full_name: full_name.trim(), email: cleanEmail, role, is_verified: isVerified },
        verificationCode,
        verificationToken,
        verificationUrl: `/verify-email.html?email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}&code=${verificationCode}`
      });
    } else {
      const existing = mockDb.users.find(u => u.email === cleanEmail);
      if (existing) {
        return res.status(409).json({ error: 'Email is already registered' });
      }

      const newUser = {
        id: mockDb.users.length + 1,
        full_name: full_name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
        role,
        is_verified: isVerified,
        verification_token: verificationToken,
        verification_code: verificationCode,
        reset_token: null,
        reset_expires: null,
        created_at: new Date()
      };
      mockDb.users.push(newUser);
      saveMockDb();

      const token = jwt.sign({ id: newUser.id, email: cleanEmail, role, full_name: full_name.trim(), is_verified: isVerified }, JWT_SECRET, { expiresIn: '7d' });

      console.log(`\n📧 [Email Verification Sent - Mock]`);
      console.log(`To: ${cleanEmail}`);
      console.log(`Code: ${verificationCode}`);
      console.log(`Link: http://localhost:${PORT}/verify-email.html?email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}\n`);

      return res.status(201).json({
        message: 'User registered successfully. Please verify your email.',
        token,
        user: { id: newUser.id, full_name: newUser.full_name, email: cleanEmail, role, is_verified: isVerified },
        verificationCode,
        verificationToken,
        verificationUrl: `/verify-email.html?email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}&code=${verificationCode}`
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = null;
    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (rows.length > 0) user = rows[0];
    } else {
      user = mockDb.users.find(u => u.email === cleanEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isVerified = Boolean(user.is_verified);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name, is_verified: isVerified },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Verify Email (by token or 6-digit code)
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token, email, code } = req.body;

    let user = null;

    if (token) {
      // Verify via token
      if (!useMockDb && dbPool) {
        const [rows] = await dbPool.query('SELECT * FROM users WHERE verification_token = ?', [token]);
        if (rows.length > 0) user = rows[0];
      } else {
        user = mockDb.users.find(u => u.verification_token === token);
      }
    } else if (email && code) {
      // Verify via email + 6-digit code
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();

      if (!useMockDb && dbPool) {
        const [rows] = await dbPool.query('SELECT * FROM users WHERE email = ? AND verification_code = ?', [cleanEmail, cleanCode]);
        if (rows.length > 0) user = rows[0];
      } else {
        user = mockDb.users.find(u => u.email === cleanEmail && u.verification_code === cleanCode);
      }
    } else {
      return res.status(400).json({ error: 'Verification token or email with code is required' });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code/link' });
    }

    // Mark verified
    if (!useMockDb && dbPool) {
      await dbPool.query(
        'UPDATE users SET is_verified = 1, verification_token = NULL, verification_code = NULL WHERE id = ?',
        [user.id]
      );
    } else {
      user.is_verified = true;
      user.verification_token = null;
      user.verification_code = null;
      saveMockDb();
    }

    console.log(`✅ [Email Verified Successfully] User ID: ${user.id}, Email: ${user.email}`);

    res.json({
      success: true,
      message: 'Your email address has been verified successfully!'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Resend Verification Email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (rows.length > 0) user = rows[0];
    } else {
      user = mockDb.users.find(u => u.email === cleanEmail);
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with that email' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'This email is already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    if (!useMockDb && dbPool) {
      await dbPool.query(
        'UPDATE users SET verification_code = ?, verification_token = ? WHERE id = ?',
        [verificationCode, verificationToken, user.id]
      );
    } else {
      user.verification_code = verificationCode;
      user.verification_token = verificationToken;
    }

    console.log(`\n📧 [Resent Email Verification]`);
    console.log(`To: ${cleanEmail}`);
    console.log(`Code: ${verificationCode}`);
    console.log(`Link: http://localhost:${PORT}/verify-email.html?email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}\n`);

    res.json({
      success: true,
      message: 'Verification code resent successfully',
      code: verificationCode,
      verificationUrl: `/verify-email.html?email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}&code=${verificationCode}`
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Forgot Password — Generate Reset Token
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (rows.length > 0) user = rows[0];
    } else {
      user = mockDb.users.find(u => u.email === cleanEmail);
    }

    if (!user) {
      return res.status(200).json({
        message: 'If that email exists in our records, password reset instructions have been generated.',
        simulated: true
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    if (!useMockDb && dbPool) {
      await dbPool.query(
        'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
        [resetToken, resetExpires, user.id]
      );
    } else {
      user.reset_token = resetToken;
      user.reset_expires = resetExpires;
    }

    const resetUrl = `/reset-password.html?token=${resetToken}`;

    console.log(`\n🔑 [Password Reset Request]`);
    console.log(`Email: ${cleanEmail}`);
    console.log(`Reset URL: http://localhost:${PORT}${resetUrl}\n`);

    res.json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetUrl,
      resetToken
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Verify Reset Token
app.post('/api/auth/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    let user = null;
    const now = new Date();

    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query(
        'SELECT id, email, reset_expires FROM users WHERE reset_token = ? AND reset_expires > ?',
        [token, now]
      );
      if (rows.length > 0) user = rows[0];
    } else {
      user = mockDb.users.find(u => u.reset_token === token && u.reset_expires && new Date(u.reset_expires) > now);
    }

    if (!user) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired password reset link' });
    }

    res.json({ valid: true, email: user.email });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
});

// 8. Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let user = null;
    const now = new Date();

    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query(
        'SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?',
        [token, now]
      );
      if (rows.length > 0) user = rows[0];
    } else {
      user = mockDb.users.find(u => u.reset_token === token && u.reset_expires && new Date(u.reset_expires) > now);
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    if (!useMockDb && dbPool) {
      await dbPool.query(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
        [newHash, user.id]
      );
    } else {
      user.password_hash = newHash;
      user.reset_token = null;
      user.reset_expires = null;
      saveMockDb();
    }

    res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 9. Change Password (Authenticated)
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    let user = null;
    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (rows.length > 0) user = rows[0];
    } else {
      user = mockDb.users.find(u => u.id === req.user.id);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password does not match' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    if (!useMockDb && dbPool) {
      await dbPool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
    } else {
      user.password_hash = newHash;
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. Update Profile (Authenticated)
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name } = req.body;

    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const cleanName = full_name.trim();

    if (!useMockDb && dbPool) {
      await dbPool.query('UPDATE users SET full_name = ? WHERE id = ?', [cleanName, req.user.id]);
    } else {
      const user = mockDb.users.find(u => u.id === req.user.id);
      if (user) user.full_name = cleanName;
    }

    const newToken = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role, full_name: cleanName, is_verified: req.user.is_verified },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      token: newToken,
      user: {
        id: req.user.id,
        full_name: cleanName,
        email: req.user.email,
        role: req.user.role,
        is_verified: req.user.is_verified
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 11. Get Current User Profile & Progress
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    let user = null;
    let progress = [];

    if (!useMockDb && dbPool) {
      const [users] = await dbPool.query('SELECT id, full_name, email, role, is_verified, created_at FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) user = users[0];
      const [progRows] = await dbPool.query('SELECT track_id, phase_number, completed FROM user_progress WHERE user_id = ?', [req.user.id]);
      progress = progRows;
    } else {
      const u = mockDb.users.find(x => x.id === req.user.id);
      if (u) {
        user = { id: u.id, full_name: u.full_name, email: u.email, role: u.role, is_verified: Boolean(u.is_verified), created_at: u.created_at };
      }
      progress = mockDb.user_progress.filter(p => p.user_id === req.user.id);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user, progress });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 12. Progress Tracking Routes
app.get('/api/progress/:trackId', authMiddleware, async (req, res) => {
  try {
    const { trackId } = req.params;
    let completedPhases = [];

    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query(
        'SELECT phase_number, completed FROM user_progress WHERE user_id = ? AND track_id = ? AND completed = 1',
        [req.user.id, trackId]
      );
      completedPhases = rows.map(r => r.phase_number);
    } else {
      completedPhases = mockDb.user_progress
        .filter(p => p.user_id === req.user.id && p.track_id === trackId && p.completed)
        .map(p => p.phase_number);
    }

    res.json({ trackId, completedPhases });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/progress/toggle', authMiddleware, async (req, res) => {
  try {
    const { trackId, phaseNumber, completed } = req.body;

    if (!trackId || phaseNumber === undefined) {
      return res.status(400).json({ error: 'trackId and phaseNumber are required' });
    }

    const isCompleted = completed === undefined ? true : Boolean(completed);

    if (!useMockDb && dbPool) {
      await dbPool.query(`
        INSERT INTO user_progress (user_id, track_id, phase_number, completed)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE completed = VALUES(completed);
      `, [req.user.id, trackId, phaseNumber, isCompleted ? 1 : 0]);
    } else {
      const existingIdx = mockDb.user_progress.findIndex(
        p => p.user_id === req.user.id && p.track_id === trackId && p.phase_number === phaseNumber
      );
      if (existingIdx >= 0) {
        mockDb.user_progress[existingIdx].completed = isCompleted;
      } else {
        mockDb.user_progress.push({
          user_id: req.user.id,
          track_id: trackId,
          phase_number: phaseNumber,
          completed: isCompleted
        });
      }
    }

    res.json({ message: 'Progress updated', trackId, phaseNumber, completed: isCompleted });
  } catch (error) {
    console.error('Toggle progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 13. Contact Form API
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const cleanSubject = subject ? subject.trim() : 'General Inquiry';

    if (!useMockDb && dbPool) {
      await dbPool.query(
        'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
        [name.trim(), email.trim(), cleanSubject, message.trim()]
      );
    } else {
      mockDb.contact_messages.push({
        id: mockDb.contact_messages.length + 1,
        name: name.trim(),
        email: email.trim(),
        subject: cleanSubject,
        message: message.trim(),
        is_read: false,
        created_at: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been received! We will get back to you shortly.'
    });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 14. Admin Dashboard Routes
app.get('/api/admin/stats', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    let userCount = 0;
    let messageCount = 0;
    let progressCount = 0;

    if (!useMockDb && dbPool) {
      const [[users]] = await dbPool.query('SELECT COUNT(*) as count FROM users');
      const [[messages]] = await dbPool.query('SELECT COUNT(*) as count FROM contact_messages');
      const [[progress]] = await dbPool.query('SELECT COUNT(*) as count FROM user_progress WHERE completed = 1');
      userCount = users.count;
      messageCount = messages.count;
      progressCount = progress.count;
    } else {
      userCount = mockDb.users.length;
      messageCount = mockDb.contact_messages.length;
      progressCount = mockDb.user_progress.filter(p => p.completed).length;
    }

    res.json({
      userCount,
      messageCount,
      progressCount,
      tracksCount: 12,
      database: useMockDb ? 'mock' : 'mysql'
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/users', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    let users = [];
    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query('SELECT id, full_name, email, role, is_verified, created_at FROM users ORDER BY id DESC');
      users = rows;
    } else {
      users = mockDb.users.map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        is_verified: Boolean(u.is_verified),
        created_at: u.created_at
      }));
    }
    res.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/messages', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    let messages = [];
    if (!useMockDb && dbPool) {
      const [rows] = await dbPool.query('SELECT * FROM contact_messages ORDER BY id DESC');
      messages = rows;
    } else {
      messages = [...mockDb.contact_messages].reverse();
    }
    res.json({ messages });
  } catch (error) {
    console.error('Admin messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback for SPA routing or HTML views
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  next();
});

// Start Server
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`🚀 DEVPATH Server running at http://localhost:${PORT}`);
    console.log(`==================================================`);
    await initDatabase();
  });
} else {
  initDatabase().catch(console.error);
}

module.exports = app;

