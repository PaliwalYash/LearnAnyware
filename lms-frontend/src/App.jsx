import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  Calendar,
  Download,
  Upload,
  ExternalLink,
  Bell,
  CheckCircle,
  Clock,
  Award,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  FileText,
  Eye,
  AlertCircle,
  Shield,
  UserPlus,
  Lock,
  Unlock,
  BarChart3,
  Settings,
  Key,
  Plus,
  Minus,
  Home,
  GraduationCap,
  User,
  MessageCircle,
  Send,
  Receipt,
  CreditCard,
  DollarSign,
  Bot,
  History,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Markdown from "react-markdown";

const API_BASE = "http://localhost:5002/api";

const LearningManagementSystem = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [students, setStudents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // AI Chat states
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Add these state variables in the LearningManagementSystem component
  const [assignments, setAssignments] = useState([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    assignmentFile: null,
  });
  const [submissionForm, setSubmissionForm] = useState({
    submissionLink: "",
    submissionFile: null,
    message: "",
  });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentFeedback, setAssignmentFeedback] = useState("");
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Form states
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    duration_days: 30,
    group_link: "",
  });

  const [sessionForm, setSessionForm] = useState({
    title: "",
    notes: "",
    meetLink: "",
    sessionDate: new Date().toISOString().split("T")[0],
    notesFile: null,
  });

  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    projectFile: null,
  });

  const [attendanceForm, setAttendanceForm] = useState({
    studentId: "",
    sessionDate: new Date().toISOString().split("T")[0],
    status: "present",
    notes: "",
  });

  const [receiptForm, setReceiptForm] = useState({
    studentId: "",
    courseId: "",
    amount: "",
    gstRate: "18",
    description: "",
  });

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
  });

  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
  });

  const [studentEmail, setStudentEmail] = useState("");
  const [editingSession, setEditingSession] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [projectFeedback, setProjectFeedback] = useState("");
  const [showCredentials, setShowCredentials] = useState(null);
  const [groupLinkForm, setGroupLinkForm] = useState("");
  const [courseGroupLink, setCourseGroupLink] = useState(null);
  const [groupLinkLoading, setGroupLinkLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchInitialData(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedCourse !== "create") {
      fetchSessions(selectedCourse.id);
      fetchAssignments(selectedCourse.id);
      if (user?.role === "teacher") {
        fetchCourseStudents(selectedCourse.id);
        fetchProjects(selectedCourse.id);
        fetchAttendance(selectedCourse.id);
      } else if (user?.role === "student") {
        fetchMyProject(selectedCourse.id);
      }
    }
  }, [selectedCourse, user]);

  // const fetchInitialData = async (userData) => {
  //   try {
  //     await fetchDashboardStats();

  //     if (userData.role === "admin") {
  //       await fetchTeachers();
  //     } else if (userData.role === "teacher") {
  //       await Promise.all([fetchCourses(), fetchTeacherStudents()]);
  //     } else if (userData.role === "student") {
  //       await Promise.all([
  //         fetchCourses(),
  //         fetchCertificates(),
  //         fetchReceipts(),
  //         fetchChatHistory(),
  //       ]);
  //       setProfileForm({ name: userData.name });
  //     }
  //   } catch (error) {
  //     showMessage("Error loading initial data", "error");
  //   }
  // };
  const deleteReceipt = async (receiptId) => {
    setLoading(true);
    try {
      await apiCall(`/receipts/${receiptId}`, {
        method: "DELETE",
      });

      showMessage("Receipt deleted successfully!", "success");
      setShowDeleteModal(false);
      setReceiptToDelete(null);

      // Refresh the receipts list
      fetchTeacherReceipts();
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };
  const showMessage = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(""), 4000);
  };

  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem("token");
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  // API Functions
  const fetchDashboardStats = async () => {
    try {
      const data = await apiCall("/dashboard/stats");
      setDashboardStats(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await apiCall("/admin/teachers");
      setTeachers(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchTeacherStudents = async () => {
    try {
      const data = await apiCall("/teacher/students");
      setStudents(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await apiCall("/courses");
      setCourses(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchCourseStudents = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/students`);
      setStudents(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchProjects = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/projects`);
      setProjects(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchMyProject = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/my-project`);
      setCurrentProject(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchAttendance = async (courseId, date = null) => {
    try {
      const url = date
        ? `/courses/${courseId}/attendance?date=${date}`
        : `/courses/${courseId}/attendance`;
      const data = await apiCall(url);
      setAttendance(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchSessions = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/sessions`);
      setSessions(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchCertificates = async () => {
    try {
      const data = await apiCall("/certificates");
      setCertificates(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchReceipts = async () => {
    try {
      const data = await apiCall("/receipts");
      setReceipts(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchChatHistory = async () => {
    try {
      const data = await apiCall("/ai-chat/history");
      setChatHistory(data);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  // Add these functions after the existing API functions

  const fetchAssignments = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/assignments`);
      setAssignments(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(assignmentForm).forEach((key) => {
        if (assignmentForm[key] !== null) {
          formData.append(key, assignmentForm[key]);
        }
      });

      const response = await fetch(
        `${API_BASE}/courses/${selectedCourse.id}/assignments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        showMessage("Assignment created successfully!", "success");
        setAssignmentForm({
          title: "",
          description: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          assignmentFile: null,
        });
        fetchAssignments(selectedCourse.id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  // Update the submitAssignment function
  const submitAssignment = async (e, assignmentId) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();

      // Only append non-empty values
      if (submissionForm.submissionLink && submissionForm.submissionLink.trim()) {
        formData.append('submissionLink', submissionForm.submissionLink.trim());
      }

      if (submissionForm.submissionFile) {
        formData.append('submissionFile', submissionForm.submissionFile);
      }

      if (submissionForm.message && submissionForm.message.trim()) {
        formData.append('message', submissionForm.message.trim());
      }

      const response = await fetch(
        `${API_BASE}/assignments/${assignmentId}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        showMessage(data.message, "success");
        setSubmissionForm({
          submissionLink: "",
          submissionFile: null,
          message: "",
        });
        fetchAssignments(selectedCourse.id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const startEditingAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description || "",
      startDate: assignment.start_date,
      endDate: assignment.end_date,
      assignmentFile: null,
    });
  };
  const updateAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(assignmentForm).forEach((key) => {
        if (assignmentForm[key] !== null) {
          formData.append(key, assignmentForm[key]);
        }
      });

      const response = await fetch(
        `${API_BASE}/assignments/${editingAssignment.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        showMessage("Assignment updated successfully!", "success");
        setEditingAssignment(null);
        setAssignmentForm({
          title: "",
          description: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          assignmentFile: null,
        });
        fetchAssignments(selectedCourse.id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const fetchAssignmentSubmissions = async (assignmentId) => {
    try {
      const data = await apiCall(`/assignments/${assignmentId}/submissions`);
      setAssignmentSubmissions(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const verifyAssignmentSubmission = async (submissionId, status, feedback = "") => {
    setLoading(true);
    try {
      await apiCall(`/assignment-submissions/${submissionId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ status, feedback }),
      });

      showMessage(`Assignment ${status} successfully!`, "success");
      fetchAssignmentSubmissions(selectedAssignment.id);
      setAssignmentFeedback("");
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const deleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;

    setLoading(true);
    try {
      await apiCall(`/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      showMessage("Assignment deleted successfully!", "success");
      fetchAssignments(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = authMode === "login" ? "/login" : "/register";
      const data = await apiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(authForm),
      });

      if (authMode === "login") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        showMessage("Login successful!", "success");
        fetchInitialData(data.user);
      } else {
        const data = await apiCall("/register", {
          method: "POST",
          body: JSON.stringify(authForm),
        });

        showMessage(
          "Registration successful! Please check your email for welcome instructions, then login with your credentials.",
          "success"
        );
        setAuthMode("login");
        setAuthForm({ name: "", email: "", password: "", role: "student" });
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setCourses([]);
    setSelectedCourse(null);
    setSessions([]);
    setCertificates([]);
    setReceipts([]);
    setChatHistory([]);
    setActiveSection("dashboard");
  };

  // Updated createTeacher function
  const createTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiCall("/admin/create-teacher", {
        method: "POST",
        body: JSON.stringify(teacherForm),
      });

      if (data.emailSent) {
        showMessage(
          `Teacher created successfully! Login credentials have been sent to ${teacherForm.email}`,
          "success"
        );
        setEmailStatus({
          type: 'success',
          message: `Credentials emailed to ${teacherForm.email}`,
          email: teacherForm.email
        });
      } else {
        showMessage(
          "Teacher created successfully, but email could not be sent. Please provide credentials manually.",
          "warning"
        );
        setEmailStatus({
          type: 'warning',
          message: 'Email could not be sent',
          email: teacherForm.email,
          showResend: true
        });
      }

      setShowCredentials(data.credentials);
      setTeacherForm({ name: "", email: "" });
      fetchTeachers();
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const deleteTeacher = async (teacherId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this teacher?"
      )
    )
      return;

    setLoading(true);
    try {
      await apiCall(`/admin/teacher/${teacherId}`, {
        method: "DELETE",
      });

      showMessage("Teacher deleted successfully!", "success");
      fetchTeachers();
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const toggleTeacherStatus = async (teacherId) => {
    setLoading(true);
    try {
      const data = await apiCall(`/admin/teacher/${teacherId}/toggle-status`, {
        method: "PUT",
      });

      showMessage(data.message, "success");
      fetchTeachers();
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  // Updated createStudent function
  const createStudent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiCall("/teacher/create-student", {
        method: "POST",
        body: JSON.stringify(studentForm),
      });

      if (data.emailSent) {
        showMessage(
          `Student created successfully! Login credentials have been sent to ${studentForm.email}`,
          "success"
        );
        setEmailStatus({
          type: 'success',
          message: `Credentials emailed to ${studentForm.email}`,
          email: studentForm.email
        });
      } else {
        showMessage(
          "Student created successfully, but email could not be sent. Please provide credentials manually.",
          "warning"
        );
        setEmailStatus({
          type: 'warning',
          message: 'Email could not be sent',
          email: studentForm.email,
          showResend: true
        });
      }

      setShowCredentials(data.credentials);
      setStudentForm({ name: "", email: "" });
      fetchTeacherStudents();
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  // Resend credentials function
  const resendCredentials = async (userId, userEmail) => {
    setResendingEmail(true);
    try {
      const data = await apiCall("/resend-credentials", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });

      if (data.emailSent) {
        showMessage(
          `Credentials have been resent to ${userEmail}`,
          "success"
        );
        setEmailStatus({
          type: 'success',
          message: `Credentials resent to ${userEmail}`,
          email: userEmail
        });
      } else {
        showMessage("Failed to resend credentials", "error");
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
    setResendingEmail(false);
  };

  // Test email function (for admins)
  const testEmailConfiguration = async () => {
    const testEmail = prompt("Enter email address to send test email:");
    if (!testEmail) return;

    setLoading(true);
    try {
      const data = await apiCall("/test-email", {
        method: "POST",
        body: JSON.stringify({ testEmail }),
      });

      showMessage(
        `Test email sent successfully to ${testEmail}`,
        "success"
      );
    } catch (error) {
      showMessage(`Test email failed: ${error.message}`, "error");
    }
    setLoading(false);
  };
  const deleteStudent = async (studentId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this student?"
      )
    )
      return;

    setLoading(true);
    try {
      await apiCall(`/teacher/student/${studentId}`, {
        method: "DELETE",
      });

      showMessage("Student deleted successfully!", "success");
      fetchTeacherStudents();
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const createCourse = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall("/courses", {
        method: "POST",
        body: JSON.stringify(courseForm),
      });

      showMessage("Course created successfully!", "success");
      setCourseForm({
        title: "",
        description: "",
        duration_days: 30,
        group_link: "" // Add this line
      });
      fetchCourses();
      setSelectedCourse(null);
      setActiveSection("courses");
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };


  const updateCourse = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall(`/courses/${editingCourse.id}`, {
        method: "PUT",
        body: JSON.stringify(courseForm),
      });

      showMessage("Course updated successfully!", "success");
      setEditingCourse(null);
      setCourseForm({
        title: "",
        description: "",
        duration_days: 30,
        group_link: "" // Add this line
      });
      fetchCourses();
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  // Add new function to update group link
  const updateGroupLink = async (courseId, groupLink) => {
    setGroupLinkLoading(true);
    try {
      await apiCall(`/courses/${courseId}/group-link`, {
        method: "PUT",
        body: JSON.stringify({ group_link: groupLink }),
      });

      showMessage(
        groupLink
          ? "Group link updated successfully!"
          : "Group link removed successfully!",
        "success"
      );

      setCourseGroupLink(groupLink || null);
      setGroupLinkForm("");
    } catch (error) {
      showMessage(error.message, "error");
    }
    setGroupLinkLoading(false);
  };

  // Add function to fetch course group link
  const fetchCourseGroupLink = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/group-link`);
      setCourseGroupLink(data.group_link);
    } catch (error) {
      console.error("Fetch group link error:", error);
      setCourseGroupLink(null);
    }
  };

  // Add function to join group
  const joinGroup = async (courseId, groupLink) => {
    try {
      // Track the group join activity
      await apiCall(`/courses/${courseId}/group-join`, {
        method: "POST",
      });

      // Open the group link in a new tab
      window.open(groupLink, '_blank');
      showMessage("Redirecting to group...", "success");
    } catch (error) {
      // Still redirect even if tracking fails
      window.open(groupLink, '_blank');
      console.error("Group join tracking error:", error);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    setLoading(true);
    try {
      await apiCall(`/courses/${courseId}`, {
        method: "DELETE",
      });

      showMessage("Course deleted successfully!", "success");
      fetchCourses();
      setSelectedCourse(null);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const createSession = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(sessionForm).forEach((key) => {
        if (sessionForm[key] !== null) {
          formData.append(key, sessionForm[key]);
        }
      });

      const response = await fetch(
        `${API_BASE}/courses/${selectedCourse.id}/sessions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        showMessage("Session created successfully!", "success");
        setSessionForm({
          title: "",
          notes: "",
          meetLink: "",
          sessionDate: new Date().toISOString().split("T")[0],
          notesFile: null,
        });
        fetchSessions(selectedCourse.id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const updateSession = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(sessionForm).forEach((key) => {
        if (sessionForm[key] !== null) {
          formData.append(key, sessionForm[key]);
        }
      });

      const response = await fetch(
        `${API_BASE}/sessions/${editingSession.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        showMessage("Session updated successfully!", "success");
        setEditingSession(null);
        setSessionForm({
          title: "",
          notes: "",
          meetLink: "",
          sessionDate: new Date().toISOString().split("T")[0],
          notesFile: null,
        });
        fetchSessions(selectedCourse.id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this session?"))
      return;

    setLoading(true);
    try {
      await apiCall(`/sessions/${sessionId}`, {
        method: "DELETE",
      });

      showMessage("Session deleted successfully!", "success");
      fetchSessions(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const addStudent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall(`/courses/${selectedCourse.id}/students`, {
        method: "POST",
        body: JSON.stringify({ email: studentEmail }),
      });

      showMessage("Student added successfully!", "success");
      setStudentEmail("");
      fetchCourseStudents(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const removeStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to remove this student?"))
      return;

    setLoading(true);
    try {
      await apiCall(`/courses/${selectedCourse.id}/students/${studentId}`, {
        method: "DELETE",
      });

      showMessage("Student removed successfully!", "success");
      fetchCourseStudents(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const markAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall(`/courses/${selectedCourse.id}/attendance`, {
        method: "POST",
        body: JSON.stringify(attendanceForm),
      });

      showMessage("Attendance marked successfully!", "success");
      setAttendanceForm({
        studentId: "",
        sessionDate: new Date().toISOString().split("T")[0],
        status: "present",
        notes: "",
      });
      fetchAttendance(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const submitProject = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(projectForm).forEach((key) => {
        if (projectForm[key] !== null) {
          formData.append(key, projectForm[key]);
        }
      });

      const response = await fetch(
        `${API_BASE}/courses/${selectedCourse.id}/project`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        showMessage("Project submitted successfully!", "success");
        setProjectForm({ title: "", description: "", projectFile: null });
        fetchMyProject(selectedCourse.id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const verifyProject = async (projectId, status, feedback = "") => {
    setLoading(true);
    try {
      await apiCall(`/projects/${projectId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ status, feedback }),
      });

      showMessage(`Project ${status} successfully!`, "success");
      fetchProjects(selectedCourse.id);
      setProjectFeedback("");
      if (status === "approved") {
        fetchCertificates();
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const markAsRead = async (sessionId) => {
    try {
      await apiCall(`/sessions/${sessionId}/mark-read`, {
        method: "POST",
      });
      showMessage("Session marked as read!", "success");
      fetchSessions(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const joinMeet = async (sessionId, meetLink) => {
    try {
      await apiCall(`/sessions/${sessionId}/join-meet`, {
        method: "POST",
      });
      window.open(meetLink, "_blank");
      showMessage("Meeting attendance recorded!", "success");
      fetchSessions(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      await apiCall("/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      showMessage("Password changed successfully!", "success");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  // const generateReceipt = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);

  //   try {
  //     const data = await apiCall("/receipts", {
  //       method: "POST",
  //       body: JSON.stringify(receiptForm),
  //     });

  //     showMessage("Payment receipt generated successfully!", "success");
  //     setReceiptForm({
  //       studentId: "",
  //       courseId: "",
  //       amount: "",
  //       gstRate: "18",
  //       description: "",
  //     });
  //   } catch (error) {
  //     showMessage(error.message, "error");
  //   }

  //   setLoading(false);
  // };

  const updateStudentProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall("/student/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });

      showMessage("Profile updated successfully!", "success");

      // Update user data in localStorage
      const updatedUser = { ...user, name: profileForm.name };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const askAI = async (e) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    setChatLoading(true);
    const question = chatQuestion;
    setChatQuestion("");

    try {
      const data = await apiCall("/ai-chat", {
        method: "POST",
        body: JSON.stringify({ question }),
      });

      setChatHistory((prev) => [data, ...prev]);
    } catch (error) {
      showMessage("AI service error. Please try again later.", "error");
    }

    setChatLoading(false);
  };

  const startEditingSession = (session) => {
    setEditingSession(session);
    setSessionForm({
      title: session.title,
      notes: session.notes || "",
      meetLink: session.meet_link || "",
      sessionDate: session.session_date,
      notesFile: null,
    });
  };

  const startEditingCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      duration_days: course.duration_days,
      group_link: course.group_link || ""
    });
  };

  // Add this useEffect to fetch group link when course is selected
  useEffect(() => {
    if (selectedCourse && selectedCourse !== "create" && selectedCourse.id) {
      fetchCourseGroupLink(selectedCourse.id);
    }
  }, [selectedCourse]);

  // Add these to your state variables
  const [teacherReceipts, setTeacherReceipts] = useState([]);
  const [receiptSearch, setReceiptSearch] = useState("");
  const [receiptFilter, setReceiptFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const receiptsPerPage = 9;

  // Add these computed values
  const filteredReceipts = teacherReceipts.filter((receipt) => {
    const matchesSearch =
      !receiptSearch ||
      receipt.student_name
        .toLowerCase()
        .includes(receiptSearch.toLowerCase()) ||
      receipt.receipt_number
        .toLowerCase()
        .includes(receiptSearch.toLowerCase());

    const matchesFilter =
      !receiptFilter || receipt.course_id.toString() === receiptFilter;

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredReceipts.length / receiptsPerPage);
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * receiptsPerPage,
    currentPage * receiptsPerPage
  );

  // Add this API function
  const fetchTeacherReceipts = async () => {
    try {
      const data = await apiCall("/teacher/receipts");
      setTeacherReceipts(data);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Update the generateReceipt function to refresh the list
  const generateReceipt = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiCall("/receipts", {
        method: "POST",
        body: JSON.stringify(receiptForm),
      });

      showMessage("Payment receipt generated successfully!", "success");
      setReceiptForm({
        studentId: "",
        courseId: "",
        amount: "",
        gstRate: "18",
        description: "",
      });

      // Refresh the receipts list
      fetchTeacherReceipts();
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  // Update the fetchInitialData function for teachers
  const fetchInitialData = async (userData) => {
    try {
      await fetchDashboardStats();

      if (userData.role === "admin") {
        await fetchTeachers();
      } else if (userData.role === "teacher") {
        await Promise.all([
          fetchCourses(),
          fetchTeacherStudents(),
          fetchTeacherReceipts(),
        ]);
      } else if (userData.role === "student") {
        await Promise.all([
          fetchCourses(),
          fetchCertificates(),
          fetchReceipts(),
          fetchChatHistory(),
        ]);
        setProfileForm({ name: userData.name });
      }
    } catch (error) {
      showMessage("Error loading initial data", "error");
    }
  };
  // Login Form
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="relative bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Learning Hub</h1>
            <p className="text-gray-300">Modern Learning Management System</p>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-xl backdrop-blur-sm ${message.type === "error"
                ? "bg-red-500/20 text-red-200 border border-red-500/30"
                : message.type === "success"
                  ? "bg-green-500/20 text-green-200 border border-green-500/30"
                  : "bg-blue-500/20 text-blue-200 border border-blue-500/30"
                }`}
            >
              {message.text}
            </div>
          )}

          {/* <div className="flex mb-6 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                authMode === "login"
                  ? "bg-white/20 text-white shadow-lg"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                authMode === "register"
                  ? "bg-white/20 text-white shadow-lg"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Register
            </button>
          </div> */}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg"
            >
              {loading
                ? "Processing..."
                : authMode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Demo Admin: admin@lms.com / admin123
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-300 hover:text-white mr-4"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center mr-3">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">Learning Hub</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {user.role}
                  </p>
                </div>
                <div className="h-8 w-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>

              {user.role === "student" && (
                <button
                  onClick={() => setAiChatOpen(true)}
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 flex items-center space-x-2 shadow-lg"
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Assistant</span>
                </button>
              )}

              <button
                onClick={() => setActiveSection("settings")}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-500/80 backdrop-blur-sm text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors border border-red-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Message Display */}
      {message && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 relative z-30">
          <div
            className={`p-3 rounded-xl backdrop-blur-sm ${message.type === "error"
              ? "bg-red-500/20 text-red-200 border border-red-500/30"
              : message.type === "success"
                ? "bg-green-500/20 text-green-200 border border-green-500/30"
                : "bg-blue-500/20 text-blue-200 border border-blue-500/30"
              }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 w-full max-w-md border border-white/20">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Account Created Successfully
              </h3>
            </div>

            {/* Email Status */}
            {emailStatus && (
              <div className={`mb-4 p-3 rounded-xl border ${emailStatus.type === 'success'
                ? 'bg-green-500/20 border-green-500/30 text-green-200'
                : emailStatus.type === 'warning'
                  ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200'
                  : 'bg-red-500/20 border-red-500/30 text-red-200'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {emailStatus.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : emailStatus.type === 'warning' ? (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    <span className="text-sm">{emailStatus.message}</span>
                  </div>
                  {emailStatus.showResend && (
                    <button
                      onClick={() => resendCredentials(showCredentials.userId, emailStatus.email)}
                      disabled={resendingEmail}
                      className="text-xs underline hover:no-underline disabled:opacity-50"
                    >
                      {resendingEmail ? 'Sending...' : 'Resend'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-700/50 p-4 rounded-xl mb-4 border border-white/10">
              <p className="text-sm text-gray-300 mb-2">Login Credentials:</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-mono text-sm text-white bg-slate-600/50 px-2 py-1 rounded">
                    {showCredentials.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Password:</span>
                  <span className="font-mono text-sm text-white bg-slate-600/50 px-2 py-1 rounded">
                    {showCredentials.password}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 p-3 rounded-xl mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-200 text-sm font-medium">Security Notice</p>
                  <p className="text-yellow-200/80 text-xs">
                    {emailStatus?.type === 'success'
                      ? "The user has been emailed their credentials and should change their password after first login."
                      : "Please share these credentials securely with the user and ask them to change their password after first login."
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCredentials(null);
                  setEmailStatus(null);
                }}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Close
              </button>
              {emailStatus?.showResend && (
                <button
                  onClick={() => resendCredentials(showCredentials.userId, emailStatus.email)}
                  disabled={resendingEmail}
                  className="bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center"
                >
                  <Send className="h-3 w-3 mr-1" />
                  {resendingEmail ? 'Sending...' : 'Resend Email'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {aiChatOpen && user.role === "student" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl w-full max-w-2xl h-[600px] border border-white/20 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    AI Coding Assistant
                  </h3>
                  <p className="text-sm text-gray-400">
                    Ask me anything about coding!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiChatOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-400 mt-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with your AI assistant!</p>
                </div>
              ) : (
                chatHistory.map((chat, index) => (
                  <div key={index} className="space-y-4">
                    {/* User Question */}
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-xl max-w-xs lg:max-w-md">
                        <p className="text-sm">{chat.question}</p>
                      </div>
                    </div>

                    {/* AI Answer */}

                    <div className="flex justify-start">
                      <div className="bg-slate-700/50 text-white p-3 rounded-xl max-w-xs lg:max-w-md border border-white/10">
                        <p className="text-sm whitespace-pre-wrap wrap">
                          <Markdown>{chat.answer}</Markdown>
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(chat.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700/50 text-white p-3 rounded-xl border border-white/10">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={askAI} className="flex space-x-2">
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  placeholder="Ask me about coding concepts, debugging, or best practices..."
                  className="flex-1 px-4 py-2 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatQuestion.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white p-2 rounded-xl hover:from-emerald-600 hover:to-blue-600 disabled:opacity-50 transition-all"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Submissions Modal */}
      {/* Assignment Submissions Modal - Updated */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl w-full max-w-4xl h-[600px] border border-white/20 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Assignment Submissions
                </h3>
                <p className="text-sm text-gray-400">
                  {selectedAssignment.title}
                </p>
                <p className="text-xs text-gray-500">
                  Due Date: {new Date(selectedAssignment.end_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAssignment(null);
                  setAssignmentSubmissions([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {assignmentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-slate-700/30 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-white">
                            {submission.student_name}
                          </h4>
                          {submission.is_after_due_date && (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                              Submitted After Due Date
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {submission.student_email}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span>
                            Submitted: {new Date(submission.submitted_at).toLocaleString()}
                          </span>
                          {submission.is_after_due_date && (
                            <span className="text-orange-300">
                              ({Math.ceil((new Date(submission.submitted_at) - new Date(submission.assignment_end_date)) / (1000 * 60 * 60 * 24))} days late)
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          {submission.submission_link && (
                            <div>
                              <span className="text-gray-400 text-sm">Link: </span>
                              <a
                                href={submission.submission_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 text-sm break-all"
                              >
                                {submission.submission_link}
                              </a>
                            </div>
                          )}
                          {submission.submission_file && (
                            <div>
                              <span className="text-gray-400 text-sm">File: </span>
                              <a
                                href={`http://localhost:5002/uploads/${submission.submission_file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 text-sm inline-flex items-center"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download File
                              </a>
                            </div>
                          )}
                          {submission.message && (
                            <div>
                              <span className="text-gray-400 text-sm">Message: </span>
                              <p className="text-gray-300 text-sm mt-1 bg-slate-600/30 p-2 rounded">
                                {submission.message}
                              </p>
                            </div>
                          )}
                          {submission.teacher_feedback && (
                            <div className="mt-3 p-3 bg-slate-600/50 rounded-xl">
                              <p className="text-sm font-medium text-gray-300">
                                Your Feedback:
                              </p>
                              <p className="text-sm text-gray-400 mt-1">
                                {submission.teacher_feedback}
                              </p>
                            </div>
                          )}
                          {submission.verified_by_name && (
                            <p className="text-sm text-gray-400 mt-2">
                              Verified by: {submission.verified_by_name} on {new Date(submission.verified_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2 ml-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${submission.status === "approved"
                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                : submission.status === "rejected"
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                              }`}
                          >
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </div>

                        {submission.status === "submitted" && (
                          <div className="flex flex-col space-y-2">
                            <textarea
                              placeholder="Feedback (optional)"
                              value={assignmentFeedback}
                              onChange={(e) => setAssignmentFeedback(e.target.value)}
                              className="w-48 px-3 py-2 bg-slate-600/50 border border-white/20 rounded-xl text-sm text-white"
                              rows="2"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() =>
                                  verifyAssignmentSubmission(
                                    submission.id,
                                    "approved",
                                    assignmentFeedback
                                  )
                                }
                                disabled={loading}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  verifyAssignmentSubmission(
                                    submission.id,
                                    "rejected",
                                    assignmentFeedback
                                  )
                                }
                                disabled={loading}
                                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {assignmentSubmissions.length === 0 && (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400">
                      No submissions yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-30 w-64 bg-slate-800/50 backdrop-blur-md border-r border-white/10 transition-transform duration-300 ease-in-out lg:block`}
        >
          <div className="p-6">
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setActiveSection("dashboard");
                  setSelectedCourse(null);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "dashboard"
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Home className="h-5 w-5 mr-3" />
                Dashboard
              </button>

              {user.role === "admin" && (
                <>
                  <button
                    onClick={() => {
                      setActiveSection("teachers");
                      setSelectedCourse(null);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "teachers"
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <Users className="h-5 w-5 mr-3" />
                    Teachers
                  </button>
                </>
              )}

              {(user.role === "teacher" || user.role === "student") && (
                <button
                  onClick={() => {
                    setActiveSection("courses");
                    setSelectedCourse(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "courses"
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <BookOpen className="h-5 w-5 mr-3" />
                  Courses
                </button>
              )}

              {user.role === "teacher" && (
                <>
                  <button
                    onClick={() => {
                      setActiveSection("students");
                      setSelectedCourse(null);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "students"
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <GraduationCap className="h-5 w-5 mr-3" />
                    My Students
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection("receipts");
                      setSelectedCourse(null);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "receipts"
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <Receipt className="h-5 w-5 mr-3" />
                    Payment Receipts
                  </button>
                </>
              )}

              {user.role === "student" && (
                <>
                  <button
                    onClick={() => {
                      setActiveSection("certificates");
                      setSelectedCourse(null);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "certificates"
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <Award className="h-5 w-5 mr-3" />
                    Certificates
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection("my-receipts");
                      setSelectedCourse(null);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "my-receipts"
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <CreditCard className="h-5 w-5 mr-3" />
                    My Receipts
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setActiveSection("settings");
                  setSelectedCourse(null);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "settings"
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Dashboard Section */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white">
                  Welcome back, {user.name}!
                </h2>
                <div className="text-gray-400 text-sm">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {user.role === "admin" && (
                  <>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Teachers
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.teachers || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-green-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Students
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.students || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Courses
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.courses || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-yellow-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                          <Award className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Certificates
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.certificates || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {user.role === "teacher" && (
                  <>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            My Courses
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.courses || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-green-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Students
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.students || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Assignments
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.assignments || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-orange-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Pending Reviews
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.pendingAssignments || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {user.role === "student" && (
                  <>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Enrolled Courses
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.enrolledCourses || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-green-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Completed
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.completedCourses || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-yellow-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                          <Award className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Certificates
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.certificates || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Projects
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.projects || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {user.role === "teacher" && (
                    <>
                      <button
                        onClick={() => setActiveSection("courses")}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-center"
                      >
                        <Plus className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">
                          Create Course
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveSection("students")}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-center"
                      >
                        <UserPlus className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">Add Student</span>
                      </button>
                      <button
                        onClick={() => setActiveSection("receipts")}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 text-center"
                      >
                        <Receipt className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">
                          Generate Receipt
                        </span>
                      </button>
                    </>
                  )}

                  {user.role === "student" && (
                    <>
                      <button
                        onClick={() => setActiveSection("courses")}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-center"
                      >
                        <BookOpen className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">
                          View Courses
                        </span>
                      </button>
                      <button
                        onClick={() => setAiChatOpen(true)}
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white p-4 rounded-xl hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 text-center"
                      >
                        <Bot className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">
                          AI Assistant
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveSection("certificates")}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 text-center"
                      >
                        <Award className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">
                          Certificates
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveSection("my-receipts")}
                        className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 rounded-xl hover:from-pink-600 hover:to-red-600 transition-all duration-200 text-center"
                      >
                        <CreditCard className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">My Receipts</span>
                      </button>
                    </>
                  )}

                  {user.role === "admin" && (
                    <>
                      <button
                        onClick={() => setActiveSection("teachers")}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-center"
                      >
                        <UserPlus className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">Add Teacher</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Student Receipts Section */}
          {activeSection === "my-receipts" && user.role === "student" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                My Payment Receipts
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-200"
                  >
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center mr-3">
                        <Receipt className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          Receipt #{receipt.receipt_number}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {receipt.course_title}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-300 mb-4">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>₹{receipt.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST ({receipt.gst_rate}%):</span>
                        <span>₹{receipt.gst_amount}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-white border-t border-white/10 pt-2">
                        <span>Total:</span>
                        <span>₹{receipt.total_amount}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Issued:{" "}
                        {new Date(receipt.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Teacher: {receipt.teacher_name}
                      </p>
                    </div>

                    <a
                      href={`http://localhost:5002/receipts/${receipt.receipt_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center justify-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </a>
                  </div>
                ))}
              </div>

              {receipts.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    No receipts found
                  </h3>
                  <p className="text-gray-400">
                    Payment receipts will appear here once issued by your
                    teacher.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Settings Section */}
          {activeSection === "settings" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Settings</h2>

              {/* Profile Information */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Profile Information
                </h3>

                {user.role === "student" ? (
                  <form onSubmit={updateStudentProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <div className="px-4 py-3 bg-slate-700/30 rounded-xl text-gray-400 border border-white/10">
                          {user.email}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Role
                        </label>
                        <div className="px-4 py-3 bg-slate-700/30 rounded-xl text-gray-400 border border-white/10 capitalize">
                          {user.role}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Status
                        </label>
                        <span
                          className={`inline-flex px-4 py-3 rounded-xl text-sm font-medium ${user.status === "active"
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                            }`}
                        >
                          {user.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {loading ? "Updating..." : "Update Profile"}
                    </button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <div className="px-4 py-3 bg-slate-700/30 rounded-xl text-white border border-white/10">
                        {user.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <div className="px-4 py-3 bg-slate-700/30 rounded-xl text-white border border-white/10">
                        {user.email}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Role
                      </label>
                      <div className="px-4 py-3 bg-slate-700/30 rounded-xl text-white border border-white/10 capitalize">
                        {user.role}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Status
                      </label>
                      <span
                        className={`inline-flex px-4 py-3 rounded-xl text-sm font-medium ${user.status === "active"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                      >
                        {user.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Change Password */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Change Password
                </h3>
                <form onSubmit={changePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {loading ? "Changing..." : "Change Password"}
                  </button>
                </form>
              </div>

              {/* ADD THIS NEW EMAIL COMPONENT */}
              {user.role === 'admin' && (
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Email Configuration</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Test Email Configuration
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="email"
                          placeholder="Enter test email address"
                          className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                          id="testEmail"
                        />
                        <button
                          onClick={() => {
                            const email = document.getElementById('testEmail').value;
                            if (email) testEmailConfiguration(email);
                          }}
                          disabled={loading}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {loading ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                      <h4 className="text-sm font-medium text-white mb-2">Email Features</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>✅ Welcome emails for new users</li>
                        <li>✅ Automatic credential delivery</li>
                        <li>✅ Professional HTML templates</li>
                        <li>✅ Resend functionality</li>
                        <li>✅ Mobile-responsive design</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* System Information */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  System Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                    <p className="text-gray-400">Application Version</p>
                    <p className="font-medium text-white">LMS v2.0.0</p>
                  </div>
                  <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                    <p className="text-gray-400">Last Login</p>
                    <p className="font-medium text-white">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                    <p className="text-gray-400">Account Created</p>
                    <p className="font-medium text-white">
                      {new Date(
                        user.created_at || Date.now()
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                    <p className="text-gray-400">Server Status</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                      Online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Teachers Section */}
          {activeSection === "teachers" && user.role === "admin" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  Teacher Management
                </h2>
              </div>

              {/* Create Teacher Form */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Create New Teacher
                </h3>
                <form onSubmit={createTeacher} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={teacherForm.name}
                        onChange={(e) =>
                          setTeacherForm({
                            ...teacherForm,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        placeholder="Teacher's full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={teacherForm.email}
                        onChange={(e) =>
                          setTeacherForm({
                            ...teacherForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        placeholder="teacher@example.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {loading ? "Creating..." : "Create Teacher"}
                  </button>
                </form>
              </div>

              {/* Teachers List */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Teachers</h3>
                  {user.role === "admin" && (
                    <button
                      onClick={testEmailConfiguration}
                      disabled={loading}
                      className="bg-blue-600/80 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Test Email
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{teacher.name}</h4>
                          <p className="text-sm text-gray-400">{teacher.email}</p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>Courses: {teacher.course_count || 0}</span>
                            <span>Created: {new Date(teacher.created_at).toLocaleDateString()}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${teacher.status === "active"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-red-500/20 text-red-300"
                              }`}>
                              {teacher.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {/* ADD THIS NEW RESEND BUTTON */}
                        <button
                          onClick={() => resendCredentials(teacher.id, teacher.email)}
                          disabled={resendingEmail}
                          className="bg-blue-600/80 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                          title="Resend login credentials"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Resend
                        </button>
                        {/* Keep your existing buttons */}
                        <button
                          onClick={() => toggleTeacherStatus(teacher.id)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center ${teacher.status === "active"
                            ? "bg-red-500/80 text-white hover:bg-red-600"
                            : "bg-green-500/80 text-white hover:bg-green-600"
                            }`}
                        >
                          {teacher.status === "active" ? (
                            <>
                              <Lock className="h-4 w-4 mr-1" />
                              Block
                            </>
                          ) : (
                            <>
                              <Unlock className="h-4 w-4 mr-1" />
                              Unblock
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => deleteTeacher(teacher.id)}
                          disabled={loading}
                          className="bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all duration-200 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {teachers.length === 0 && (
                    <div className="text-center py-8">
                      <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400">No teachers created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Teacher Students Section */}
          {activeSection === "students" && user.role === "teacher" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  Student Management
                </h2>
              </div>

              {/* Create Student Form */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Create New Student
                </h3>
                <form onSubmit={createStudent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={studentForm.name}
                        onChange={(e) =>
                          setStudentForm({
                            ...studentForm,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        placeholder="Student's full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={studentForm.email}
                        onChange={(e) =>
                          setStudentForm({
                            ...studentForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        placeholder="student@example.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {loading ? "Creating..." : "Create Student"}
                  </button>
                </form>
              </div>

              {/* Students List */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  My Students
                </h3>
                <div className="space-y-4">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gradient-to-r from-green-400 to-blue-400 rounded-xl flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">
                            {student.name}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {student.email}
                          </p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>
                              Enrolled Courses: {student.enrolled_courses || 0}
                            </span>
                            <span>
                              Created:{" "}
                              {new Date(
                                student.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        disabled={loading}
                        className="bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <div className="text-center py-8">
                      <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400">No students created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Teacher Receipts Section */}
          {activeSection === "receipts" && user.role === "teacher" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  Payment Receipts
                </h2>
              </div>

              {/* Generate Receipt Form */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Generate Payment Receipt
                </h3>
                <form onSubmit={generateReceipt} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Student
                      </label>
                      <select
                        value={receiptForm.studentId}
                        onChange={(e) =>
                          setReceiptForm({
                            ...receiptForm,
                            studentId: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        required
                      >
                        <option value="">Select Student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} ({student.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Course
                      </label>
                      <select
                        value={receiptForm.courseId}
                        onChange={(e) =>
                          setReceiptForm({
                            ...receiptForm,
                            courseId: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        required
                      >
                        <option value="">Select Course</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={receiptForm.amount}
                        onChange={(e) =>
                          setReceiptForm({
                            ...receiptForm,
                            amount: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        GST Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={receiptForm.gstRate}
                        onChange={(e) =>
                          setReceiptForm({
                            ...receiptForm,
                            gstRate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        placeholder="GST Rate"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={receiptForm.description}
                      onChange={(e) =>
                        setReceiptForm({
                          ...receiptForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                      rows="3"
                      placeholder="Payment description"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Generate Receipt"}
                  </button>
                </form>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Generated Receipts
                </h3>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by student name or receipt number..."
                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400"
                      value={receiptSearch}
                      onChange={(e) => setReceiptSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <select
                      className="px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                      value={receiptFilter}
                      onChange={(e) => setReceiptFilter(e.target.value)}
                    >
                      <option value="">All Courses</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Receipts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="bg-slate-700/30 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center mr-2">
                            <Receipt className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white text-sm">
                              Receipt #{receipt.receipt_number}
                            </h4>
                            <p className="text-xs text-gray-400">
                              {receipt.course_title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {new Date(receipt.created_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              setReceiptToDelete(receipt);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-colors"
                            title="Delete Receipt"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm mb-3">
                        <div className="flex justify-between text-gray-300">
                          <span>Student:</span>
                          <span className="font-medium">
                            {receipt.student_name}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Amount:</span>
                          <span>
                            Rs. {parseFloat(receipt.amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>GST ({receipt.gst_rate}%):</span>
                          <span>
                            Rs. {parseFloat(receipt.gst_amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold text-white border-t border-white/10 pt-1">
                          <span>Total:</span>
                          <span>
                            Rs. {parseFloat(receipt.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {receipt.description && (
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                          {receipt.description}
                        </p>
                      )}

                      <div className="flex space-x-2">
                        <a
                          href={`http://localhost:5002/receipts/${receipt.receipt_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center justify-center text-sm"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </a>
                        <a
                          href={`http://localhost:5002/receipts/${receipt.receipt_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-600 text-white py-2 px-3 rounded-lg hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                        >
                          <Eye className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-6">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${currentPage === page
                              ? "bg-purple-500 text-white"
                              : "bg-slate-700/50 text-gray-300 hover:bg-slate-600"
                              }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {filteredReceipts.length === 0 && (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      No receipts generated yet
                    </h3>
                    <p className="text-gray-400">
                      {receiptSearch || receiptFilter
                        ? "No receipts match your search criteria."
                        : "Generate your first payment receipt using the form above."}
                    </p>
                  </div>
                )}
              </div>

              {/* Receipt Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center mr-3">
                      <Receipt className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Receipts</p>
                      <p className="text-lg font-bold text-white">
                        {teacherReceipts.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center mr-3">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Amount</p>
                      <p className="text-lg font-bold text-white">
                        ₹
                        {teacherReceipts
                          .reduce(
                            (sum, receipt) =>
                              sum + parseFloat(receipt.total_amount),
                            0
                          )
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">This Month</p>
                      <p className="text-lg font-bold text-white">
                        {
                          teacherReceipts.filter(
                            (receipt) =>
                              new Date(receipt.created_at).getMonth() ===
                              new Date().getMonth()
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-gradient-to-r from-pink-400 to-red-400 rounded-lg flex items-center justify-center mr-3">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Avg Amount</p>
                      <p className="text-lg font-bold text-white">
                        ₹
                        {teacherReceipts.length > 0
                          ? (
                            teacherReceipts.reduce(
                              (sum, receipt) =>
                                sum + parseFloat(receipt.total_amount),
                              0
                            ) / teacherReceipts.length
                          ).toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Certificates Section */}
          {activeSection === "certificates" && user.role === "student" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">My Certificates</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-yellow-500/30 transition-all duration-200"
                  >
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center mr-3">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {cert.course_name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Certificate of Completion
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-300 mb-4">
                      <p>
                        <strong>Issued:</strong>{" "}
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Code:</strong>{" "}
                        <span className="font-mono text-xs">
                          {cert.certificate_code}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {cert.description}
                      </p>
                    </div>

                    <a
                      href={`http://localhost:5002/certificates/${cert.certificate_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 flex items-center justify-center font-medium"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </a>
                  </div>
                ))}
              </div>

              {certificates.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    No certificates yet
                  </h3>
                  <p className="text-gray-400">
                    Complete courses and submit projects to earn certificates.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Courses Section */}
          {activeSection === "courses" && (
            <div className="space-y-6">
              {selectedCourse === "create" ? (
                /* Enhanced Create Course Form */
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    Create New Course
                  </h2>
                  <form onSubmit={createCourse} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Course Title
                      </label>
                      <input
                        type="text"
                        required
                        value={courseForm.title}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        placeholder="Enter course title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        required
                        value={courseForm.description}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        rows="3"
                        placeholder="Enter course description"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Duration (Days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={courseForm.duration_days}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              duration_days: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Group Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={courseForm.group_link}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              group_link: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                          placeholder="https://chat.whatsapp.com/..."
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200"
                      >
                        {loading ? "Creating..." : "Create Course"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCourse(null)}
                        className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : editingCourse ? (
                /* Enhanced Edit Course Form */
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    Edit Course
                  </h2>
                  <form onSubmit={updateCourse} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Course Title
                      </label>
                      <input
                        type="text"
                        required
                        value={courseForm.title}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        required
                        value={courseForm.description}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        rows="3"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Duration (Days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={courseForm.duration_days}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              duration_days: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Group Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={courseForm.group_link}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              group_link: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                          placeholder="https://chat.whatsapp.com/..."
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200"
                      >
                        {loading ? "Updating..." : "Update Course"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourse(null);
                          setCourseForm({
                            title: "",
                            description: "",
                            duration_days: 30,
                            group_link: ""
                          });
                        }}
                        className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : selectedCourse ? (
                /* Enhanced Course Details with Group Link Management */
                <div className="space-y-6">
                  {/* Course Header with Group Link */}
                  <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white">
                          {selectedCourse.title}
                        </h2>
                        <p className="text-gray-300 mt-2">
                          {selectedCourse.description}
                        </p>
                        {user.role === "teacher" && (
                          <p className="text-sm text-gray-400 mt-2">
                            Duration: {selectedCourse.duration_days} days
                          </p>
                        )}

                        {/* Group Link Display for Students */}
                        {user.role === "student" && courseGroupLink && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl border border-green-500/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-green-300 font-medium">Join Study Group</h3>
                                <p className="text-green-200/80 text-sm">Connect with your classmates</p>
                              </div>
                              <button
                                onClick={() => joinGroup(selectedCourse.id, courseGroupLink)}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Join Group
                              </button>
                            </div>
                          </div>
                        )}

                        {/* No Group Link Message for Students */}
                        {user.role === "student" && !courseGroupLink && (
                          <div className="mt-4 p-4 bg-slate-700/30 rounded-xl border border-white/10">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 text-gray-400 mr-2" />
                              <p className="text-gray-400 text-sm">No study group available for this course yet.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        {user.role === "teacher" && (
                          <>
                            <button
                              onClick={() => startEditingCourse(selectedCourse)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteCourse(selectedCourse.id)}
                              className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedCourse(null)}
                          className="bg-slate-600 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                        >
                          Back to Courses
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Tabs with Overview */}
                  <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/10">
                    <div className="border-b border-white/10">
                      <nav className="flex space-x-8 px-6">
                        {[
                          "overview",
                          "sessions",
                          "assignments", // Add this line
                          user.role === "teacher" ? "students" : "project",
                          user.role === "teacher" ? "projects" : null,
                          user.role === "teacher" ? "attendance" : null,
                        ]
                          .filter(Boolean)
                          .map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${activeTab === tab
                                ? "border-purple-500 text-purple-400"
                                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500"
                                }`}
                            >
                              {tab}
                            </button>
                          ))}
                      </nav>
                    </div>

                    <div className="p-6">
                      {/* Enhanced Overview Tab with Group Management */}
                      {activeTab === "overview" && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-white">
                            Course Overview
                          </h3>

                          {/* Group Link Management for Teachers */}
                          {user.role === "teacher" && (
                            <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                              <h4 className="text-lg font-medium text-white mb-4">Study Group Management</h4>

                              {courseGroupLink ? (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between p-3 bg-green-500/20 rounded-xl border border-green-500/30">
                                    <div>
                                      <p className="text-green-300 font-medium">Group Link Active</p>
                                      <p className="text-green-200/80 text-sm">Students can join the study group</p>
                                      <p className="text-green-200/60 text-xs mt-1 font-mono break-all">
                                        {courseGroupLink}
                                      </p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => window.open(courseGroupLink, '_blank')}
                                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center"
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Visit
                                      </button>
                                      <button
                                        onClick={() => updateGroupLink(selectedCourse.id, "")}
                                        disabled={groupLinkLoading}
                                        className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm flex items-center"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="p-3 bg-slate-600/30 rounded-xl border border-white/10">
                                    <p className="text-gray-300 text-sm">No study group link set. Add one to help students connect!</p>
                                  </div>
                                </div>
                              )}

                              <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Add/Update Group Link
                                </label>
                                <div className="flex space-x-2">
                                  <input
                                    type="url"
                                    value={groupLinkForm}
                                    onChange={(e) => setGroupLinkForm(e.target.value)}
                                    placeholder="https://chat.whatsapp.com/... or any group link"
                                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                  />
                                  <button
                                    onClick={() => updateGroupLink(selectedCourse.id, groupLinkForm)}
                                    disabled={groupLinkLoading || !groupLinkForm.trim()}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    {groupLinkLoading ? "Updating..." : "Update"}
                                  </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                  Supported: WhatsApp, Telegram, Discord, Slack, or any group chat link
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Statistics Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/30">
                              <div className="flex items-center">
                                <Calendar className="h-8 w-8 text-blue-400" />
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-400">
                                    Sessions
                                  </p>
                                  <p className="text-2xl font-bold text-white">
                                    {sessions.length}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {user.role === "teacher" && (
                              <div className="bg-green-500/20 p-4 rounded-xl border border-green-500/30">
                                <div className="flex items-center">
                                  <Users className="h-8 w-8 text-green-400" />
                                  <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-400">
                                      Students
                                    </p>
                                    <p className="text-2xl font-bold text-white">
                                      {students.length}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="bg-purple-500/20 p-4 rounded-xl border border-purple-500/30">
                              <div className="flex items-center">
                                <Users className="h-8 w-8 text-purple-400" />
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-400">
                                    {user.role === "teacher"
                                      ? "Study Group"
                                      : "Group Access"}
                                  </p>
                                  <p className="text-2xl font-bold text-white">
                                    {courseGroupLink ? "Active" : "None"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Course Information */}
                          <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                            <h4 className="text-lg font-medium text-white mb-3">Course Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">Duration:</span>
                                <span className="text-white ml-2">{selectedCourse.duration_days} days</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Created:</span>
                                <span className="text-white ml-2">
                                  {new Date(selectedCourse.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {user.role === "teacher" && (
                                <>
                                  <div>
                                    <span className="text-gray-400">Enrolled Students:</span>
                                    <span className="text-white ml-2">{students.length}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Total Sessions:</span>
                                    <span className="text-white ml-2">{sessions.length}</span>
                                  </div>
                                </>
                              )}
                              {user.role === "student" && (
                                <>
                                  <div>
                                    <span className="text-gray-400">Teacher:</span>
                                    <span className="text-white ml-2">{selectedCourse.teacher_name}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Status:</span>
                                    <span className={`ml-2 ${selectedCourse.completed_at ? 'text-green-300' : 'text-blue-300'}`}>
                                      {selectedCourse.completed_at ? 'Completed' : 'In Progress'}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          {user.role === "teacher" && (
                            <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                              <h4 className="text-lg font-medium text-white mb-3">Quick Actions</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button
                                  onClick={() => setActiveTab("sessions")}
                                  className="bg-blue-500/20 text-blue-300 p-3 rounded-xl hover:bg-blue-500/30 transition-colors text-center border border-blue-500/30"
                                >
                                  <Calendar className="h-5 w-5 mx-auto mb-1" />
                                  <span className="text-sm">Sessions</span>
                                </button>
                                <button
                                  onClick={() => setActiveTab("students")}
                                  className="bg-green-500/20 text-green-300 p-3 rounded-xl hover:bg-green-500/30 transition-colors text-center border border-green-500/30"
                                >
                                  <Users className="h-5 w-5 mx-auto mb-1" />
                                  <span className="text-sm">Students</span>
                                </button>
                                <button
                                  onClick={() => setActiveTab("projects")}
                                  className="bg-purple-500/20 text-purple-300 p-3 rounded-xl hover:bg-purple-500/30 transition-colors text-center border border-purple-500/30"
                                >
                                  <FileText className="h-5 w-5 mx-auto mb-1" />
                                  <span className="text-sm">Projects</span>
                                </button>
                                <button
                                  onClick={() => setActiveTab("attendance")}
                                  className="bg-yellow-500/20 text-yellow-300 p-3 rounded-xl hover:bg-yellow-500/30 transition-colors text-center border border-yellow-500/30"
                                >
                                  <UserCheck className="h-5 w-5 mx-auto mb-1" />
                                  <span className="text-sm">Attendance</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sessions Tab */}
                      {activeTab === "sessions" && (
                        <div className="space-y-6">
                          {/* Create/Edit Session Form for Teachers */}
                          {user.role === "teacher" && (
                            <div className="border-b border-white/10 pb-6">
                              <h3 className="text-lg font-semibold text-white mb-4">
                                {editingSession
                                  ? "Edit Session"
                                  : "Create Session"}
                              </h3>
                              <form
                                onSubmit={
                                  editingSession ? updateSession : createSession
                                }
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Session Title
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={sessionForm.title}
                                      onChange={(e) =>
                                        setSessionForm({
                                          ...sessionForm,
                                          title: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      placeholder="Session title"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Session Date
                                    </label>
                                    <input
                                      type="date"
                                      required
                                      value={sessionForm.sessionDate}
                                      onChange={(e) =>
                                        setSessionForm({
                                          ...sessionForm,
                                          sessionDate: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Notes
                                  </label>
                                  <textarea
                                    value={sessionForm.notes}
                                    onChange={(e) =>
                                      setSessionForm({
                                        ...sessionForm,
                                        notes: e.target.value,
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    rows="3"
                                    placeholder="Session notes"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Meet Link
                                  </label>
                                  <input
                                    type="url"
                                    value={sessionForm.meetLink}
                                    onChange={(e) =>
                                      setSessionForm({
                                        ...sessionForm,
                                        meetLink: e.target.value,
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    placeholder="https://meet.google.com/..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Notes File (Optional)
                                  </label>
                                  <input
                                    type="file"
                                    onChange={(e) =>
                                      setSessionForm({
                                        ...sessionForm,
                                        notesFile: e.target.files[0],
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    accept=".pdf,.doc,.docx,.txt"
                                  />
                                </div>
                                <div className="flex space-x-3">
                                  <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    {loading
                                      ? editingSession
                                        ? "Updating..."
                                        : "Creating..."
                                      : editingSession
                                        ? "Update Session"
                                        : "Create Session"}
                                  </button>
                                  {editingSession && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSession(null);
                                        setSessionForm({
                                          title: "",
                                          notes: "",
                                          meetLink: "",
                                          sessionDate: new Date()
                                            .toISOString()
                                            .split("T")[0],
                                          notesFile: null,
                                        });
                                      }}
                                      className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-all duration-200"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          )}

                          {/* Sessions List */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Course Sessions
                            </h3>
                            <div className="space-y-4">
                              {sessions.map((session) => (
                                <div
                                  key={session.id}
                                  className="bg-slate-700/30 rounded-xl p-4 border border-white/10"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-white">
                                        {session.title}
                                      </h4>
                                      <p className="text-sm text-gray-400 mt-1">
                                        Date:{" "}
                                        {new Date(
                                          session.session_date
                                        ).toLocaleDateString()}
                                      </p>
                                      {session.notes && (
                                        <p className="text-sm text-gray-300 mt-2">
                                          {session.notes}
                                        </p>
                                      )}
                                      {session.notes_file && (
                                        <a
                                          href={`http://localhost:5002/uploads/${session.notes_file}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mt-2"
                                        >
                                          <Upload className="h-4 w-4 mr-1" />
                                          Download Notes
                                        </a>
                                      )}
                                    </div>
                                    <div className="flex flex-col space-y-2 ml-4">
                                      {user.role === "student" && (
                                        <div className="flex flex-col space-y-2">
                                          {!session.marked_read ? (
                                            <button
                                              onClick={() =>
                                                markAsRead(session.id)
                                              }
                                              className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-700 transition-colors flex items-center"
                                            >
                                              <Clock className="h-3 w-3 mr-1" />
                                              Mark Read
                                            </button>
                                          ) : (
                                            <span className="text-green-400 text-sm flex items-center">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Read
                                            </span>
                                          )}
                                          {session.meet_link && (
                                            <button
                                              onClick={() =>
                                                joinMeet(
                                                  session.id,
                                                  session.meet_link
                                                )
                                              }
                                              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
                                            >
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Join Meet
                                            </button>
                                          )}
                                        </div>
                                      )}
                                      {user.role === "teacher" && (
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() =>
                                              startEditingSession(session)
                                            }
                                            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              deleteSession(session.id)
                                            }
                                            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sessions.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-gray-400">
                                    No sessions available yet.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Students Tab for Teachers */}
                      {activeTab === "students" && user.role === "teacher" && (
                        <div className="space-y-6">
                          {/* Add Student Form */}
                          <div className="border-b border-white/10 pb-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Add Student to Course
                            </h3>
                            <form
                              onSubmit={addStudent}
                              className="flex space-x-3"
                            >
                              <input
                                type="email"
                                placeholder="Student email"
                                value={studentEmail}
                                onChange={(e) =>
                                  setStudentEmail(e.target.value)
                                }
                                className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                required
                              />
                              <button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Add Student
                              </button>
                            </form>
                          </div>

                          {/* Students List */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Enrolled Students
                            </h3>
                            <div className="space-y-3">
                              {students.map((student) => (
                                <div
                                  key={student.id}
                                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/10"
                                >
                                  <div>
                                    <h4 className="font-medium text-white">
                                      {student.name}
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                      {student.email}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                      <span>
                                        Enrolled:{" "}
                                        {new Date(
                                          student.enrolled_at
                                        ).toLocaleDateString()}
                                      </span>
                                      {student.completed_at && (
                                        <span className="text-green-400">
                                          Completed:{" "}
                                          {new Date(
                                            student.completed_at
                                          ).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                      <span>
                                        Attendance: {student.present_count || 0}
                                        /{student.total_attendance || 0}
                                      </span>
                                      {student.project_status && (
                                        <span
                                          className={`px-2 py-1 rounded text-xs ${student.project_status ===
                                            "approved"
                                            ? "bg-green-500/20 text-green-300"
                                            : student.project_status ===
                                              "rejected"
                                              ? "bg-red-500/20 text-red-300"
                                              : "bg-yellow-500/20 text-yellow-300"
                                            }`}
                                        >
                                          Project: {student.project_status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeStudent(student.id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors flex items-center"
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Remove
                                  </button>
                                </div>
                              ))}
                              {students.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Users className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-gray-400">
                                    No students enrolled yet.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Project Tab for Students */}
                      {activeTab === "project" && user.role === "student" && (
                        <div className="space-y-6">
                          {/* Project Submission Form */}
                          {!currentProject ||
                            currentProject.status === "rejected" ? (
                            <div className="border-b border-white/10 pb-6">
                              <h3 className="text-lg font-semibold text-white mb-4">
                                {currentProject?.status === "rejected"
                                  ? "Resubmit Project"
                                  : "Submit Project"}
                              </h3>
                              {currentProject?.status === "rejected" && (
                                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                                  <p className="text-red-300 font-medium">
                                    Previous submission was rejected
                                  </p>
                                  {currentProject.teacher_feedback && (
                                    <p className="text-red-200 text-sm mt-1">
                                      Feedback:{" "}
                                      {currentProject.teacher_feedback}
                                    </p>
                                  )}
                                </div>
                              )}
                              <form
                                onSubmit={submitProject}
                                className="space-y-4"
                              >
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Project Title
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={projectForm.title}
                                    onChange={(e) =>
                                      setProjectForm({
                                        ...projectForm,
                                        title: e.target.value,
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    placeholder="Enter project title"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Project Description
                                  </label>
                                  <textarea
                                    required
                                    value={projectForm.description}
                                    onChange={(e) =>
                                      setProjectForm({
                                        ...projectForm,
                                        description: e.target.value,
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    rows="4"
                                    placeholder="Describe your project"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Project File
                                  </label>
                                  <input
                                    type="file"
                                    required
                                    onChange={(e) =>
                                      setProjectForm({
                                        ...projectForm,
                                        projectFile: e.target.files[0],
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    accept=".pdf,.doc,.docx,.zip,.rar"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={loading}
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {loading ? "Submitting..." : "Submit Project"}
                                </button>
                              </form>
                            </div>
                          ) : (
                            /* Current Project Status */
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-4">
                                Your Project
                              </h3>
                              <div className="bg-slate-700/30 rounded-xl p-4 border border-white/10">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium text-white">
                                      {currentProject.title}
                                    </h4>
                                    <p className="text-sm text-gray-300 mt-1">
                                      {currentProject.description}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-2">
                                      Submitted:{" "}
                                      {new Date(
                                        currentProject.submission_date
                                      ).toLocaleDateString()}
                                    </p>
                                    {currentProject.project_file && (
                                      <a
                                        href={`http://localhost:5002/uploads/${currentProject.project_file}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mt-2"
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download Submitted File
                                      </a>
                                    )}
                                    {currentProject.teacher_feedback && (
                                      <div className="mt-3 p-3 bg-slate-600/50 rounded-xl">
                                        <p className="text-sm font-medium text-gray-300">
                                          Teacher Feedback:
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                          {currentProject.teacher_feedback}
                                        </p>
                                      </div>
                                    )}
                                    {currentProject.verified_by_name && (
                                      <p className="text-sm text-gray-400 mt-2">
                                        Verified by:{" "}
                                        {currentProject.verified_by_name}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${currentProject.status === "approved"
                                      ? "bg-green-500/20 text-green-300"
                                      : currentProject.status === "rejected"
                                        ? "bg-red-500/20 text-red-300"
                                        : "bg-yellow-500/20 text-yellow-300"
                                      }`}
                                  >
                                    {currentProject.status
                                      .charAt(0)
                                      .toUpperCase() +
                                      currentProject.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                              {currentProject.status === "approved" && (
                                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                                  <div className="flex items-center">
                                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                                    <p className="text-green-300 font-medium">
                                      Congratulations! Your project has been
                                      approved and your certificate has been
                                      generated.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Projects Tab for Teachers */}
                      {activeTab === "projects" && user.role === "teacher" && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-white">
                            Student Projects
                          </h3>
                          <div className="space-y-4">
                            {projects.map((project) => (
                              <div
                                key={project.id}
                                className="bg-slate-700/30 rounded-xl p-4 border border-white/10"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-white">
                                      {project.title}
                                    </h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                      Student: {project.student_name} (
                                      {project.student_email})
                                    </p>
                                    <p className="text-sm text-gray-300 mt-2">
                                      {project.description}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-2">
                                      Submitted:{" "}
                                      {new Date(
                                        project.submission_date
                                      ).toLocaleDateString()}
                                    </p>
                                    {project.project_file && (
                                      <a
                                        href={`http://localhost:5002/uploads/${project.project_file}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mt-2"
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download Project File
                                      </a>
                                    )}
                                    {project.teacher_feedback && (
                                      <div className="mt-3 p-3 bg-slate-600/50 rounded-xl">
                                        <p className="text-sm font-medium text-gray-300">
                                          Your Feedback:
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                          {project.teacher_feedback}
                                        </p>
                                      </div>
                                    )}
                                    {project.verified_by_name && (
                                      <p className="text-sm text-gray-400 mt-2">
                                        Verified by: {project.verified_by_name}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end space-y-2 ml-4">
                                    <span
                                      className={`px-3 py-1 rounded-full text-sm font-medium ${project.status === "approved"
                                        ? "bg-green-500/20 text-green-300"
                                        : project.status === "rejected"
                                          ? "bg-red-500/20 text-red-300"
                                          : "bg-yellow-500/20 text-yellow-300"
                                        }`}
                                    >
                                      {project.status.charAt(0).toUpperCase() +
                                        project.status.slice(1)}
                                    </span>
                                    {project.status === "submitted" && (
                                      <div className="flex flex-col space-y-2">
                                        <textarea
                                          placeholder="Feedback (optional)"
                                          value={projectFeedback}
                                          onChange={(e) =>
                                            setProjectFeedback(e.target.value)
                                          }
                                          className="w-48 px-3 py-2 bg-slate-600/50 border border-white/20 rounded-xl text-sm text-white"
                                          rows="2"
                                        />
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() =>
                                              verifyProject(
                                                project.id,
                                                "approved",
                                                projectFeedback
                                              )
                                            }
                                            disabled={loading}
                                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                                          >
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Approve
                                          </button>
                                          <button
                                            onClick={() =>
                                              verifyProject(
                                                project.id,
                                                "rejected",
                                                projectFeedback
                                              )
                                            }
                                            disabled={loading}
                                            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center"
                                          >
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Reject
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {projects.length === 0 && (
                              <div className="text-center py-8">
                                <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                  <FileText className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-400">
                                  No projects submitted yet.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Attendance Tab for Teachers */}
                      {activeTab === "attendance" &&
                        user.role === "teacher" && (
                          <div className="space-y-6">
                            {/* Mark Attendance Form */}
                            <div className="border-b border-white/10 pb-6">
                              <h3 className="text-lg font-semibold text-white mb-4">
                                Mark Attendance
                              </h3>
                              <form
                                onSubmit={markAttendance}
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Student
                                    </label>
                                    <select
                                      value={attendanceForm.studentId}
                                      onChange={(e) =>
                                        setAttendanceForm({
                                          ...attendanceForm,
                                          studentId: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      required
                                    >
                                      <option value="">Select Student</option>
                                      {students.map((student) => (
                                        <option
                                          key={student.id}
                                          value={student.id}
                                        >
                                          {student.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Date
                                    </label>
                                    <input
                                      type="date"
                                      value={attendanceForm.sessionDate}
                                      onChange={(e) =>
                                        setAttendanceForm({
                                          ...attendanceForm,
                                          sessionDate: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Status
                                    </label>
                                    <select
                                      value={attendanceForm.status}
                                      onChange={(e) =>
                                        setAttendanceForm({
                                          ...attendanceForm,
                                          status: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    >
                                      <option value="present">Present</option>
                                      <option value="absent">Absent</option>
                                      <option value="late">Late</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Notes (Optional)
                                  </label>
                                  <textarea
                                    value={attendanceForm.notes}
                                    onChange={(e) =>
                                      setAttendanceForm({
                                        ...attendanceForm,
                                        notes: e.target.value,
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    rows="2"
                                    placeholder="Additional notes"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={loading}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  {loading ? "Marking..." : "Mark Attendance"}
                                </button>
                              </form>
                            </div>

                            {/* Attendance Records */}
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">
                                  Attendance Records
                                </h3>
                                <input
                                  type="date"
                                  onChange={(e) =>
                                    fetchAttendance(
                                      selectedCourse.id,
                                      e.target.value
                                    )
                                  }
                                  className="px-4 py-2 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                  placeholder="Filter by date"
                                />
                              </div>
                              <div className="space-y-3">
                                {attendance.map((record) => (
                                  <div
                                    key={record.id}
                                    className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/10"
                                  >
                                    <div>
                                      <h4 className="font-medium text-white">
                                        {record.student_name}
                                      </h4>
                                      <p className="text-sm text-gray-400">
                                        {record.student_email}
                                      </p>
                                      <p className="text-sm text-gray-400">
                                        Date:{" "}
                                        {new Date(
                                          record.session_date
                                        ).toLocaleDateString()}
                                      </p>
                                      {record.notes && (
                                        <p className="text-sm text-gray-300 mt-1">
                                          Notes: {record.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${record.status === "present"
                                          ? "bg-green-500/20 text-green-300"
                                          : record.status === "late"
                                            ? "bg-yellow-500/20 text-yellow-300"
                                            : "bg-red-500/20 text-red-300"
                                          }`}
                                      >
                                        {record.status.charAt(0).toUpperCase() +
                                          record.status.slice(1)}
                                      </span>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Marked by: {record.marked_by_name}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                {attendance.length === 0 && (
                                  <div className="text-center py-8">
                                    <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                      <UserCheck className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-400">
                                      No attendance records found.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Assignments Tab - Updated */}
                      {activeTab === "assignments" && (
                        <div className="space-y-6">
                          {/* Create/Edit Assignment Form for Teachers */}
                          {user.role === "teacher" && (
                            <div className="border-b border-white/10 pb-6">
                              <h3 className="text-lg font-semibold text-white mb-4">
                                {editingAssignment ? "Edit Assignment" : "Create Assignment"}
                              </h3>
                              <form onSubmit={editingAssignment ? updateAssignment : createAssignment} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Assignment Title *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={assignmentForm.title}
                                      onChange={(e) =>
                                        setAssignmentForm({
                                          ...assignmentForm,
                                          title: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      placeholder="Assignment title"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Assignment File (Optional)
                                    </label>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        setAssignmentForm({
                                          ...assignmentForm,
                                          assignmentFile: e.target.files[0],
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description
                                  </label>
                                  <textarea
                                    value={assignmentForm.description}
                                    onChange={(e) =>
                                      setAssignmentForm({
                                        ...assignmentForm,
                                        description: e.target.value,
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    rows="3"
                                    placeholder="Assignment description"
                                  />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Start Date *
                                    </label>
                                    <input
                                      type="date"
                                      required
                                      value={assignmentForm.startDate}
                                      onChange={(e) =>
                                        setAssignmentForm({
                                          ...assignmentForm,
                                          startDate: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      End Date *
                                    </label>
                                    <input
                                      type="date"
                                      required
                                      value={assignmentForm.endDate}
                                      onChange={(e) =>
                                        setAssignmentForm({
                                          ...assignmentForm,
                                          endDate: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    />
                                  </div>
                                </div>
                                <div className="flex space-x-3">
                                  <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    {loading ? (editingAssignment ? "Updating..." : "Creating...") : (editingAssignment ? "Update Assignment" : "Create Assignment")}
                                  </button>
                                  {editingAssignment && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAssignment(null);
                                        setAssignmentForm({
                                          title: "",
                                          description: "",
                                          startDate: new Date().toISOString().split("T")[0],
                                          endDate: "",
                                          assignmentFile: null,
                                        });
                                      }}
                                      className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-all duration-200"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          )}

                          {/* Assignments List */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Course Assignments
                            </h3>
                            <div className="space-y-4">
                              {assignments.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="bg-slate-700/30 rounded-xl p-4 border border-white/10"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-medium text-white">
                                          {assignment.title}
                                        </h4>
                                        {user.role === "student" && assignment.is_overdue && !assignment.submission && (
                                          <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                                            Past Due
                                          </span>
                                        )}
                                        {user.role === "student" && assignment.submission && (
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`px-2 py-1 text-xs rounded-full border ${assignment.submission.status === "approved"
                                                ? "bg-green-500/20 text-green-300 border-green-500/30"
                                                : assignment.submission.status === "rejected"
                                                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                                                  : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                                }`}
                                            >
                                              {assignment.submission.status}
                                            </span>
                                            {assignment.submission.is_after_due_date && (
                                              <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                                                Submitted After Due Date
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {assignment.description && (
                                        <p className="text-sm text-gray-300 mb-2">
                                          {assignment.description}
                                        </p>
                                      )}
                                      <div className="text-sm text-gray-400 space-y-1">
                                        <p>
                                          Start: {new Date(assignment.start_date).toLocaleDateString()}
                                        </p>
                                        <p>
                                          Due: {new Date(assignment.end_date).toLocaleDateString()}
                                        </p>
                                        {assignment.assignment_file && (
                                          <a
                                            href={`http://localhost:5002/uploads/${assignment.assignment_file}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-purple-400 hover:text-purple-300"
                                          >
                                            <Download className="h-4 w-4 mr-1" />
                                            Download Assignment File
                                          </a>
                                        )}
                                        {user.role === "teacher" && (
                                          <p>Submissions: {assignment.submission_count}</p>
                                        )}
                                      </div>

                                      {/* Student Submission Form */}
                                      {user.role === "student" && (!assignment.submission || assignment.submission.status === "rejected") && (
                                        <div className="mt-4 p-4 bg-slate-600/30 rounded-xl border border-white/10">
                                          <h5 className="text-white font-medium mb-3">
                                            {assignment.submission?.status === "rejected" ? "Resubmit Assignment" : "Submit Assignment"}
                                            {assignment.is_overdue && (
                                              <span className="text-orange-300 text-sm ml-2">(Past Due Date)</span>
                                            )}
                                          </h5>
                                          {assignment.submission?.status === "rejected" && assignment.submission.teacher_feedback && (
                                            <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                                              <p className="text-red-300 font-medium text-sm">Previous submission was rejected:</p>
                                              <p className="text-red-200 text-sm mt-1">{assignment.submission.teacher_feedback}</p>
                                            </div>
                                          )}
                                          <form onSubmit={(e) => submitAssignment(e, assignment.id)} className="space-y-3">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Submission Link (GitHub, Drive, etc.)
                                              </label>
                                              <input
                                                type="url"
                                                value={submissionForm.submissionLink}
                                                onChange={(e) =>
                                                  setSubmissionForm({
                                                    ...submissionForm,
                                                    submissionLink: e.target.value,
                                                  })
                                                }
                                                className="w-full px-3 py-2 bg-slate-700/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-white text-sm"
                                                placeholder="https://github.com/username/repo"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Upload File
                                              </label>
                                              <input
                                                type="file"
                                                onChange={(e) =>
                                                  setSubmissionForm({
                                                    ...submissionForm,
                                                    submissionFile: e.target.files[0],
                                                  })
                                                }
                                                className="w-full px-3 py-2 bg-slate-700/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-white text-sm"
                                                accept=".pdf,.doc,.docx,.zip,.rar,.txt"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Message
                                              </label>
                                              <textarea
                                                value={submissionForm.message}
                                                onChange={(e) =>
                                                  setSubmissionForm({
                                                    ...submissionForm,
                                                    message: e.target.value,
                                                  })
                                                }
                                                className="w-full px-3 py-2 bg-slate-700/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-white text-sm"
                                                rows="2"
                                                placeholder="Additional message or notes"
                                              />
                                            </div>
                                            <p className="text-xs text-gray-400">
                                              * At least one of the above fields (link, file, or message) is required
                                            </p>
                                            <button
                                              type="submit"
                                              disabled={loading || (!submissionForm.submissionLink && !submissionForm.submissionFile && !submissionForm.message)}
                                              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 text-sm flex items-center"
                                            >
                                              <Upload className="h-3 w-3 mr-1" />
                                              {loading ? "Submitting..." : (assignment.submission?.status === "rejected" ? "Resubmit Assignment" : "Submit Assignment")}
                                            </button>
                                          </form>
                                        </div>
                                      )}

                                      {/* Student Submission Display */}
                                      {user.role === "student" && assignment.submission && assignment.submission.status !== "rejected" && (
                                        <div className="mt-4 p-4 bg-slate-600/30 rounded-xl border border-white/10">
                                          <h5 className="text-white font-medium mb-3">Your Submission</h5>
                                          <div className="space-y-2 text-sm">
                                            {assignment.submission.submission_link && (
                                              <div>
                                                <span className="text-gray-400">Link: </span>
                                                <a
                                                  href={assignment.submission.submission_link}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-purple-400 hover:text-purple-300"
                                                >
                                                  {assignment.submission.submission_link}
                                                </a>
                                              </div>
                                            )}
                                            {assignment.submission.submission_file && (
                                              <div>
                                                <span className="text-gray-400">File: </span>
                                                <a
                                                  href={`http://localhost:5002/uploads/${assignment.submission.submission_file}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-purple-400 hover:text-purple-300"
                                                >
                                                  Download Submitted File
                                                </a>
                                              </div>
                                            )}
                                            {assignment.submission.message && (
                                              <div>
                                                <span className="text-gray-400">Message: </span>
                                                <span className="text-gray-300">
                                                  {assignment.submission.message}
                                                </span>
                                              </div>
                                            )}
                                            <div>
                                              <span className="text-gray-400">Submitted: </span>
                                              <span className="text-gray-300">
                                                {new Date(assignment.submission.submitted_at).toLocaleString()}
                                              </span>
                                            </div>
                                            {assignment.submission.teacher_feedback && (
                                              <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                                                <span className="text-gray-400 font-medium">Teacher Feedback: </span>
                                                <p className="text-gray-300 mt-1">{assignment.submission.teacher_feedback}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Teacher Actions */}
                                    {user.role === "teacher" && (
                                      <div className="flex flex-col space-y-2 ml-4">
                                        <button
                                          onClick={() => startEditingAssignment(assignment)}
                                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedAssignment(assignment);
                                            fetchAssignmentSubmissions(assignment.id);
                                          }}
                                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Submissions
                                        </button>
                                        <button
                                          onClick={() => deleteAssignment(assignment.id)}
                                          className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {assignments.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FileText className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-gray-400">
                                    No assignments available yet.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Courses List */
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">
                      {user.role === "teacher"
                        ? "My Courses"
                        : "Enrolled Courses"}
                    </h2>
                    {user.role === "teacher" && (
                      <button
                        onClick={() => setSelectedCourse("create")}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Course
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => {
                          setSelectedCourse(course);
                          setActiveTab("overview");
                        }}
                        // className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:bg-slate-700/50 transition-all duration-200 border border-white/10 hover:border-purple-500/30 group"
                        className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:bg-slate-700/50 transition-all duration-200 border border-white/10 hover:border-purple-500/30 group relative"
                      >
                        {/* Group Link Indicator */}
                        {course.group_link && (
                          <div className="absolute top-4 right-4">
                            <div className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs border border-green-500/30 flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              Group
                            </div>
                          </div>
                        )}
                        <div className="flex items-center mb-4">
                          <div className="h-12 w-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl flex items-center justify-center mr-3">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-lg group-hover:text-purple-300 transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {course.description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-400">
                          {user.role === "teacher" && (
                            <div className="flex justify-between">
                              <span>
                                Students: {course.enrolled_students || 0}
                              </span>
                              <span>Duration: {course.duration_days} days</span>
                            </div>
                          )}

                          {user.role === "student" && (
                            <div className="flex justify-between items-center">
                              <span>Teacher: {course.teacher_name}</span>
                              <div className="flex items-center space-x-2">
                                {course.group_link && (
                                  <span className="flex items-center text-green-400 text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    Group Available
                                  </span>
                                )}
                                {course.completed_at && (
                                  <span className="flex items-center text-green-400">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <span>
                              Created:{" "}
                              {new Date(course.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex items-center space-x-2">
                              {course.group_link && (
                                <span className="text-green-400 text-xs">📱</span>
                              )}
                              <span className="text-purple-400 group-hover:text-purple-300 font-medium">
                                View Details →
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {courses.length === 0 && (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        No courses available
                      </h3>
                      <p className="text-gray-400">
                        {user.role === "teacher"
                          ? "Create your first course to get started."
                          : "You are not enrolled in any courses yet. Contact your teacher to get enrolled."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
          }
        </div >
        {showDeleteModal && receiptToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 w-full max-w-md border border-white/20">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-red-500/20 rounded-full flex items-center justify-center mr-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Delete Receipt
                </h3>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-2">
                  Are you sure you want to delete this receipt?
                </p>
                <div className="bg-slate-700/50 p-3 rounded-xl border border-white/10">
                  <p className="text-sm text-white">
                    <strong>Receipt:</strong> #{receiptToDelete.receipt_number}
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Student:</strong> {receiptToDelete.student_name}
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Amount:</strong> Rs.{" "}
                    {parseFloat(receiptToDelete.total_amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Course:</strong> {receiptToDelete.course_title}
                  </p>
                </div>
                <p className="text-red-300 text-sm mt-2">
                  ⚠️ This action cannot be undone. The PDF file will also be
                  permanently deleted.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => deleteReceipt(receiptToDelete.id)}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {loading ? "Deleting..." : "Delete Receipt"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setReceiptToDelete(null);
                  }}
                  disabled={loading}
                  className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Mobile overlay */}
        {
          sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden z-20"
              onClick={() => setSidebarOpen(false)}
            />
          )
        }
      </div >
    </div >
  );
};

export default LearningManagementSystem;
