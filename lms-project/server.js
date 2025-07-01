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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Database configuration
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "yashplw@9960",
  database: "lms_db",
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
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

// Create database tables
async function createTables() {
  // Create users table with basic columns first
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('teacher', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add all missing columns to users table
  const userColumns = [
    { name: "status", type: "ENUM('active', 'blocked') DEFAULT 'active'" },
    { name: "created_by", type: "INT NULL" },
  ];

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

  // Update role column to include admin
  try {
    await db.query(
      `ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'teacher', 'student') NOT NULL`
    );
    console.log("Updated role column to include admin");
  } catch (error) {
    console.log("Role column update completed or not needed");
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
  // Add this table creation in the createTables() function after other table creations
  await db.query(`CREATE TABLE IF NOT EXISTS course_queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  student_id INT NOT NULL,
  teacher_id INT NULL,
  question TEXT NOT NULL,
  answer TEXT NULL,
  status ENUM('pending', 'answered') DEFAULT 'pending',
  asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
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

const JWT_SECRET = "your-secret-key-change-this-in-production";

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
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

// Check if user is blocked
const checkUserStatus = async (req, res, next) => {
  try {
    const [user] = await db.execute("SELECT status FROM users WHERE id = ?", [
      req.user.userId,
    ]);

    if (user.length === 0 || user[0].status === "blocked") {
      return res
        .status(403)
        .json({ message: "Account is blocked or not found" });
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

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const [users] = await db.execute(
      "SELECT id, name, email, password, role, status FROM users WHERE email = ?",
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

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
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
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin Routes - Delete Teacher
app.delete(
  "/api/admin/teacher/:teacherId",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      const [teacher] = await db.execute(
        'SELECT id FROM users WHERE id = ? AND role = "teacher"',
        [teacherId]
      );

      if (teacher.length === 0) {
        return res.status(404).json({ message: "Teacher not found" });
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
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      await db.execute(
        "UPDATE users SET name = ? WHERE id = ? AND role = 'student'",
        [name, req.user.userId]
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
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      const tempPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const [result] = await db.execute(
        "INSERT INTO users (name, email, password, role, created_by) VALUES (?, ?, ?, ?, ?)",
        [name, email, hashedPassword, "teacher", req.user.userId]
      );

      await db.execute(
        "INSERT INTO user_credentials (user_id, temp_password) VALUES (?, ?)",
        [result.insertId, tempPassword]
      );

      // Send welcome email with credentials
      const userData = {
        name,
        email,
        role: 'teacher'
      };

      try {
        const emailResult = await sendWelcomeEmail(userData, tempPassword);
        if (emailResult.success) {
          console.log(`Credentials email sent to new teacher: ${email}`);
        } else {
          console.error('Failed to send credentials email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      res.status(201).json({
        message: "Teacher created successfully! Login credentials have been sent to their email.",
        teacherId: result.insertId,
        credentials: {
          email: email,
          password: tempPassword,
        },
        emailSent: true
      });
    } catch (error) {
      console.error("Create teacher error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/api/admin/teachers",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const [teachers] = await db.execute(`
      SELECT u.id, u.name, u.email, u.status, u.created_at,
             COUNT(c.id) as course_count
      FROM users u
      LEFT JOIN courses c ON u.id = c.teacher_id
      WHERE u.role = 'teacher'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

      res.json(teachers);
    } catch (error) {
      console.error("Get teachers error:", error);
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
        'SELECT id, status FROM users WHERE id = ? AND role = "teacher"',
        [teacherId]
      );

      if (teacher.length === 0) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      const newStatus = teacher[0].status === "active" ? "blocked" : "active";

      await db.execute("UPDATE users SET status = ? WHERE id = ?", [
        newStatus,
        teacherId,
      ]);

      res.json({
        message: `Teacher ${newStatus === "active" ? "unblocked" : "blocked"
          } successfully`,
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
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
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

      const tempPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const [result] = await db.execute(
        "INSERT INTO users (name, email, password, role, created_by) VALUES (?, ?, ?, ?, ?)",
        [name, email, hashedPassword, "student", req.user.userId]
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
      SELECT u.id, u.name, u.email, u.status, u.created_at,
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

      // Validate dates if provided
      if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Validate group_link if provided
      if (group_link && !isValidUrl(group_link)) {
        return res.status(400).json({ message: "Invalid group link URL" });
      }

      const [result] = await db.execute(
        "INSERT INTO courses (title, description, teacher_id, duration_days, group_link, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [title, description, req.user.userId, duration_days || 30, group_link || null, start_date || null, end_date || null]
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
        query = `SELECT c.*, u.name as teacher_name, ce.enrolled_at, ce.completed_at
               FROM courses c 
               LEFT JOIN users u ON c.teacher_id = u.id
               LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.student_id = ?`;
        params = [req.user.userId];
      } else {
        // Admin can see all courses
        query = `SELECT c.*, u.name as teacher_name, 
               COUNT(ce.student_id) as enrolled_students
               FROM courses c 
               LEFT JOIN users u ON c.teacher_id = u.id
               LEFT JOIN course_enrollments ce ON c.id = ce.course_id
               GROUP BY c.id`;
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

      // Rest of the existing function code remains the same
      const [students] = await db.execute(
        `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
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

      // Validate video URL if provided
      if (videoUrl && !isValidUrl(videoUrl)) {
        return res.status(400).json({ message: "Invalid video URL" });
      }

      const [result] = await db.execute(
        "INSERT INTO blogs (title, content, image_url, video_url, author_id) VALUES (?, ?, ?, ?, ?)",
        [title, content, imageUrl, videoUrl || null, req.user.userId]
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
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      // Convert to integers and validate
      const pageNum = Math.max(1, parseInt(page, 10)) || 1;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10))) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Use query instead of execute for this specific case
      const [blogs] = await db.query(
        `SELECT b.*, u.name as author_name, u.role as author_role
         FROM blogs b
         JOIN users u ON b.author_id = u.id
         ORDER BY b.created_at DESC
         LIMIT ${limitNum} OFFSET ${offset}`
      );

      const [totalCount] = await db.execute(
        "SELECT COUNT(*) as count FROM blogs"
      );

      res.json({
        blogs,
        totalCount: totalCount[0].count,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount[0].count / limitNum)
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
      const { q, courseId } = req.query; // search query and course ID

      let query = `
        SELECT u.id, u.name, u.email 
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

      // Add search filter
      if (q) {
        query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`);
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
        info: {
          Title: `Certificate of Completion - ${courseName}`,
          Author: 'Learning Management System',
          Subject: 'Course Completion Certificate'
        }
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Colors
      const darkBlue = '#2c3e50';
      const gold = '#f39c12';
      const lightBlue = '#3498db';
      const darkGray = '#34495e';

      // Certificate border
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .lineWidth(3)
        .stroke(darkBlue);

      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
        .lineWidth(1)
        .stroke(darkBlue);

      // Header
      doc.fontSize(42)
        .fillColor(darkBlue)
        .font('Helvetica-Bold')
        .text("CERTIFICATE", 0, 100, { align: "center" });

      doc.fontSize(24)
        .fillColor(gold)
        .text("OF COMPLETION", 0, 150, { align: "center" });

      // Decorative line
      doc.moveTo(200, 190)
        .lineTo(doc.page.width - 200, 190)
        .lineWidth(2)
        .stroke(gold);

      // Main content
      doc.fontSize(18)
        .fillColor(darkGray)
        .font('Helvetica')
        .text("This is to certify that", 0, 230, { align: "center" });

      doc.fontSize(36)
        .fillColor(darkBlue)
        .font('Helvetica-Bold')
        .text(studentName, 0, 270, { align: "center" });

      doc.fontSize(18)
        .fillColor(darkGray)
        .font('Helvetica')
        .text("has successfully completed the course", 0, 320, { align: "center" });

      doc.fontSize(28)
        .fillColor(lightBlue)
        .font('Helvetica-Bold')
        .text(courseName, 0, 360, { align: "center", width: doc.page.width });

      // Dates section
      const dateY = 420;
      doc.fontSize(14)
        .fillColor(darkGray)
        .font('Helvetica');

      if (courseEndDate) {
        doc.text(`Course Completion Date: ${courseEndDate}`, 0, dateY, { align: "center" });
        doc.text(`Certificate Issued: ${completionDate}`, 0, dateY + 20, { align: "center" });
      } else {
        doc.text(`Completion Date: ${completionDate}`, 0, dateY, { align: "center" });
      }

      // Certificate code
      doc.fontSize(12)
        .fillColor('#7f8c8d')
        .text(`Certificate Code: ${certificateCode}`, 0, 480, { align: "center" });

      // Footer
      doc.fontSize(10)
        .fillColor('#95a5a6')
        .text("This certificate is digitally generated and verified by Learning Management System", 0, 520, { align: "center" });

      // Signature area (decorative)
      doc.fontSize(12)
        .fillColor(darkGray)
        .text("Authorized Signature", doc.page.width - 200, 460, { align: "center", width: 150 });

      doc.moveTo(doc.page.width - 200, 490)
        .lineTo(doc.page.width - 50, 490)
        .stroke(darkGray);

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
        "SELECT id, name, email, role, status, created_at FROM users WHERE id = ?",
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
app.get(
  "/api/dashboard/stats",
  authenticateToken,
  checkUserStatus,
  async (req, res) => {
    try {
      let stats = {};

      if (req.user.role === "admin") {
        const [teacherCount] = await db.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = "teacher"'
        );
        const [studentCount] = await db.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = "student"'
        );
        const [courseCount] = await db.execute(
          "SELECT COUNT(*) as count FROM courses"
        );
        const [certificateCount] = await db.execute(
          "SELECT COUNT(*) as count FROM certificates"
        );

        stats = {
          teachers: teacherCount[0].count,
          students: studentCount[0].count,
          courses: courseCount[0].count,
          certificates: certificateCount[0].count,
        };
      } else if (req.user.role === "teacher") {
        const [courseCount] = await db.execute(
          "SELECT COUNT(*) as count FROM courses WHERE teacher_id = ?",
          [req.user.userId]
        );
        const [studentCount] = await db.execute(
          `
    SELECT COUNT(DISTINCT ce.student_id) as count 
    FROM course_enrollments ce 
    JOIN courses c ON ce.course_id = c.id 
    WHERE c.teacher_id = ?
  `,
          [req.user.userId]
        );
        const [sessionCount] = await db.execute(
          `
    SELECT COUNT(*) as count 
    FROM daily_sessions ds 
    JOIN courses c ON ds.course_id = c.id 
    WHERE c.teacher_id = ?
  `,
          [req.user.userId]
        );
        const [projectCount] = await db.execute(
          `
    SELECT COUNT(*) as count 
    FROM projects p 
    JOIN courses c ON p.course_id = c.id 
    WHERE c.teacher_id = ? AND p.status = 'submitted'
  `,
          [req.user.userId]
        );

        // Add assignment stats
        const [assignmentCount] = await db.execute(
          `
    SELECT COUNT(*) as count 
    FROM assignments a 
    JOIN courses c ON a.course_id = c.id 
    WHERE c.teacher_id = ?
  `,
          [req.user.userId]
        );

        const [pendingAssignmentCount] = await db.execute(
          `
    SELECT COUNT(*) as count 
    FROM assignment_submissions asub
    JOIN assignments a ON asub.assignment_id = a.id
    JOIN courses c ON a.course_id = c.id 
    WHERE c.teacher_id = ? AND asub.status = 'submitted'
  `,
          [req.user.userId]
        );

        stats = {
          courses: courseCount[0].count,
          students: studentCount[0].count,
          sessions: sessionCount[0].count,
          pendingProjects: projectCount[0].count,
          assignments: assignmentCount[0].count,
          pendingAssignments: pendingAssignmentCount[0].count,
        };
      } else if (req.user.role === "student") {
        const [enrolledCount] = await db.execute(
          "SELECT COUNT(*) as count FROM course_enrollments WHERE student_id = ?",
          [req.user.userId]
        );
        const [completedCount] = await db.execute(
          "SELECT COUNT(*) as count FROM course_enrollments WHERE student_id = ? AND completed_at IS NOT NULL",
          [req.user.userId]
        );
        const [certificateCount] = await db.execute(
          "SELECT COUNT(*) as count FROM certificates WHERE student_id = ?",
          [req.user.userId]
        );
        const [projectCount] = await db.execute(
          "SELECT COUNT(*) as count FROM projects WHERE student_id = ?",
          [req.user.userId]
        );

        stats = {
          enrolledCourses: enrolledCount[0].count,
          completedCourses: completedCount[0].count,
          certificates: certificateCount[0].count,
          projects: projectCount[0].count,
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
app.get("/api/adsense-config", authenticateToken, async (req, res) => {
  try {
    const config = {
      clientId: process.env.GOOGLE_ADSENSE_CLIENT_ID || "ca-pub-xxxxxxxxxxxxxxxxx",
      enabled: process.env.GOOGLE_ADSENSE_ENABLED === 'true',
      testMode: process.env.ADSENSE_TEST_MODE === 'true'
    };
    res.json(config);
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
  async (req, res) => {
    try {
      const { enabled, testMode } = req.body;

      // In a production app, you'd save this to database
      // For now, we'll just return success
      res.json({
        message: "AdSense settings updated successfully",
        enabled,
        testMode
      });
    } catch (error) {
      console.error("Update AdSense settings error:", error);
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
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { question } = req.body;

      if (!question || !question.trim()) {
        return res.status(400).json({ message: "Question is required" });
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
        "INSERT INTO course_queries (course_id, student_id, question) VALUES (?, ?, ?)",
        [courseId, req.user.userId, question.trim()]
      );

      res.status(201).json({
        message: "Query submitted successfully",
        queryId: result.insertId,
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

      let query, params;

      if (req.user.role === "student") {
        // Students can only see their own queries
        const [enrollmentCheck] = await db.execute(
          "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
          [courseId, req.user.userId]
        );

        if (enrollmentCheck.length === 0) {
          return res.status(403).json({ message: "Not enrolled in this course" });
        }

        query = `
          SELECT cq.*, s.name as student_name, t.name as teacher_name
          FROM course_queries cq
          JOIN users s ON cq.student_id = s.id
          LEFT JOIN users t ON cq.teacher_id = t.id
          WHERE cq.course_id = ? AND cq.student_id = ?
          ORDER BY cq.asked_at DESC
        `;
        params = [courseId, req.user.userId];
      } else if (req.user.role === "teacher") {
        // Teachers can see all queries for their courses
        const hasAccess = await checkCourseAccess(courseId, req.user.userId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to view queries" });
        }

        query = `
          SELECT cq.*, s.name as student_name, s.email as student_email, t.name as teacher_name
          FROM course_queries cq
          JOIN users s ON cq.student_id = s.id
          LEFT JOIN users t ON cq.teacher_id = t.id
          WHERE cq.course_id = ?
          ORDER BY cq.status ASC, cq.asked_at DESC
        `;
        params = [courseId];
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      const [queries] = await db.execute(query, params);
      res.json(queries);
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
      const { answer } = req.body;

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

      await db.execute(
        "UPDATE course_queries SET answer = ?, teacher_id = ?, status = 'answered', answered_at = NOW() WHERE id = ?",
        [answer.trim(), req.user.userId, queryId]
      );

      res.json({ message: "Query answered successfully" });
    } catch (error) {
      console.error("Answer query error:", error);
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
