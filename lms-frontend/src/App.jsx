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

// Add the CSS constant here:
const videoSecurityStyles = `
  .video-security-container {
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
    -khtml-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-user-drag: none !important;
    -khtml-user-drag: none !important;
    -moz-user-drag: none !important;
    -o-user-drag: none !important;
    user-drag: none !important;
  }

  video {
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
    -khtml-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-user-drag: none !important;
    pointer-events: auto !important;
  }

  video::-webkit-media-controls-download-button {
    display: none !important;
  }
  
  video::-webkit-media-controls-fullscreen-button {
    display: none !important;
  }
  
  video::-webkit-media-controls-picture-in-picture-button {
    display: none !important;
  }
  
  video::-webkit-media-controls-enclosure {
    overflow: hidden !important;
  }

  video::-webkit-media-controls-panel {
    background-color: rgba(0, 0, 0, 0.8) !important;
  }
  
  @media print {
    video, .video-security-container {
      display: none !important;
      visibility: hidden !important;
    }
  }
  
  @keyframes moveWatermark {
    0% { top: 10%; left: 10%; }
    25% { top: 10%; left: 80%; }
    50% { top: 80%; left: 80%; }
    75% { top: 80%; left: 10%; }
    100% { top: 10%; left: 10%; }
  }
  
  .moving-watermark {
    animation: moveWatermark 15s linear infinite;
  }

  /* Disable screenshot functionality */
  .video-security-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    z-index: 999;
    pointer-events: none;
  }

  /* Disable text selection globally when video is playing */
  body.video-playing {
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
    -khtml-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
  }
`;

// Add these imports to your main component file
import { adsenseManager } from './utils/adsenseManager';
import { ResponsiveAd, SquareAd, BannerAd } from './components/AdSenseComponents';

const API_BASE = "http://localhost:5000/api";
const LMS_API_BASE = "http://localhost:5002/api";

// Add this component before your main LearningManagementSystem component
const TeacherSearchInput = ({ value, onChange, onSelect, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchTeachers = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${LMS_API_BASE}/teachers/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Search teachers error:", error);
      setSuggestions([]);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    searchTeachers(newValue);
  };

  const handleSelectTeacher = (teacher) => {
    onSelect(teacher);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <input
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white w-full"
        required
      />

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((teacher) => (
            <div
              key={teacher.id}
              onClick={() => handleSelectTeacher(teacher)}
              className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-white/10 last:border-b-0"
            >
              <div className="font-medium text-white">{teacher.name}</div>
              <div className="text-sm text-gray-400">{teacher.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Add this component before your main LearningManagementSystem component
const StudentSearchInput = ({ value, onChange, onSelect, placeholder, courseId }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchStudents = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `${LMS_API_BASE}/students/search?q=${encodeURIComponent(query)}`;
      if (courseId) {
        url += `&courseId=${courseId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Search students error:", error);
      setSuggestions([]);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    searchStudents(newValue);
  };

  const handleSelectStudent = (student) => {
    onSelect(student);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <input
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white w-full"
        required
      />

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((student) => (
            <div
              key={student.id}
              onClick={() => handleSelectStudent(student)}
              className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-white/10 last:border-b-0"
            >
              <div className="font-medium text-white">{student.name}</div>
              <div className="text-sm text-gray-400">{student.email}</div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && value.trim() && !loading && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-lg">
          <div className="px-4 py-3 text-gray-400 text-sm">
            No students found or all students are already enrolled
          </div>
        </div>
      )}
    </div>
  );
};

// Blog Post Card Component with Read More/Less functionality
const BlogPostCard = ({ blog, user, isLongContent, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentLimit = 500;

  const displayContent = isExpanded || !isLongContent
    ? blog.content
    : blog.content.substring(0, contentLimit) + '...';

  return (
    <article className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-500/30 group">
      {/* Blog Header */}
      <div className="p-6 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-purple-300 transition-colors">
              {blog.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span className="font-medium">{blog.author_name}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${blog.author_role === "admin"
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}>
                {blog.author_role.charAt(0).toUpperCase() + blog.author_role.slice(1)}
              </span>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{new Date(blog.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{new Date(blog.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>

          {(user.role === "admin" || blog.author_id === user.id) && (
            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(blog)}
                className="bg-blue-600/80 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center backdrop-blur-sm"
                title="Edit blog post"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </button>
              <button
                onClick={() => onDelete(blog.id)}
                className="bg-red-600/80 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center backdrop-blur-sm"
                title="Delete blog post"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Featured Image */}
      {blog.image_url && (
        <div className="px-6 pb-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-700/30">
            <img
              src={`http://localhost:5002${blog.image_url}`}
              alt={blog.title}
              className="w-full h-48 sm:h-64 object-cover hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Blog Content with Read More/Less */}
      <div className="px-6 pb-4">
        <div
          className={`text-gray-300 text-sm leading-relaxed transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-none' : 'max-h-32 overflow-hidden'
            }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {displayContent}
          </div>
        </div>

        {/* Read More/Less Button */}
        {isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center transition-colors group/btn"
          >
            {isExpanded ? (
              <>
                <Minus className="h-3 w-3 mr-1 group-hover/btn:scale-110 transition-transform" />
                Show Less
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1 group-hover/btn:scale-110 transition-transform" />
                Read More
              </>
            )}
          </button>
        )}
      </div>

      {/* Video Link */}
      {blog.video_url && (
        <div className="px-6 pb-4">
          <div className="bg-slate-700/30 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-300">
                <div className="h-8 w-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                  <ExternalLink className="h-4 w-4 text-red-400" />
                </div>
                <span>Video Content Available</span>
              </div>
              <a
                href={blog.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600/80 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center backdrop-blur-sm"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Watch Video
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Blog Footer */}
      <div className="px-6 py-4 bg-slate-700/20 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Published on {new Date(blog.created_at).toLocaleDateString()}</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              Article
            </span>
            {blog.image_url && (
              <span className="flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                Image
              </span>
            )}
            {blog.video_url && (
              <span className="flex items-center">
                <ExternalLink className="h-3 w-3 mr-1" />
                Video
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

// Google AdSense Banner Component
const GoogleAdBanner = ({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
  style = {},
  className = ""
}) => {
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
      setAdError(true);
    }
  }, []);

  if (adError) {
    return null; // Don't show anything if ad fails
  }

  return (
    <div className={`ad-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client="ca-pub-xxxxxxxxxxxxxxxxx" // Replace with your actual client ID
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      ></ins>
    </div>
  );
};

// // Responsive Ad Component
// const ResponsiveAd = ({ adSlot, className = "" }) => {
//   return (
//     <div className={`my-6 ${className}`}>
//       <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10">
//         <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
//         <GoogleAdBanner
//           adSlot={adSlot}
//           adFormat="auto"
//           fullWidthResponsive={true}
//           style={{ minHeight: '250px' }}
//         />
//       </div>
//     </div>
//   );
// };

// // Square Ad Component
// const SquareAd = ({ adSlot, className = "" }) => {
//   return (
//     <div className={`my-4 ${className}`}>
//       <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10">
//         <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
//         <GoogleAdBanner
//           adSlot={adSlot}
//           adFormat="rectangle"
//           fullWidthResponsive={false}
//           style={{ width: '300px', height: '250px', margin: '0 auto' }}
//         />
//       </div>
//     </div>
//   );
// };

// // Horizontal Banner Ad
// const BannerAd = ({ adSlot, className = "" }) => {
//   return (
//     <div className={`my-6 ${className}`}>
//       <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10">
//         <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
//         <GoogleAdBanner
//           adSlot={adSlot}
//           adFormat="horizontal"
//           fullWidthResponsive={true}
//           style={{ minHeight: '90px' }}
//         />
//       </div>
//     </div>
//   );
// };

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

  const [subTeachers, setSubTeachers] = useState([]);
  const [subTeacherEmail, setSubTeacherEmail] = useState("");
  const [allCourseTeachers, setAllCourseTeachers] = useState([]);
  const [courseTeachers, setCourseTeachers] = useState([]);
  const [teacherSearchValue, setTeacherSearchValue] = useState("");
  const [studentSearchValue, setStudentSearchValue] = useState("");

  // Add these state variables with other useState declarations
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({
    title: "",
    description: "",
    orderIndex: 0,
    videoFile: null,
  });
  const [videoProgress, setVideoProgress] = useState({});
  const [youtubeForm, setYoutubeForm] = useState({
    title: "",
    description: "",
    youtubeUrl: "",
    orderIndex: 0,
  });
  const [videoType, setVideoType] = useState("file");
  // AdSense Configuration States
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adsConfig, setAdsConfig] = useState({
    clientId: '',
    enabled: false,
    testMode: true
  });

  const [queries, setQueries] = useState([]);
  const [queryForm, setQueryForm] = useState({
    title: "",
    question: "",
    priority: "medium",
    category: "general",
    isAnonymous: false,
    attachments: []
  });
  const [queryFilters, setQueryFilters] = useState({
    status: "all",
    category: "all",
    priority: "all",
    sortBy: "recent",
    search: ""
  });
  const [queryStats, setQueryStats] = useState({});
  const [answerForm, setAnswerForm] = useState("");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [queryPagination, setQueryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [expandedQueries, setExpandedQueries] = useState(new Set());

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
    start_date: "",
    end_date: "",
  });

  const [sessionForm, setSessionForm] = useState({
    title: "",
    notes: "",
    meetLink: "",
    sessionDate: new Date().toISOString().split("T")[0],
    sessionTime: "",
    conductedBy: "",
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
    mobile: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    mobile: "",
  });

  const [studentEmail, setStudentEmail] = useState("");
  const [editingSession, setEditingSession] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [projectFeedback, setProjectFeedback] = useState("");
  const [showCredentials, setShowCredentials] = useState(null);
  const [groupLinkForm, setGroupLinkForm] = useState("");
  const [courseGroupLink, setCourseGroupLink] = useState(null);
  const [groupLinkLoading, setGroupLinkLoading] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState(new Set());


  // Blog states
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [blogForm, setBlogForm] = useState({
    title: "",
    content: "",
    videoUrl: "",
    blogImage: null,
  });
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogPage, setBlogPage] = useState(1);
  const [blogTotalPages, setBlogTotalPages] = useState(1);

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
      fetchCourseTeachers(selectedCourse.id);
      fetchQueries(selectedCourse.id);
      fetchVideos(selectedCourse.id);
      if (user?.role === "teacher") {
        fetchCourseStudents(selectedCourse.id);
        fetchProjects(selectedCourse.id);
        fetchAttendance(selectedCourse.id);
        fetchSubTeachers(selectedCourse.id);
        fetchAllCourseTeachers(selectedCourse.id);
        fetchQueryStats(selectedCourse.id);
      } else if (user?.role === "student") {
        fetchMyProject(selectedCourse.id);
      }
    }
  }, [selectedCourse, user]);

  useEffect(() => {
    if (selectedCourse && selectedCourse !== "create") {
      fetchQueries(selectedCourse.id, 1);
    }
  }, [queryFilters]);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        const user = JSON.parse(userData);

        // For admin users, validate both client and LMS tokens
        if (user.role === "admin") {
          const clientToken = localStorage.getItem("clientToken");

          if (!clientToken) {
            console.log("No client token found for admin, clearing session");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            return;
          }

          // Verify client token is still valid
          try {
            const verifyResponse = await fetch(`${API_BASE}/verify-token`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${clientToken}`,
                "Content-Type": "application/json"
              }
            });

            if (!verifyResponse.ok) {
              console.log("Client token invalid, clearing session");
              localStorage.removeItem("token");
              localStorage.removeItem("clientToken");
              localStorage.removeItem("user");
              return;
            }

            // Client token is valid, proceed with LMS session
            setUser(user);
            fetchInitialData(user);
          } catch (error) {
            console.error("Token validation failed:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("clientToken");
            localStorage.removeItem("user");
          }
        } else {
          // For non-admin users, proceed normally
          setUser(user);
          fetchInitialData(user);
        }
      }
    };

    validateToken();
  }, []);

  // Add this useEffect to disable developer tools and screenshots
  // Add these additional security hooks at the top of your component
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [securityViolations, setSecurityViolations] = useState(0);

  // Enhanced security useEffect
  // Enhanced security useEffect - Close video after 1 violation
  useEffect(() => {
    if (selectedVideo) {
      let devToolsChecker;

      // Function to handle security violation
      const handleSecurityViolation = (message) => {
        setSecurityViolations(prev => {
          const newCount = prev + 1;
          showMessage(message, "error");

          // Close video immediately after first violation
          if (newCount >= 1) {
            setSelectedVideo(null);
            setSecurityViolations(0);
            showMessage("Video closed due to security violation", "error");
          }

          return newCount;
        });
      };

      // Advanced DevTools detection
      const detectDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
          if (!isDevToolsOpen) {
            setIsDevToolsOpen(true);
            handleSecurityViolation("Developer tools detected - Video closed for security");
          }
        } else {
          setIsDevToolsOpen(false);
        }
      };

      // Advanced keyboard blocking
      const handleKeyDown = (e) => {
        const blockedKeys = [
          'F12', 'F11', // Function keys
          'PrintScreen', 'Insert', // Screenshot keys
          'ContextMenu', // Context menu key
        ];

        const blockedCombinations = [
          { ctrl: true, shift: true, key: 'I' }, // DevTools
          { ctrl: true, shift: true, key: 'C' }, // DevTools
          { ctrl: true, shift: true, key: 'J' }, // Console
          { ctrl: true, key: 'U' }, // View source
          { ctrl: true, key: 'S' }, // Save
          { ctrl: true, key: 'P' }, // Print
          { ctrl: true, key: 'A' }, // Select all
          { ctrl: true, key: 'C' }, // Copy
          { ctrl: true, key: 'V' }, // Paste
          { ctrl: true, key: 'X' }, // Cut
          { alt: true, key: 'F4' }, // Alt+F4
          { meta: true, alt: true, key: 'I' }, // Mac DevTools
          { meta: true, key: 'S' }, // Mac Save
          { meta: true, key: 'P' }, // Mac Print
        ];

        // Block individual keys
        if (blockedKeys.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          handleSecurityViolation(`Blocked key detected: ${e.key}`);
          return false;
        }

        // Block key combinations
        for (const combo of blockedCombinations) {
          if (
            (combo.ctrl === undefined || combo.ctrl === e.ctrlKey) &&
            (combo.shift === undefined || combo.shift === e.shiftKey) &&
            (combo.alt === undefined || combo.alt === e.altKey) &&
            (combo.meta === undefined || combo.meta === e.metaKey) &&
            e.key === combo.key
          ) {
            e.preventDefault();
            e.stopPropagation();
            handleSecurityViolation(`Blocked key combination: ${combo.ctrl ? 'Ctrl+' : ''}${combo.shift ? 'Shift+' : ''}${combo.alt ? 'Alt+' : ''}${combo.meta ? 'Cmd+' : ''}${combo.key}`);
            return false;
          }
        }
      };

      // Disable right-click globally
      const handleContextMenu = (e) => {
        e.preventDefault();
        handleSecurityViolation("Right-click detected");
        return false;
      };

      // Detect window focus changes (potential screen recording)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          const videoElement = document.querySelector('video');
          if (videoElement) {
            videoElement.pause();
            videoElement.style.filter = 'blur(20px)';
            videoElement.style.opacity = '0.3';
          }
          // Don't count this as a violation, just pause
          showMessage("Video paused - window not in focus", "warning");
        } else {
          const videoElement = document.querySelector('video');
          if (videoElement) {
            videoElement.style.filter = 'none';
            videoElement.style.opacity = '1';
          }
        }
      };

      // Detect window resize (potential screen recording software)
      const handleResize = () => {
        detectDevTools();
      };

      // Block text selection
      const handleSelectStart = (e) => {
        e.preventDefault();
        handleSecurityViolation("Text selection attempt detected");
        return false;
      };

      // Block drag operations
      const handleDragStart = (e) => {
        e.preventDefault();
        handleSecurityViolation("Drag operation detected");
        return false;
      };

      // Advanced screenshot detection (PrintScreen key)
      const handleKeyUp = (e) => {
        if (e.key === 'PrintScreen') {
          handleSecurityViolation("Screenshot attempt detected");
        }
      };

      // Detect developer tools using console
      const detectDevToolsConsole = () => {
        let devtools = {
          open: false,
          orientation: null
        };

        const threshold = 160;
        setInterval(() => {
          if (window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold) {
            if (!devtools.open) {
              devtools.open = true;
              handleSecurityViolation("Developer tools opened");
            }
          } else {
            devtools.open = false;
          }
        }, 500);
      };

      // Start DevTools detection
      devToolsChecker = setInterval(detectDevTools, 500);
      detectDevToolsConsole();

      // Add all event listeners with capture phase for better detection
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('keyup', handleKeyUp, true);
      document.addEventListener('contextmenu', handleContextMenu, true);
      document.addEventListener('selectstart', handleSelectStart, true);
      document.addEventListener('dragstart', handleDragStart, true);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('resize', handleResize);
      window.addEventListener('blur', handleVisibilityChange);

      // Disable browser's built-in screenshot capability
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';

      // Additional security: Detect if user switches tabs frequently (potential recording)
      let tabSwitchCount = 0;
      const handleFocus = () => {
        tabSwitchCount++;
        if (tabSwitchCount > 3) { // More than 3 tab switches
          handleSecurityViolation("Suspicious tab switching detected");
        }
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(devToolsChecker);
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('keyup', handleKeyUp, true);
        document.removeEventListener('contextmenu', handleContextMenu, true);
        document.removeEventListener('selectstart', handleSelectStart, true);
        document.removeEventListener('dragstart', handleDragStart, true);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('blur', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);

        // Restore normal functionality
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.mozUserSelect = '';
        document.body.style.msUserSelect = '';
      };
    }
  }, [selectedVideo, isDevToolsOpen]);

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
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    let token = localStorage.getItem("token");
    let baseUrl = LMS_API_BASE;

    // Determine which API and token to use
    if (user.role === "admin") {
      const clientEndpoints = ["/clients", "/admin/dashboard"];
      const isClientEndpoint = clientEndpoints.some(ep => endpoint.startsWith(ep));

      if (isClientEndpoint) {
        baseUrl = API_BASE;
        token = localStorage.getItem("clientToken") || token;
      }
    }

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle admin inactive error
        if (data.error === "ADMIN_INACTIVE" || data.message.includes("Service temporarily unavailable")) {
          if (user.role === "teacher" || user.role === "student") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.reload();
            return;
          }
        }

        // Handle 401/403 errors for admin users
        if (user.role === "admin" && (response.status === 403 || response.status === 401)) {
          console.log("Admin token expired or invalid, attempting refresh...");

          // Try to refresh LMS session using client token
          const clientToken = localStorage.getItem("clientToken");
          if (clientToken && baseUrl === LMS_API_BASE) {
            try {
              console.log("Attempting to refresh admin session...");

              // First verify that the client token is still valid
              const verifyResponse = await fetch(`${API_BASE}/verify-token`, {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${clientToken}`,
                  "Content-Type": "application/json"
                }
              });

              if (!verifyResponse.ok) {
                console.error("Client token is invalid, forcing logout");
                localStorage.removeItem("token");
                localStorage.removeItem("clientToken");
                localStorage.removeItem("user");
                window.location.reload();
                return;
              }

              const verifiedUser = await verifyResponse.json();
              console.log("checking verifyuser", verified);

              // Now create LMS session with verified user data
              const refreshResponse = await fetch(`${LMS_API_BASE}/admin/login-from-client`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${clientToken}`
                },
                body: JSON.stringify({
                  adminId: verifiedUser.id,
                  adminEmail: verifiedUser.email,
                  adminName: verifiedUser.name
                }),
              });

              if (refreshResponse.ok) {
                const refreshResult = await refreshResponse.json();
                localStorage.setItem("token", refreshResult.token);
                console.log("Admin session refreshed successfully");

                // Retry original request with new token
                const retryConfig = {
                  ...config,
                  headers: {
                    ...config.headers,
                    Authorization: `Bearer ${refreshResult.token}`
                  }
                };

                const retryResponse = await fetch(`${baseUrl}${endpoint}`, retryConfig);
                const retryData = await retryResponse.json();

                if (retryResponse.ok) {
                  return retryData;
                } else {
                  console.error("Retry failed after token refresh:", retryData);
                  throw new Error(retryData.message || "Request failed after token refresh");
                }
              } else {
                const refreshError = await refreshResponse.json();
                console.error("Token refresh failed:", refreshError);
                throw new Error(refreshError.message || "Token refresh failed");
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);

              // If refresh fails, force logout
              localStorage.removeItem("token");
              localStorage.removeItem("clientToken");
              localStorage.removeItem("user");
              window.location.reload();
              return;
            }
          } else {
            console.error("No client token available for refresh");
            throw new Error(data.message || "Authentication failed");
          }
        }

        throw new Error(data.message || "Something went wrong");
      }

      return data;
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  };




  const validateMobileNumber = (mobile) => {
    if (!mobile) return true; // Optional field

    // Remove all spaces, hyphens, parentheses for validation
    const cleanMobile = mobile.replace(/[\s\-()]/g, '');

    // Check if it's a valid format: optional + followed by 10-15 digits
    const mobileRegex = /^(\+\d{1,3})?\d{10,15}$/;

    return mobileRegex.test(cleanMobile);
  };
  const formatMobileDisplay = (mobile) => {
    if (!mobile) return '';

    // If it's an Indian number without country code, add +91
    if (mobile.length === 10 && /^\d{10}$/.test(mobile)) {
      return `+91 ${mobile.substring(0, 5)} ${mobile.substring(5)}`;
    }

    // If it already has country code, format it nicely
    if (mobile.startsWith('+91') && mobile.length === 13) {
      const number = mobile.substring(3);
      return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
    }

    return mobile; // Return as-is for other formats
  };

  const resetTeacherForm = () => {
    setTeacherForm({ name: "", email: "" });
  };

  const resetStudentForm = () => {
    setStudentForm({ name: "", email: "", mobile: "" });
  };
  const searchStudentsByMobile = async (mobileQuery) => {
    try {
      const data = await apiCall(`/students/search?mobile=${encodeURIComponent(mobileQuery)}`);
      return data;
    } catch (error) {
      console.error("Search by mobile error:", error);
      return [];
    }
  };
  const EnhancedStudentSearchInput = ({ value, onChange, onSelect, placeholder, courseId }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);

    const searchStudents = async (query) => {
      if (!query.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        let url = `${LMS_API_BASE}/students/search?q=${encodeURIComponent(query)}`;
        if (courseId) {
          url += `&courseId=${courseId}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Search students error:", error);
        setSuggestions([]);
      }
      setLoading(false);
    };

    const handleInputChange = (e) => {
      const newValue = e.target.value;
      onChange(newValue);
      searchStudents(newValue);
    };

    const handleSelectStudent = (student) => {
      onSelect(student);
      setShowSuggestions(false);
    };

    return (
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => value && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white w-full"
          required
        />

        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((student) => (
              <div
                key={student.id}
                onClick={() => handleSelectStudent(student)}
                className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-white/10 last:border-b-0"
              >
                <div className="font-medium text-white">{student.name}</div>
                <div className="text-sm text-gray-400">{student.email}</div>
                {student.mobile && (
                  <div className="text-sm text-gray-400">📱 {formatMobileDisplay(student.mobile)}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {showSuggestions && suggestions.length === 0 && value.trim() && !loading && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-lg">
            <div className="px-4 py-3 text-gray-400 text-sm">
              No students found or all students are already enrolled
            </div>
          </div>
        )}
      </div>
    );
  };
  // Add these API functions after existing API functions

  const fetchVideos = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/videos`);
      setVideos(data);

      // Set progress for students
      if (user?.role === "student") {
        const progressMap = {};
        data.forEach(video => {
          if (video.progress) {
            progressMap[video.id] = video.progress;
          }
        });
        setVideoProgress(progressMap);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const uploadVideo = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(videoForm).forEach((key) => {
        if (videoForm[key] !== null && videoForm[key] !== "") {
          formData.append(key, videoForm[key]);
        }
      });

      const response = await fetch(
        `${LMS_API_BASE}/courses/${selectedCourse.id}/videos`,
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
        showMessage("Video uploaded successfully!", "success");
        setVideoForm({
          title: "",
          description: "",
          orderIndex: 0,
          videoFile: null,
        });
        fetchVideos(selectedCourse.id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };
  // Add YouTube video function
  const addYoutubeVideo = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiCall(`/courses/${selectedCourse.id}/videos/youtube`, {
        method: "POST",
        body: JSON.stringify(youtubeForm),
      });

      showMessage("YouTube video added successfully!", "success");
      setYoutubeForm({
        title: "",
        description: "",
        youtubeUrl: "",
        orderIndex: 0,
      });
      fetchVideos(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const getYouTubeVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }
    } catch (error) {
      console.error('Invalid URL:', error);
    }
    return null;
  };

  const updateVideoProgress = async (videoId, watchedSeconds, totalDuration) => {
    if (user?.role !== "student") return;

    try {
      await apiCall(`/videos/${videoId}/progress`, {
        method: "POST",
        body: JSON.stringify({ watchedSeconds, totalDuration }),
      });
    } catch (error) {
      console.error("Update progress error:", error);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;

    setLoading(true);
    try {
      await apiCall(`/videos/${videoId}`, {
        method: "DELETE",
      });

      showMessage("Video deleted successfully!", "success");
      fetchVideos(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const addWatermark = (videoElement, userName, userEmail) => {
    // This is a placeholder for more advanced watermarking
    // In a real implementation, you'd want server-side watermarking
    const watermarkInterval = setInterval(() => {
      const watermarks = document.querySelectorAll('.moving-watermark');
      watermarks.forEach(watermark => {
        watermark.textContent = `🔒 ${userName} | ${userEmail} | ${new Date().toLocaleTimeString()}`;
      });
    }, 1000);

    videoElement.addEventListener('ended', () => clearInterval(watermarkInterval));
    videoElement.addEventListener('pause', () => clearInterval(watermarkInterval));
  };

  // API Functions
  const fetchDashboardStats = async () => {
    try {
      const data = await apiCall("/dashboard/stats");
      setDashboardStats(data);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      // Set empty stats object as fallback
      setDashboardStats({});
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await apiCall("/admin/teachers");
      setTeachers(data);
    } catch (error) {
      console.error("Fetch teachers error:", error);
      setTeachers([]);
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

  // Blog API Functions
  // const fetchBlogs = async (page = 1) => {
  //   try {
  //     const data = await apiCall(`/blogs?page=${page}&limit=10`);
  //     setBlogs(data.blogs);
  //     setBlogTotalPages(data.totalPages);
  //     setBlogPage(data.currentPage);
  //   } catch (error) {
  //     showMessage(error.message, "error");
  //   }
  // };

  const fetchBlogs = async (page = 1) => {
    try {
      // Ensure page is a number and valid
      const pageNum = parseInt(page, 10) || 1;
      console.log(`Fetching blogs for page: ${pageNum}`);

      const data = await apiCall(`/blogs?page=${pageNum}&limit=10`);

      if (data && data.blogs) {
        setBlogs(data.blogs);
        setBlogTotalPages(data.totalPages || 1);
        setBlogPage(data.currentPage || pageNum);
      } else {
        // Handle case where data structure is unexpected
        console.warn("Unexpected blog data structure:", data);
        setBlogs([]);
        setBlogTotalPages(1);
        setBlogPage(1);
      }
    } catch (error) {
      console.error("Fetch blogs error:", error);
      showMessage("Failed to load blog posts. Please try again.", "error");

      // Set empty state on error
      setBlogs([]);
      setBlogTotalPages(1);
      setBlogPage(1);
    }
  };

  const createBlog = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(blogForm).forEach((key) => {
        if (blogForm[key] !== null && blogForm[key] !== "") {
          formData.append(key, blogForm[key]);
        }
      });

      const response = await fetch(`${LMS_API_BASE}/blogs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        showMessage("Blog post created successfully!", "success");
        setBlogForm({
          title: "",
          content: "",
          videoUrl: "",
          blogImage: null,
        });
        fetchBlogs();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const updateBlog = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(blogForm).forEach((key) => {
        if (blogForm[key] !== null && blogForm[key] !== "") {
          formData.append(key, blogForm[key]);
        }
      });

      const response = await fetch(`${LMS_API_BASE}/blogs/${editingBlog.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        showMessage("Blog post updated successfully!", "success");
        setEditingBlog(null);
        setBlogForm({
          title: "",
          content: "",
          videoUrl: "",
          blogImage: null,
        });
        fetchBlogs();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const deleteBlog = async (blogId) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;

    setLoading(true);
    try {
      await apiCall(`/blogs/${blogId}`, {
        method: "DELETE",
      });

      showMessage("Blog post deleted successfully!", "success");
      fetchBlogs();
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  const startEditingBlog = (blog) => {
    setEditingBlog(blog);
    setBlogForm({
      title: blog.title,
      content: blog.content,
      videoUrl: blog.video_url || "",
      blogImage: null,
    });
  };

  // AdSense API Functions
  const fetchAdsenseConfig = async () => {
    try {
      const data = await apiCall("/adsense-config");
      console.log('Fetched AdSense config:', data);

      setAdsConfig(data);
      setAdsEnabled(data.enabled);

      // Update the adsense manager
      adsenseManager.setConfig(data);

      console.log('AdSense manager updated with config:', data);
    } catch (error) {
      console.error("Fetch AdSense config error:", error);
      setAdsEnabled(false);
      adsenseManager.setConfig({ enabled: false, testMode: true, clientId: null });
    }
  };
  const updateAdsenseSettings = async (enabled, testMode, clientId = null) => {
    try {
      await apiCall("/admin/adsense-settings", {
        method: "PUT",
        body: JSON.stringify({ enabled, testMode, clientId }),
      });

      const newConfig = { enabled, testMode, clientId };
      setAdsConfig(newConfig);
      setAdsEnabled(enabled);

      // Update the adsense manager immediately
      adsenseManager.setConfig(newConfig);

      showMessage(`AdSense ${enabled ? 'enabled' : 'disabled'} successfully!`, "success");

      console.log(`AdSense ${enabled ? 'enabled' : 'disabled'}, ads should ${enabled ? 'appear' : 'disappear'} immediately`);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const testAdsenseConfiguration = async () => {
    try {
      const data = await apiCall("/admin/adsense-test", {
        method: "POST",
      });

      if (data.success) {
        showMessage("AdSense configuration test successful!", "success");
      } else {
        showMessage(data.message, "error");
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Add these API functions in your React component

  const fetchSubTeachers = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/sub-teachers`);
      setSubTeachers(data);
    } catch (error) {
      console.error("Fetch sub-teachers error:", error);
    }
  };

  const fetchAllCourseTeachers = async (courseId) => {
    try {
      // Use the existing API endpoint that gets all course teachers
      const courseTeachers = await apiCall(`/courses/${courseId}/teachers`);

      // Set the data for the dropdown
      setAllCourseTeachers(courseTeachers);
    } catch (error) {
      console.error("Fetch course teachers error:", error);
      setAllCourseTeachers([]);
    }
  };

  const fetchCourseTeachers = async (courseId) => {
    try {
      const data = await apiCall(`/courses/${courseId}/teachers`);
      setCourseTeachers(data);
    } catch (error) {
      console.error("Fetch course teachers error:", error);
    }
  };

  const handleTeacherSelect = (teacher) => {
    setSubTeacherEmail(teacher.email);
    setTeacherSearchValue(teacher.email);
  };

  const addSubTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall(`/courses/${selectedCourse.id}/sub-teachers`, {
        method: "POST",
        body: JSON.stringify({ teacherEmail: subTeacherEmail }),
      });

      showMessage("Sub-teacher added successfully!", "success");
      setSubTeacherEmail("");
      setTeacherSearchValue("");
      fetchSubTeachers(selectedCourse.id);
      fetchAllCourseTeachers(selectedCourse.id);
      fetchCourseTeachers(selectedCourse.id); // Add this line
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const removeSubTeacher = async (teacherId) => {
    if (!window.confirm("Are you sure you want to remove this sub-teacher?")) return;

    setLoading(true);
    try {
      await apiCall(`/courses/${selectedCourse.id}/sub-teachers/${teacherId}`, {
        method: "DELETE",
      });

      showMessage("Sub-teacher removed successfully!", "success");
      fetchSubTeachers(selectedCourse.id);
      fetchAllCourseTeachers(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
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

  // Query API Functions
  const fetchQueries = async (courseId, page = 1) => {
    try {
      const params = new URLSearchParams({
        ...queryFilters,
        page: page.toString(),
        limit: queryPagination.limit.toString()
      });

      const data = await apiCall(`/courses/${courseId}/queries?${params}`);
      setQueries(data.queries);
      setQueryPagination(data.pagination);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const fetchQueryStats = async (courseId) => {
    if (user.role !== "teacher") return;

    try {
      const data = await apiCall(`/courses/${courseId}/query-stats`);
      setQueryStats(data);
    } catch (error) {
      console.error("Fetch query stats error:", error);
    }
  };

  const submitQuery = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", queryForm.title);
      formData.append("question", queryForm.question);
      formData.append("priority", queryForm.priority);
      formData.append("category", queryForm.category);
      formData.append("isAnonymous", queryForm.isAnonymous);

      // Add attachments
      queryForm.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(`${LMS_API_BASE}/courses/${selectedCourse.id}/queries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        showMessage("Query submitted successfully!", "success");
        setQueryForm({
          title: "",
          question: "",
          priority: "medium",
          category: "general",
          isAnonymous: false,
          attachments: []
        });
        fetchQueries(selectedCourse.id);
        if (user.role === "teacher") {
          fetchQueryStats(selectedCourse.id);
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const answerQuery = async (queryId, closeQuery = false) => {
    setLoading(true);

    try {
      await apiCall(`/queries/${queryId}/answer`, {
        method: "PUT",
        body: JSON.stringify({ answer: answerForm, closeQuery }),
      });

      showMessage(
        closeQuery ? "Query answered and closed successfully!" : "Query answered successfully!",
        "success"
      );
      setAnswerForm("");
      setSelectedQuery(null);
      fetchQueries(selectedCourse.id);
      if (user.role === "teacher") {
        fetchQueryStats(selectedCourse.id);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }

    setLoading(false);
  };

  const updateQueryStatus = async (queryId, status) => {
    try {
      await apiCall(`/queries/${queryId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      showMessage("Query status updated successfully!", "success");
      fetchQueries(selectedCourse.id);
      if (user.role === "teacher") {
        fetchQueryStats(selectedCourse.id);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
  };
  const markQueryHelpful = async (queryId) => {
    try {
      await apiCall(`/queries/${queryId}/helpful`, {
        method: "POST",
      });

      showMessage("Marked as helpful!", "success");
      fetchQueries(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const toggleQueryFollow = async (queryId) => {
    try {
      const data = await apiCall(`/queries/${queryId}/follow`, {
        method: "POST",
      });

      showMessage(data.message, "success");
      fetchQueries(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };
  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument'];

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        showMessage(`File ${file.name} is too large. Maximum size is 5MB.`, "error");
        return false;
      }

      const isValidType = allowedTypes.some(type => file.type.startsWith(type));
      if (!isValidType) {
        showMessage(`File ${file.name} has an unsupported format.`, "error");
        return false;
      }

      return true;
    });

    setQueryForm({
      ...queryForm,
      attachments: [...queryForm.attachments, ...validFiles].slice(0, 3) // Max 3 files
    });
  };

  const removeAttachment = (index) => {
    const newAttachments = queryForm.attachments.filter((_, i) => i !== index);
    setQueryForm({ ...queryForm, attachments: newAttachments });
  };

  const applyFilters = () => {
    fetchQueries(selectedCourse.id, 1);
  };
  const resetFilters = () => {
    setQueryFilters({
      status: "all",
      category: "all",
      priority: "all",
      sortBy: "recent",
      search: ""
    });
    setTimeout(() => fetchQueries(selectedCourse.id, 1), 100);
  };

  const toggleQueryExpansion = (queryId) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(queryId)) {
      newExpanded.delete(queryId);
    } else {
      newExpanded.add(queryId);
    }
    setExpandedQueries(newExpanded);
  };

  const deleteQuery = async (queryId) => {
    if (!window.confirm("Are you sure you want to delete this query?")) return;

    setLoading(true);
    try {
      await apiCall(`/queries/${queryId}`, {
        method: "DELETE",
      });

      showMessage("Query deleted successfully!", "success");
      fetchQueries(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
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
        `${LMS_API_BASE}/courses/${selectedCourse.id}/assignments`,
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
        `${LMS_API_BASE}/assignments/${assignmentId}/submit`,
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
        `${LMS_API_BASE}/assignments/${editingAssignment.id}`,
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
      if (authMode === "login" && authForm.role === "admin") {
        console.log("Admin login attempt with:", authForm.email);

        // Use client management login for admin
        const response = await fetch(`${API_BASE}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Login failed");
        }

        console.log("Client management login successful");

        // Store client management token
        localStorage.setItem("clientToken", result.token);

        // Verify the client token first
        const verifyResponse = await fetch(`${API_BASE}/verify-token`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${result.token}`,
            "Content-Type": "application/json"
          }
        });
        console.log(verifyResponse.body, "sdjwndj");

        if (!verifyResponse.ok) {
          throw new Error("Client token verification failed");
        }

        const verifiedUser = await verifyResponse.json();
        console.log("verifired user ", verifiedUser);

        // Create LMS admin session with verified user data
        try {
          console.log("Creating LMS admin session...");
          const lmsResponse = await fetch(`${LMS_API_BASE}/admin/login-from-client`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${result.token}`
            },
            body: JSON.stringify({
              adminId: verifiedUser.id,
              adminEmail: verifiedUser.email,
              adminName: verifiedUser.name
            }),
          });

          const lmsResult = await lmsResponse.json();

          if (lmsResponse.ok) {
            console.log("LMS admin session created successfully");
            localStorage.setItem("token", lmsResult.token);
            localStorage.setItem("user", JSON.stringify(lmsResult.user));
            setUser(lmsResult.user);
            showMessage("Admin login successful!", "success");
            fetchInitialData(lmsResult.user);
          } else {
            console.error("LMS session creation failed:", lmsResult);
            throw new Error(lmsResult.message || "Failed to create LMS session");
          }
        } catch (lmsError) {
          console.error("LMS admin session creation failed:", lmsError);
          throw new Error("Failed to create LMS admin session");
        }
      } else {
        // For teacher and student login, use existing LMS API
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
          showMessage(
            "Registration successful! Please check your email for welcome instructions, then login with your credentials.",
            "success"
          );
          setAuthMode("login");
          setAuthForm({ name: "", email: "", password: "", role: "student" });
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      if (error.message.includes("Service temporarily unavailable") ||
        error.message.includes("ADMIN_INACTIVE")) {
        showMessage("Service is currently unavailable. Your administrator's account is inactive. Please contact support.", "error");
      } else {
        showMessage(error.message, "error");
      }
    }

    setLoading(false);
  };


  const createLMSAdminSession = async (adminData) => {
    try {
      // Option 1: Create a special admin login endpoint in LMS that accepts admin credentials
      const response = await fetch(`${LMS_API_BASE}/admin/login-from-client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("clientToken")}`
        },
        body: JSON.stringify({
          adminId: adminData.id,
          adminEmail: adminData.email,
          adminName: adminData.name
        }),
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem("lmsToken", result.token);
      }
    } catch (error) {
      console.error("Could not create LMS admin session:", error);
    }
  };

  const apiCallFixed = async (endpoint, options = {}) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    let token = localStorage.getItem("token");
    let baseUrl = LMS_API_BASE;

    // Determine which API and token to use
    if (user.role === "admin") {
      // Admin-specific routing logic
      const clientEndpoints = ["/clients", "/admin/dashboard"];
      const isClientEndpoint = clientEndpoints.some(ep => endpoint.startsWith(ep));

      if (isClientEndpoint) {
        baseUrl = API_BASE;
        token = localStorage.getItem("clientToken") || token;
      } else {
        baseUrl = LMS_API_BASE;
        token = localStorage.getItem("lmsToken") || token;
      }
    }

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, config);

      // Handle 403/401 errors for admin users
      if (!response.ok && user.role === "admin" && (response.status === 403 || response.status === 401)) {
        // Try to refresh LMS token
        if (baseUrl === LMS_API_BASE) {
          const adminData = JSON.parse(localStorage.getItem("user"));
          await createLMSAdminSession(adminData);

          // Retry with new token
          const newToken = localStorage.getItem("lmsToken");
          if (newToken) {
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${newToken}`
              }
            };
            const retryResponse = await fetch(`${baseUrl}${endpoint}`, retryConfig);
            const retryData = await retryResponse.json();

            if (!retryResponse.ok) {
              throw new Error(retryData.message || "Something went wrong");
            }
            return retryData;
          }
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }
      return data;
    } catch (error) {
      throw error;
    }
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
      // Validate mobile number format if provided
      if (studentForm.mobile && !/^[+]?[\d\s-()]{10,15}$/.test(studentForm.mobile.replace(/\s/g, ''))) {
        showMessage("Please enter a valid mobile number", "error");
        setLoading(false);
        return;
      }

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
      setStudentForm({ name: "", email: "", mobile: "" }); // Reset with mobile
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
        if (sessionForm[key] !== null && sessionForm[key] !== "") {
          formData.append(key, sessionForm[key]);
        }
      });

      const response = await fetch(
        `${LMS_API_BASE}/courses/${selectedCourse.id}/sessions`,
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
        resetSessionForm(); // Use the reset function
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
        if (sessionForm[key] !== null && sessionForm[key] !== "") {
          formData.append(key, sessionForm[key]);
        }
      });

      const response = await fetch(
        `${LMS_API_BASE}/sessions/${editingSession.id}`,
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
        resetSessionForm(); // Use the reset function
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
      setStudentSearchValue(""); // Clear search value
      fetchCourseStudents(selectedCourse.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
    setLoading(false);
  };

  // Add this function to handle student selection
  const handleStudentSelect = (student) => {
    setStudentEmail(student.email);
    setStudentSearchValue(student.email);
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
        `${LMS_API_BASE}/courses/${selectedCourse.id}/project`,
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

  const updateStudentProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate mobile number format if provided
      if (profileForm.mobile && !/^[+]?[\d\s-()]{10,15}$/.test(profileForm.mobile.replace(/\s/g, ''))) {
        showMessage("Please enter a valid mobile number", "error");
        setLoading(false);
        return;
      }

      await apiCall("/student/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });

      showMessage("Profile updated successfully!", "success");

      // Update user data in localStorage
      const updatedUser = { ...user, name: profileForm.name, mobile: profileForm.mobile };
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
      sessionTime: session.session_time || "",
      conductedBy: session.conducted_by || "",
      notesFile: null,
    });
  };

  const startEditingCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      duration_days: course.duration_days,
      group_link: course.group_link || "",
      start_date: course.start_date || "",
      end_date: course.end_date || "",
    });
  };

  const resetSessionForm = () => {
    setSessionForm({
      title: "",
      notes: "",
      meetLink: "",
      sessionDate: new Date().toISOString().split("T")[0],
      sessionTime: "",
      conductedBy: "",
      notesFile: null,
    });
    setEditingSession(null);
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
      console.log("Fetching initial data for user:", userData);

      // Always fetch AdSense config first
      await fetchAdsenseConfig();

      // Always try to fetch dashboard stats
      await fetchDashboardStats();

      // Try to fetch blogs but don't fail the entire initialization if it fails
      try {
        await fetchBlogs();
      } catch (blogError) {
        console.warn("Blog fetching failed during initialization:", blogError);
        // Continue with other initialization
      }

      // ... rest of your existing fetchInitialData code
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
        setProfileForm({ name: userData.name, mobile: userData.mobile || "" });
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      showMessage("Some features may not be available. Please refresh the page.", "warning");
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
            <h1 className="text-3xl font-bold text-white mb-2">LearnAnyware</h1>
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

            {/* Role Selection for Login */}
            {authMode === "login" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Login As
                </label>
                <select
                  value={authForm.role}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, role: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white "
                >
                  {/* <option value="student">Student</option>
                  <option value="teacher">Teacher</option> */}
                  <option value="teacher">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {authMode === "login" && authForm.role === "admin" && (
              <div className="mt-4 text-center">
                <p className="text-gray-400 text-xs mb-2">Debug Info:</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>Client API: {API_BASE || 'Not configured'}</p>
                  <p>LMS API: {LMS_API_BASE || 'Not configured'}</p>
                  <p>Client Token: {localStorage.getItem("clientToken") ? 'Present' : 'Missing'}</p>
                  <p>LMS Token: {localStorage.getItem("token") ? 'Present' : 'Missing'}</p>
                </div>
              </div>
            )}

            {/* Role Selection for Registration */}
            {authMode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Register As
                </label>
                <select
                  value={authForm.role}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, role: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            )}

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
            <p className="text-gray-400 text-sm mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Admin: Use your client management credentials</p>
              <p>Teacher: teacher@lms.com / teacher123</p>
              <p>Student: student@lms.com / student123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-slate-900">
      <style dangerouslySetInnerHTML={{ __html: videoSecurityStyles }} />
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
                <h1 className="text-xl font-bold text-white">LearnAnyware</h1>
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

              {/* {user.role === "student" && (
                <button
                  onClick={() => setAiChatOpen(true)}
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 flex items-center space-x-2 shadow-lg"
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Assistant</span>
                </button>
              )} */}

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
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl w-full max-w-4xl h-[600px] border border-white/20 flex flex-col">

            {/* Video Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {selectedVideo.video_type === 'youtube' ? '📺' : '🔒'} {selectedVideo.title}
                </h3>
                {selectedVideo.description && (
                  <p className="text-sm text-gray-400">
                    {selectedVideo.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedVideo(null);
                  setSecurityViolations(0);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className="flex-1 p-4">
              <div className="w-full h-full bg-black rounded-xl overflow-hidden relative">
                {selectedVideo.video_type === 'youtube' ? (
                  /* YouTube Player */
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideo.youtube_url)}?rel=0&modestbranding=1&controls=1`}
                    title={selectedVideo.title}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  /* Secure File Player */
                  <div
                    className="w-full h-full video-security-container"
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      position: 'relative'
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      showMessage("Right-click detected - Video closed", "error");
                      setSelectedVideo(null);
                      setSecurityViolations(0);
                      return false;
                    }}
                  >
                    {/* Security Notice for File Videos */}
                    <div className="absolute top-2 left-2 bg-red-500/20 border border-red-500/50 px-2 py-1 rounded text-xs text-red-300 z-20">
                      🛡️ Protected Content
                    </div>

                    <video
                      key={selectedVideo.id}
                      className="w-full h-full object-contain"
                      controls
                      controlsList="nodownload nofullscreen noremoteplaybook noplaybackrate"
                      disablePictureInPicture
                      disableRemotePlayback
                      playsInline
                      onTimeUpdate={(e) => {
                        if (user?.role === "student") {
                          updateVideoProgress(
                            selectedVideo.id,
                            Math.floor(e.target.currentTime),
                            Math.floor(e.target.duration)
                          );
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showMessage("Right-click on video detected - Video closed", "error");
                        setSelectedVideo(null);
                        setSecurityViolations(0);
                        return false;
                      }}
                      style={{
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none'
                      }}
                    >
                      <source
                        src={`${LMS_API_BASE}/videos/${selectedVideo.id}/stream?token=${localStorage.getItem("token")}`}
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>

                    {/* Watermarks for File Videos */}
                    <div
                      className="absolute top-4 right-4 pointer-events-none text-white/40 text-xs font-mono bg-black/30 px-2 py-1 rounded"
                      style={{ zIndex: 15 }}
                    >
                      {user?.name} | {new Date().toLocaleString()}
                    </div>

                    <div
                      className="absolute text-white/20 text-xs pointer-events-none moving-watermark"
                      style={{
                        zIndex: 12,
                        animation: 'moveWatermark 10s linear infinite'
                      }}
                    >
                      🔒 Protected Content - {user?.email}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Video Info */}
            <div className="p-4 border-t border-white/10">
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Added by: {selectedVideo.uploaded_by_name}</span>
                <span>
                  {new Date(selectedVideo.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Progress bar only for file videos */}
              {selectedVideo.video_type === 'file' && user.role === "student" && videoProgress[selectedVideo.id] && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Your Progress</span>
                    <span>
                      {Math.round((videoProgress[selectedVideo.id].watched_seconds / videoProgress[selectedVideo.id].total_duration) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${Math.round((videoProgress[selectedVideo.id].watched_seconds / videoProgress[selectedVideo.id].total_duration) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {selectedVideo.video_type === 'youtube' && (
                <div className="mt-2 text-xs text-gray-500">
                  Note: YouTube videos are played through YouTube's secure player
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-30 w-64 min-h-screen bg-slate-800/50 backdrop-blur-md border-r border-white/10 transition-transform duration-300 ease-in-out lg:block`}
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
                  setActiveSection("blogs");
                  setSelectedCourse(null);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeSection === "blogs"
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <FileText className="h-5 w-5 mr-3" />
                Blog
              </button>

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
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-red-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-red-400 to-red-600 rounded-xl flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Videos
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.videos || 0}
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
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-red-500/30 transition-all duration-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-r from-red-400 to-red-600 rounded-xl flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-400">
                            Videos Watched
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {dashboardStats.watchedVideos || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Ad Banner after stats */}
              {adsEnabled && (
                <BannerAd adSlot="1234567890" className="mt-6" />
              )}

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
              {/* Side Ad for larger screens */}
              {adsEnabled && (
                <div className="hidden lg:block">
                  <SquareAd adSlot="0987654321" />
                </div>
              )}
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

          {/* Blog Section */}
          {/* Enhanced Blog Section - With Read More/Less */}
          {activeSection === "blogs" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Blog Posts</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {blogs.length > 0
                      ? `${blogs.length} post${blogs.length > 1 ? 's' : ''} available`
                      : 'No posts available yet'
                    }
                  </p>
                </div>
                {(user.role === "admin" || user.role === "teacher") && (
                  <button
                    onClick={() => setSelectedBlog("create")}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Blog Post
                  </button>
                )}
              </div>

              {selectedBlog === "create" || editingBlog ? (
                /* Enhanced Blog Form */
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-purple-400" />
                      {editingBlog ? "Edit Blog Post" : "Create New Blog Post"}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedBlog(null);
                        setEditingBlog(null);
                        setBlogForm({
                          title: "",
                          content: "",
                          videoUrl: "",
                          blogImage: null,
                        });
                      }}
                      className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={editingBlog ? updateBlog : createBlog} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Blog Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={blogForm.title}
                        onChange={(e) =>
                          setBlogForm({
                            ...blogForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400 transition-all"
                        placeholder="Enter an engaging blog title..."
                        maxLength="255"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {blogForm.title.length}/255 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Content *
                      </label>
                      <div className="relative">
                        <textarea
                          required
                          value={blogForm.content}
                          onChange={(e) =>
                            setBlogForm({
                              ...blogForm,
                              content: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400 transition-all resize-vertical"
                          rows="10"
                          placeholder="Write your blog content here... You can use line breaks for paragraphs."
                          style={{ minHeight: '200px' }}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                          {blogForm.content.length} characters
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Tip: Use double line breaks for paragraphs
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Featured Image (Optional)
                        </label>
                        <div className="space-y-3">
                          <input
                            type="file"
                            onChange={(e) =>
                              setBlogForm({
                                ...blogForm,
                                blogImage: e.target.files[0],
                              })
                            }
                            className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-purple-500 file:text-white hover:file:bg-purple-600 file:cursor-pointer"
                            accept="image/*"
                          />
                          <p className="text-xs text-gray-500">
                            Recommended: 16:9 aspect ratio, max 5MB
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Video URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={blogForm.videoUrl}
                          onChange={(e) =>
                            setBlogForm({
                              ...blogForm,
                              videoUrl: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400 transition-all"
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          YouTube, Vimeo, or any video URL
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center justify-center shadow-lg"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            {editingBlog ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            {editingBlog ? "Update Blog Post" : "Publish Blog Post"}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBlog(null);
                          setEditingBlog(null);
                          setBlogForm({
                            title: "",
                            content: "",
                            videoUrl: "",
                            blogImage: null,
                          });
                        }}
                        className="flex-1 sm:flex-none bg-slate-600 text-white px-8 py-3 rounded-xl hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Enhanced Blog List - With Read More/Less */
                // <div className="space-y-6">
                //   <div className="grid grid-cols-1 gap-6">
                //     {blogs.map((blog) => {
                //       const isLongContent = blog.content.length > 500;
                //       const blogKey = `blog-${blog.id}`;

                //       return (
                //         <BlogPostCard
                //           key={blog.id}
                //           blog={blog}
                //           user={user}
                //           isLongContent={isLongContent}
                //           onEdit={startEditingBlog}
                //           onDelete={deleteBlog}
                //         />
                //       );
                //     })}
                //   </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {blogs.map((blog, index) => (
                      <React.Fragment key={blog.id}>
                        <BlogPostCard
                          blog={blog}
                          user={user}
                          isLongContent={blog.content.length > 500}
                          onEdit={startEditingBlog}
                          onDelete={deleteBlog}
                        />

                        {/* Show ad after every 2 blog posts - will be hidden if ads disabled */}
                        {(index + 1) % 2 === 0 && index < blogs.length - 1 && (
                          <ResponsiveAd adSlot="1111111111" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Bottom banner ad - will be hidden if ads disabled */}
                  {blogs.length > 0 && (
                    <BannerAd adSlot="2222222222" />
                  )}
                  {/* Side Ad for larger screens - will be hidden if ads disabled */}
                  <div className="hidden lg:block">
                    <SquareAd adSlot="0987654321" />
                  </div>

                  {/* Enhanced Pagination */}
                  {blogTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10">
                      <p className="text-sm text-gray-400">
                        Page {blogPage} of {blogTotalPages}
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => fetchBlogs(1)}
                          disabled={blogPage === 1}
                          className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="First page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <ChevronLeft className="h-4 w-4 -ml-2" />
                        </button>
                        <button
                          onClick={() => fetchBlogs(blogPage - 1)}
                          disabled={blogPage === 1}
                          className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex space-x-1">
                          {Array.from({ length: Math.min(5, blogTotalPages) }, (_, i) => {
                            let pageNum;
                            if (blogTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (blogPage <= 3) {
                              pageNum = i + 1;
                            } else if (blogPage >= blogTotalPages - 2) {
                              pageNum = blogTotalPages - 4 + i;
                            } else {
                              pageNum = blogPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => fetchBlogs(pageNum)}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${blogPage === pageNum
                                  ? "bg-purple-500 text-white shadow-lg"
                                  : "bg-slate-700/50 text-gray-300 hover:bg-slate-600"
                                  }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => fetchBlogs(blogPage + 1)}
                          disabled={blogPage === blogTotalPages}
                          className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => fetchBlogs(blogTotalPages)}
                          disabled={blogPage === blogTotalPages}
                          className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Last page"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <ChevronRight className="h-4 w-4 -ml-2" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {blogs.length === 0 && (
                    <div className="text-center py-16">
                      <div className="h-20 w-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-medium text-white mb-3">
                        No blog posts yet
                      </h3>
                      <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        {user.role === "admin" || user.role === "teacher"
                          ? "Share your knowledge and insights with the community by creating your first blog post."
                          : "Blog posts from teachers and administrators will appear here. Check back soon for updates!"}
                      </p>
                      {(user.role === "admin" || user.role === "teacher") && (
                        <button
                          onClick={() => setSelectedBlog("create")}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center mx-auto"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Post
                        </button>
                      )}
                    </div>
                  )}
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
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={profileForm.mobile}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              mobile: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                          placeholder="+91 9876543210 or 10-digit number"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Format: +91 9876543210 or 9876543210 (10-15 digits)
                        </p>
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
                        Mobile Number
                      </label>
                      <div className="px-4 py-3 bg-slate-700/30 rounded-xl text-white border border-white/10">
                        {user.mobile || "Not provided"}
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
              {/* Add this to your admin settings section */}
              {user.role === "admin" && (
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Google AdSense Management
                  </h3>

                  <div className="space-y-6">
                    {/* Current Status */}
                    <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                      <h4 className="text-sm font-medium text-white mb-3">Current Status</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center justify-between p-2 bg-slate-600/30 rounded-lg">
                          <span className="text-gray-300">Status:</span>
                          <span className={`font-medium ${adsConfig.enabled ? 'text-green-300' : 'text-red-300'}`}>
                            {adsConfig.enabled ? '✅ Enabled' : '❌ Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-600/30 rounded-lg">
                          <span className="text-gray-300">Mode:</span>
                          <span className={`font-medium ${adsConfig.testMode ? 'text-yellow-300' : 'text-blue-300'}`}>
                            {adsConfig.testMode ? '🧪 Test' : '🟢 Live'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-600/30 rounded-lg">
                          <span className="text-gray-300">Client ID:</span>
                          <span className="font-medium text-white text-xs">
                            {adsConfig.clientId ? `${adsConfig.clientId.substring(0, 15)}...` : 'Not Set'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Enable/Disable Toggle */}
                      <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Advertisement Display
                            </label>
                            <p className="text-xs text-gray-500">
                              {adsConfig.enabled ? 'Ads are currently visible to users' : 'Ads are hidden from all users'}
                            </p>
                          </div>
                          <button
                            onClick={() => updateAdsenseSettings(!adsConfig.enabled, adsConfig.testMode, adsConfig.clientId)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${adsConfig.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adsConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>

                        {adsConfig.enabled && (
                          <div className="text-xs text-green-300 bg-green-500/10 p-2 rounded border border-green-500/20">
                            ✅ Ads are live and visible to users
                          </div>
                        )}

                        {!adsConfig.enabled && (
                          <div className="text-xs text-red-300 bg-red-500/10 p-2 rounded border border-red-500/20">
                            ❌ Ads are disabled and hidden from users
                          </div>
                        )}
                      </div>

                      {/* Test Mode Toggle */}
                      <div className="bg-slate-700/30 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Test Mode
                            </label>
                            <p className="text-xs text-gray-500">
                              {adsConfig.testMode ? 'Showing test ads' : 'Showing live ads'}
                            </p>
                          </div>
                          <button
                            onClick={() => updateAdsenseSettings(adsConfig.enabled, !adsConfig.testMode, adsConfig.clientId)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${adsConfig.testMode ? 'bg-yellow-600' : 'bg-blue-600'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adsConfig.testMode ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>

                        {adsConfig.testMode && (
                          <div className="text-xs text-yellow-300 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                            🧪 Test mode - showing test ads
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={testAdsenseConfiguration}
                        disabled={!adsConfig.enabled}
                        className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Test Configuration
                      </button>

                      <button
                        onClick={fetchAdsenseConfig}
                        className="flex-1 bg-slate-600 text-white px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Refresh Config
                      </button>
                    </div>

                    {/* Instructions */}
                    <div className="bg-slate-700/20 p-4 rounded-xl border border-white/10">
                      <h4 className="text-sm font-medium text-white mb-2">Setup Instructions</h4>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Replace the client ID in the code with your actual Google AdSense publisher ID</li>
                        <li>• Add your domain to your AdSense account settings</li>
                        <li>• Enable ads using the toggle above to make them visible to users</li>
                        <li>• Use test mode during development to avoid policy violations</li>
                        <li>• Allow 24-48 hours for ads to start appearing consistently</li>
                        <li>• Monitor performance in your Google AdSense dashboard</li>
                      </ul>
                    </div>

                    {/* Debug Info (only in development) */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="bg-slate-700/20 p-4 rounded-xl border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-2">Debug Information</h4>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>Manager Status: {adsenseManager.isEnabled() ? 'Enabled' : 'Disabled'}</div>
                          <div>Script Loaded: {adsenseManager.isScriptLoaded() ? 'Yes' : 'No'}</div>
                          <div>Should Show Ads: {adsenseManager.shouldShowAds() ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                    )}
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
              {/* Updated Create Student Form in Students Section */}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Mobile Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={studentForm.mobile}
                      onChange={(e) =>
                        setStudentForm({
                          ...studentForm,
                          mobile: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                      placeholder="+91 9876543210 or 10-digit number"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Format: +91 9876543210 or 9876543210 (10-15 digits)
                    </p>
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
                          {student.mobile && (
                            <p className="text-sm text-gray-400">
                              📱 {student.mobile}
                            </p>
                          )}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Start Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={courseForm.start_date}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              start_date: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          End Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={courseForm.end_date}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              end_date: e.target.value,
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Start Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={courseForm.start_date}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              start_date: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          End Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={courseForm.end_date}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              end_date: e.target.value,
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
                            group_link: "",
                            start_date: "",
                            end_date: "",
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
                          "videos", // Add this line
                          "assignments",
                          "queries",
                          user.role === "teacher" ? "students" : "project",
                          user.role === "teacher" ? "projects" : null,
                          user.role === "teacher" ? "attendance" : null,
                          user.role === "teacher" ? "subteachers" : null,
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
                              {tab === "subteachers" ? "Sub Teachers" : tab}
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

                          {/* Updated Course Information */}
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
                              {selectedCourse.start_date && (
                                <div>
                                  <span className="text-gray-400">Start Date:</span>
                                  <span className="text-white ml-2">
                                    {new Date(selectedCourse.start_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {selectedCourse.end_date && (
                                <div>
                                  <span className="text-gray-400">End Date:</span>
                                  <span className="text-white ml-2">
                                    {new Date(selectedCourse.end_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}

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
                                    <span className="text-gray-400">Status:</span>
                                    <span className={`ml-2 ${selectedCourse.completed_at ? 'text-green-300' : 'text-blue-300'}`}>
                                      {selectedCourse.completed_at ? 'Completed' : 'In Progress'}
                                    </span>
                                  </div>
                                </>
                              )}

                              {/* Teachers Information - Show only names */}
                              <div className="col-span-2">
                                <span className="text-gray-400">Teachers:</span>
                                <div className="mt-2">
                                  {courseTeachers.map((teacher, index) => (
                                    <div key={teacher.id} className="flex items-center justify-between py-1">
                                      <span className="text-white">
                                        {teacher.name}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs ${teacher.role === 'main'
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        }`}>
                                        {teacher.role === 'main' ? 'Main Teacher' : 'Sub Teacher'}
                                      </span>
                                    </div>
                                  ))}
                                  {courseTeachers.length === 0 && (
                                    <span className="text-gray-400 text-sm">Loading teachers...</span>
                                  )}
                                </div>
                              </div>
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
                              <form onSubmit={editingSession ? updateSession : createSession} className="space-y-4">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Session Time
                                    </label>
                                    <input
                                      type="time"
                                      value={sessionForm.sessionTime}
                                      onChange={(e) =>
                                        setSessionForm({
                                          ...sessionForm,
                                          sessionTime: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Conducted By
                                    </label>
                                    <select
                                      value={sessionForm.conductedBy}
                                      onChange={(e) =>
                                        setSessionForm({
                                          ...sessionForm,
                                          conductedBy: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    >
                                      <option value="">Select Teacher</option>
                                      {allCourseTeachers.map((teacher) => (
                                        <option key={teacher.id} value={teacher.id}>
                                          {teacher.name} ({teacher.role === 'main' ? 'Main Teacher' : 'Sub Teacher'})
                                        </option>
                                      ))}
                                    </select>
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
                                      onClick={resetSessionForm}
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
                                        Date: {new Date(session.session_date).toLocaleDateString()}
                                        {session.session_time && (
                                          <span> • Time: {session.session_time}</span>
                                        )}
                                      </p>
                                      {session.conducted_by_name && (
                                        <p className="text-sm text-gray-400">
                                          Conducted by: {session.conducted_by_name}
                                        </p>
                                      )}
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
                          {/* Updated Add Student Form */}
                          <div className="border-b border-white/10 pb-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Add Student to Course
                            </h3>
                            <form onSubmit={addStudent} className="flex space-x-3">
                              <StudentSearchInput
                                value={studentEmail}
                                onChange={(value) => {
                                  setStudentEmail(value);
                                  setStudentSearchValue(value);
                                }}
                                onSelect={handleStudentSelect}
                                placeholder="Search and select student by name or email"
                                courseId={selectedCourse.id}
                              />
                              <button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 flex items-center whitespace-nowrap"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Add Student
                              </button>
                            </form>
                          </div>

                          {/* Students List */}
                          {/* Enhanced Students List */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Enrolled Students ({students.length})
                            </h3>
                            <div className="space-y-3">
                              {students.map((student) => (
                                <div
                                  key={student.id}
                                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/10"
                                >
                                  <div className="flex items-center space-x-4">
                                    <div className="h-10 w-10 bg-gradient-to-r from-green-400 to-blue-400 rounded-xl flex items-center justify-center">
                                      <GraduationCap className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-white">
                                        {student.name}
                                      </h4>
                                      <p className="text-sm text-gray-400">
                                        {student.email}
                                      </p>
                                      {student.mobile && (
                                        <p className="text-sm text-gray-400">
                                          📱 {student.mobile}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                                        <span>
                                          Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                                        </span>
                                        {student.completed_at && (
                                          <span className="text-green-400">
                                            Completed: {new Date(student.completed_at).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                        <span>
                                          Attendance: {student.present_count || 0}/{student.total_attendance || 0}
                                        </span>
                                        {student.project_status && (
                                          <span
                                            className={`px-2 py-1 rounded text-xs ${student.project_status === "approved"
                                              ? "bg-green-500/20 text-green-300"
                                              : student.project_status === "rejected"
                                                ? "bg-red-500/20 text-red-300"
                                                : "bg-yellow-500/20 text-yellow-300"
                                              }`}
                                          >
                                            Project: {student.project_status}
                                          </span>
                                        )}
                                      </div>
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
                                  <p className="text-gray-400">No students enrolled yet.</p>
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

                      {activeTab === "subteachers" && user.role === "teacher" && (
                        <div className="space-y-6">
                          {/* Updated Add Sub-Teacher Form */}
                          <div className="border-b border-white/10 pb-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Add Sub-Teacher
                            </h3>
                            <form onSubmit={addSubTeacher} className="flex space-x-3">
                              <TeacherSearchInput
                                value={subTeacherEmail}
                                onChange={(value) => {
                                  setSubTeacherEmail(value);
                                  setTeacherSearchValue(value);
                                }}
                                onSelect={handleTeacherSelect}
                                placeholder="Search and select teacher by name or email"
                              />
                              <button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 flex items-center whitespace-nowrap"
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Sub-Teacher
                              </button>
                            </form>
                          </div>

                          {/* Sub-Teachers List */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Sub-Teachers
                            </h3>
                            <div className="space-y-3">
                              {subTeachers.map((subTeacher) => (
                                <div
                                  key={subTeacher.id}
                                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/10"
                                >
                                  <div>
                                    <h4 className="font-medium text-white">
                                      {subTeacher.name}
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                      {subTeacher.email}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                      <span>
                                        Added: {new Date(subTeacher.added_at).toLocaleDateString()}
                                      </span>
                                      <span>
                                        Added by: {subTeacher.added_by_name}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeSubTeacher(subTeacher.teacher_id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors flex items-center"
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Remove
                                  </button>
                                </div>
                              ))}
                              {subTeachers.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Users className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-gray-400">No sub-teachers added yet.</p>
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
                      {/* Enhanced Queries Tab */}
                      {activeTab === "queries" && (
                        <div className="space-y-6">
                          {/* Query Statistics for Teachers */}
                          {user.role === "teacher" && queryStats.total_queries > 0 && (
                            <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10">
                              <h4 className="text-lg font-medium text-white mb-4">Query Statistics</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-400">{queryStats.total_queries}</div>
                                  <div className="text-sm text-gray-400">Total Queries</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-yellow-400">{queryStats.pending_queries}</div>
                                  <div className="text-sm text-gray-400">Pending</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-400">{queryStats.answered_queries}</div>
                                  <div className="text-sm text-gray-400">Answered</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-400">
                                    {queryStats.avg_response_time_hours ? Math.round(queryStats.avg_response_time_hours) : 0}h
                                  </div>
                                  <div className="text-sm text-gray-400">Avg Response</div>
                                </div>
                              </div>

                              {/* Updated to use high_priority_count instead of high_priority */}
                              {queryStats.high_priority_count > 0 && (
                                <div className="mt-3 p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                                  <div className="flex items-center text-red-300">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    <span className="text-sm">{queryStats.high_priority_count} high priority queries need attention</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Enhanced Submit Query Form for Students */}
                          {user.role === "student" && (
                            <div className="border-b border-white/10 pb-6">
                              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <Plus className="h-5 w-5 mr-2" />
                                Ask a Question
                              </h3>
                              <form onSubmit={submitQuery} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Question Title *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={queryForm.title}
                                      onChange={(e) =>
                                        setQueryForm({
                                          ...queryForm,
                                          title: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      placeholder="Brief title for your question..."
                                      maxLength="255"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Category
                                    </label>
                                    <select
                                      value={queryForm.category}
                                      onChange={(e) =>
                                        setQueryForm({
                                          ...queryForm,
                                          category: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    >
                                      <option value="general">General</option>
                                      <option value="assignment">Assignment</option>
                                      <option value="technical">Technical</option>
                                      <option value="deadline">Deadline</option>
                                      <option value="content">Content</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Priority
                                    </label>
                                    <select
                                      value={queryForm.priority}
                                      onChange={(e) =>
                                        setQueryForm({
                                          ...queryForm,
                                          priority: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    >
                                      <option value="low">Low</option>
                                      <option value="medium">Medium</option>
                                      <option value="high">High</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center pt-8">
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={queryForm.isAnonymous}
                                        onChange={(e) =>
                                          setQueryForm({
                                            ...queryForm,
                                            isAnonymous: e.target.checked,
                                          })
                                        }
                                        className="mr-2 rounded"
                                      />
                                      <span className="text-sm text-gray-300">Ask anonymously</span>
                                    </label>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Your Question *
                                  </label>
                                  <textarea
                                    required
                                    value={queryForm.question}
                                    onChange={(e) =>
                                      setQueryForm({
                                        ...queryForm,
                                        question: e.target.value,
                                      })
                                    }
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                    rows="4"
                                    placeholder="Describe your question in detail..."
                                  />
                                </div>

                                {/* File Attachments */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Attachments (Optional)
                                  </label>
                                  <div className="flex items-center space-x-4">
                                    <input
                                      type="file"
                                      multiple
                                      onChange={handleFileAttachment}
                                      className="hidden"
                                      id="query-attachments"
                                      accept="image/*,.pdf,.doc,.docx,.txt"
                                    />
                                    <label
                                      htmlFor="query-attachments"
                                      className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer flex items-center"
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Add Files
                                    </label>
                                    <span className="text-xs text-gray-400">
                                      Max 3 files, 5MB each. Images, PDFs, docs allowed.
                                    </span>
                                  </div>

                                  {/* Selected Files */}
                                  {queryForm.attachments.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {queryForm.attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-slate-700/30 p-2 rounded-lg">
                                          <div className="flex items-center">
                                            <FileText className="h-4 w-4 mr-2 text-gray-400" />
                                            <span className="text-sm text-white">{file.name}</span>
                                            <span className="text-xs text-gray-400 ml-2">
                                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="submit"
                                  disabled={loading}
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  {loading ? "Submitting..." : "Submit Question"}
                                </button>
                              </form>
                            </div>
                          )}

                          {/* Enhanced Filters and Search */}
                          <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10">
                            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  placeholder="Search queries..."
                                  value={queryFilters.search}
                                  onChange={(e) =>
                                    setQueryFilters({ ...queryFilters, search: e.target.value })
                                  }
                                  className="w-full px-4 py-2 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white text-sm"
                                />
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <select
                                  value={queryFilters.status}
                                  onChange={(e) =>
                                    setQueryFilters({ ...queryFilters, status: e.target.value })
                                  }
                                  className="px-3 py-2 bg-slate-700/50 border border-white/20 rounded-lg text-white text-sm"
                                >
                                  <option value="all">All Status</option>
                                  <option value="pending">Pending</option>
                                  <option value="answered">Answered</option>
                                  <option value="closed">Closed</option>
                                </select>

                                <select
                                  value={queryFilters.category}
                                  onChange={(e) =>
                                    setQueryFilters({ ...queryFilters, category: e.target.value })
                                  }
                                  className="px-3 py-2 bg-slate-700/50 border border-white/20 rounded-lg text-white text-sm"
                                >
                                  <option value="all">All Categories</option>
                                  <option value="general">General</option>
                                  <option value="assignment">Assignment</option>
                                  <option value="technical">Technical</option>
                                  <option value="deadline">Deadline</option>
                                  <option value="content">Content</option>
                                </select>

                                <select
                                  value={queryFilters.priority}
                                  onChange={(e) =>
                                    setQueryFilters({ ...queryFilters, priority: e.target.value })
                                  }
                                  className="px-3 py-2 bg-slate-700/50 border border-white/20 rounded-lg text-white text-sm"
                                >
                                  <option value="all">All Priority</option>
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>

                                <select
                                  value={queryFilters.sortBy}
                                  onChange={(e) =>
                                    setQueryFilters({ ...queryFilters, sortBy: e.target.value })
                                  }
                                  className="px-3 py-2 bg-slate-700/50 border border-white/20 rounded-lg text-white text-sm"
                                >
                                  <option value="recent">Recent</option>
                                  <option value="oldest">Oldest</option>
                                  <option value="priority">Priority</option>
                                  <option value="popular">Popular</option>
                                  <option value="unanswered">Unanswered First</option>
                                </select>

                                <button
                                  onClick={resetFilters}
                                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Queries List */}
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold text-white">
                                {user.role === "teacher" ? "Student Questions" : "Course Questions"}
                                {queries.length > 0 && (
                                  <span className="text-sm text-gray-400 ml-2">
                                    ({queryPagination.total} total)
                                  </span>
                                )}
                              </h3>
                            </div>

                            <div className="space-y-4">
                              {queries.map((query) => {
                                const isExpanded = expandedQueries.has(query.id);
                                const showFullQuestion = isExpanded || query.question.length <= 200;

                                return (
                                  <div
                                    key={query.id}
                                    className="bg-slate-700/30 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all duration-200"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        {/* Query Header */}
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex-1">
                                            <h4 className="font-medium text-white text-lg mb-2">
                                              {query.title}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                              <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium border ${query.status === "answered"
                                                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                                                  : query.status === "closed"
                                                    ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                                    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                                  }`}
                                              >
                                                {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                                              </span>

                                              <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium border ${query.priority === "high"
                                                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                                                  : query.priority === "medium"
                                                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                                    : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                                  }`}
                                              >
                                                {query.priority.charAt(0).toUpperCase() + query.priority.slice(1)}
                                              </span>

                                              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-medium">
                                                {query.category.charAt(0).toUpperCase() + query.category.slice(1)}
                                              </span>

                                              {query.attachment_count > 0 && (
                                                <span className="flex items-center text-xs text-gray-400">
                                                  <FileText className="h-3 w-3 mr-1" />
                                                  {query.attachment_count} file{query.attachment_count > 1 ? 's' : ''}
                                                </span>
                                              )}

                                              {query.is_anonymous && (
                                                <span className="px-2 py-1 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-full text-xs">
                                                  Anonymous
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                              <span className="flex items-center">
                                                <User className="h-3 w-3 mr-1" />
                                                {query.student_name}
                                              </span>
                                              <span className="flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {new Date(query.asked_at).toLocaleDateString()}
                                              </span>
                                              {query.views > 0 && (
                                                <span className="flex items-center">
                                                  <Eye className="h-3 w-3 mr-1" />
                                                  {query.views} views
                                                </span>
                                              )}
                                              {query.helpful_votes > 0 && (
                                                <span className="flex items-center">
                                                  <CheckCircle className="h-3 w-3 mr-1" />
                                                  {query.helpful_votes} helpful
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Question Content */}
                                        <div className="mb-3">
                                          <p className="text-sm text-gray-400 mb-1">Question:</p>
                                          <div className="text-white">
                                            {showFullQuestion ? (
                                              <p className="whitespace-pre-wrap">{query.question}</p>
                                            ) : (
                                              <p className="whitespace-pre-wrap">
                                                {query.question.substring(0, 200)}...
                                              </p>
                                            )}
                                            {query.question.length > 200 && (
                                              <button
                                                onClick={() => toggleQueryExpansion(query.id)}
                                                className="text-purple-400 hover:text-purple-300 text-sm mt-1 flex items-center"
                                              >
                                                {isExpanded ? (
                                                  <>
                                                    <ChevronLeft className="h-3 w-3 mr-1" />
                                                    Show Less
                                                  </>
                                                ) : (
                                                  <>
                                                    <ChevronRight className="h-3 w-3 mr-1" />
                                                    Read More
                                                  </>
                                                )}
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Attachments */}
                                        {query.attachments && query.attachments.length > 0 && (
                                          <div className="mb-3">
                                            <p className="text-sm text-gray-400 mb-2">Attachments:</p>
                                            <div className="flex flex-wrap gap-2">
                                              {query.attachments.map((attachment) => (
                                                <a
                                                  key={attachment.id}
                                                  href={`http://localhost:5002/uploads/${attachment.filename}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex items-center bg-slate-600/50 px-3 py-2 rounded-lg hover:bg-slate-600/70 transition-colors"
                                                >
                                                  <FileText className="h-3 w-3 mr-2 text-gray-400" />
                                                  <span className="text-sm text-white">{attachment.original_name}</span>
                                                  <span className="text-xs text-gray-400 ml-2">
                                                    ({(attachment.file_size / 1024 / 1024).toFixed(2)} MB)
                                                  </span>
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Answer Section */}
                                        {query.answer && (
                                          <div className="mt-4 p-4 bg-slate-600/50 rounded-xl border border-white/10">
                                            <p className="text-sm text-gray-400 mb-2 flex items-center">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Answer:
                                            </p>
                                            <p className="text-white whitespace-pre-wrap">{query.answer}</p>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                                              <p className="text-xs text-gray-400">
                                                Answered by {query.teacher_name} on{" "}
                                                {new Date(query.answered_at).toLocaleString()}
                                              </p>
                                              {user.role === "student" && query.status === "answered" && (
                                                <button
                                                  onClick={() => markQueryHelpful(query.id)}
                                                  className="text-green-400 hover:text-green-300 text-xs flex items-center"
                                                >
                                                  <CheckCircle className="h-3 w-3 mr-1" />
                                                  Helpful
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Answer Form for Teachers */}
                                        {user.role === "teacher" &&
                                          query.status === "pending" &&
                                          selectedQuery === query.id && (
                                            <div className="mt-4 p-4 bg-slate-600/30 rounded-xl border border-white/10">
                                              <textarea
                                                value={answerForm}
                                                onChange={(e) => setAnswerForm(e.target.value)}
                                                placeholder="Type your answer here..."
                                                className="w-full px-3 py-3 bg-slate-700/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-white text-sm"
                                                rows="4"
                                              />
                                              <div className="flex space-x-2 mt-3">
                                                <button
                                                  onClick={() => answerQuery(query.id, false)}
                                                  disabled={loading || !answerForm.trim()}
                                                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                                                >
                                                  <MessageCircle className="h-3 w-3 mr-1" />
                                                  {loading ? "Answering..." : "Submit Answer"}
                                                </button>
                                                <button
                                                  onClick={() => answerQuery(query.id, true)}
                                                  disabled={loading || !answerForm.trim()}
                                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                                                >
                                                  <Lock className="h-3 w-3 mr-1" />
                                                  Answer & Close
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setSelectedQuery(null);
                                                    setAnswerForm("");
                                                  }}
                                                  className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex flex-col space-y-2 ml-4">
                                        {user.role === "teacher" && query.status === "pending" && (
                                          <button
                                            onClick={() => {
                                              setSelectedQuery(selectedQuery === query.id ? null : query.id);
                                              setAnswerForm("");
                                            }}
                                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center whitespace-nowrap"
                                          >
                                            <MessageCircle className="h-3 w-3 mr-1" />
                                            {selectedQuery === query.id ? "Cancel" : "Answer"}
                                          </button>
                                        )}

                                        {user.role === "teacher" && (
                                          <div className="relative group">
                                            <button className="bg-slate-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center">
                                              <Settings className="h-3 w-3 mr-1" />
                                              Status
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                              <button
                                                onClick={() => updateQueryStatus(query.id, "pending")}
                                                className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 rounded-t-lg"
                                              >
                                                Mark Pending
                                              </button>
                                              <button
                                                onClick={() => updateQueryStatus(query.id, "answered")}
                                                className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700"
                                              >
                                                Mark Answered
                                              </button>
                                              <button
                                                onClick={() => updateQueryStatus(query.id, "closed")}
                                                className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 rounded-b-lg"
                                              >
                                                Close Query
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {user.role === "student" && query.student_id === user.userId && (
                                          <button
                                            onClick={() => toggleQueryFollow(query.id)}
                                            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center ${query.isFollowing
                                              ? "bg-purple-600 text-white hover:bg-purple-700"
                                              : "bg-slate-600 text-white hover:bg-slate-700"
                                              }`}
                                          >
                                            <Bell className="h-3 w-3 mr-1" />
                                            {query.isFollowing ? "Following" : "Follow"}
                                          </button>
                                        )}

                                        <button
                                          onClick={() => deleteQuery(query.id)}
                                          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Pagination */}
                              {queryPagination.totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-2 mt-6">
                                  <button
                                    onClick={() => fetchQueries(selectedCourse.id, queryPagination.page - 1)}
                                    disabled={queryPagination.page === 1}
                                    className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </button>

                                  <div className="flex space-x-1">
                                    {Array.from({ length: Math.min(5, queryPagination.totalPages) }, (_, i) => {
                                      let pageNum;
                                      if (queryPagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                      } else if (queryPagination.page <= 3) {
                                        pageNum = i + 1;
                                      } else if (queryPagination.page >= queryPagination.totalPages - 2) {
                                        pageNum = queryPagination.totalPages - 4 + i;
                                      } else {
                                        pageNum = queryPagination.page - 2 + i;
                                      }

                                      return (
                                        <button
                                          key={pageNum}
                                          onClick={() => fetchQueries(selectedCourse.id, pageNum)}
                                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${queryPagination.page === pageNum
                                            ? "bg-purple-500 text-white shadow-lg"
                                            : "bg-slate-700/50 text-gray-300 hover:bg-slate-600"
                                            }`}
                                        >
                                          {pageNum}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <button
                                    onClick={() => fetchQueries(selectedCourse.id, queryPagination.page + 1)}
                                    disabled={queryPagination.page === queryPagination.totalPages}
                                    className="px-3 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>
                              )}

                              {/* Empty State */}
                              {queries.length === 0 && (
                                <div className="text-center py-12">
                                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <h3 className="text-lg font-medium text-white mb-2">
                                    {queryFilters.search || queryFilters.status !== 'all' || queryFilters.category !== 'all' || queryFilters.priority !== 'all'
                                      ? "No queries match your filters"
                                      : user.role === "teacher"
                                        ? "No questions from students yet"
                                        : "No questions posted yet"}
                                  </h3>
                                  <p className="text-gray-400">
                                    {queryFilters.search || queryFilters.status !== 'all' || queryFilters.category !== 'all' || queryFilters.priority !== 'all'
                                      ? "Try adjusting your search criteria or filters."
                                      : user.role === "teacher"
                                        ? "Student questions will appear here once they start asking."
                                        : "Be the first to ask a question to your teachers!"}
                                  </p>
                                  {(queryFilters.search || queryFilters.status !== 'all' || queryFilters.category !== 'all' || queryFilters.priority !== 'all') && (
                                    <button
                                      onClick={resetFilters}
                                      className="mt-4 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                                    >
                                      Clear Filters
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {activeTab === "videos" && (
                        <div className="space-y-6">
                          {/* Video Upload/Add Form for Teachers */}
                          {user.role === "teacher" && (
                            <div className="border-b border-white/10 pb-6">
                              <div className="flex items-center space-x-4 mb-4">
                                <h3 className="text-lg font-semibold text-white">
                                  Add Video
                                </h3>
                                <div className="flex bg-slate-700/30 rounded-xl p-1">
                                  <button
                                    onClick={() => setVideoType("file")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${videoType === "file"
                                      ? "bg-purple-500 text-white"
                                      : "text-gray-300 hover:text-white"
                                      }`}
                                  >
                                    Upload File
                                  </button>
                                  <button
                                    onClick={() => setVideoType("youtube")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${videoType === "youtube"
                                      ? "bg-red-500 text-white"
                                      : "text-gray-300 hover:text-white"
                                      }`}
                                  >
                                    YouTube Link
                                  </button>
                                </div>
                              </div>

                              {/* File Upload Form */}
                              {videoType === "file" && (
                                <form onSubmit={uploadVideo} className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Video Title *
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        value={videoForm.title}
                                        onChange={(e) =>
                                          setVideoForm({
                                            ...videoForm,
                                            title: e.target.value,
                                          })
                                        }
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                        placeholder="Video title"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Order Index
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={videoForm.orderIndex}
                                        onChange={(e) =>
                                          setVideoForm({
                                            ...videoForm,
                                            orderIndex: parseInt(e.target.value) || 0,
                                          })
                                        }
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Description
                                    </label>
                                    <textarea
                                      value={videoForm.description}
                                      onChange={(e) =>
                                        setVideoForm({
                                          ...videoForm,
                                          description: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      rows="3"
                                      placeholder="Video description"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Video File * (MP4, AVI, MOV, WMV, WebM - Max 500MB)
                                    </label>
                                    <input
                                      type="file"
                                      required
                                      onChange={(e) =>
                                        setVideoForm({
                                          ...videoForm,
                                          videoFile: e.target.files[0],
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white"
                                      accept="video/*"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {loading ? "Uploading..." : "Upload Video"}
                                  </button>
                                </form>
                              )}

                              {/* YouTube Link Form */}
                              {videoType === "youtube" && (
                                <form onSubmit={addYoutubeVideo} className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Video Title *
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        value={youtubeForm.title}
                                        onChange={(e) =>
                                          setYoutubeForm({
                                            ...youtubeForm,
                                            title: e.target.value,
                                          })
                                        }
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-white"
                                        placeholder="Video title"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Order Index
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={youtubeForm.orderIndex}
                                        onChange={(e) =>
                                          setYoutubeForm({
                                            ...youtubeForm,
                                            orderIndex: parseInt(e.target.value) || 0,
                                          })
                                        }
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-white"
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      YouTube URL *
                                    </label>
                                    <input
                                      type="url"
                                      required
                                      value={youtubeForm.youtubeUrl}
                                      onChange={(e) =>
                                        setYoutubeForm({
                                          ...youtubeForm,
                                          youtubeUrl: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-white"
                                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                      Supports both youtube.com and youtu.be URLs
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Description
                                    </label>
                                    <textarea
                                      value={youtubeForm.description}
                                      onChange={(e) =>
                                        setYoutubeForm({
                                          ...youtubeForm,
                                          description: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-white"
                                      rows="3"
                                      placeholder="Video description"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all duration-200 flex items-center"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    {loading ? "Adding..." : "Add YouTube Video"}
                                  </button>
                                </form>
                              )}
                            </div>
                          )}

                          {/* Videos List */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              Course Videos
                            </h3>
                            <div className="space-y-4">
                              {videos.map((video, index) => (
                                <div
                                  key={video.id}
                                  className="bg-slate-700/30 rounded-xl p-4 border border-white/10"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-medium text-white">
                                          {video.title}
                                        </h4>
                                        <span className="text-xs text-gray-400 bg-slate-600/50 px-2 py-1 rounded">
                                          #{index + 1}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded border ${video.video_type === 'youtube'
                                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                          }`}>
                                          {video.video_type === 'youtube' ? 'YouTube' : 'File'}
                                        </span>
                                        {user.role === "student" && video.video_type === 'file' && videoProgress[video.id]?.completed && (
                                          <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded border border-green-500/30">
                                            Completed
                                          </span>
                                        )}
                                      </div>
                                      {video.description && (
                                        <p className="text-sm text-gray-300 mb-2">
                                          {video.description}
                                        </p>
                                      )}
                                      <div className="text-sm text-gray-400 space-y-1">
                                        <p>Uploaded by: {video.uploaded_by_name}</p>
                                        <p>
                                          Added: {new Date(video.created_at).toLocaleDateString()}
                                        </p>
                                        {video.video_type === 'youtube' && (
                                          <p className="text-red-400">
                                            YouTube: {video.youtube_url}
                                          </p>
                                        )}
                                        {user.role === "student" && video.video_type === 'file' && videoProgress[video.id] && (
                                          <div className="mt-2">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                              <span>Progress</span>
                                              <span>
                                                {Math.round((videoProgress[video.id].watched_seconds / videoProgress[video.id].total_duration) * 100)}%
                                              </span>
                                            </div>
                                            <div className="w-full bg-slate-600 rounded-full h-2">
                                              <div
                                                className="bg-purple-500 h-2 rounded-full"
                                                style={{
                                                  width: `${Math.round((videoProgress[video.id].watched_seconds / videoProgress[video.id].total_duration) * 100)}%`
                                                }}
                                              ></div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col space-y-2 ml-4">
                                      <button
                                        onClick={() => setSelectedVideo(video)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        {video.video_type === 'youtube' ? 'Watch' : 'Play'}
                                      </button>
                                      {user.role === "teacher" && (
                                        <button
                                          onClick={() => deleteVideo(video.id)}
                                          className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors flex items-center"
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {videos.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FileText className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-gray-400">
                                    No videos added yet.
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
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {user.role === "teacher"
                          ? "My Courses"
                          : "My Enrolled Courses"}
                      </h2>
                      {user.role === "student" && (
                        <p className="text-gray-400 text-sm mt-1">
                          {courses.length > 0
                            ? `Enrolled in ${courses.length} course${courses.length > 1 ? 's' : ''}`
                            : 'Not enrolled in any courses yet'
                          }
                        </p>
                      )}
                    </div>
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

                  {courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {courses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => {
                            setSelectedCourse(course);
                            setActiveTab("overview");
                          }}
                          className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:bg-slate-700/50 transition-all duration-200 border border-white/10 hover:border-purple-500/30 group relative"
                        >
                          {/* Enrollment Status for Students */}
                          {user.role === "student" && (
                            <div className="absolute top-4 right-4">
                              {course.completed_at ? (
                                <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs border border-green-500/30 flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </div>
                              ) : (
                                <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs border border-blue-500/30 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Progress
                                </div>
                              )}
                            </div>
                          )}

                          {/* Group Link Indicator for Teachers */}
                          {user.role === "teacher" && course.group_link && (
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
                              <h3 className="font-semibold text-white text-lg group-hover:text-purple-300 transition-colors line-clamp-1">
                                {course.title}
                              </h3>
                              <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                                {course.description}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm text-gray-400">
                            {user.role === "teacher" && (
                              <div className="flex justify-between">
                                <span>Students: {course.enrolled_students || 0}</span>
                                <span>Duration: {course.duration_days} days</span>
                              </div>
                            )}

                            {user.role === "student" && (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span>Teacher:</span>
                                  <span className="text-white font-medium">{course.teacher_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Enrolled:</span>
                                  <span className="text-white">
                                    {new Date(course.enrolled_at).toLocaleDateString()}
                                  </span>
                                </div>
                                {course.completed_at && (
                                  <div className="flex justify-between">
                                    <span>Completed:</span>
                                    <span className="text-green-300">
                                      {new Date(course.completed_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {course.group_link && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-green-400 text-xs flex items-center">
                                      <Users className="h-3 w-3 mr-1" />
                                      Study Group Available
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-white/10">
                              <span className="text-xs">
                                Created: {new Date(course.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-purple-400 group-hover:text-purple-300 font-medium text-sm">
                                View Details →
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Enhanced Empty State */
                    <div className="text-center py-16">
                      <div className="h-20 w-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-medium text-white mb-3">
                        {user.role === "teacher" ? "No courses created yet" : "Not enrolled in any courses"}
                      </h3>
                      <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        {user.role === "teacher"
                          ? "Create your first course to start teaching and managing students."
                          : "You haven't been enrolled in any courses yet. Contact your teacher or administrator to get enrolled."}
                      </p>
                      {user.role === "teacher" && (
                        <button
                          onClick={() => setSelectedCourse("create")}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center mx-auto"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Course
                        </button>
                      )}
                      {user.role === "student" && (
                        <div className="bg-slate-800/30 rounded-xl p-6 max-w-md mx-auto border border-white/10">
                          <h4 className="text-white font-medium mb-2">Need to get enrolled?</h4>
                          <p className="text-gray-400 text-sm mb-4">
                            Ask your teacher to add you to a course using your email address:
                          </p>
                          <div className="bg-slate-700/50 p-3 rounded-lg border border-white/10">
                            <code className="text-purple-300 text-sm">{user.email}</code>
                          </div>
                        </div>
                      )}
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