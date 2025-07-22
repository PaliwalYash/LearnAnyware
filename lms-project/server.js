const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const crypto = require("crypto");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const { sendWelcomeEmail } = require('./emailService');
const activeVideoSessions = new Map();
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const API_BASE = process.env.API_BASE;

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use("/certificates", express.static("certificates"));
app.use("/receipts", express.static("receipts"));

// Create directories
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("certificates")) fs.mkdirSync("certificates");
if (!fs.existsSync("receipts")) fs.mkdirSync("receipts");
// Add this after the existing directory creation code
if (!fs.existsSync("uploads/videos")) {
  fs.mkdirSync("uploads/videos", { recursive: true });
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Update the multer storage configuration to handle videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/videos/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_SIZE?.replace('MB', '')) * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', file.originalname, 'MIME type:', file.mimetype);

    // More comprehensive list of video MIME types
    const allowedTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/3gpp',
      'video/x-flv',
      'video/mkv',
      'video/x-matroska'
    ];

    // Also check file extension as backup
    const allowedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.webm', '.qt', '.3gp', '.flv', '.mkv'];
    const fileExtension = file.originalname.toLowerCase().substr(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, 'MIME type:', file.mimetype, 'Extension:', fileExtension);
      cb(new Error(`Only video files are allowed. Received: ${file.mimetype} for file: ${file.originalname}`), false);
    }
  }
});

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ,
};

let db;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function askGemini(question) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `You are a helpful coding instructor. Answer the following coding question in a clear, educational manner. 
Provide explanations, examples when helpful, and best practices. Keep your response concise but comprehensive.

Question: ${question}

Please provide a helpful response that explains the concept and includes code examples where appropriate.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw new Error("AI service temporarily unavailable");
  }
}
async function migrateExistingData() {
  try {
    console.log("Starting tenant data migration...");

    // Check if columns exist
    const [userCols] = await db.execute("SHOW COLUMNS FROM users LIKE 'admin_id'");
    if (userCols.length === 0) {
      console.log("admin_id column not found, skipping migration");
      return;
    }

    // Update teachers with admin_id based on who created them
    await db.execute(`
      UPDATE users 
      SET admin_id = created_by 
      WHERE role = 'teacher' 
      AND created_by IS NOT NULL 
      AND admin_id IS NULL
    `);

    // Update courses with admin_id based on teacher's admin_id
    await db.execute(`
      UPDATE courses c
      JOIN users t ON c.teacher_id = t.id
      SET c.admin_id = t.admin_id
      WHERE t.admin_id IS NOT NULL AND c.admin_id IS NULL
    `);

    // Update blogs created by admins
    await db.execute(`
      UPDATE blogs b
      JOIN users u ON b.author_id = u.id
      SET b.admin_id = u.id
      WHERE u.role = 'admin' AND b.admin_id IS NULL
    `);

    // Update blogs created by teachers
    await db.execute(`
      UPDATE blogs b
      JOIN users u ON b.author_id = u.id
      SET b.admin_id = u.admin_id
      WHERE u.role = 'teacher' AND u.admin_id IS NOT NULL AND b.admin_id IS NULL
    `);

    console.log("Tenant data migration completed successfully");
  } catch (error) {
    console.error("Tenant data migration failed:", error);
  }
}

async function createAdSenseTable() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS adsense_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      enabled BOOLEAN DEFAULT FALSE,
      test_mode BOOLEAN DEFAULT TRUE,
      client_id VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_admin_adsense (admin_id)
    )`);
    console.log("AdSense settings table created successfully");
  } catch (error) {
    console.log("AdSense settings table already exists or error:", error.message);
  }
}


// Initialize database
async function initDatabase() {
  try {
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await tempConnection.query("CREATE DATABASE IF NOT EXISTS lms_db");
    await tempConnection.end();

    db = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL database");

    await createTables();
    await createDefaultAdmin();
    await migrateExistingData();
    await createAdSenseTable();
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}
async function addAdSenseTable() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS adsense_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      enabled BOOLEAN DEFAULT FALSE,
      test_mode BOOLEAN DEFAULT TRUE,
      client_id VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_admin_adsense (admin_id)
    )`);
    console.log("AdSense settings table created successfully");
  } catch (error) {
    console.log("AdSense settings table already exists or error:", error.message);
  }
}

// Create database tables
async function createTables() {
  // Create users table with basic columns first
  await addAdSenseTable();
  
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('teacher', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add all missing columns to users table (including mobile)
  const userColumns = [
    { name: "status", type: "ENUM('active', 'blocked') DEFAULT 'active'" },
    { name: "created_by", type: "INT NULL" },
    { name: "mobile", type: "VARCHAR(15) NULL" }, // Add this line
  ];
  // Add these columns after the existing userColumns array processing
  const adminColumns = [
    { name: "admin_id", type: "INT NULL" }
  ];

  for (const column of adminColumns) {
    try {
      await db.query(
        `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`
      );
      console.log(`Added ${column.name} column to users table`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        console.log(`${column.name} column already exists in users table`);
      }
    }
  }
  // Add admin_id columns for tenant isolation
  const tenantColumns = [
    {
      table: "users",
      column: "admin_id",
      type: "INT NULL",
      constraint: "fk_users_admin_id",
      reference: "users(id)"
    },
    {
      table: "blogs",
      column: "admin_id",
      type: "INT NULL",
      constraint: "fk_blogs_admin_id",
      reference: "users(id)"
    },
    {
      table: "courses",
      column: "admin_id",
      type: "INT NULL",
      constraint: "fk_courses_admin_id",
      reference: "users(id)"
    }
  ];

  for (const col of tenantColumns) {
    try {
      await db.execute(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`);
      console.log(`Added ${col.column} column to ${col.table} table`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        console.log(`${col.column} column already exists in ${col.table} table`);
      }
    }

    // Add foreign key constraint
    try {
      await db.execute(
        `ALTER TABLE ${col.table} ADD CONSTRAINT ${col.constraint} FOREIGN KEY (${col.column}) REFERENCES ${col.reference} ON DELETE SET NULL`
      );
      console.log(`Added foreign key constraint ${col.constraint}`);
    } catch (error) {
      if (error.code !== "ER_DUP_KEYNAME") {
        console.log(`Foreign key constraint ${col.constraint} already exists`);
      }
    }
  }

  // Add foreign key constraint for admin_id
  try {
    await db.query(
      `ALTER TABLE users ADD CONSTRAINT fk_users_admin_id FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log("Added foreign key constraint for users admin_id");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") {
      console.log("Users admin_id foreign key constraint already exists or not needed");
    }
  }

  // Add admin_id to blogs table
  try {
    await db.query(`ALTER TABLE blogs ADD COLUMN admin_id INT NULL`);
    console.log("Added admin_id column to blogs table");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.log("admin_id column already exists in blogs table");
    }
  }

  // Add foreign key constraint for blogs admin_id
  try {
    await db.query(
      `ALTER TABLE blogs ADD CONSTRAINT fk_blogs_admin_id FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log("Added foreign key constraint for blogs admin_id");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") {
      console.log("Blogs admin_id foreign key constraint already exists or not needed");
    }
  }

  for (const column of userColumns) {
    try {
      await db.query(
        `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`
      );
      console.log(`Added ${column.name} column to users table`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        console.log(`${column.name} column already exists`);
      }
    }
  }


  try {
    await db.query(
      `ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'teacher', 'student') NOT NULL`

    );
    console.log("Updated role column to include admin");
  } catch (error) {
    console.log("Role column update completed or not needed");
  }
  try {
    await db.query(`ALTER TABLE users ADD COLUMN admin_id INT NULL;
    ALTER TABLE users ADD CONSTRAINT fk_users_admin_id FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;`);
    console.log("-- Add admin_id to track which admin owns each teacher");

  } catch {
    console.log("admin_id column update completed or not needed");
  }

  try {
    await db.query(`ALTER TABLE blogs ADD COLUMN admin_id INT NULL;
        ALTER TABLE blogs ADD CONSTRAINT fk_blogs_admin_id FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;`);
    console.log("-- Add admin_id to blogs table ");

  }
  catch {
    console.log("--admin_id to blogs table column update completed or not needed");

  }
  try {
    await db.query(`UPDATE users SET admin_id = created_by WHERE role = 'teacher' AND created_by IS NOT NULL;
        UPDATE blogs SET admin_id = author_id WHERE author_id IN (SELECT id FROM users WHERE role = 'admin');`);
    console.log("-- Update existing records to set admin_id based on created_by");
  } catch {
    console.log("-- Update existing records to set admin_id based on created_by column update completed or not needed");

  }


  // Add foreign key constraint for created_by
  try {
    await db.query(
      `ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log("Added foreign key constraint for created_by");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") {
      console.log("Foreign key constraint already exists or not needed");
    }
  }

  // Create other tables...
  await db.query(`CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id INT NOT NULL,
    duration_days INT DEFAULT 30,
    group_link VARCHAR(500) NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  try {
    await db.query(
      `ALTER TABLE courses ADD COLUMN duration_days INT DEFAULT 30`
    );
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.log("duration_days column already exists");
    }
  }

  await db.query(`CREATE TABLE IF NOT EXISTS course_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (course_id, student_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS daily_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    notes TEXT,
    notes_file VARCHAR(255),
    meet_link VARCHAR(500),
    session_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_time TIME DEFAULT NULL,
    conducted_by INT NULL,
    FOREIGN KEY (conducted_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS session_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    marked_read BOOLEAN DEFAULT FALSE,
    joined_meet BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    joined_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES daily_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (session_id, student_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_certificate (student_id, course_id)
  )`);

  // Add certificate columns
  const certificateColumns = [
    { name: "certificate_path", type: "VARCHAR(255)" },
    { name: "certificate_code", type: "VARCHAR(100) UNIQUE" },
  ];

  for (const column of certificateColumns) {
    try {
      await db.query(
        `ALTER TABLE certificates ADD COLUMN ${column.name} ${column.type}`
      );
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        console.log(`${column.name} already exists`);
      }
    }
  }

  // Create projects table
  await db.query(`CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_file VARCHAR(255),
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('submitted', 'approved', 'rejected') DEFAULT 'submitted',
    teacher_feedback TEXT,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project (course_id, student_id)
  )`);

  // Add this in the createTables() function after the existing table creation code

  // Create assignments table
  await db.query(`CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignment_file VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
)`);

  // Create assignment submissions table
  await db.query(`CREATE TABLE IF NOT EXISTS assignment_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  submission_link VARCHAR(500),
  submission_file VARCHAR(255),
  message TEXT,
  status ENUM('submitted', 'approved', 'rejected') DEFAULT 'submitted',
  teacher_feedback TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  verified_by INT NULL,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_submission (assignment_id, student_id)
)`);

  await db.query(`CREATE TABLE IF NOT EXISTS course_teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  teacher_id INT NOT NULL,
  added_by INT NOT NULL,
  role ENUM('main', 'sub') DEFAULT 'sub',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_course_teacher (course_id, teacher_id)
)`);

  await db.query(`CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500) NULL,
  video_url VARCHAR(500) NULL,
  author_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
)`);
  console.log("Blog table created successfully");

  console.log("Assignment tables created successfully");
  await db.query(`CREATE TABLE IF NOT EXISTS course_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_file VARCHAR(255) NULL,
  youtube_url VARCHAR(500) NULL,
  video_type ENUM('file', 'youtube') DEFAULT 'file',
  duration INT DEFAULT NULL,
  order_index INT DEFAULT 0,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
)`);

  // Create video watch progress table
  await db.query(`CREATE TABLE IF NOT EXISTS video_watch_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  student_id INT NOT NULL,
  watched_seconds INT DEFAULT 0,
  total_duration INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES course_videos(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_video_progress (video_id, student_id)
)`);

  console.log("Video tables created successfully");
  // Add this table creation in the createTables() function after other table creations
  await db.query(`CREATE TABLE IF NOT EXISTS course_queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  student_id INT NOT NULL,
  teacher_id INT NULL,
  title VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  category ENUM('general', 'assignment', 'technical', 'deadline', 'content') DEFAULT 'general',
  status ENUM('pending', 'answered', 'closed') DEFAULT 'pending',
  is_anonymous BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0,
  helpful_votes INT DEFAULT 0,
  asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_course_status (course_id, status),
  INDEX idx_course_category (course_id, category)
)`);

  await db.query(`CREATE TABLE IF NOT EXISTS query_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (query_id) REFERENCES course_queries(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
)`);

  await db.query(`CREATE TABLE IF NOT EXISTS query_followers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (query_id) REFERENCES course_queries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_follower (query_id, user_id)
)`);

  console.log("Course queries table created successfully");
  // Add missing columns to projects table
  const projectColumns = [{ name: "verified_by", type: "INT NULL" }];

  for (const column of projectColumns) {
    try {
      await db.query(
        `ALTER TABLE projects ADD COLUMN ${column.name} ${column.type}`
      );
      console.log(`Added ${column.name} column to projects table`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        console.log(`${column.name} column already exists`);
      }
    }
  }

  // Add foreign key constraint for verified_by
  try {
    await db.query(
      `ALTER TABLE projects ADD CONSTRAINT fk_projects_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log("Added foreign key constraint for projects verified_by");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") {
      console.log("Projects verified_by foreign key constraint already exists");
    }
  }

  await db.query(`CREATE TABLE IF NOT EXISTS student_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    session_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late') DEFAULT 'absent',
    marked_by INT NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_attendance (course_id, student_id, session_date)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS user_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    temp_password VARCHAR(255),
    is_password_changed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create payment receipts table
  await db.query(`CREATE TABLE IF NOT EXISTS payment_receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    gst_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    receipt_path VARCHAR(255),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create AI chat history table
  await db.query(`CREATE TABLE IF NOT EXISTS ai_chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  console.log("Database tables created successfully");
}



// Helper function to check course access (main teacher or sub-teacher)
const checkCourseAccess = async (courseId, userId) => {
  try {
    const [accessCheck] = await db.execute(
      `SELECT 1 FROM courses WHERE id = ? AND teacher_id = ?
       UNION
       SELECT 1 FROM course_teachers WHERE course_id = ? AND teacher_id = ?`,
      [courseId, userId, courseId, userId]
    );
    return accessCheck.length > 0;
  } catch (error) {
    console.error("Course access check error:", error);
    return false;
  }
};

// Create default admin user
async function createDefaultAdmin() {
  try {
    const [existingAdmin] = await db.execute(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.execute(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
        ["System Admin", "admin@lms.com", hashedPassword, "admin", "active"]
      );
      console.log("Default admin created: admin@lms.com / admin123");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error creating default admin:", error);
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  // Try to verify as LMS token first
  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      // If LMS token verification fails, check if it's a client token for admin requests
      const isAdminRoute = req.path.includes('/admin') || req.method === 'POST' && req.path.includes('/admin/login-from-client');

      if (isAdminRoute) {
        try {
          // Verify as client token
          const tokenVerification = await verifyClientToken(token);

          if (tokenVerification.valid) {
            const clientUser = tokenVerification.user;

            // Format user object for LMS compatibility
            req.user = {
              userId: clientUser.id,
              id: clientUser.id,
              email: clientUser.email,
              name: clientUser.name,
              role: 'admin'
            };

            return next();
          }
        } catch (verifyError) {
          console.error("Client token verification failed:", verifyError);
        }
      }

      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Handle LMS token verification success
    if (user.role === 'admin' || user.role === 'client') {
      if (user.id && !user.userId) {
        user.userId = user.id;
        user.role = 'admin';
      }
      if (!user.id && user.userId) {
        user.id = user.userId;
      }
    } else {
      if (user.id && !user.userId) {
        user.userId = user.id;
      }
    }

    req.user = user;
    next();
  });
};


// Role-based middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};
// Helper function to check admin status from client management system
const checkAdminStatus = async (adminId) => {
  try {
    const response = await fetch(`${API_BASE}/clients/${adminId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000 // Add timeout
    });

    if (!response.ok) {
      console.error(`Admin status check failed: ${response.status}`);
      // Return active as true for connectivity issues to avoid blocking legitimate users
      return { active: true, error: 'Unable to verify admin status' };
    }

    const data = await response.json();
    return {
      active: data.active && data.status === 'Active',
      adminData: data
    };
  } catch (error) {
    console.error('Admin status check error:', error);
    // Return active as true for connectivity issues
    return { active: true, error: 'Admin status check failed' };
  }
};
const verifyClientToken = async (token) => {
  try {
    const response = await fetch(`${API_BASE}/verify-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000
    });

    if (!response.ok) {
      console.error(`Client token verification failed: ${response.status}`);
      return { valid: false, error: 'Token verification failed' };
    }

    const userData = await response.json();
    return {
      valid: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role === 'client' ? 'admin' : userData.role
      }
    };
  } catch (error) {
    console.error('Client token verification error:', error);
    return { valid: false, error: 'Token verification failed' };
  }
};

// Check if user is blocked
const checkUserStatus = async (req, res, next) => {
  try {
    // For admin users from client system, handle differently
    if (req.user.role === "admin" || req.user.role === "client") {
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(403).json({ message: "Invalid user data" });
      }

      const [user] = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);

      if (user.length === 0) {
        // Create admin user if doesn't exist in LMS database
        try {
          const hashedPassword = await bcrypt.hash("admin123", 10);
          const [result] = await db.execute(
            "INSERT INTO users (name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
            [
              req.user.name || "Admin User", // Use actual name from token
              req.user.email,
              hashedPassword,
              "admin",
              "active"
            ]
          );

          req.user.userId = result.insertId;
          req.user.id = result.insertId;

          console.log(`Created admin user in LMS: ${req.user.email} with ID: ${result.insertId}`);
          return next();
        } catch (createError) {
          console.error("Error creating admin user:", createError);
          return res.status(500).json({ message: "Failed to create admin session" });
        }
      }

      if (user[0].status === "blocked") {
        return res.status(403).json({ message: "Account is blocked" });
      }

      // Update admin name if it has changed
      if (user[0].name !== req.user.name && req.user.name) {
        try {
          await db.execute(
            "UPDATE users SET name = ? WHERE id = ?",
            [req.user.name, userId]
          );
          console.log(`Updated admin name from "${user[0].name}" to "${req.user.name}"`);
        } catch (updateError) {
          console.error("Error updating admin name:", updateError);
        }
      }

      req.user.userId = user[0].id;
      req.user.id = user[0].id;
    } else {
      // Regular status check for teachers and students
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(403).json({ message: "Invalid user data" });
      }

      const [user] = await db.execute("SELECT status, admin_id FROM users WHERE id = ?", [userId]);

      if (user.length === 0 || user[0].status === "blocked") {
        return res.status(403).json({ message: "Account is blocked or not found" });
      }

      // Check admin status for teachers and students
      if (req.user.role === 'teacher' || req.user.role === 'student') {
        let adminIdToCheck = null;

        if (req.user.role === 'teacher' && user[0].admin_id) {
          adminIdToCheck = user[0].admin_id;
        } else if (req.user.role === 'student') {
          const [adminInfo] = await db.execute(`
            SELECT DISTINCT c.admin_id 
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            JOIN users t ON c.teacher_id = t.id
            WHERE ce.student_id = ? AND c.admin_id IS NOT NULL
            LIMIT 1
          `, [userId]);

          if (adminInfo.length > 0) {
            adminIdToCheck = adminInfo[0].admin_id;
          }
        }

        if (adminIdToCheck) {
          const adminStatus = await checkAdminStatus(adminIdToCheck);

          if (!adminStatus.active) {
            return res.status(403).json({
              message: "Service temporarily unavailable. Please contact your administrator.",
              error: "ADMIN_INACTIVE"
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Generate random password
function generatePassword() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Generate receipt number
function generateReceiptNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `RCP-${timestamp}-${random}`;
}

// Authentication Routes
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Only allow student registration directly
    if (role !== "student") {
      return res.status(400).json({
        message: "Only student registration is allowed through this endpoint",
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [existingUser] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );

    // Send welcome email
    const userData = {
      name,
      email,
      role
    };

    try {
      await sendWelcomeEmail(userData);
      console.log(`Welcome email sent to new student: ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    res.status(201).json({
      message: "Student registered successfully! Check your email for login instructions.",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const adminTokenRefresh = async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    try {
      // Check if admin exists in LMS database
      const [adminUser] = await db.execute(
        'SELECT id, name, email FROM users WHERE email = ? AND role = "admin"',
        [req.user.email]
      );

      if (adminUser.length === 0) {
        // Admin user doesn't exist in LMS, create them
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const [result] = await db.execute(
          "INSERT INTO users (name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
          [req.user.name || "Admin User", req.user.email, hashedPassword, "admin", "active"]
        );

        req.user.userId = result.insertId;
        req.user.id = result.insertId;
        console.log(`Auto-created admin user: ${req.user.email} with ID: ${result.insertId}`);
      } else {
        req.user.userId = adminUser[0].id;
        req.user.id = adminUser[0].id;
      }
    } catch (error) {
      console.error("Admin token refresh error:", error);
      return res.status(500).json({ message: "Failed to refresh admin session" });
    }
  }
  next();
};

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [users] = await db.execute(
      "SELECT id, name, email, mobile, password, role, status, admin_id FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    if (user.status === "blocked") {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact administrator.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check admin status for teachers and students
    if (user.role === 'teacher' || user.role === 'student') {
      let adminIdToCheck = null;

      if (user.role === 'teacher' && user.admin_id) {
        adminIdToCheck = user.admin_id;
      } else if (user.role === 'student') {
        // For students, find their admin through enrolled courses
        const [adminInfo] = await db.execute(`
          SELECT DISTINCT c.admin_id 
          FROM course_enrollments ce
          JOIN courses c ON ce.course_id = c.id
          JOIN users t ON c.teacher_id = t.id
          WHERE ce.student_id = ? AND c.admin_id IS NOT NULL
          LIMIT 1
        `, [user.id]);

        if (adminInfo.length > 0) {
          adminIdToCheck = adminInfo[0].admin_id;
        }
      }

      if (adminIdToCheck) {
        const adminStatus = await checkAdminStatus(adminIdToCheck);

        if (!adminStatus.active) {
          return res.status(403).json({
            message: "Service temporarily unavailable. Please contact your administrator.",
            error: "ADMIN_INACTIVE"
          });
        }
      }
    }

    // Create token with both userId and id for compatibility
    const token = jwt.sign(
      {
        userId: user.id,  // LMS format
        id: user.id,      // Client system format
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const validateMobile = (mobile) => {
  if (!mobile) return true; // Optional field

  // Remove all spaces, hyphens, parentheses for validation
  const cleanMobile = mobile.replace(/[\s\-()]/g, '');

  // Check if it's a valid format: optional + followed by 10-15 digits
  const mobileRegex = /^(\+\d{1,3})?\d{10,15}$/;

  return mobileRegex.test(cleanMobile);
};
app.post(
  "/api/check-mobile",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { mobile } = req.body;
      const { userId } = req.user;

      if (!mobile) {
        return res.json({ available: true });
      }

      if (!validateMobile(mobile)) {
        return res.status(400).json({ message: "Invalid mobile number format" });
      }

      const [existing] = await db.execute(
        "SELECT id FROM users WHERE mobile = ? AND id != ? AND mobile IS NOT NULL",
        [mobile, userId]
      );

      res.json({
        available: existing.length === 0,
        message: existing.length > 0 ? "Mobile number already taken" : "Mobile number available"
      });
    } catch (error) {
      console.error("Check mobile availability error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Admin Routes - Delete Teacher
app.delete(
  "/api/admin/teacher/:teacherId",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      const [teacher] = await db.execute(
        'SELECT id FROM users WHERE id = ? AND role = "teacher" AND admin_id = ?',
        [teacherId, req.user.userId]
      );

      if (teacher.length === 0) {
        return res.status(404).json({ message: "Teacher not found or not authorized" });
      }

      await db.execute("DELETE FROM users WHERE id = ?", [teacherId]);
      res.json({ message: "Teacher deleted successfully" });
    } catch (error) {
      console.error("Delete teacher error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Payment Receipt Routes
app.post(
  "/api/receipts",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { studentId, courseId, amount, gstRate, description } = req.body;

      if (!studentId || !courseId || !amount) {
        return res
          .status(400)
          .json({ message: "Student, course, and amount are required" });
      }

      // Verify teacher owns the course
      const [courseCheck] = await db.execute(
        "SELECT id FROM courses WHERE id = ? AND teacher_id = ?",
        [courseId, req.user.userId]
      );

      if (courseCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      // Verify student is enrolled
      const [enrollmentCheck] = await db.execute(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, studentId]
      );

      if (enrollmentCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Student not enrolled in this course" });
      }

      const receiptNumber = generateReceiptNumber();
      const gstRateDecimal = gstRate || 18.0;
      const gstAmount = (amount * gstRateDecimal) / 100;
      const totalAmount = parseFloat(amount) + gstAmount;

      // Get student and course details
      const [details] = await db.execute(
        `SELECT u.name as student_name, c.title as course_title
         FROM users u, courses c
         WHERE u.id = ? AND c.id = ?`,
        [studentId, courseId]
      );

      const { student_name, course_title } = details[0];

      // Generate PDF receipt
      const receiptFileName = `receipt_${receiptNumber}.pdf`;
      const receiptPath = path.join("receipts", receiptFileName);

      await generatePaymentReceipt({
        receiptNumber,
        studentName: student_name,
        courseTitle: course_title,
        amount: parseFloat(amount),
        gstRate: gstRateDecimal,
        gstAmount,
        totalAmount,
        description: description || `Course fee for ${course_title}`,
        filePath: receiptPath,
      });

      // Save to database
      await db.execute(
        `INSERT INTO payment_receipts 
         (student_id, course_id, receipt_number, amount, gst_rate, gst_amount, total_amount, description, receipt_path, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId,
          courseId,
          receiptNumber,
          amount,
          gstRateDecimal,
          gstAmount,
          totalAmount,
          description,
          receiptFileName,
          req.user.userId,
        ]
      );

      res.status(201).json({
        message: "Payment receipt generated successfully",
        receiptNumber,
        receiptPath: receiptFileName,
      });
    } catch (error) {
      console.error("Generate receipt error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get receipts for student
app.get(
  "/api/receipts",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const [receipts] = await db.execute(
        `SELECT pr.*, c.title as course_title, u.name as teacher_name
         FROM payment_receipts pr
         JOIN courses c ON pr.course_id = c.id
         JOIN users u ON pr.created_by = u.id
         WHERE pr.student_id = ?
         ORDER BY pr.created_at DESC`,
        [req.user.userId]
      );

      res.json(receipts);
    } catch (error) {
      console.error("Get receipts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// AI Chat Routes
app.post(
  "/api/ai-chat",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }

      // Call Gemini AI
      const answer = await askGemini(question);

      // Save to chat history
      await db.execute(
        "INSERT INTO ai_chat_history (student_id, question, answer) VALUES (?, ?, ?)",
        [req.user.userId, question, answer]
      );

      res.json({
        question,
        answer,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("AI chat error:", error);
      res
        .status(500)
        .json({ message: "AI service error. Please try again later." });
    }
  }
);

// Get AI chat history
app.get(
  "/api/ai-chat/history",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const [history] = await db.execute(
        "SELECT * FROM ai_chat_history WHERE student_id = ? ORDER BY created_at DESC LIMIT 50",
        [req.user.userId]
      );

      res.json(history);
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update student profile (name only)
app.put(
  "/api/student/profile",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { name, mobile } = req.body; // Add mobile here

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      // Validate mobile number if provided
      if (mobile && !/^[+]?[\d\s-()]{10,15}$/.test(mobile.replace(/\s/g, ''))) {
        return res.status(400).json({ message: "Invalid mobile number format" });
      }

      // Check if mobile number already exists for another user
      if (mobile) {
        const [existingMobile] = await db.execute(
          "SELECT id FROM users WHERE mobile = ? AND id != ? AND mobile IS NOT NULL",
          [mobile, req.user.userId]
        );

        if (existingMobile.length > 0) {
          return res.status(400).json({ message: "Mobile number already taken" });
        }
      }

      await db.execute(
        "UPDATE users SET name = ?, mobile = ? WHERE id = ? AND role = 'student'",
        [name, mobile || null, req.user.userId]
      );

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

async function generatePaymentReceipt(receiptData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Payment Receipt - ${receiptData.receiptNumber}`,
          Author: 'Learning Management System',
          Subject: 'Payment Receipt'
        }
      });

      const stream = fs.createWriteStream(receiptData.filePath);
      doc.pipe(stream);

      // Colors
      const darkGray = '#2c3e50';
      const black = '#000000';
      const lightGray = '#e5e5e5';

      // Helper function to format currency
      const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount).toFixed(2)}`;
      };

      // Header Section with Background (COLORED)
      doc.rect(0, 0, 595, 80).fill('#f0f0f0');

      // Company/System Header (COLORED)
      doc.fillColor(darkGray)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('LEARNING MANAGEMENT SYSTEM', 50, 25, { align: 'center' });

      doc.fillColor(darkGray)
        .fontSize(12)
        .font('Helvetica')
        .text('Payment Receipt', 50, 55, { align: 'center' });

      // Receipt Title (COLORED)
      doc.rect(0, 100, 595, 50).fill(darkGray);
      doc.fillColor('#ffffff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', 50, 120, { align: 'center' });

      // ALL TEXT BELOW IS BLACK
      doc.fillColor(black);

      // Receipt Number and Date Section
      const receiptInfoY = 180;

      // Left side - Receipt Number
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('Receipt No:', 50, receiptInfoY);
      doc.fontSize(14)
        .font('Helvetica')
        .text(receiptData.receiptNumber, 140, receiptInfoY);

      // Right side - Date
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('Date:', 350, receiptInfoY);
      doc.fontSize(14)
        .font('Helvetica')
        .text(new Date().toLocaleDateString('en-IN'), 390, receiptInfoY);

      // Horizontal line
      doc.strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(50, receiptInfoY + 25)
        .lineTo(545, receiptInfoY + 25)
        .stroke();

      // Student Details Section
      const studentY = 230;
      doc.rect(50, studentY, 495, 25).fill('#f8f8f8').stroke('#cccccc');

      doc.fillColor(black)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('STUDENT DETAILS', 55, studentY + 7);

      doc.fillColor(black)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Name:', 55, studentY + 40);
      doc.fontSize(12)
        .font('Helvetica')
        .text(receiptData.studentName, 95, studentY + 40);

      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('Course:', 55, studentY + 60);
      doc.fontSize(12)
        .font('Helvetica')
        .text(receiptData.courseTitle, 105, studentY + 60);

      // Payment Details Section
      const paymentY = 330;
      doc.rect(50, paymentY, 495, 25).fill('#f8f8f8').stroke('#cccccc');

      doc.fillColor(black)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('PAYMENT DETAILS', 55, paymentY + 7);

      if (receiptData.description) {
        doc.fillColor(black)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Description:', 55, paymentY + 40);
        doc.fontSize(12)
          .font('Helvetica')
          .text(receiptData.description, 130, paymentY + 40);
      }

      // Payment Table
      const tableY = paymentY + 80;
      const colPositions = {
        item: 60,
        amount: 280,
        gstRate: 380,
        gstAmount: 480
      };

      // Table Header - ONLY HEADERS HAVE BACKGROUND
      doc.rect(50, tableY, 495, 30).fill('#f0f0f0').stroke('#cccccc');
      doc.fillColor(black)
        .fontSize(12)
        .font('Helvetica-Bold');

      doc.text('ITEM', colPositions.item, tableY + 10);
      doc.text('AMOUNT', colPositions.amount, tableY + 10);
      doc.text('GST RATE', colPositions.gstRate, tableY + 10);
      doc.text('GST AMOUNT', colPositions.gstAmount, tableY + 10);

      // Table Content - WHITE BACKGROUND, BLACK TEXT
      doc.rect(50, tableY + 30, 495, 30).fill('#ffffff').stroke('#cccccc');
      doc.fillColor(black)
        .fontSize(11)
        .font('Helvetica');

      doc.text('Course Fee', colPositions.item, tableY + 42);
      doc.text(formatCurrency(receiptData.amount), colPositions.amount, tableY + 42);
      doc.text(`${receiptData.gstRate}%`, colPositions.gstRate, tableY + 42);
      doc.text(formatCurrency(receiptData.gstAmount), colPositions.gstAmount, tableY + 42);

      // Subtotal and Total Section
      const totalY = tableY + 80;
      const labelX = 350;
      const valueX = 480;

      // Subtotal
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(black);
      doc.text('Subtotal:', labelX, totalY);
      doc.text(formatCurrency(receiptData.amount), valueX, totalY);

      // GST
      doc.text(`GST (${receiptData.gstRate}%):`, labelX, totalY + 20);
      doc.text(formatCurrency(receiptData.gstAmount), valueX, totalY + 20);

      // Horizontal line before total
      doc.strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(labelX, totalY + 40)
        .lineTo(545, totalY + 40)
        .stroke();

      // Total Amount - WHITE BACKGROUND WITH BLACK BORDER
      doc.rect(340, totalY + 45, 205, 35).fill('#ffffff').stroke('#000000', 2);
      doc.fillColor(black)
        .fontSize(14)
        .font('Helvetica-Bold');
      doc.text('TOTAL AMOUNT:', labelX, totalY + 57);
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text(formatCurrency(receiptData.totalAmount), valueX, totalY + 57);

      // Amount in Words
      const amountInWords = numberToWords(receiptData.totalAmount);
      doc.fillColor(black)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Amount in Words:', 50, totalY + 100);
      doc.fontSize(11)
        .font('Helvetica')
        .text(`${amountInWords} Only`, 50, totalY + 115, { width: 495 });

      // Payment Method
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(black)
        .text('Payment Method: Online/Cash', 50, totalY + 140);

      // Footer Section
      const footerY = 680;

      // Horizontal line above footer
      doc.strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .stroke();

      // Terms and Conditions
      doc.fontSize(8)
        .fillColor(black)
        .font('Helvetica-Bold')
        .text('Terms & Conditions:', 50, footerY + 10);
      doc.font('Helvetica')
        .text('• This receipt is computer generated and does not require signature.', 50, footerY + 22);
      doc.text('• Please retain this receipt for your records.', 50, footerY + 32);
      doc.text('• For any queries, please contact the administration.', 50, footerY + 42);

      // System signature
      doc.fontSize(9)
        .fillColor(black)
        .font('Helvetica')
        .text('Generated by Learning Management System', 50, footerY + 65, { align: 'center', width: 495 });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 50, footerY + 77, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function remains the same
function numberToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (amount === 0) return 'Zero Rupees';

  let [rupees, paise] = parseFloat(amount).toFixed(2).split('.');
  rupees = parseInt(rupees);
  paise = parseInt(paise);

  function convertToWords(num) {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convertToWords(num % 100) : '');
    if (num < 100000) return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convertToWords(num % 1000) : '');
    if (num < 10000000) return convertToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convertToWords(num % 100000) : '');
    return convertToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convertToWords(num % 10000000) : '');
  }

  let result = 'Rupees ' + convertToWords(rupees);
  if (paise > 0) {
    result += ' and ' + convertToWords(paise) + ' Paise';
  }

  return result;
}
// Delete receipt route
app.delete(
  "/api/receipts/:receiptId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { receiptId } = req.params;

      // Check if receipt belongs to the teacher
      const [receipt] = await db.execute(
        "SELECT * FROM payment_receipts WHERE id = ? AND created_by = ?",
        [receiptId, req.user.userId]
      );

      if (receipt.length === 0) {
        return res.status(404).json({ message: "Receipt not found or not authorized" });
      }

      const receiptData = receipt[0];

      // Delete the physical file
      const filePath = path.join("receipts", receiptData.receipt_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await db.execute("DELETE FROM payment_receipts WHERE id = ?", [receiptId]);

      res.json({ message: "Receipt deleted successfully" });
    } catch (error) {
      console.error("Delete receipt error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
// Add this route to your backend
app.get(
  "/api/teacher/receipts",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const [receipts] = await db.execute(
        `SELECT pr.*, c.title as course_title, u.name as student_name
         FROM payment_receipts pr
         JOIN courses c ON pr.course_id = c.id
         JOIN users u ON pr.student_id = u.id
         WHERE pr.created_by = ?
         ORDER BY pr.created_at DESC`,
        [req.user.userId]
      );

      res.json(receipts);
    } catch (error) {
      console.error("Get teacher receipts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Assignment Management Routes

// Create assignment (Teacher)
// Create assignment (Teacher) - Fixed
app.post(
  "/api/courses/:courseId/assignments",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  upload.single("assignmentFile"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, description, startDate, endDate } = req.body;
      const assignmentFile = req.file ? req.file.filename : null;

      if (!title || !startDate || !endDate) {
        return res.status(400).json({ message: "Title, start date, and end date are required" });
      }

      // Validate dates
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res.status(404).json({ message: "Course not found or not authorized" });
      }

      // Clean description - convert empty string to null
      const cleanDescription = description && description.trim() ? description.trim() : null;

      const [result] = await db.execute(
        "INSERT INTO assignments (course_id, title, description, assignment_file, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [courseId, title, cleanDescription, assignmentFile, startDate, endDate, req.user.userId]
      );

      res.status(201).json({
        message: "Assignment created successfully",
        assignmentId: result.insertId,
      });
    } catch (error) {
      console.error("Assignment creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get assignments for a course
app.get(
  "/api/courses/:courseId/assignments",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Check access
      let accessQuery;
      let accessParams;

      if (req.user.role === "teacher") {
        const hasAccess = await checkCourseAccess(courseId, req.user.userId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to view assignments" });
        }
      } else if (req.user.role === "student") {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );
        if (enrollmentCheck.length === 0) {
          return res.status(403).json({ message: "Not authorized to view assignments" });
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      let query = `
        SELECT a.*, u.name as created_by_name
        FROM assignments a
        JOIN users u ON a.created_by = u.id
        WHERE a.course_id = ?
      `;

      if (req.user.role === "student") {
        query += `
          ORDER BY a.end_date ASC
        `;
      } else {
        query += `
          ORDER BY a.created_at DESC
        `;
      }

      const [assignments] = await db.execute(query, [courseId]);

      // For students, add submission status
      if (req.user.role === "student") {
        for (let assignment of assignments) {
          const [submission] = await db.execute(
            "SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?",
            [assignment.id, req.user.userId]
          );

          assignment.submission = submission[0] || null;
          assignment.is_overdue = new Date() > new Date(assignment.end_date);
          assignment.can_submit = true;

          // Add status for after due date submissions
          if (assignment.submission) {
            const submissionDate = new Date(assignment.submission.submitted_at);
            const dueDate = new Date(assignment.end_date);
            assignment.submission.is_after_due_date = submissionDate > dueDate;
          }
        }
      }

      // For teachers, add submission count
      if (req.user.role === "teacher") {
        for (let assignment of assignments) {
          const [submissionCount] = await db.execute(
            "SELECT COUNT(*) as count FROM assignment_submissions WHERE assignment_id = ?",
            [assignment.id]
          );
          assignment.submission_count = submissionCount[0].count;
        }
      }

      res.json(assignments);
    } catch (error) {
      console.error("Get assignments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Submit assignment (Student)
// Submit assignment (Student) - Updated
// Submit assignment (Student) - Fixed
app.post(
  "/api/assignments/:assignmentId/submit",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  upload.single("submissionFile"),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { submissionLink, message } = req.body;
      const submissionFile = req.file ? req.file.filename : null;

      // Convert empty strings and undefined to null
      const cleanSubmissionLink = submissionLink && submissionLink.trim() ? submissionLink.trim() : null;
      const cleanMessage = message && message.trim() ? message.trim() : null;

      // Check if at least one field is provided
      if (!cleanSubmissionLink && !submissionFile && !cleanMessage) {
        return res.status(400).json({ message: "At least one of submission link, file, or message is required" });
      }

      // Check if assignment exists and student is enrolled
      const [assignmentCheck] = await db.execute(
        `SELECT a.*, ce.id as enrollment_id 
         FROM assignments a
         JOIN course_enrollments ce ON a.course_id = ce.course_id
         WHERE a.id = ? AND ce.student_id = ?`,
        [assignmentId, req.user.userId]
      );

      if (assignmentCheck.length === 0) {
        return res.status(404).json({ message: "Assignment not found or not enrolled" });
      }

      const assignment = assignmentCheck[0];
      const isAfterDueDate = new Date() > new Date(assignment.end_date);

      // Use explicit null values for database insertion
      await db.execute(
        `INSERT INTO assignment_submissions (assignment_id, student_id, submission_link, submission_file, message, status)
         VALUES (?, ?, ?, ?, ?, 'submitted')
         ON DUPLICATE KEY UPDATE 
           submission_link = VALUES(submission_link),
           submission_file = VALUES(submission_file),
           message = VALUES(message),
           status = 'submitted',
           submitted_at = NOW(),
           verified_at = NULL,
           verified_by = NULL,
           teacher_feedback = NULL`,
        [
          assignmentId,
          req.user.userId,
          cleanSubmissionLink,
          submissionFile,
          cleanMessage
        ]
      );

      const statusMessage = isAfterDueDate
        ? "Assignment submitted successfully (submitted after due date)"
        : "Assignment submitted successfully";

      res.json({
        message: statusMessage,
        isAfterDueDate: isAfterDueDate
      });
    } catch (error) {
      console.error("Assignment submission error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get assignment submissions (Teacher)
// Get assignment submissions (Teacher) - Updated
app.get(
  "/api/assignments/:assignmentId/submissions",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { assignmentId } = req.params;

      // Check if teacher has access to the assignment
      const [assignmentCheck] = await db.execute(
        `SELECT a.*, c.teacher_id 
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
         WHERE a.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
        [req.user.userId, assignmentId, req.user.userId, req.user.userId]
      );

      if (assignmentCheck.length === 0) {
        return res.status(404).json({ message: "Assignment not found or not authorized" });
      }

      const assignment = assignmentCheck[0];

      const [submissions] = await db.execute(
        `SELECT ass.*, u.name as student_name, u.email as student_email,
                v.name as verified_by_name
         FROM assignment_submissions ass
         JOIN users u ON ass.student_id = u.id
         LEFT JOIN users v ON ass.verified_by = v.id
         WHERE ass.assignment_id = ?
         ORDER BY ass.submitted_at DESC`,
        [assignmentId]
      );

      // Add due date comparison for each submission
      const submissionsWithStatus = submissions.map(submission => {
        const submissionDate = new Date(submission.submitted_at);
        const dueDate = new Date(assignment.end_date);

        return {
          ...submission,
          is_after_due_date: submissionDate > dueDate,
          assignment_end_date: assignment.end_date
        };
      });

      res.json(submissionsWithStatus);
    } catch (error) {
      console.error("Get submissions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Verify assignment submission (Teacher)
app.put(
  "/api/assignment-submissions/:submissionId/verify",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { status, feedback } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Check if teacher has access to the assignment
      const [submissionCheck] = await db.execute(
        `SELECT ass.*, a.course_id, c.teacher_id 
         FROM assignment_submissions ass
         JOIN assignments a ON ass.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
         WHERE ass.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
        [req.user.userId, submissionId, req.user.userId, req.user.userId]
      );

      if (submissionCheck.length === 0) {
        return res.status(404).json({ message: "Submission not found or not authorized" });
      }

      await db.execute(
        "UPDATE assignment_submissions SET status = ?, teacher_feedback = ?, verified_at = NOW(), verified_by = ? WHERE id = ?",
        [status, feedback, req.user.userId, submissionId]
      );

      res.json({ message: `Assignment ${status} successfully` });
    } catch (error) {
      console.error("Verify assignment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Edit assignment (Teacher)
// Edit assignment (Teacher) - Fixed
app.put(
  "/api/assignments/:assignmentId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  upload.single("assignmentFile"),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { title, description, startDate, endDate } = req.body;
      const assignmentFile = req.file ? req.file.filename : null;

      if (!title || !startDate || !endDate) {
        return res.status(400).json({ message: "Title, start date, and end date are required" });
      }

      // Validate dates
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Check if teacher has access to the assignment
      const [assignmentCheck] = await db.execute(
        `SELECT a.*, c.teacher_id 
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
         WHERE a.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
        [req.user.userId, assignmentId, req.user.userId, req.user.userId]
      );

      if (assignmentCheck.length === 0) {
        return res.status(404).json({ message: "Assignment not found or not authorized" });
      }

      // Clean description - convert empty string to null
      const cleanDescription = description && description.trim() ? description.trim() : null;

      let updateQuery = "UPDATE assignments SET title = ?, description = ?, start_date = ?, end_date = ?";
      let params = [title, cleanDescription, startDate, endDate];

      if (assignmentFile) {
        updateQuery += ", assignment_file = ?";
        params.push(assignmentFile);
      }

      updateQuery += " WHERE id = ?";
      params.push(assignmentId);

      await db.execute(updateQuery, params);

      res.json({ message: "Assignment updated successfully" });
    } catch (error) {
      console.error("Update assignment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete assignment (Teacher)
app.delete(
  "/api/assignments/:assignmentId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { assignmentId } = req.params;

      const [assignmentCheck] = await db.execute(
        `SELECT a.*, c.teacher_id 
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
         WHERE a.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
        [req.user.userId, assignmentId, req.user.userId, req.user.userId]
      );

      if (assignmentCheck.length === 0) {
        return res.status(404).json({ message: "Assignment not found or not authorized" });
      }

      await db.execute("DELETE FROM assignments WHERE id = ?", [assignmentId]);

      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      console.error("Delete assignment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
const checkAdsEnabled = async (req, res, next) => {
  try {
    let adminId = null;

    if (req.user.role === "admin") {
      adminId = req.user.userId;
    } else if (req.user.role === "teacher") {
      const [teacherInfo] = await db.execute(
        "SELECT admin_id FROM users WHERE id = ? AND role = 'teacher'",
        [req.user.userId]
      );
      adminId = teacherInfo[0]?.admin_id;
    } else if (req.user.role === "student") {
      const [adminInfo] = await db.execute(`
        SELECT DISTINCT c.admin_id 
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        WHERE ce.student_id = ? AND c.admin_id IS NOT NULL
        LIMIT 1
      `, [req.user.userId]);
      adminId = adminInfo[0]?.admin_id;
    }

    // Default to ads disabled
    req.adsEnabled = false;

    if (adminId) {
      const [settings] = await db.execute(
        "SELECT enabled FROM adsense_settings WHERE admin_id = ?",
        [adminId]
      );

      if (settings.length > 0) {
        req.adsEnabled = Boolean(settings[0].enabled);
      }
    }

    next();
  } catch (error) {
    console.error("Check ads enabled error:", error);
    req.adsEnabled = false;
    next();
  }
};
// Admin Routes
app.post(
  "/api/admin/create-teacher",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const [existingUser] = await db.execute(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const tempPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // IMPORTANT: Set admin_id to current admin's ID
      const [result] = await db.execute(
        "INSERT INTO users (name, email, password, role, created_by, admin_id) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, "teacher", req.user.userId, req.user.userId]
      );

      await db.execute(
        "INSERT INTO user_credentials (user_id, temp_password) VALUES (?, ?)",
        [result.insertId, tempPassword]
      );

      // Send welcome email code...
      const userData = { name, email, role: 'teacher' };
      try {
        const emailResult = await sendWelcomeEmail(userData, tempPassword);
        console.log(`Credentials email sent to new teacher: ${email}`);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      res.status(201).json({
        message: "Teacher created successfully! Login credentials have been sent to their email.",
        teacherId: result.insertId,
        credentials: { email: email, password: tempPassword },
        emailSent: true
      });
    } catch (error) {
      console.error("Create teacher error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Special admin login endpoint for client management system integration
app.post("/api/admin/login-from-client", async (req, res) => {
  try {
    const { adminId, adminEmail, adminName } = req.body;

    // Get the client token from headers
    const authHeader = req.headers["authorization"];
    const clientToken = authHeader && authHeader.split(" ")[1];

    if (!clientToken) {
      return res.status(401).json({ message: "Client token required" });
    }

    // Verify client token by calling the client system
    const tokenVerification = await verifyClientToken(clientToken);

    if (!tokenVerification.valid) {
      return res.status(403).json({
        message: "Invalid client token",
        error: tokenVerification.error
      });
    }

    const clientUser = tokenVerification.user;
    console.log(clientUser);

    // Use the verified user info from client system - PRIORITY ORDER
    const finalAdminId = adminId || clientUser.id;
    const finalAdminEmail = adminEmail || clientUser.email;
    const finalAdminName = adminName || clientUser.name; // Remove fallback to "Admin User"

    // Validate that we have all required info
    if (!finalAdminName || !finalAdminEmail) {
      return res.status(400).json({
        message: "Missing admin name or email from client system"
      });
    }

    // Create or find admin user in LMS system
    let adminUser;
    try {
      const [existingAdmin] = await db.execute(
        'SELECT id, name, email FROM users WHERE email = ? AND role = "admin"',
        [finalAdminEmail]
      );

      if (existingAdmin.length > 0) {
        // Update existing admin's name if it has changed
        if (existingAdmin[0].name !== finalAdminName) {
          await db.execute(
            "UPDATE users SET name = ? WHERE id = ?",
            [finalAdminName, existingAdmin[0].id]
          );
        }

        adminUser = {
          id: existingAdmin[0].id,
          name: finalAdminName, // Use the updated name
          email: finalAdminEmail
        };
      } else {
        // Create admin user in LMS if doesn't exist
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const [result] = await db.execute(
          "INSERT INTO users (name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
          [finalAdminName, finalAdminEmail, hashedPassword, "admin", "active"]
        );
        adminUser = {
          id: result.insertId,
          name: finalAdminName,
          email: finalAdminEmail
        };
        console.log(`Created new admin user in LMS: ${finalAdminEmail} with ID: ${result.insertId}`);
      }
    } catch (error) {
      console.error("Admin user creation/update error:", error);
      return res.status(500).json({ message: "Failed to create admin session" });
    }

    // Generate LMS JWT token with consistent format
    const lmsToken = jwt.sign(
      {
        userId: adminUser.id,  // LMS format
        id: adminUser.id,      // Client system format
        email: finalAdminEmail,
        name: adminUser.name,  // Use the actual name
        role: "admin"
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "LMS admin session created",
      token: lmsToken,
      user: {
        id: adminUser.id,
        name: adminUser.name, // This should now be the correct name
        email: finalAdminEmail,
        role: "admin",
        status: "active"
      }
    });
  } catch (error) {
    console.error("LMS admin login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update the existing auth middleware to be more permissive for admin users
const authenticateTokenWithFallback = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      // If token verification fails, check if this is an admin request
      // and try to create a new session
      if (req.body && req.body.adminEmail) {
        try {
          // Handle admin session creation
          return next();
        } catch (error) {
          return res.status(403).json({ message: "Invalid or expired token" });
        }
      }
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Optional: Add a middleware to check if user exists in database for admin routes
const checkUserExists = async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    try {
      const [user] = await db.execute("SELECT * FROM users WHERE id = ?", [
        req.user.userId,
      ]);

      if (user.length === 0) {
        // Admin user doesn't exist in LMS, create them
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const [result] = await db.execute(
          "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 'active'",
          ["Admin User", req.user.email, hashedPassword, "admin", "active"]
        );

        // Update userId if it was just created
        if (result.insertId) {
          req.user.userId = result.insertId;
        }
      }
    } catch (error) {
      console.error("User check error:", error);
    }
  }
  next();
};

app.get(
  "/api/admin/teachers",
  authenticateToken,
  adminTokenRefresh,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const [teachers] = await db.execute(`
        SELECT u.id, u.name, u.email, u.mobile, u.status, u.created_at,
               COUNT(c.id) as course_count
        FROM users u
        LEFT JOIN courses c ON u.id = c.teacher_id
        WHERE u.role = 'teacher' AND u.admin_id = ?
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `, [req.user.userId]);

      res.json(teachers);
    } catch (error) {
      console.error("Get teachers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/api/teacher/import-students",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  upload.single("studentsFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const lines = fileContent.split('\n');

      const students = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i].trim();
        if (!line) continue;

        const [name, email, mobile] = line.split(',').map(item => item.trim());

        if (!name || !email) {
          errors.push(`Line ${i + 1}: Name and email are required`);
          continue;
        }

        if (mobile && !validateMobile(mobile)) {
          errors.push(`Line ${i + 1}: Invalid mobile number format for ${name}`);
          continue;
        }

        students.push({ name, email, mobile: mobile || null });
      }

      if (errors.length > 0) {
        return res.status(400).json({ message: "Validation errors", errors });
      }

      const results = [];
      for (const student of students) {
        try {
          const tempPassword = generatePassword();
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          const [result] = await db.execute(
            "INSERT INTO users (name, email, mobile, password, role, created_by) VALUES (?, ?, ?, ?, ?, ?)",
            [student.name, student.email, student.mobile, hashedPassword, "student", req.user.userId]
          );

          await db.execute(
            "INSERT INTO user_credentials (user_id, temp_password) VALUES (?, ?)",
            [result.insertId, tempPassword]
          );

          results.push({
            ...student,
            id: result.insertId,
            password: tempPassword,
            success: true
          });
        } catch (error) {
          results.push({
            ...student,
            success: false,
            error: error.message
          });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        message: "Bulk import completed",
        results,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length
      });
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.put(
  "/api/admin/teacher/:teacherId/toggle-status",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      const [teacher] = await db.execute(
        'SELECT id, status FROM users WHERE id = ? AND role = "teacher" AND admin_id = ?',
        [teacherId, req.user.userId]
      );

      if (teacher.length === 0) {
        return res.status(404).json({ message: "Teacher not found or not authorized" });
      }

      const newStatus = teacher[0].status === "active" ? "blocked" : "active";

      await db.execute("UPDATE users SET status = ? WHERE id = ?", [newStatus, teacherId]);

      res.json({
        message: `Teacher ${newStatus === "active" ? "unblocked" : "blocked"} successfully`,
        newStatus,
      });
    } catch (error) {
      console.error("Toggle teacher status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Teacher Routes for Student Management
app.post(
  "/api/teacher/create-student",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { name, email, mobile } = req.body; // Add mobile here

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      // Validate mobile number if provided
      if (mobile && !/^[+]?[\d\s-()]{10,15}$/.test(mobile.replace(/\s/g, ''))) {
        return res.status(400).json({ message: "Invalid mobile number format" });
      }

      const [existingUser] = await db.execute(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (existingUser.length > 0) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      // Check if mobile number already exists (if provided)
      if (mobile) {
        const [existingMobile] = await db.execute(
          "SELECT id FROM users WHERE mobile = ? AND mobile IS NOT NULL",
          [mobile]
        );

        if (existingMobile.length > 0) {
          return res
            .status(400)
            .json({ message: "User already exists with this mobile number" });
        }
      }

      const tempPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const [result] = await db.execute(
        "INSERT INTO users (name, email, mobile, password, role, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, mobile || null, hashedPassword, "student", req.user.userId]
      );

      await db.execute(
        "INSERT INTO user_credentials (user_id, temp_password) VALUES (?, ?)",
        [result.insertId, tempPassword]
      );

      // Send welcome email with credentials
      const userData = {
        name,
        email,
        role: 'student'
      };

      try {
        const emailResult = await sendWelcomeEmail(userData, tempPassword);
        if (emailResult.success) {
          console.log(`Credentials email sent to new student: ${email}`);
        } else {
          console.error('Failed to send credentials email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      res.status(201).json({
        message: "Student created successfully! Login credentials have been sent to their email.",
        studentId: result.insertId,
        credentials: {
          email: email,
          password: tempPassword,
        },
        emailSent: true
      });
    } catch (error) {
      console.error("Create student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/api/resend-credentials",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  async (req, res) => {
    try {
      const { userId } = req.body;

      // Get user details
      const [user] = await db.execute(
        "SELECT u.*, uc.temp_password FROM users u LEFT JOIN user_credentials uc ON u.id = uc.user_id WHERE u.id = ?",
        [userId]
      );

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const userData = user[0];

      // Check authorization
      if (req.user.role === "teacher" && userData.role !== "student") {
        return res.status(403).json({ message: "Teachers can only resend student credentials" });
      }

      // Only resend if user hasn't changed password
      const [credentials] = await db.execute(
        "SELECT temp_password, is_password_changed FROM user_credentials WHERE user_id = ?",
        [userId]
      );

      if (credentials.length === 0 || credentials[0].is_password_changed) {
        return res.status(400).json({
          message: "User has already changed their password. Cannot resend credentials."
        });
      }

      // Send email
      const emailData = {
        name: userData.name,
        email: userData.email,
        role: userData.role
      };

      const emailResult = await sendWelcomeEmail(emailData, credentials[0].temp_password);

      if (emailResult.success) {
        res.json({
          message: "Credentials email resent successfully!",
          emailSent: true
        });
      } else {
        res.status(500).json({
          message: "Failed to send email",
          error: emailResult.error
        });
      }

    } catch (error) {
      console.error("Resend credentials error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Optional: Route to test email configuration
app.post(
  "/api/test-email",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { testEmail } = req.body;

      if (!testEmail) {
        return res.status(400).json({ message: "Test email address is required" });
      }

      const testData = {
        name: "Test User",
        email: testEmail,
        role: "student"
      };

      const emailResult = await sendWelcomeEmail(testData, "TEST123");

      if (emailResult.success) {
        res.json({
          message: "Test email sent successfully!",
          messageId: emailResult.messageId
        });
      } else {
        res.status(500).json({
          message: "Failed to send test email",
          error: emailResult.error
        });
      }

    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/teacher/students",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const [students] = await db.execute(
        `
      SELECT u.id, u.name, u.email, u.mobile, u.status, u.created_at, -- Add mobile here
             COUNT(DISTINCT ce.course_id) as enrolled_courses
      FROM users u
      LEFT JOIN course_enrollments ce ON u.id = ce.student_id
      WHERE u.role = 'student' AND u.created_by = ?
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `,
        [req.user.userId]
      );

      res.json(students);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.delete(
  "/api/teacher/student/:studentId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { studentId } = req.params;

      const [student] = await db.execute(
        'SELECT id FROM users WHERE id = ? AND role = "student" AND created_by = ?',
        [studentId, req.user.userId]
      );

      if (student.length === 0) {
        return res
          .status(404)
          .json({ message: "Student not found or not created by you" });
      }

      await db.execute("DELETE FROM users WHERE id = ?", [studentId]);

      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Delete student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/api/courses",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { title, description, duration_days, group_link, start_date, end_date } = req.body;

      // Get teacher's admin_id
      const [teacherInfo] = await db.execute(
        "SELECT admin_id FROM users WHERE id = ? AND role = 'teacher'",
        [req.user.userId]
      );

      if (teacherInfo.length === 0) {
        return res.status(403).json({ message: "Teacher not found" });
      }

      // Validate dates if provided
      if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Validate group_link if provided
      if (group_link && !isValidUrl(group_link)) {
        return res.status(400).json({ message: "Invalid group link URL" });
      }

      const [result] = await db.execute(
        "INSERT INTO courses (title, description, teacher_id, duration_days, group_link, start_date, end_date, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [title, description, req.user.userId, duration_days || 30, group_link || null, start_date || null, end_date || null, teacherInfo[0].admin_id]
      );

      res.status(201).json({
        message: "Course created successfully",
        courseId: result.insertId,
      });
    } catch (error) {
      console.error("Course creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/courses",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      let query, params;

      if (req.user.role === "teacher") {
        // Teachers see courses they created or where they are sub-teachers
        query = `
          SELECT DISTINCT c.*, u.name as teacher_name, 
                 COUNT(ce.student_id) as enrolled_students,
                 CASE WHEN c.teacher_id = ? THEN 'main' ELSE 'sub' END as teacher_role
          FROM courses c 
          LEFT JOIN users u ON c.teacher_id = u.id
          LEFT JOIN course_enrollments ce ON c.id = ce.course_id
          LEFT JOIN course_teachers ct ON c.id = ct.course_id
          WHERE c.teacher_id = ? OR ct.teacher_id = ?
          GROUP BY c.id
          ORDER BY teacher_role, c.created_at DESC
        `;
        params = [req.user.userId, req.user.userId, req.user.userId];

      } else if (req.user.role === "student") {
        // Students see ONLY courses they are enrolled in
        query = `
          SELECT c.*, u.name as teacher_name, ce.enrolled_at, ce.completed_at
          FROM courses c 
          INNER JOIN users u ON c.teacher_id = u.id
          INNER JOIN course_enrollments ce ON c.id = ce.course_id
          WHERE ce.student_id = ?
          ORDER BY ce.enrolled_at DESC
        `;
        params = [req.user.userId];

      } else if (req.user.role === "admin") {
        // Admin can see all courses
        query = `
          SELECT c.*, u.name as teacher_name, 
                 COUNT(ce.student_id) as enrolled_students
          FROM courses c 
          LEFT JOIN users u ON c.teacher_id = u.id
          LEFT JOIN course_enrollments ce ON c.id = ce.course_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `;
        params = [];
      }

      const [courses] = await db.execute(query, params);
      res.json(courses);
    } catch (error) {
      console.error("Courses fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.put(
  "/api/courses/:courseId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, description, duration_days, group_link, start_date, end_date } = req.body;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      // Validate dates if provided
      if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Validate group_link if provided
      if (group_link && !isValidUrl(group_link)) {
        return res.status(400).json({ message: "Invalid group link URL" });
      }

      await db.execute(
        "UPDATE courses SET title = ?, description = ?, duration_days = ?, group_link = ?, start_date = ?, end_date = ? WHERE id = ?",
        [title, description, duration_days, group_link || null, start_date || null, end_date || null, courseId]
      );

      res.json({ message: "Course updated successfully" });
    } catch (error) {
      console.error("Update course error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Add this route after your existing courses routes
app.get(
  "/api/courses/:courseId",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      let hasAccess = false;

      if (req.user.role === "teacher") {
        hasAccess = await checkCourseAccess(courseId, req.user.userId);
      } else if (req.user.role === "student") {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );
        hasAccess = enrollmentCheck.length > 0;
      } else if (req.user.role === "admin") {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized to view this course" });
      }

      const [course] = await db.execute(
        `SELECT c.*, u.name as teacher_name 
         FROM courses c 
         JOIN users u ON c.teacher_id = u.id 
         WHERE c.id = ?`,
        [courseId]
      );

      if (course.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json(course[0]);
    } catch (error) {
      console.error("Get course details error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Add group link management route for teachers
app.put(
  "/api/courses/:courseId/group-link",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { group_link } = req.body;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      // Validate group_link if provided
      if (group_link && !isValidUrl(group_link)) {
        return res.status(400).json({ message: "Invalid group link URL" });
      }

      await db.execute(
        "UPDATE courses SET group_link = ? WHERE id = ?",
        [group_link || null, courseId]
      );

      res.json({
        message: group_link ? "Group link updated successfully" : "Group link removed successfully",
        group_link: group_link || null
      });
    } catch (error) {
      console.error("Update group link error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get course group link for students
app.get(
  "/api/courses/:courseId/group-link",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      let hasAccess = false;

      if (req.user.role === 'teacher') {
        hasAccess = await checkCourseAccess(courseId, req.user.userId);
      } else if (req.user.role === 'student') {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );
        hasAccess = enrollmentCheck.length > 0;
      } else if (req.user.role === 'admin') {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(404).json({
          message: req.user.role === 'student'
            ? "Course not found or you are not enrolled"
            : "Course not found or not authorized"
        });
      }

      const [result] = await db.execute(
        "SELECT group_link FROM courses WHERE id = ?",
        [courseId]
      );

      if (result.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json({
        group_link: result[0].group_link,
        has_group_link: !!result[0].group_link
      });
    } catch (error) {
      console.error("Get group link error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Track group join activity (optional analytics)
app.post(
  "/api/courses/:courseId/group-join",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Verify student is enrolled
      const [enrollmentCheck] = await db.execute(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, req.user.userId]
      );

      if (enrollmentCheck.length === 0) {
        return res.status(403).json({ message: "Not enrolled in this course" });
      }

      // You can add group join logging here if needed
      // For now, just return success
      res.json({ message: "Group join activity recorded" });
    } catch (error) {
      console.error("Group join tracking error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Helper function to validate URLs
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

app.delete(
  "/api/courses/:courseId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Only main teacher can delete course
      const [courseCheck] = await db.execute(
        "SELECT id FROM courses WHERE id = ? AND teacher_id = ?",
        [courseId, req.user.userId]
      );

      if (courseCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Course not found or only main teacher can delete course" });
      }

      await db.execute("DELETE FROM courses WHERE id = ?", [courseId]);

      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Delete course error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get all teachers for a course (for course information display)
app.get(
  "/api/courses/:courseId/teachers",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Check if user has access to the course
      let hasAccess = false;

      if (req.user.role === "teacher") {
        hasAccess = await checkCourseAccess(courseId, req.user.userId);
      } else if (req.user.role === "student") {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );
        hasAccess = enrollmentCheck.length > 0;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized to view course teachers" });
      }

      // Get main teacher
      const [mainTeacher] = await db.execute(
        `SELECT u.id, u.name, u.email, 'main' as role
         FROM courses c
         JOIN users u ON c.teacher_id = u.id
         WHERE c.id = ?`,
        [courseId]
      );

      // Get sub teachers
      const [subTeachers] = await db.execute(
        `SELECT u.id, u.name, u.email, 'sub' as role
         FROM course_teachers ct
         JOIN users u ON ct.teacher_id = u.id
         WHERE ct.course_id = ?
         ORDER BY u.name`,
        [courseId]
      );

      const allTeachers = [...mainTeacher, ...subTeachers];
      res.json(allTeachers);
    } catch (error) {
      console.error("Get course teachers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Student Management
app.post(
  "/api/courses/:courseId/students",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { email } = req.body;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      // Rest of the existing function code remains the same
      const [students] = await db.execute(
        'SELECT id FROM users WHERE email = ? AND role = "student"',
        [email]
      );

      if (students.length === 0) {
        return res.status(404).json({ message: "Student not found" });
      }

      const studentId = students[0].id;

      await db.execute(
        "INSERT IGNORE INTO course_enrollments (course_id, student_id) VALUES (?, ?)",
        [courseId, studentId]
      );

      res.json({ message: "Student added to course successfully" });
    } catch (error) {
      console.error("Add student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.delete(
  "/api/courses/:courseId/students/:studentId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId, studentId } = req.params;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      await db.execute(
        "DELETE FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, studentId]
      );

      res.json({ message: "Student removed from course successfully" });
    } catch (error) {
      console.error("Remove student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/courses/:courseId/students",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      const [students] = await db.execute(
        `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.mobile, -- Add mobile here
        ce.enrolled_at, 
        ce.completed_at
      FROM course_enrollments ce
      JOIN users u ON ce.student_id = u.id
      WHERE ce.course_id = ?
      ORDER BY u.name
    `,
        [courseId]
      );

      // Get attendance stats and project info for each student
      for (let student of students) {
        const [attendanceStats] = await db.execute(
          `
        SELECT 
          COUNT(*) as total_attendance,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count
        FROM student_attendance 
        WHERE student_id = ? AND course_id = ?
      `,
          [student.id, courseId]
        );

        const [projectInfo] = await db.execute(
          `
        SELECT status, submission_date 
        FROM projects 
        WHERE student_id = ? AND course_id = ?
      `,
          [student.id, courseId]
        );

        student.total_attendance = attendanceStats[0]?.total_attendance || 0;
        student.present_count = attendanceStats[0]?.present_count || 0;
        student.project_status = projectInfo[0]?.status || null;
        student.project_submitted_at = projectInfo[0]?.submission_date || null;
      }

      res.json(students);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Updated session creation route
app.post(
  "/api/courses/:courseId/sessions",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  upload.single("notesFile"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, notes, meetLink, sessionDate, sessionTime, conductedBy } = req.body;
      const notesFile = req.file ? req.file.filename : null;

      // Check if user has access to the course (main teacher or sub-teacher)
      const [accessCheck] = await db.execute(
        `SELECT 1 FROM courses WHERE id = ? AND teacher_id = ?
         UNION
         SELECT 1 FROM course_teachers WHERE course_id = ? AND teacher_id = ?`,
        [courseId, req.user.userId, courseId, req.user.userId]
      );

      if (accessCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      // Validate conducted_by teacher has access to course
      if (conductedBy) {
        const [teacherAccessCheck] = await db.execute(
          `SELECT 1 FROM courses WHERE id = ? AND teacher_id = ?
           UNION
           SELECT 1 FROM course_teachers WHERE course_id = ? AND teacher_id = ?`,
          [courseId, conductedBy, courseId, conductedBy]
        );

        if (teacherAccessCheck.length === 0) {
          return res.status(400).json({ message: "Selected teacher does not have access to this course" });
        }
      }

      const [result] = await db.execute(
        "INSERT INTO daily_sessions (course_id, title, notes, notes_file, meet_link, session_date, session_time, conducted_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [courseId, title, notes, notesFile, meetLink, sessionDate, sessionTime || null, conductedBy || req.user.userId]
      );

      const [students] = await db.execute(
        "SELECT student_id FROM course_enrollments WHERE course_id = ?",
        [courseId]
      );

      for (const student of students) {
        await db.execute(
          "INSERT INTO session_attendance (session_id, student_id) VALUES (?, ?)",
          [result.insertId, student.student_id]
        );
      }

      io.to(`course_${courseId}`).emit("newSession", {
        sessionId: result.insertId,
        title,
        notes,
        meetLink,
        sessionDate,
        sessionTime,
      });

      res.status(201).json({
        message: "Session created successfully",
        sessionId: result.insertId,
      });
    } catch (error) {
      console.error("Session creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Updated session fetch route
app.get(
  "/api/courses/:courseId/sessions",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      let query = `
      SELECT ds.*, 
             COUNT(sa.student_id) as total_students,
             COUNT(CASE WHEN sa.marked_read = 1 THEN 1 END) as students_read,
             COUNT(CASE WHEN sa.joined_meet = 1 THEN 1 END) as students_joined,
             ct.name as conducted_by_name
      FROM daily_sessions ds
      LEFT JOIN session_attendance sa ON ds.id = sa.session_id
      LEFT JOIN users ct ON ds.conducted_by = ct.id
      WHERE ds.course_id = ?
      GROUP BY ds.id
      ORDER BY ds.session_date DESC, ds.session_time DESC
    `;

      if (req.user.role === "student") {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );

        if (enrollmentCheck.length === 0) {
          return res
            .status(403)
            .json({ message: "Not enrolled in this course" });
        }

        query = `
        SELECT ds.*, sa.marked_read, sa.joined_meet, sa.read_at, sa.joined_at,
               ct.name as conducted_by_name
        FROM daily_sessions ds
        LEFT JOIN session_attendance sa ON ds.id = sa.session_id AND sa.student_id = ?
        LEFT JOIN users ct ON ds.conducted_by = ct.id
        WHERE ds.course_id = ?
        ORDER BY ds.session_date DESC, ds.session_time DESC
      `;
      }

      const params =
        req.user.role === "student" ? [req.user.userId, courseId] : [courseId];
      const [sessions] = await db.execute(query, params);

      res.json(sessions);
    } catch (error) {
      console.error("Sessions fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Updated session update route
app.put(
  "/api/sessions/:sessionId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  upload.single("notesFile"),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { title, notes, meetLink, sessionDate, sessionTime, conductedBy } = req.body;
      const notesFile = req.file ? req.file.filename : null;

      const [sessionCheck] = await db.execute(
        `
      SELECT ds.*, c.teacher_id 
      FROM daily_sessions ds
      JOIN courses c ON ds.course_id = c.id
      LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
      WHERE ds.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)
    `,
        [req.user.userId, sessionId, req.user.userId, req.user.userId]
      );

      if (sessionCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Session not found or not authorized" });
      }

      let updateQuery =
        "UPDATE daily_sessions SET title = ?, notes = ?, meet_link = ?, session_date = ?, session_time = ?, conducted_by = ?";
      let params = [title, notes, meetLink, sessionDate, sessionTime || null, conductedBy || req.user.userId];

      if (notesFile) {
        updateQuery += ", notes_file = ?";
        params.push(notesFile);
      }

      updateQuery += " WHERE id = ?";
      params.push(sessionId);

      await db.execute(updateQuery, params);

      res.json({ message: "Session updated successfully" });
    } catch (error) {
      console.error("Update session error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.delete(
  "/api/sessions/:sessionId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const [sessionCheck] = await db.execute(
        `
      SELECT ds.*, c.teacher_id 
      FROM daily_sessions ds
      JOIN courses c ON ds.course_id = c.id
      LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
      WHERE ds.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)
    `,
        [req.user.userId, sessionId, req.user.userId, req.user.userId]
      );

      if (sessionCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Session not found or not authorized" });
      }

      await db.execute("DELETE FROM daily_sessions WHERE id = ?", [sessionId]);

      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Delete session error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Mark as read and join meet
app.post(
  "/api/sessions/:sessionId/mark-read",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      await db.execute(
        "UPDATE session_attendance SET marked_read = 1, read_at = NOW() WHERE session_id = ? AND student_id = ?",
        [sessionId, req.user.userId]
      );

      res.json({ message: "Session marked as read" });
    } catch (error) {
      console.error("Mark read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/api/sessions/:sessionId/join-meet",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      await db.execute(
        "UPDATE session_attendance SET joined_meet = 1, joined_at = NOW() WHERE session_id = ? AND student_id = ?",
        [sessionId, req.user.userId]
      );

      res.json({ message: "Meeting attendance recorded" });
    } catch (error) {
      console.error("Join meet error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Attendance Management
app.post(
  "/api/courses/:courseId/attendance",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { studentId, sessionDate, status, notes } = req.body;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      const [enrollmentCheck] = await db.execute(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, studentId]
      );

      if (enrollmentCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Student not enrolled in this course" });
      }

      await db.execute(
        `
      INSERT INTO student_attendance (course_id, student_id, session_date, status, marked_by, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status),
        marked_by = VALUES(marked_by),
        notes = VALUES(notes),
        marked_at = NOW()
    `,
        [courseId, studentId, sessionDate, status, req.user.userId, notes]
      );

      res.json({ message: "Attendance marked successfully" });
    } catch (error) {
      console.error("Mark attendance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/courses/:courseId/attendance",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { date } = req.query;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      let query = `
      SELECT 
        sa.*, u.name as student_name, u.email as student_email,
        t.name as marked_by_name
      FROM student_attendance sa
      JOIN users u ON sa.student_id = u.id
      JOIN users t ON sa.marked_by = t.id
      WHERE sa.course_id = ?
    `;

      let params = [courseId];

      if (date) {
        query += " AND sa.session_date = ?";
        params.push(date);
      }

      query += " ORDER BY sa.session_date DESC, u.name";

      const [attendance] = await db.execute(query, params);

      res.json(attendance);
    } catch (error) {
      console.error("Get attendance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Blog Management Routes

// Create blog (Admin/Teacher only)
app.post(
  "/api/blogs",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  checkUserStatus,
  upload.single("blogImage"),
  async (req, res) => {
    try {
      const { title, content, videoUrl } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      if (videoUrl && !isValidUrl(videoUrl)) {
        return res.status(400).json({ message: "Invalid video URL" });
      }

      let adminId = null;

      if (req.user.role === "admin") {
        adminId = req.user.userId;
      } else if (req.user.role === "teacher") {
        // Get teacher's admin_id
        const [teacherInfo] = await db.execute(
          "SELECT admin_id FROM users WHERE id = ? AND role = 'teacher'",
          [req.user.userId]
        );
        adminId = teacherInfo[0]?.admin_id || null;
      }

      const [result] = await db.execute(
        "INSERT INTO blogs (title, content, image_url, video_url, author_id, admin_id) VALUES (?, ?, ?, ?, ?, ?)",
        [title, content, imageUrl, videoUrl || null, req.user.userId, adminId]
      );

      res.status(201).json({
        message: "Blog post created successfully",
        blogId: result.insertId,
      });
    } catch (error) {
      console.error("Blog creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);


// Get all blogs (All users can view)
app.get(
  "/api/blogs",
  authenticateToken,
  checkUserStatus,
  checkAdsEnabled, // Add this middleware
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10)) || 1;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10))) || 10;
      const offset = (pageNum - 1) * limitNum;

      let baseQuery = `
        FROM blogs b
        JOIN users u ON b.author_id = u.id
      `;

      let whereConditions = [];
      let params = [];

      if (req.user.role === "admin") {
        whereConditions.push("b.admin_id = ?");
        params.push(req.user.userId);
      } else if (req.user.role === "teacher") {
        const [teacherInfo] = await db.execute(
          "SELECT admin_id FROM users WHERE id = ?",
          [req.user.userId]
        );

        if (teacherInfo.length > 0 && teacherInfo[0].admin_id) {
          whereConditions.push("(b.admin_id = ? OR b.author_id = ?)");
          params.push(teacherInfo[0].admin_id, req.user.userId);
        } else {
          whereConditions.push("b.author_id = ?");
          params.push(req.user.userId);
        }
      } else if (req.user.role === "student") {
        whereConditions.push(`b.admin_id IN (
          SELECT DISTINCT c.admin_id 
          FROM course_enrollments ce
          JOIN courses c ON ce.course_id = c.id
          WHERE ce.student_id = ? AND c.admin_id IS NOT NULL
        )`);
        params.push(req.user.userId);
      } else {
        whereConditions.push("1 = 0");
      }

      let whereClause = "";
      if (whereConditions.length > 0) {
        whereClause = " WHERE " + whereConditions.join(" AND ");
      }

      const selectQuery = `
        SELECT b.*, u.name as author_name, u.role as author_role
        ${baseQuery}
        ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      const countQuery = `
        SELECT COUNT(*) as count
        ${baseQuery}
        ${whereClause}
      `;

      const [blogs] = await db.execute(selectQuery, params);
      const [totalCount] = await db.execute(countQuery, params);

      res.json({
        blogs,
        totalCount: totalCount[0].count,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount[0].count / limitNum),
        adsEnabled: req.adsEnabled // Include ads status in response
      });
    } catch (error) {
      console.error("Get blogs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
// Get single blog
app.get(
  "/api/blogs/:blogId",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { blogId } = req.params;

      const [blog] = await db.execute(
        `SELECT b.*, u.name as author_name, u.role as author_role
         FROM blogs b
         JOIN users u ON b.author_id = u.id
         WHERE b.id = ?`,
        [blogId]
      );

      if (blog.length === 0) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.json(blog[0]);
    } catch (error) {
      console.error("Get blog error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update blog (Only author can update)
app.put(
  "/api/blogs/:blogId",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  checkUserStatus,
  upload.single("blogImage"),
  async (req, res) => {
    try {
      const { blogId } = req.params;
      const { title, content, videoUrl } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      // Check if user owns the blog or is admin
      const [blogCheck] = await db.execute(
        "SELECT author_id FROM blogs WHERE id = ?",
        [blogId]
      );

      if (blogCheck.length === 0) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      if (blogCheck[0].author_id !== req.user.userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to update this blog" });
      }

      // Validate video URL if provided
      if (videoUrl && !isValidUrl(videoUrl)) {
        return res.status(400).json({ message: "Invalid video URL" });
      }

      let updateQuery = "UPDATE blogs SET title = ?, content = ?, video_url = ?";
      let params = [title, content, videoUrl || null];

      if (imageUrl) {
        updateQuery += ", image_url = ?";
        params.push(imageUrl);
      }

      updateQuery += " WHERE id = ?";
      params.push(blogId);

      await db.execute(updateQuery, params);

      res.json({ message: "Blog post updated successfully" });
    } catch (error) {
      console.error("Update blog error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete blog (Only author or admin can delete)
app.delete(
  "/api/blogs/:blogId",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { blogId } = req.params;

      // Check if user owns the blog or is admin
      const [blogCheck] = await db.execute(
        "SELECT author_id, image_url FROM blogs WHERE id = ?",
        [blogId]
      );

      if (blogCheck.length === 0) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      if (blogCheck[0].author_id !== req.user.userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this blog" });
      }

      // Delete the image file if exists
      if (blogCheck[0].image_url) {
        const imagePath = path.join("uploads", path.basename(blogCheck[0].image_url));
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await db.execute("DELETE FROM blogs WHERE id = ?", [blogId]);

      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      console.error("Delete blog error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Project Management
app.post(
  "/api/courses/:courseId/project",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  upload.single("projectFile"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, description } = req.body;
      const projectFile = req.file ? req.file.filename : null;

      const [enrollmentCheck] = await db.execute(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, req.user.userId]
      );

      if (enrollmentCheck.length === 0) {
        return res.status(403).json({ message: "Not enrolled in this course" });
      }

      await db.execute(
        `
      INSERT INTO projects (course_id, student_id, title, description, project_file)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        title = VALUES(title),
        description = VALUES(description),
        project_file = VALUES(project_file),
        submission_date = NOW(),
        status = 'submitted',
        teacher_feedback = NULL,
        verified_at = NULL,
        verified_by = NULL
    `,
        [courseId, req.user.userId, title, description, projectFile]
      );

      res.json({ message: "Project submitted successfully" });
    } catch (error) {
      console.error("Project submission error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/courses/:courseId/my-project",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const [project] = await db.execute(
        `
      SELECT p.*, c.title as course_name, u.name as verified_by_name
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      LEFT JOIN users u ON p.verified_by = u.id
      WHERE p.course_id = ? AND p.student_id = ?
    `,
        [courseId, req.user.userId]
      );

      res.json(project[0] || null);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/courses/:courseId/projects",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      const [projects] = await db.execute(
        `
      SELECT p.*, u.name as student_name, u.email as student_email,
             v.name as verified_by_name
      FROM projects p
      JOIN users u ON p.student_id = u.id
      LEFT JOIN users v ON p.verified_by = v.id
      WHERE p.course_id = ?
      ORDER BY p.submission_date DESC
    `,
        [courseId]
      );

      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Sub-teacher management routes

// Add sub-teacher to course
app.post(
  "/api/courses/:courseId/sub-teachers",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { teacherEmail } = req.body;

      // Check if user owns the course
      const [courseCheck] = await db.execute(
        "SELECT id FROM courses WHERE id = ? AND teacher_id = ?",
        [courseId, req.user.userId]
      );

      if (courseCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      // Find teacher by email
      const [teacher] = await db.execute(
        'SELECT id, name FROM users WHERE email = ? AND role = "teacher" AND status = "active"',
        [teacherEmail]
      );

      if (teacher.length === 0) {
        return res.status(404).json({ message: "Teacher not found or inactive" });
      }

      // Check if teacher is already added
      const [existingSubTeacher] = await db.execute(
        "SELECT id FROM course_teachers WHERE course_id = ? AND teacher_id = ?",
        [courseId, teacher[0].id]
      );

      if (existingSubTeacher.length > 0) {
        return res.status(400).json({ message: "Teacher is already added to this course" });
      }

      // Add sub-teacher
      await db.execute(
        "INSERT INTO course_teachers (course_id, teacher_id, added_by, role) VALUES (?, ?, ?, 'sub')",
        [courseId, teacher[0].id, req.user.userId]
      );

      res.json({
        message: "Sub-teacher added successfully",
        teacherName: teacher[0].name
      });
    } catch (error) {
      console.error("Add sub-teacher error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get sub-teachers for a course
app.get(
  "/api/courses/:courseId/sub-teachers",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Check access (main teacher or sub-teacher)
      const [accessCheck] = await db.execute(
        `SELECT 1 FROM courses WHERE id = ? AND teacher_id = ?
         UNION
         SELECT 1 FROM course_teachers WHERE course_id = ? AND teacher_id = ?`,
        [courseId, req.user.userId, courseId, req.user.userId]
      );

      if (accessCheck.length === 0) {
        return res.status(403).json({ message: "Not authorized to view sub-teachers" });
      }

      const [subTeachers] = await db.execute(
        `SELECT ct.*, u.name, u.email, a.name as added_by_name
         FROM course_teachers ct
         JOIN users u ON ct.teacher_id = u.id
         JOIN users a ON ct.added_by = a.id
         WHERE ct.course_id = ?
         ORDER BY ct.added_at DESC`,
        [courseId]
      );

      res.json(subTeachers);
    } catch (error) {
      console.error("Get sub-teachers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Remove sub-teacher from course
app.delete(
  "/api/courses/:courseId/sub-teachers/:teacherId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId, teacherId } = req.params;

      // Check if user owns the course
      const [courseCheck] = await db.execute(
        "SELECT id FROM courses WHERE id = ? AND teacher_id = ?",
        [courseId, req.user.userId]
      );

      if (courseCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Course not found or not authorized" });
      }

      await db.execute(
        "DELETE FROM course_teachers WHERE course_id = ? AND teacher_id = ?",
        [courseId, teacherId]
      );

      res.json({ message: "Sub-teacher removed successfully" });
    } catch (error) {
      console.error("Remove sub-teacher error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get all active teachers for suggestions
app.get(
  "/api/teachers/search",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { q } = req.query; // search query

      let query = `
        SELECT id, name, email 
        FROM users 
        WHERE role = 'teacher' AND status = 'active'
      `;
      let params = [];

      if (q) {
        query += ` AND (name LIKE ? OR email LIKE ?)`;
        params = [`%${q}%`, `%${q}%`];
      }

      query += ` ORDER BY name LIMIT 10`;

      const [teachers] = await db.execute(query, params);
      res.json(teachers);
    } catch (error) {
      console.error("Search teachers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get all active students for suggestions
app.get(
  "/api/students/search",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { q, courseId, mobile } = req.query; // Add mobile search parameter

      let query = `
        SELECT u.id, u.name, u.email, u.mobile 
        FROM users u
        WHERE u.role = 'student' AND u.status = 'active'
      `;
      let params = [];

      // Exclude students already enrolled in the course
      if (courseId) {
        query += ` AND u.id NOT IN (
          SELECT ce.student_id 
          FROM course_enrollments ce 
          WHERE ce.course_id = ?
        )`;
        params.push(courseId);
      }

      // Add search filter - search by name, email, or mobile
      if (q) {
        query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      // Mobile-specific search
      if (mobile) {
        query += ` AND u.mobile LIKE ?`;
        params.push(`%${mobile}%`);
      }

      query += ` ORDER BY u.name LIMIT 10`;

      const [students] = await db.execute(query, params);
      res.json(students);
    } catch (error) {
      console.error("Search students error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.put(
  "/api/projects/:projectId/verify",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { status, feedback } = req.body;

      const [projectCheck] = await db.execute(
        `
      SELECT p.*, c.teacher_id 
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
      WHERE p.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)
    `,
        [req.user.userId, projectId, req.user.userId, req.user.userId]
      );

      if (projectCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Project not found or not authorized" });
      }

      const project = projectCheck[0];

      await db.execute(
        "UPDATE projects SET status = ?, teacher_feedback = ?, verified_at = NOW(), verified_by = ? WHERE id = ?",
        [status, feedback, req.user.userId, projectId]
      );

      // Only generate certificate if project is approved
      if (status === "approved") {
        await generateCertificateForProject(
          project.student_id,
          project.course_id
        );
      }

      res.json({ message: `Project ${status} successfully` });
    } catch (error) {
      console.error("Verify project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Certificate generation
async function generateCertificate(
  studentName,
  courseName,
  completionDate,
  courseEndDate,
  filePath,
  certificateCode
) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 30,
        info: {
          Title: `Certificate of Completion - ${courseName}`,
          Author: 'Learning Management System',
          Subject: 'Course Completion Certificate'
        }
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Colors
      const primaryBlue = '#1e40af';
      const accentGold = '#f59e0b';
      const deepNavy = '#1e293b';
      const lightGray = '#f1f5f9';
      const darkGray = '#475569';

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;

      // Decorative border with gradient effect
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(4)
        .stroke(primaryBlue);

      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(2)
        .stroke(accentGold);

      doc.rect(35, 35, pageWidth - 70, pageHeight - 70)
        .lineWidth(1)
        .stroke(darkGray);

      // Header background with decorative element
      doc.rect(40, 40, pageWidth - 80, 80)
        .fill(lightGray)
        .stroke(primaryBlue, 1);

      // Institution/System Header
      doc.fontSize(24)
        .fillColor(primaryBlue)
        .font('Helvetica-Bold')
        .text("LEARNING MANAGEMENT SYSTEM", 50, 60, {
          align: "center",
          width: pageWidth - 100
        });

      doc.fontSize(12)
        .fillColor(darkGray)
        .font('Helvetica')
        .text("Professional Learning Excellence", 50, 90, {
          align: "center",
          width: pageWidth - 100
        });

      // Main Certificate Title
      doc.fontSize(48)
        .fillColor(primaryBlue)
        .font('Helvetica-Bold')
        .text("CERTIFICATE", 50, 150, {
          align: "center",
          width: pageWidth - 100
        });

      doc.fontSize(22)
        .fillColor(accentGold)
        .font('Helvetica-Bold')
        .text("OF COMPLETION", 50, 200, {
          align: "center",
          width: pageWidth - 100
        });

      // Decorative line with ornaments
      const lineY = 235;
      const lineStartX = 120;
      const lineEndX = pageWidth - 120;

      // Central decorative line
      doc.moveTo(lineStartX, lineY)
        .lineTo(lineEndX, lineY)
        .lineWidth(3)
        .stroke(accentGold);

      // Ornamental circles at line ends
      doc.circle(lineStartX - 10, lineY, 5)
        .fillAndStroke(accentGold, accentGold);
      doc.circle(lineEndX + 10, lineY, 5)
        .fillAndStroke(accentGold, accentGold);

      // Achievement statement
      doc.fontSize(16)
        .fillColor(deepNavy)
        .font('Helvetica')
        .text("This is to certify that", 50, 265, {
          align: "center",
          width: pageWidth - 100
        });

      // Student name with decorative background
      const nameY = 295;
      const nameBoxWidth = pageWidth - 160;
      const nameBoxHeight = 45;

      doc.rect(80, nameY - 5, nameBoxWidth, nameBoxHeight)
        .fill('#f8fafc')
        .stroke(primaryBlue, 1);

      doc.fontSize(32)
        .fillColor(primaryBlue)
        .font('Helvetica-Bold')
        .text(studentName, 90, nameY + 8, {
          align: "center",
          width: nameBoxWidth - 20
        });

      // Course completion statement
      doc.fontSize(16)
        .fillColor(deepNavy)
        .font('Helvetica')
        .text("has successfully completed the course", 50, 365, {
          align: "center",
          width: pageWidth - 100
        });

      // Course name with emphasis
      doc.fontSize(24)
        .fillColor(accentGold)
        .font('Helvetica-Bold')
        .text(courseName, 50, 390, {
          align: "center",
          width: pageWidth - 100
        });

      // Achievement description
      doc.fontSize(14)
        .fillColor(darkGray)
        .font('Helvetica')
        .text("demonstrating competency and dedication in the subject matter", 50, 425, {
          align: "center",
          width: pageWidth - 100
        });

      // Date and certificate info section
      const infoY = 455;
      doc.fontSize(13)
        .fillColor(deepNavy)
        .font('Helvetica-Bold');

      if (courseEndDate) {
        doc.text(`Course Completion: ${courseEndDate}`, 50, infoY, {
          align: "center",
          width: pageWidth - 100
        });
        doc.text(`Certificate Issued: ${completionDate}`, 50, infoY + 18, {
          align: "center",
          width: pageWidth - 100
        });
      } else {
        doc.text(`Date of Completion: ${completionDate}`, 50, infoY + 9, {
          align: "center",
          width: pageWidth - 100
        });
      }

      // Certificate authentication section
      const authY = 510;

      // Left side - Digital signature placeholder
      doc.fontSize(11)
        .fillColor(darkGray)
        .font('Helvetica-Bold')
        .text("Authorized Signature", 80, authY);

      doc.moveTo(80, authY + 20)
        .lineTo(220, authY + 20)
        .lineWidth(1)
        .stroke(darkGray);

      doc.fontSize(10)
        .fillColor(darkGray)
        .font('Helvetica')
        .text("Academic Director", 80, authY + 25);

      // Right side - Certificate seal/emblem placeholder
      doc.fontSize(11)
        .fillColor(darkGray)
        .font('Helvetica-Bold')
        .text("Official Seal", pageWidth - 220, authY);

      // Decorative seal circle
      doc.circle(pageWidth - 150, authY + 15, 20)
        .lineWidth(2)
        .stroke(primaryBlue);

      doc.fontSize(8)
        .fillColor(primaryBlue)
        .font('Helvetica-Bold')
        .text("LMS", pageWidth - 158, authY + 10);

      doc.fontSize(6)
        .fillColor(primaryBlue)
        .font('Helvetica')
        .text("CERTIFIED", pageWidth - 168, authY + 22);

      // Certificate code and verification
      doc.fontSize(10)
        .fillColor('#64748b')
        .font('Helvetica')
        .text(`Certificate ID: ${certificateCode}`, 50, pageHeight - 80, {
          align: "center",
          width: pageWidth - 100
        });

      // Footer with verification info
      doc.fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text("This certificate is digitally generated and can be verified online", 50, pageHeight - 60, {
          align: "center",
          width: pageWidth - 100
        });

      doc.text(`Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 50, pageHeight - 45, {
        align: "center",
        width: pageWidth - 100
      });

      // Watermark/background pattern (subtle)
      doc.save();
      doc.opacity(0.05);
      doc.fontSize(100)
        .fillColor(primaryBlue)
        .font('Helvetica-Bold')
        .text("CERTIFIED", centerX - 200, pageHeight / 2 - 60, {
          rotate: -15
        });
      doc.restore();

      doc.end();

      stream.on("finish", () => resolve());
      stream.on("error", (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}
async function generateCertificateForProject(studentId, courseId) {
  try {
    const [existingCert] = await db.execute(
      "SELECT id FROM certificates WHERE student_id = ? AND course_id = ?",
      [studentId, courseId]
    );

    if (existingCert.length > 0) {
      return;
    }

    const [details] = await db.execute(
      `
      SELECT u.name as student_name, c.title as course_name, c.end_date as course_end_date
      FROM users u, courses c
      WHERE u.id = ? AND c.id = ?
    `,
      [studentId, courseId]
    );

    if (details.length === 0) return;

    const { student_name, course_name, course_end_date } = details[0];
    const completionDate = new Date().toLocaleDateString();
    const courseEndDateFormatted = course_end_date ? new Date(course_end_date).toLocaleDateString() : null;
    const certificateFileName = `certificate_${studentId}_${courseId}_${Date.now()}.pdf`;
    const certificatePath = path.join("certificates", certificateFileName);
    const certificateCode = `CERT-${Date.now()}-${studentId}-${courseId}`;

    await generateCertificate(
      student_name,
      course_name,
      completionDate,
      courseEndDateFormatted,
      certificatePath,
      certificateCode
    );

    await db.execute(
      "INSERT INTO certificates (student_id, course_id, certificate_path, certificate_code) VALUES (?, ?, ?, ?)",
      [studentId, courseId, certificateFileName, certificateCode]
    );

    await db.execute(
      "UPDATE course_enrollments SET completed_at = NOW() WHERE student_id = ? AND course_id = ?",
      [studentId, courseId]
    );
  } catch (error) {
    console.error("Certificate generation error:", error);
  }
}

// Get certificates
app.get(
  "/api/certificates",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const [certificates] = await db.execute(
        `
      SELECT c.*, co.title as course_name, co.description
      FROM certificates c
      JOIN courses co ON c.course_id = co.id
      WHERE c.student_id = ?
      ORDER BY c.issued_at DESC
    `,
        [req.user.userId]
      );

      res.json(certificates);
    } catch (error) {
      console.error("Certificates fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Profile management
app.get(
  "/api/profile",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const [user] = await db.execute(
        "SELECT id, name, email, mobile, role, status, created_at FROM users WHERE id = ?", // Add mobile here
        [req.user.userId]
      );

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user[0]);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.put(
  "/api/profile",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { name, email } = req.body;

      const [existingUser] = await db.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, req.user.userId]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already taken" });
      }

      await db.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [
        name,
        email,
        req.user.userId,
      ]);

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Change password
app.put(
  "/api/change-password",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const [user] = await db.execute(
        "SELECT password FROM users WHERE id = ?",
        [req.user.userId]
      );

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user[0].password
      );
      if (!isValidPassword) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      await db.execute("UPDATE users SET password = ? WHERE id = ?", [
        hashedNewPassword,
        req.user.userId,
      ]);

      // Mark password as changed if it was temporary
      await db.execute(
        "UPDATE user_credentials SET is_password_changed = TRUE WHERE user_id = ?",
        [req.user.userId]
      );

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Dashboard stats
// Complete Dashboard stats route - Replace the existing one
app.get(
  "/api/dashboard/stats",
  adminTokenRefresh,
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      let stats = {};

      if (req.user.role === "admin") {
        // Admin statistics - only for their tenant
        const [teacherCount] = await db.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = "teacher" AND admin_id = ?',
          [req.user.userId]
        );

        const [studentCount] = await db.execute(
          `SELECT COUNT(DISTINCT u.id) as count 
     FROM users u 
     WHERE u.role = "student" 
     AND u.id IN (
       SELECT DISTINCT ce.student_id 
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       JOIN users t ON c.teacher_id = t.id
       WHERE t.admin_id = ?
     )`,
          [req.user.userId]
        );

        const [courseCount] = await db.execute(
          `SELECT COUNT(*) as count 
     FROM courses c
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        const [certificateCount] = await db.execute(
          `SELECT COUNT(*) as count 
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Assignment statistics for this admin's tenant
        const [assignmentStats] = await db.execute(
          `SELECT 
      COUNT(*) as total_assignments,
      COUNT(CASE WHEN a.end_date < NOW() THEN 1 END) as past_due,
      COUNT(DISTINCT ass.assignment_id) as assignments_with_submissions,
      COUNT(CASE WHEN ass.status = 'submitted' THEN 1 END) as pending_submissions
     FROM assignments a
     LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id
     JOIN courses c ON a.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Video statistics for this admin's tenant
        const [videoStats] = await db.execute(
          `SELECT 
      COUNT(*) as total_videos,
      COUNT(CASE WHEN cv.video_type = 'file' THEN 1 END) as uploaded_videos,
      COUNT(CASE WHEN cv.video_type = 'youtube' THEN 1 END) as youtube_videos
     FROM course_videos cv
     JOIN courses c ON cv.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Query statistics for this admin's tenant
        const [queryStats] = await db.execute(
          `SELECT 
      COUNT(*) as total_queries,
      COUNT(CASE WHEN cq.status = 'pending' THEN 1 END) as pending_queries,
      COUNT(CASE WHEN cq.status = 'answered' THEN 1 END) as answered_queries,
      COUNT(CASE WHEN cq.priority = 'high' AND cq.status = 'pending' THEN 1 END) as urgent_queries
     FROM course_queries cq
     JOIN courses c ON cq.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Blog statistics for this admin's tenant
        const [blogStats] = await db.execute(
          "SELECT COUNT(*) as total_blogs FROM blogs WHERE admin_id = ?",
          [req.user.userId]
        );

        // Receipt statistics for this admin's tenant
        const [receiptStats] = await db.execute(
          `SELECT 
      COUNT(*) as total_receipts,
      SUM(pr.total_amount) as total_revenue
     FROM payment_receipts pr
     JOIN courses c ON pr.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Project statistics for this admin's tenant
        const [projectStats] = await db.execute(
          `SELECT 
      COUNT(*) as total_projects,
      COUNT(CASE WHEN p.status = 'submitted' THEN 1 END) as pending_projects,
      COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_projects,
      COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_projects
     FROM projects p
     JOIN courses c ON p.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Session statistics for this admin's tenant
        const [sessionStats] = await db.execute(
          `SELECT 
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN ds.session_date >= CURDATE() THEN 1 END) as upcoming_sessions,
      COUNT(CASE WHEN ds.session_date < CURDATE() THEN 1 END) as past_sessions
     FROM daily_sessions ds
     JOIN courses c ON ds.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Attendance statistics for this admin's tenant
        const [attendanceStats] = await db.execute(
          `SELECT 
      COUNT(*) as total_attendance_records,
      COUNT(CASE WHEN sa.status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN sa.status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN sa.status = 'late' THEN 1 END) as late_count
     FROM student_attendance sa
     JOIN courses c ON sa.course_id = c.id
     JOIN users t ON c.teacher_id = t.id
     WHERE t.admin_id = ?`,
          [req.user.userId]
        );

        // Recent activity statistics for this admin's tenant
        const [recentStats] = await db.execute(
          `SELECT 
      COUNT(CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_teachers_month,
      COUNT(CASE WHEN ce.enrolled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_enrollments_month,
      COUNT(CASE WHEN cert.issued_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_certificates_month
     FROM users u
     LEFT JOIN course_enrollments ce ON u.id = ce.student_id
     LEFT JOIN certificates cert ON u.id = cert.student_id
     WHERE u.role = 'teacher' AND u.admin_id = ?`,
          [req.user.userId]
        );

        stats = {
          teachers: teacherCount[0].count,
          students: studentCount[0].count,
          courses: courseCount[0].count,
          certificates: certificateCount[0].count,
          assignments: assignmentStats[0].total_assignments || 0,
          pendingAssignments: assignmentStats[0].pending_submissions || 0,
          pastDueAssignments: assignmentStats[0].past_due || 0,
          assignmentsWithSubmissions: assignmentStats[0].assignments_with_submissions || 0,
          videos: videoStats[0].total_videos || 0,
          uploadedVideos: videoStats[0].uploaded_videos || 0,
          youtubeVideos: videoStats[0].youtube_videos || 0,
          totalQueries: queryStats[0].total_queries || 0,
          pendingQueries: queryStats[0].pending_queries || 0,
          answeredQueries: queryStats[0].answered_queries || 0,
          urgentQueries: queryStats[0].urgent_queries || 0,
          totalBlogs: blogStats[0].total_blogs || 0,
          totalReceipts: receiptStats[0].total_receipts || 0,
          totalRevenue: parseFloat(receiptStats[0].total_revenue || 0).toFixed(2),
          totalProjects: projectStats[0].total_projects || 0,
          pendingProjects: projectStats[0].pending_projects || 0,
          approvedProjects: projectStats[0].approved_projects || 0,
          rejectedProjects: projectStats[0].rejected_projects || 0,
          totalSessions: sessionStats[0].total_sessions || 0,
          upcomingSessions: sessionStats[0].upcoming_sessions || 0,
          pastSessions: sessionStats[0].past_sessions || 0,
          totalAttendanceRecords: attendanceStats[0].total_attendance_records || 0,
          presentCount: attendanceStats[0].present_count || 0,
          absentCount: attendanceStats[0].absent_count || 0,
          lateCount: attendanceStats[0].late_count || 0,
          attendanceRate: attendanceStats[0].total_attendance_records > 0
            ? ((attendanceStats[0].present_count / attendanceStats[0].total_attendance_records) * 100).toFixed(1)
            : 0,
          newTeachersThisMonth: recentStats[0].new_teachers_month || 0,
          newEnrollmentsThisMonth: recentStats[0].new_enrollments_month || 0,
          newCertificatesThisMonth: recentStats[0].new_certificates_month || 0,
        };
      } else if (req.user.role === "teacher") {
        // Teacher statistics
        const userId = req.user.userId || req.user.id;

        const [courseStats] = await db.execute(
          `SELECT COUNT(*) as count FROM courses 
           WHERE teacher_id = ? OR id IN (
             SELECT course_id FROM course_teachers WHERE teacher_id = ?
           )`,
          [userId, userId]
        );

        const [studentStats] = await db.execute(
          `SELECT COUNT(DISTINCT ce.student_id) as count 
           FROM course_enrollments ce
           JOIN courses c ON ce.course_id = c.id
           LEFT JOIN course_teachers ct ON c.id = ct.course_id
           WHERE c.teacher_id = ? OR ct.teacher_id = ?`,
          [userId, userId]
        );

        const [assignmentStats] = await db.execute(
          `SELECT 
            COUNT(DISTINCT a.id) as total_assignments,
            COUNT(CASE WHEN ass.status = 'submitted' THEN 1 END) as pending_submissions
           FROM assignments a
           LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id
           JOIN courses c ON a.course_id = c.id
           LEFT JOIN course_teachers ct ON c.id = ct.course_id
           WHERE c.teacher_id = ? OR ct.teacher_id = ?`,
          [userId, userId]
        );

        const [videoStats] = await db.execute(
          `SELECT COUNT(*) as count 
           FROM course_videos cv
           JOIN courses c ON cv.course_id = c.id
           LEFT JOIN course_teachers ct ON c.id = ct.course_id
           WHERE c.teacher_id = ? OR ct.teacher_id = ?`,
          [userId, userId]
        );

        stats = {
          courses: courseStats[0].count,
          students: studentStats[0].count,
          assignments: assignmentStats[0].total_assignments || 0,
          pendingAssignments: assignmentStats[0].pending_submissions || 0,
          videos: videoStats[0].count || 0,
        };

      } else if (req.user.role === "student") {
        // Student statistics
        const userId = req.user.userId || req.user.id;

        const [enrollmentStats] = await db.execute(
          `SELECT 
            COUNT(*) as enrolled_courses,
            COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_courses
           FROM course_enrollments WHERE student_id = ?`,
          [userId]
        );

        const [certificateStats] = await db.execute(
          "SELECT COUNT(*) as count FROM certificates WHERE student_id = ?",
          [userId]
        );

        const [projectStats] = await db.execute(
          "SELECT COUNT(*) as count FROM projects WHERE student_id = ?",
          [userId]
        );

        const [videoStats] = await db.execute(
          `SELECT COUNT(DISTINCT vwp.video_id) as count 
           FROM video_watch_progress vwp
           WHERE vwp.student_id = ? AND vwp.watched_seconds > 0`,
          [userId]
        );

        stats = {
          enrolledCourses: enrollmentStats[0].enrolled_courses || 0,
          completedCourses: enrollmentStats[0].completed_courses || 0,
          certificates: certificateStats[0].count || 0,
          projects: projectStats[0].count || 0,
          watchedVideos: videoStats[0].count || 0,
        };
      }

      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Add these routes to your server.js file

// Google AdSense Configuration Route
app.get("/api/adsense-config", authenticateToken, checkUserStatus, async (req, res) => {
  try {
    let adminId = null;

    // Determine the admin ID based on user role
    if (req.user.role === "admin") {
      adminId = req.user.userId;
    } else if (req.user.role === "teacher") {
      // Get teacher's admin_id
      const [teacherInfo] = await db.execute(
        "SELECT admin_id FROM users WHERE id = ? AND role = 'teacher'",
        [req.user.userId]
      );
      adminId = teacherInfo[0]?.admin_id;
    } else if (req.user.role === "student") {
      // For students, find their admin through enrolled courses
      const [adminInfo] = await db.execute(`
        SELECT DISTINCT c.admin_id 
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        WHERE ce.student_id = ? AND c.admin_id IS NOT NULL
        LIMIT 1
      `, [req.user.userId]);
      adminId = adminInfo[0]?.admin_id;
    }

    if (!adminId) {
      // Return default disabled config if no admin found
      return res.json({
        enabled: false,
        testMode: true,
        clientId: null
      });
    }

    // Get settings from database
    const [settings] = await db.execute(
      "SELECT * FROM adsense_settings WHERE admin_id = ?",
      [adminId]
    );

    if (settings.length === 0) {
      // Return default settings if none exist
      return res.json({
        enabled: false,
        testMode: true,
        clientId: process.env.GOOGLE_ADSENSE_CLIENT_ID || null
      });
    }

    const config = settings[0];
    res.json({
      enabled: Boolean(config.enabled),
      testMode: Boolean(config.test_mode),
      clientId: config.client_id || process.env.GOOGLE_ADSENSE_CLIENT_ID || null
    });

  } catch (error) {
    console.error("AdSense config error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin route to toggle ads
app.put(
  "/api/admin/adsense-settings",
  authenticateToken,
  requireRole(["admin"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { enabled, testMode, clientId } = req.body;
      const adminId = req.user.userId;

      // Validate input
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "Enabled must be a boolean value" });
      }

      if (typeof testMode !== 'boolean') {
        return res.status(400).json({ message: "Test mode must be a boolean value" });
      }

      if (clientId && !clientId.startsWith('ca-pub-')) {
        return res.status(400).json({ message: "Invalid client ID format" });
      }

      // Insert or update settings
      await db.execute(`
        INSERT INTO adsense_settings (admin_id, enabled, test_mode, client_id)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          enabled = VALUES(enabled),
          test_mode = VALUES(test_mode),
          client_id = VALUES(client_id),
          updated_at = NOW()
      `, [adminId, enabled, testMode, clientId || null]);

      // Log the change for audit purposes
      console.log(`Admin ${adminId} updated AdSense settings: enabled=${enabled}, testMode=${testMode}, clientId=${clientId ? 'set' : 'not set'}`);

      res.json({
        message: "AdSense settings updated successfully",
        settings: {
          enabled,
          testMode,
          clientId: clientId || null
        }
      });

    } catch (error) {
      console.error("Update AdSense settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/admin/adsense-settings",
  authenticateToken,
  requireRole(["admin"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const adminId = req.user.userId;

      const [settings] = await db.execute(
        "SELECT * FROM adsense_settings WHERE admin_id = ?",
        [adminId]
      );

      if (settings.length === 0) {
        // Return default settings
        return res.json({
          enabled: false,
          testMode: true,
          clientId: null,
          created_at: null,
          updated_at: null
        });
      }

      const config = settings[0];
      res.json({
        enabled: Boolean(config.enabled),
        testMode: Boolean(config.test_mode),
        clientId: config.client_id,
        created_at: config.created_at,
        updated_at: config.updated_at
      });

    } catch (error) {
      console.error("Get AdSense settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
app.delete(
  "/api/admin/adsense-settings",
  authenticateToken,
  requireRole(["admin"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const adminId = req.user.userId;

      await db.execute(
        "DELETE FROM adsense_settings WHERE admin_id = ?",
        [adminId]
      );

      console.log(`Admin ${adminId} reset AdSense settings to default`);

      res.json({
        message: "AdSense settings reset to default",
        settings: {
          enabled: false,
          testMode: true,
          clientId: null
        }
      });

    } catch (error) {
      console.error("Reset AdSense settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
app.get(
  "/api/admin/adsense-stats",
  authenticateToken,
  requireRole(["admin"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const adminId = req.user.userId;

      // Get current settings
      const [settings] = await db.execute(
        "SELECT * FROM adsense_settings WHERE admin_id = ?",
        [adminId]
      );

      // Count users who would see ads
      const [userStats] = await db.execute(`
        SELECT 
          COUNT(CASE WHEN u.role = 'teacher' AND u.admin_id = ? THEN 1 END) as teachers,
          COUNT(CASE WHEN u.role = 'student' AND u.id IN (
            SELECT DISTINCT ce.student_id 
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE c.admin_id = ?
          ) THEN 1 END) as students
        FROM users u
      `, [adminId, adminId]);

      // Count blog posts that could show ads
      const [blogStats] = await db.execute(
        "SELECT COUNT(*) as blog_count FROM blogs WHERE admin_id = ?",
        [adminId]
      );

      // Count courses for potential ad placements
      const [courseStats] = await db.execute(`
        SELECT COUNT(*) as course_count 
        FROM courses c
        JOIN users t ON c.teacher_id = t.id
        WHERE t.admin_id = ?
      `, [adminId]);

      const config = settings[0] || { enabled: false, test_mode: true };
      const stats = userStats[0] || { teachers: 0, students: 0 };
      const blogs = blogStats[0] || { blog_count: 0 };
      const courses = courseStats[0] || { course_count: 0 };

      // Calculate potential ad placements
      const estimatedAdPlacements = 
        (blogs.blog_count * 2) + // 2 ads per blog post
        (courses.course_count * 3) + // 3 ads per course page
        (stats.students * 1.5); // Average course enrollments per student

      res.json({
        settings: {
          enabled: Boolean(config.enabled),
          testMode: Boolean(config.test_mode),
          clientId: config.client_id ? 'configured' : 'not configured',
          lastUpdated: config.updated_at
        },
        potentialAudience: {
          teachers: stats.teachers,
          students: stats.students,
          total: stats.teachers + stats.students
        },
        content: {
          blogPosts: blogs.blog_count,
          courses: courses.course_count,
          estimatedAdPlacements: Math.ceil(estimatedAdPlacements)
        },
        revenue: {
          estimatedMonthlyViews: Math.ceil((stats.teachers + stats.students) * 150), // Estimate based on active users
          potentialRpm: config.test_mode ? '$0.50 - $2.00' : '$1.00 - $5.00'
        },
        recommendations: [
          config.enabled ? 
            (config.test_mode ? "Switch to live mode when ready for real revenue" : "Monitor performance in AdSense dashboard") :
            "Enable AdSense to start monetizing your content",
          `You have ${stats.teachers + stats.students} potential ad viewers`,
          blogs.blog_count > 0 ? `${blogs.blog_count} blog posts ready for ads` : "Create blog content to increase ad revenue",
          courses.course_count > 0 ? `${courses.course_count} courses can display ads` : "Add more courses to increase ad inventory"
        ],
        status: config.enabled ? 'active' : 'inactive'
      });

    } catch (error) {
      console.error("Get AdSense stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/api/admin/adsense-test",
  authenticateToken,
  requireRole(["admin"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const adminId = req.user.userId;

      // Get current settings
      const [settings] = await db.execute(
        "SELECT * FROM adsense_settings WHERE admin_id = ?",
        [adminId]
      );

      if (settings.length === 0 || !settings[0].enabled) {
        return res.status(400).json({
          message: "AdSense is not enabled. Please enable it first.",
          success: false
        });
      }

      const config = settings[0];

      // Validate client ID format
      if (!config.client_id || !config.client_id.startsWith('ca-pub-')) {
        return res.status(400).json({
          message: "Invalid or missing AdSense client ID. Please configure it properly.",
          success: false
        });
      }

      // Log the test
      console.log(`Admin ${adminId} tested AdSense configuration`);

      res.json({
        message: "AdSense configuration appears valid",
        success: true,
        config: {
          enabled: true,
          testMode: Boolean(config.test_mode),
          clientId: config.client_id.substring(0, 15) + '...', // Partial ID for security
          configured: true
        },
        testResults: {
          clientIdFormat: config.client_id.startsWith('ca-pub-') ? 'Valid' : 'Invalid',
          settingsConfigured: true,
          databaseConnection: 'Working',
          lastTested: new Date().toISOString()
        },
        recommendations: [
          config.test_mode ? "Currently in test mode - switch to live mode when ready" : "Live mode active",
          "Ensure your domain is added to your AdSense account",
          "Allow 24-48 hours for ads to start appearing consistently",
          "Monitor ad performance in your AdSense dashboard",
          "Test ads on different pages to ensure proper loading"
        ]
      });

    } catch (error) {
      console.error("Test AdSense configuration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Course Query Management Routes

// Submit query (Student)
app.post(
  "/api/courses/:courseId/queries",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  upload.array("attachments", 3), // Allow up to 3 attachments
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, question, priority, category, isAnonymous } = req.body;

      if (!title || !title.trim() || !question || !question.trim()) {
        return res.status(400).json({ message: "Title and question are required" });
      }

      // Check if student is enrolled
      const [enrollmentCheck] = await db.execute(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, req.user.userId]
      );

      if (enrollmentCheck.length === 0) {
        return res.status(403).json({ message: "Not enrolled in this course" });
      }

      const [result] = await db.execute(
        `INSERT INTO course_queries 
         (course_id, student_id, title, question, priority, category, is_anonymous) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          courseId,
          req.user.userId,
          title.trim(),
          question.trim(),
          priority || 'medium',
          category || 'general',
          isAnonymous === 'true'
        ]
      );

      const queryId = result.insertId;

      // Handle file attachments
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await db.execute(
            `INSERT INTO query_attachments 
             (query_id, filename, original_name, file_size, mime_type, uploaded_by) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [queryId, file.filename, file.originalname, file.size, file.mimetype, req.user.userId]
          );
        }
      }

      // Auto-follow the query for the student
      await db.execute(
        "INSERT INTO query_followers (query_id, user_id) VALUES (?, ?)",
        [queryId, req.user.userId]
      );

      res.status(201).json({
        message: "Query submitted successfully",
        queryId: queryId,
      });
    } catch (error) {
      console.error("Submit query error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get queries for a course
app.get(
  "/api/courses/:courseId/queries",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const {
        status = 'all',
        category = 'all',
        priority = 'all',
        sortBy = 'recent',
        search = '',
        page = 1,
        limit = 10
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      let baseQuery = `
        FROM course_queries cq
        JOIN users s ON cq.student_id = s.id
        LEFT JOIN users t ON cq.teacher_id = t.id
        LEFT JOIN (
          SELECT query_id, COUNT(*) as attachment_count 
          FROM query_attachments 
          GROUP BY query_id
        ) att ON cq.id = att.query_id
        WHERE cq.course_id = ?
      `;

      let params = [courseId];
      let whereConditions = [];

      if (req.user.role === "student") {
        // Students can see all queries or their own private ones
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );

        if (enrollmentCheck.length === 0) {
          return res.status(403).json({ message: "Not enrolled in this course" });
        }

        whereConditions.push("(cq.is_anonymous = FALSE OR cq.student_id = ?)");
        params.push(req.user.userId);
      } else if (req.user.role === "teacher") {
        const hasAccess = await checkCourseAccess(courseId, req.user.userId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to view queries" });
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      // Add filters
      if (status !== 'all') {
        whereConditions.push("cq.status = ?");
        params.push(status);
      }

      if (category !== 'all') {
        whereConditions.push("cq.category = ?");
        params.push(category);
      }

      if (priority !== 'all') {
        whereConditions.push("cq.priority = ?");
        params.push(priority);
      }

      if (search) {
        whereConditions.push("(cq.title LIKE ? OR cq.question LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
      }

      if (whereConditions.length > 0) {
        baseQuery += " AND " + whereConditions.join(" AND ");
      }

      // Sorting
      let orderBy = "ORDER BY ";
      switch (sortBy) {
        case 'oldest':
          orderBy += "cq.asked_at ASC";
          break;
        case 'priority':
          orderBy += "FIELD(cq.priority, 'high', 'medium', 'low'), cq.asked_at DESC";
          break;
        case 'popular':
          orderBy += "cq.helpful_votes DESC, cq.views DESC";
          break;
        case 'unanswered':
          orderBy += "cq.status = 'pending' DESC, cq.asked_at DESC";
          break;
        default: // recent
          orderBy += "cq.asked_at DESC";
      }

      const selectQuery = `
        SELECT cq.*, 
               CASE 
                 WHEN cq.is_anonymous = TRUE AND cq.student_id != ? THEN 'Anonymous Student'
                 ELSE s.name 
               END as student_name,
               CASE 
                 WHEN cq.is_anonymous = TRUE AND cq.student_id != ? THEN NULL
                 ELSE s.email 
               END as student_email,
               t.name as teacher_name,
               COALESCE(att.attachment_count, 0) as attachment_count
        ${baseQuery} 
        ${orderBy}
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

      // Add user ID for anonymous check
      const queryParams = [req.user.userId, req.user.userId, ...params];
      const countParams = [...params];

      const [queries] = await db.execute(selectQuery, queryParams);
      const [totalCount] = await db.execute(countQuery, countParams);

      // Get attachments for each query
      for (let query of queries) {
        const [attachments] = await db.execute(
          `SELECT id, original_name, filename, file_size, mime_type, uploaded_at 
           FROM query_attachments 
           WHERE query_id = ?`,
          [query.id]
        );
        query.attachments = attachments;

        // Check if current user is following this query
        if (req.user.role === "student") {
          const [isFollowing] = await db.execute(
            "SELECT id FROM query_followers WHERE query_id = ? AND user_id = ?",
            [query.id, req.user.userId]
          );
          query.isFollowing = isFollowing.length > 0;
        }
      }

      res.json({
        queries,
        pagination: {
          total: totalCount[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount[0].total / limitNum)
        }
      });
    } catch (error) {
      console.error("Get queries error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Answer query (Teacher)
app.put(
  "/api/queries/:queryId/answer",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { queryId } = req.params;
      const { answer, closeQuery } = req.body;

      if (!answer || !answer.trim()) {
        return res.status(400).json({ message: "Answer is required" });
      }

      // Check if teacher has access to the course
      const [queryCheck] = await db.execute(
        `SELECT cq.*, c.teacher_id 
         FROM course_queries cq
         JOIN courses c ON cq.course_id = c.id
         LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
         WHERE cq.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
        [req.user.userId, queryId, req.user.userId, req.user.userId]
      );

      if (queryCheck.length === 0) {
        return res.status(404).json({ message: "Query not found or not authorized" });
      }

      const newStatus = closeQuery ? 'closed' : 'answered';

      await db.execute(
        `UPDATE course_queries 
         SET answer = ?, teacher_id = ?, status = ?, answered_at = NOW() 
         WHERE id = ?`,
        [answer.trim(), req.user.userId, newStatus, queryId]
      );

      res.json({
        message: closeQuery ? "Query answered and closed successfully" : "Query answered successfully"
      });
    } catch (error) {
      console.error("Answer query error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.put(
  "/api/queries/:queryId/status",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { queryId } = req.params;
      const { status } = req.body;

      if (!['pending', 'answered', 'closed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      let authorized = false;

      if (req.user.role === "student") {
        // Students can only change status of their own queries
        const [queryCheck] = await db.execute(
          "SELECT id FROM course_queries WHERE id = ? AND student_id = ?",
          [queryId, req.user.userId]
        );
        authorized = queryCheck.length > 0;
      } else if (req.user.role === "teacher") {
        // Teachers can change status of queries in their courses
        const [queryCheck] = await db.execute(
          `SELECT cq.id 
           FROM course_queries cq
           JOIN courses c ON cq.course_id = c.id
           LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
           WHERE cq.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
          [req.user.userId, queryId, req.user.userId, req.user.userId]
        );
        authorized = queryCheck.length > 0;
      }

      if (!authorized) {
        return res.status(404).json({ message: "Query not found or not authorized" });
      }

      await db.execute(
        "UPDATE course_queries SET status = ? WHERE id = ?",
        [status, queryId]
      );

      res.json({ message: "Query status updated successfully" });
    } catch (error) {
      console.error("Update query status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/api/queries/:queryId/helpful",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { queryId } = req.params;

      // Check if student has access to the query
      const [queryCheck] = await db.execute(
        `SELECT cq.course_id 
         FROM course_queries cq
         JOIN course_enrollments ce ON cq.course_id = ce.course_id
         WHERE cq.id = ? AND ce.student_id = ?`,
        [queryId, req.user.userId]
      );

      if (queryCheck.length === 0) {
        return res.status(404).json({ message: "Query not found or not accessible" });
      }

      await db.execute(
        "UPDATE course_queries SET helpful_votes = helpful_votes + 1 WHERE id = ?",
        [queryId]
      );

      res.json({ message: "Marked as helpful" });
    } catch (error) {
      console.error("Mark helpful error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Follow/Unfollow query
app.post(
  "/api/queries/:queryId/follow",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { queryId } = req.params;

      // Check if student has access to the query
      const [queryCheck] = await db.execute(
        `SELECT cq.course_id 
         FROM course_queries cq
         JOIN course_enrollments ce ON cq.course_id = ce.course_id
         WHERE cq.id = ? AND ce.student_id = ?`,
        [queryId, req.user.userId]
      );

      if (queryCheck.length === 0) {
        return res.status(404).json({ message: "Query not found or not accessible" });
      }

      // Check if already following
      const [existing] = await db.execute(
        "SELECT id FROM query_followers WHERE query_id = ? AND user_id = ?",
        [queryId, req.user.userId]
      );

      if (existing.length > 0) {
        // Unfollow
        await db.execute(
          "DELETE FROM query_followers WHERE query_id = ? AND user_id = ?",
          [queryId, req.user.userId]
        );
        res.json({ message: "Unfollowed query", following: false });
      } else {
        // Follow
        await db.execute(
          "INSERT INTO query_followers (query_id, user_id) VALUES (?, ?)",
          [queryId, req.user.userId]
        );
        res.json({ message: "Following query", following: true });
      }
    } catch (error) {
      console.error("Follow query error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/courses/:courseId/query-stats",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [stats] = await db.execute(
        `SELECT 
          COUNT(*) as total_queries,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_queries,
          COUNT(CASE WHEN status = 'answered' THEN 1 END) as answered_queries,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_queries,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
          AVG(CASE WHEN answered_at IS NOT NULL 
              THEN TIMESTAMPDIFF(HOUR, asked_at, answered_at) 
              END) as avg_response_time_hours,
          COALESCE(SUM(views), 0) as total_views,
          COALESCE(SUM(helpful_votes), 0) as total_helpful_votes
         FROM course_queries 
         WHERE course_id = ?`,
        [courseId]
      );

      const [categoryStats] = await db.execute(
        `SELECT category, COUNT(*) as count 
         FROM course_queries 
         WHERE course_id = ? 
         GROUP BY category
         ORDER BY count DESC`,
        [courseId]
      );

      res.json({
        ...stats[0],
        categoryBreakdown: categoryStats
      });
    } catch (error) {
      console.error("Get query stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/queries/:queryId",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { queryId } = req.params;

      const [query] = await db.execute(
        `SELECT cq.*, 
                CASE 
                  WHEN cq.is_anonymous = TRUE AND cq.student_id != ? THEN 'Anonymous Student'
                  ELSE s.name 
                END as student_name,
                CASE 
                  WHEN cq.is_anonymous = TRUE AND cq.student_id != ? THEN NULL
                  ELSE s.email 
                END as student_email,
                t.name as teacher_name,
                c.title as course_title
         FROM course_queries cq
         JOIN users s ON cq.student_id = s.id
         LEFT JOIN users t ON cq.teacher_id = t.id
         JOIN courses c ON cq.course_id = c.id
         WHERE cq.id = ?`,
        [req.user.userId, req.user.userId, queryId]
      );

      if (query.length === 0) {
        return res.status(404).json({ message: "Query not found" });
      }

      const queryData = query[0];

      // Check access permissions
      if (req.user.role === "student") {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [queryData.course_id, req.user.userId]
        );

        if (enrollmentCheck.length === 0) {
          return res.status(403).json({ message: "Not enrolled in this course" });
        }

        if (queryData.is_anonymous && queryData.student_id !== req.user.userId) {
          // Can view anonymous queries but not identify the student
        }
      } else if (req.user.role === "teacher") {
        const hasAccess = await checkCourseAccess(queryData.course_id, req.user.userId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to view this query" });
        }
      }

      // Get attachments
      const [attachments] = await db.execute(
        `SELECT id, original_name, filename, file_size, mime_type, uploaded_at 
         FROM query_attachments 
         WHERE query_id = ?`,
        [queryId]
      );
      queryData.attachments = attachments;

      // Increment view count (only once per user per session)
      await db.execute(
        "UPDATE course_queries SET views = views + 1 WHERE id = ?",
        [queryId]
      );

      res.json(queryData);
    } catch (error) {
      console.error("Get query details error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete query (Student can delete their own, Teacher can delete any in their course)
app.delete(
  "/api/queries/:queryId",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { queryId } = req.params;

      if (req.user.role === "student") {
        // Students can only delete their own queries
        const [queryCheck] = await db.execute(
          "SELECT id FROM course_queries WHERE id = ? AND student_id = ?",
          [queryId, req.user.userId]
        );

        if (queryCheck.length === 0) {
          return res.status(404).json({ message: "Query not found or not authorized" });
        }
      } else if (req.user.role === "teacher") {
        // Teachers can delete queries from their courses
        const [queryCheck] = await db.execute(
          `SELECT cq.id 
           FROM course_queries cq
           JOIN courses c ON cq.course_id = c.id
           LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
           WHERE cq.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
          [req.user.userId, queryId, req.user.userId, req.user.userId]
        );

        if (queryCheck.length === 0) {
          return res.status(404).json({ message: "Query not found or not authorized" });
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      await db.execute("DELETE FROM course_queries WHERE id = ?", [queryId]);

      res.json({ message: "Query deleted successfully" });
    } catch (error) {
      console.error("Delete query error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Video Management Routes

// Add YouTube video (Teacher only)
app.post(
  "/api/courses/:courseId/videos/youtube",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, description, youtubeUrl, orderIndex } = req.body;

      if (!title || !youtubeUrl) {
        return res.status(400).json({ message: "Title and YouTube URL are required" });
      }

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res.status(404).json({ message: "Course not found or not authorized" });
      }

      // Validate YouTube URL
      const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(youtubeUrl)) {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }

      // Extract video ID for validation
      let videoId = null;
      try {
        const url = new URL(youtubeUrl);
        if (url.hostname === 'youtu.be') {
          videoId = url.pathname.slice(1);
        } else if (url.hostname.includes('youtube.com')) {
          videoId = url.searchParams.get('v');
        }

        if (!videoId) {
          return res.status(400).json({ message: "Could not extract video ID from YouTube URL" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid YouTube URL format" });
      }

      const [result] = await db.execute(
        "INSERT INTO course_videos (course_id, title, description, youtube_url, video_type, order_index, uploaded_by) VALUES (?, ?, ?, ?, 'youtube', ?, ?)",
        [courseId, title, description || null, youtubeUrl, orderIndex || 0, req.user.userId]
      );

      res.status(201).json({
        message: "YouTube video added successfully",
        videoId: result.insertId,
      });
    } catch (error) {
      console.error("YouTube video add error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
// Upload video (Teacher only)
app.post(
  "/api/courses/:courseId/videos",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  uploadVideo.single("videoFile"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, description, orderIndex } = req.body;
      const videoFile = req.file ? req.file.filename : null;

      if (!title || !videoFile) {
        return res.status(400).json({ message: "Title and video file are required" });
      }

      const hasAccess = await checkCourseAccess(courseId, req.user.userId);
      if (!hasAccess) {
        return res.status(404).json({ message: "Course not found or not authorized" });
      }

      const [result] = await db.execute(
        "INSERT INTO course_videos (course_id, title, description, video_file, order_index, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
        [courseId, title, description || null, videoFile, orderIndex || 0, req.user.userId]
      );

      res.status(201).json({
        message: "Video uploaded successfully",
        videoId: result.insertId,
      });
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update the existing get videos route to handle both types
app.get(
  "/api/courses/:courseId/videos",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Check access
      let hasAccess = false;
      if (req.user.role === "teacher") {
        hasAccess = await checkCourseAccess(courseId, req.user.userId);
      } else if (req.user.role === "student") {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );
        hasAccess = enrollmentCheck.length > 0;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized to view videos" });
      }

      let query = `
        SELECT cv.*, u.name as uploaded_by_name
        FROM course_videos cv
        JOIN users u ON cv.uploaded_by = u.id
        WHERE cv.course_id = ?
      `;

      if (req.user.role === "student") {
        query += `
          ORDER BY cv.order_index ASC, cv.created_at ASC
        `;
      } else {
        query += `
          ORDER BY cv.order_index ASC, cv.created_at DESC
        `;
      }

      const [videos] = await db.execute(query, [courseId]);

      // For students, add watch progress (only for uploaded videos, not YouTube)
      if (req.user.role === "student") {
        for (let video of videos) {
          if (video.video_type === 'file') {
            const [progress] = await db.execute(
              "SELECT * FROM video_watch_progress WHERE video_id = ? AND student_id = ?",
              [video.id, req.user.userId]
            );
            video.progress = progress[0] || null;
          }
        }
      }

      res.json(videos);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Stream video with authentication
// Video streaming endpoint with enhanced security
app.get(
  "/api/videos/:videoId/stream",
  async (req, res) => {
    try {
      const { videoId } = req.params;

      // Get token from query parameter as fallback for video requests
      let token = null;
      const authHeader = req.headers["authorization"];
      if (authHeader && authHeader.split(" ")[1]) {
        token = authHeader.split(" ")[1];
      } else if (req.query.token) {
        token = req.query.token;
      }

      if (!token) {
        return res.status(401).json({ message: "Access token required" });
      }

      // Verify token
      let user;
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      // Check user status
      const [userCheck] = await db.execute("SELECT status FROM users WHERE id = ?", [
        user.userId,
      ]);

      if (userCheck.length === 0 || userCheck[0].status === "blocked") {
        return res.status(403).json({ message: "Account is blocked or not found" });
      }

      // Get video info and check access
      const [videoCheck] = await db.execute(
        `SELECT cv.*, c.id as course_id 
         FROM course_videos cv
         JOIN courses c ON cv.course_id = c.id
         WHERE cv.id = ?`,
        [videoId]
      );

      if (videoCheck.length === 0) {
        return res.status(404).json({ message: "Video not found" });
      }

      const video = videoCheck[0];

      // Check user access
      let hasAccess = false;
      if (user.role === "teacher") {
        const [accessCheck] = await db.execute(
          `SELECT 1 FROM courses WHERE id = ? AND teacher_id = ?
           UNION
           SELECT 1 FROM course_teachers WHERE course_id = ? AND teacher_id = ?`,
          [video.course_id, user.userId, video.course_id, user.userId]
        );
        hasAccess = accessCheck.length > 0;
      } else if (user.role === "student") {
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [video.course_id, user.userId]
        );
        hasAccess = enrollmentCheck.length > 0;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized to view this video" });
      }

      // Track active sessions per user (security measure)
      const sessionKey = `${user.userId}-${videoId}`;
      const now = Date.now();

      if (!global.activeVideoSessions) {
        global.activeVideoSessions = new Map();
      }

      if (global.activeVideoSessions.has(sessionKey)) {
        const lastAccess = global.activeVideoSessions.get(sessionKey);
        if (now - lastAccess < 2000) { // 2 second cooldown to prevent rapid requests
          return res.status(429).json({ message: "Too many requests" });
        }
      }

      global.activeVideoSessions.set(sessionKey, now);

      // Clean up old sessions periodically
      if (Math.random() < 0.01) {
        for (const [key, time] of global.activeVideoSessions.entries()) {
          if (now - time > 300000) { // 5 minutes old
            global.activeVideoSessions.delete(key);
          }
        }
      }

      // Log video access for security monitoring
      console.log(`Video access: User ${user.userId} (${user.email}) accessing video ${videoId} at ${new Date().toISOString()}`);

      const videoPath = path.join("uploads/videos", video.video_file);

      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ message: "Video file not found" });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Add comprehensive security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Permissions-Policy', 'picture-in-picture=(), fullscreen=(), screen-wake-lock=(), display-capture=()');
      res.setHeader('Content-Security-Policy', "default-src 'self'; media-src 'self'; script-src 'none'");
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      // Prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Add custom headers to identify protected content
      res.setHeader('X-Protected-Content', 'true');
      res.setHeader('X-Video-Owner', video.course_id);

      if (range) {
        // Handle range requests for video seeking
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);

        // Handle stream errors
        file.on('error', (err) => {
          console.error('Video stream error:', err);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });

        file.on('end', () => {
          // Update last access time when stream ends
          global.activeVideoSessions.set(sessionKey, Date.now());
        });

        file.pipe(res);
      } else {
        // Handle full file requests
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
        };

        res.writeHead(200, head);

        const stream = fs.createReadStream(videoPath);

        // Handle stream errors
        stream.on('error', (err) => {
          console.error('Video stream error:', err);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });

        stream.on('end', () => {
          // Update last access time when stream ends
          global.activeVideoSessions.set(sessionKey, Date.now());
        });

        // Handle client disconnect
        req.on('close', () => {
          stream.destroy();
        });

        req.on('aborted', () => {
          stream.destroy();
        });

        stream.pipe(res);
      }

    } catch (error) {
      console.error("Video stream error:", error);

      // Don't expose internal errors to client
      if (!res.headersSent) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  }
);

// Update watch progress (Student only)
app.post(
  "/api/videos/:videoId/progress",
  authenticateToken,
  requireRole(["student"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const { watchedSeconds, totalDuration } = req.body;

      // Check if student has access to the video
      const [videoCheck] = await db.execute(
        `SELECT cv.*, c.id as course_id 
         FROM course_videos cv
         JOIN courses c ON cv.course_id = c.id
         WHERE cv.id = ?`,
        [videoId]
      );

      if (videoCheck.length === 0) {
        return res.status(404).json({ message: "Video not found" });
      }

      const video = videoCheck[0];

      const [enrollmentCheck] = await db.execute(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [video.course_id, req.user.userId]
      );

      if (enrollmentCheck.length === 0) {
        return res.status(403).json({ message: "Not enrolled in this course" });
      }

      const completed = totalDuration > 0 && (watchedSeconds / totalDuration) >= 0.9;

      await db.execute(
        `INSERT INTO video_watch_progress (video_id, student_id, watched_seconds, total_duration, completed)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           watched_seconds = GREATEST(watched_seconds, VALUES(watched_seconds)),
           total_duration = VALUES(total_duration),
           completed = GREATEST(completed, VALUES(completed)),
           last_watched_at = NOW()`,
        [videoId, req.user.userId, watchedSeconds, totalDuration, completed]
      );

      res.json({ message: "Progress updated successfully" });
    } catch (error) {
      console.error("Update progress error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete video (Teacher only)
// Update delete video route to handle both types
app.delete(
  "/api/videos/:videoId",
  authenticateToken,
  requireRole(["teacher"]),
  checkUserStatus,
  async (req, res) => {
    try {
      const { videoId } = req.params;

      const [videoCheck] = await db.execute(
        `SELECT cv.*, c.teacher_id 
         FROM course_videos cv
         JOIN courses c ON cv.course_id = c.id
         LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.teacher_id = ?
         WHERE cv.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)`,
        [req.user.userId, videoId, req.user.userId, req.user.userId]
      );

      if (videoCheck.length === 0) {
        return res.status(404).json({ message: "Video not found or not authorized" });
      }

      const video = videoCheck[0];

      // Delete the video file only if it's a file upload
      if (video.video_type === 'file' && video.video_file) {
        const videoPath = path.join("uploads/videos", video.video_file);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      }

      await db.execute("DELETE FROM course_videos WHERE id = ?", [videoId]);

      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Delete video error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
global.activeVideoSessions = new Map();

const cleanupVideoSessions = () => {
  const now = Date.now();
  const fiveMinutesAgo = now - 300000; // 5 minutes

  for (const [key, time] of global.activeVideoSessions.entries()) {
    if (time < fiveMinutesAgo) {
      global.activeVideoSessions.delete(key);
    }
  }
};

// Clean up sessions every 5 minutes
setInterval(cleanupVideoSessions, 300000);


// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinCourse", (courseId) => {
    socket.join(`course_${courseId}`);
    console.log(`User ${socket.id} joined course ${courseId}`);
  });

  socket.on("leaveCourse", (courseId) => {
    socket.leave(`course_${courseId}`);
    console.log(`User ${socket.id} left course ${courseId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5002;

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Default admin login: admin@lms.com / admin123`);
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  if (db) {
    await db.end();
  }
  process.exit(0);
});
