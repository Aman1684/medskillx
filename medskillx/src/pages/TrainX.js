import React, { useState, useEffect, useCallback } from 'react';
import './TrainX.css'; // Assuming your CSS is already aligned
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle,
  faCertificate,
  faTrophy,
  faBookOpen,
  faLightbulb,
  faGraduationCap,
  faQuestionCircle,
  faBell,
  faStar,
  faThumbsUp,
  faHourglassHalf,
  faMapSigns,
  faChevronLeft,
  faClock,
  faUsers,
  faVideo,
  faChevronRight,
  // Add any other icons you might be using that are not in the error list but exist in your file
  // from the previous error list:
  faDownload,
  faSpinner,
  faLock,
  faSyncAlt
} from '@fortawesome/free-solid-svg-icons';


// --- Notification Component ---
const Notification = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-close after 5 seconds
        return () => clearTimeout(timer);
    }, [message, type, onClose]);

    return (
        <div className={`notification ${type}`}>
            {type === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
            {type === 'error' && <FontAwesomeIcon icon={faExclamationTriangle} />}
            {type === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
            {type === 'info' && <FontAwesomeIcon icon={faInfoCircle} />}
            <span>{message}</span>
            <button onClick={onClose} aria-label="Close notification">✖</button>
        </div>
    );
};

// --- Certificate Component ---
const Certificate = ({ user, course, onDownload, onClose }) => (
    <div className="certificate-modal-overlay">
        <div className="certificate-modal-content">
            <h2><FontAwesomeIcon icon={faCertificate} /> Certificate of Completion</h2>
            <p>This certifies that <strong>{user.username || "Valued Learner"}</strong> has successfully completed the course:</p>
            <h3>{course.title}</h3>
            <p className="certificate-issuer">Issued by <b>MedSkillX</b> & {course.partner || 'Partnered Organization'}</p>
            <p className="certificate-verifiable">Digitally Verifiable & Recognized</p>
            <div className="certificate-actions">
                <button onClick={onDownload} className="btn-primary"><FontAwesomeIcon icon={faDownload} /> Download PDF</button>
                <button className="btn-secondary" onClick={onClose}>Close</button>
            </div>
        </div>
    </div>
);

// --- Leaderboard Modal Component ---
const LeaderboardModal = ({ leaderboardData, onClose }) => (
    <div className="leaderboard-modal-overlay">
        <div className="leaderboard-modal-content">
            <h2><FontAwesomeIcon icon={faTrophy} /> Global Leaderboard</h2>
            {leaderboardData.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>User</th>
                            <th>Courses Completed</th>
                            <th>Total Score</th> {/* Assuming a 'totalScore' or similar metric */}
                            <th>Fastest Completions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboardData.map((entry, index) => (
                            <tr key={entry.userId}>
                                <td>{index + 1}</td>
                                <td>{entry.username}</td>
                                <td>{entry.coursesCompleted}</td>
                                <td>{entry.totalScore}</td>
                                <td>{entry.fastestCompletionTime ? `${entry.fastestCompletionTime} min` : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Loading leaderboard data...</p>
            )}
            <button onClick={onClose} className="close-modal-btn">Close</button>
        </div>
    </div>
);

const TrainX = () => {
    // --- State from AuthContext ---
    const { isLoggedIn, loggedInUser, authToken, logout, authLoading } = useAuth();

    // --- Component Local State ---
    const [courses, setCourses] = useState([]);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
    const [quizState, setQuizState] = useState({ q: 0, selected: null, showExp: false, score: 0 });
    const [progress, setProgress] = useState({}); // Stores user's progress for all courses
    const [timerIntervalId, setTimerIntervalId] = useState(null); // Stores the interval ID for cleanup
    const [timeLeft, setTimeLeft] = useState(null); // Time left for current module in seconds
    const [notification, setNotification] = useState(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);
    const [recommendedCourses, setRecommendedCourses] = useState([]); // For recommendations

    const API_BASE_URL = 'http://localhost:5000/api/trainx';

    // Helper to display notifications
    const showNotification = useCallback((message, type) => {
        setNotification({ message, type });
    }, []);

    // --- Fetch Courses on Mount ---
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/courses`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setCourses(data);
            } catch (error) {
                console.error("Failed to fetch courses:", error);
                showNotification("Failed to load courses. Please try again later.", "error");
            }
        };
        fetchCourses();
    }, [showNotification]);

    // --- Fetch Leaderboard Data on Mount ---
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/leaderboard`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setLeaderboardData(data);
            } catch (error) {
               // console.error("Failed to fetch leaderboard data:", error);
              //  showNotification("Failed to load leaderboard. Please try again later.", "error");
            }
        };
        fetchLeaderboard();
    }, [showNotification]);

    // --- User Progress Management (Fetch and Save) ---
    useEffect(() => {
        const fetchProgress = async () => {
            if (authLoading || !isLoggedIn || !loggedInUser?.id) {
                setProgress({});
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/progress/${loggedInUser.id}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        showNotification("Your session has expired. Please log in again.", "warning");
                        logout();
                    }
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
                }
                const data = await response.json();
                setProgress(data.progress || {});
                showNotification("Your course progress loaded successfully!", "success");
            } catch (error) {
                console.error(`Failed to load progress for ${loggedInUser?.id}:`, error);
                if (!error.message.includes('401') && !error.message.includes('403')) {
                    showNotification(`Failed to load your course progress: ${error.message}.`, "error");
                }
            }
        };
        fetchProgress();
    }, [loggedInUser, isLoggedIn, authToken, authLoading, showNotification, logout]);

    // Save progress whenever `progress` state changes (debounced)
    useEffect(() => {
        const saveProgress = async () => {
            if (!isLoggedIn || !loggedInUser?.id || Object.keys(progress).length === 0) return;
            try {
                const response = await fetch(`${API_BASE_URL}/progress/${loggedInUser.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ progress }),
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        showNotification("Your session has expired. Please log in again.", "warning");
                        logout();
                    }
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
                }
                // console.log("Progress saved to backend.");
            } catch (error) {
                console.error("Failed to save progress:", error);
                if (!error.message.includes('401') && !error.message.includes('403')) {
                    showNotification(`Failed to save your progress automatically: ${error.message}.`, "error");
                }
            }
        };
        const handler = setTimeout(() => {
            saveProgress();
        }, 500); // Debounce saving for 500ms
        return () => clearTimeout(handler);
    }, [progress, loggedInUser, isLoggedIn, authToken, showNotification, logout]);

    // --- Current Module and Timer Logic ---
    const currentModule = useCallback(() => {
        return selectedCourse?.modules?.[currentModuleIdx] || null;
    }, [selectedCourse, currentModuleIdx]);

    useEffect(() => {
        if (!selectedCourse || !currentModule()) {
            if (timerIntervalId) clearInterval(timerIntervalId);
            setTimeLeft(null);
            return;
        }

        const module = currentModule();
        if (typeof module.timeLimit !== 'number' || module.timeLimit <= 0) {
            if (timerIntervalId) clearInterval(timerIntervalId);
            setTimeLeft(null); // No time limit for this module
            return;
        }

        const savedTimeLeft = progress[selectedCourse.title]?.[module.name]?.timeLeft;
        const initialTime = savedTimeLeft !== undefined ? savedTimeLeft : module.timeLimit * 60;
        setTimeLeft(initialTime);

        if (timerIntervalId) clearInterval(timerIntervalId);

        const interval = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    showNotification("⏰ Time's up for this module! Please complete the quiz.", "warning");
                    clearInterval(interval);
                    setProgress(pr => ({
                        ...pr,
                        [selectedCourse.title]: {
                            ...pr[selectedCourse.title],
                            [module.name]: { completed: false, passed: false, timeLeft: 0 } // Mark as not passed if time runs out
                        }
                    }));
                    return 0;
                }
                const newTime = prevTime - 1;
                setProgress(pr => ({
                    ...pr,
                    [selectedCourse.title]: {
                        ...pr[selectedCourse.title],
                        [module.name]: { ...(pr[selectedCourse.title]?.[module.name] || {}), timeLeft: newTime }
                    }
                }));

                // Lagging alert logic (every 30 seconds if significantly behind)
                const originalModuleDuration = module.timeLimit * 60;
                const timeSpentRatio = (originalModuleDuration - newTime) / originalModuleDuration;
                if (timeSpentRatio > 0.25 && newTime % 30 === 0 && newTime > 60) {
                    showNotification(`⌛ You have ${Math.ceil(newTime / 60)} minutes left on this module! Keep going.`, "info");
                }
                return newTime;
            });
        }, 1000);
        setTimerIntervalId(interval);

        return () => clearInterval(interval);
    }, [selectedCourse, currentModuleIdx, progress, timerIntervalId, currentModule, showNotification]);


    // --- New: Fetch Recommendations ---
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (authLoading || !isLoggedIn || !loggedInUser?.id) {
                setRecommendedCourses([]);
                return;
            }
            try {
                // This endpoint would analyze user's completed courses, quiz scores,
                // and potentially a 'user_level' or 'interests' stored in their profile.
                const response = await fetch(`${API_BASE_URL}/recommendations/${loggedInUser.id}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setRecommendedCourses(data.recommendedCourses || []);
            } catch (error) {
                console.error("Failed to fetch recommendations:", error);
            }
        };
        fetchRecommendations();
    }, [loggedInUser, isLoggedIn, authToken, authLoading]);

    // --- Handlers ---
    const handleCourseSelect = useCallback((course) => {
        if (!isLoggedIn) {
            showNotification("Please log in to enroll in a course and track your progress.", "info");
            return;
        }

        setSelectedCourse(course);
        setQuizState({ q: 0, selected: null, showExp: false, score: 0 }); // Reset quiz state

        const isAlreadyEnrolled = progress[course.title] && Object.keys(progress[course.title]).length > 0;

        if (!isAlreadyEnrolled) {
            showNotification(`You've successfully enrolled in ${course.title}!`, "success");
            const initialCourseProgress = {};
            course.modules.forEach(module => {
                initialCourseProgress[module.name] = {
                    completed: false,
                    passed: false,
                    timeLeft: module.timeLimit ? module.timeLimit * 60 : undefined
                };
            });
            setProgress(prevProgress => ({
                ...prevProgress,
                [course.title]: initialCourseProgress
            }));
            setCurrentModuleIdx(0); // Start new enrollment from first module
        } else {
            // IF ALREADY ENROLLED: Try to load user's last progress for this course/module
            const courseProgress = progress[course.title];
            const firstIncompleteModuleIdx = course.modules.findIndex(module =>
                !(courseProgress[module.name]?.completed && courseProgress[module.name]?.passed)
            );

            if (firstIncompleteModuleIdx !== -1) {
                setCurrentModuleIdx(firstIncompleteModuleIdx);
                showNotification(`Continuing ${course.title} from where you left off.`, "info");
            } else {
                showNotification("You have already completed this course! Review or download your certificate.", "info");
                setCurrentModuleIdx(0); // Go to first module for review
                if (isCourseFullyCompletedAndPassed(course.title)) { // Check if completed
                    setShowCertificate(true); // Offer certificate if fully completed
                }
            }
        }
        setNotification(null); // Clear any lingering notifications
    }, [loggedInUser, progress, isLoggedIn, showNotification]);


    const handleQuizAnswer = (idx) => {
        if (quizState.showExp || timeLeft <= 0) return;
        const currentMod = currentModule();
        if (!currentMod || !currentMod.quiz) return;

        const correct = idx === currentMod.quiz[quizState.q].answer;
        setQuizState(qs => ({
            ...qs,
            selected: idx,
            showExp: true,
            score: correct ? qs.score + 1 : qs.score
        }));
        if (correct) showNotification("✅ Correct! Well done!", "success");
        else showNotification("❌ Incorrect. Review the explanation.", "error");
    };

    const handleNextQuizOrModule = () => {
        const module = currentModule();
        if (!module || !module.quiz) return;
        const currentQuiz = module.quiz;

        if (quizState.q + 1 < currentQuiz.length) {
            setQuizState(qs => ({
                ...qs,
                q: qs.q + 1,
                selected: null,
                showExp: false
            }));
        } else {
            // Quiz finished for this module
            const passed = (quizState.score / currentQuiz.length) >= 0.8;
            const newProgressEntry = {
                completed: true,
                passed: passed,
                timeLeft: timeLeft // Save remaining time or 0 if timed out
            };

            setProgress(pr => ({
                ...pr,
                [selectedCourse.title]: {
                    ...pr[selectedCourse.title],
                    [module.name]: newProgressEntry
                }
            }));

            if (passed) {
                showNotification("🎉 Module complete! You unlocked the next section early.", "success");
                if (currentModuleIdx + 1 < selectedCourse.modules.length) {
                    setTimeout(() => {
                        setCurrentModuleIdx(idx => idx + 1);
                        setQuizState({ q: 0, selected: null, showExp: false, score: 0 });
                        if (timerIntervalId) clearInterval(timerIntervalId);
                    }, 1500);
                } else {
                    showNotification("🏆 Course completed! View your certificate.", "success");
                    setShowCertificate(true); // Automatically show certificate modal
                    // TODO: Trigger update to leaderboard here, potentially with total time taken for course
                }
            } else {
                showNotification("🔁 Score below 80%. Review additional resources and retry the quiz.", "info");
                // User will need to manually click "Retry Module"
            }
        }
    };

    const handleModuleRetry = () => {
        const module = currentModule();
        if (!module) return;
        setQuizState({ q: 0, selected: null, showExp: false, score: 0 });
        setNotification(null);

        if (typeof module.timeLimit === 'number' && module.timeLimit > 0) {
            const newTimeLimit = module.timeLimit * 60;
            setTimeLeft(newTimeLimit);
            setProgress(pr => ({
                ...pr,
                [selectedCourse.title]: {
                    ...pr[selectedCourse.title],
                    [module.name]: { ...(pr[selectedCourse.title]?.[module.name] || {}), timeLeft: newTimeLimit, completed: false, passed: false }
                }
            }));
            // Restart timer
            if (timerIntervalId) clearInterval(timerIntervalId);
            const interval = setInterval(() => setTimeLeft(t => {
                if (t <= 1) {
                    showNotification("⏰ Time's up! Please complete the module.", "warning");
                    clearInterval(interval);
                    setProgress(pr => ({
                        ...pr,
                        [selectedCourse.title]: {
                            ...pr[selectedCourse.title],
                            [module.name]: { completed: false, passed: false, timeLeft: 0 }
                        }
                    }));
                    return 0;
                }
                setProgress(pr => ({
                    ...pr,
                    [selectedCourse.title]: {
                        ...pr[selectedCourse.title],
                        [module.name]: { ...(pr[selectedCourse.title]?.[module.name] || {}), timeLeft: t - 1 }
                    }
                }));
                return t - 1;
            }), 1000);
            setTimerIntervalId(interval);
        } else {
            setProgress(pr => ({
                ...pr,
                [selectedCourse.title]: {
                    ...pr[selectedCourse.title],
                    [module.name]: { ...(pr[selectedCourse.title]?.[module.name] || {}), completed: false, passed: false }
                }
            }));
        }
    };

    const handleDownloadCertificate = async () => {
  try {
    const encodedCourseTitle = encodeURIComponent(selectedCourse.title);
    const response = await fetch(
      `${API_BASE_URL}/api/certificate/download/${loggedInUser.id}/${encodedCourseTitle}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    // Handle non-OK responses first
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorData}`);
    }

    // Verify content type before processing
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/pdf')) {
      throw new Error('Invalid response format - expected PDF');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    // Create temporary link for download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `certificate_${selectedCourse.title}.pdf`);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

  } catch (error) {
    console.error("Download failed:", error);
    showNotification(`Download failed: ${error.message}`, "error");
  }
};

    // --- Calculated Values for Progress Display ---
    const getCourseProgress = useCallback((courseTitle) => {
        return progress[courseTitle] || {};
    }, [progress]);

    const getCompletedModulesCount = useCallback((courseTitle) => {
        const courseProgressData = getCourseProgress(courseTitle);
        const course = courses.find(c => c.title === courseTitle);
        if (!course) return 0;
        return course.modules.filter(module =>
            courseProgressData[module.name]?.completed && courseProgressData[module.name]?.passed
        ).length;
    }, [getCourseProgress, courses]);

    const getTotalModulesCount = useCallback((courseTitle) => {
        const course = courses.find(c => c.title === courseTitle);
        return course ? course.modules.length : 0;
    }, [courses]);

    const getCourseProgressPercent = useCallback((courseTitle) => {
        const total = getTotalModulesCount(courseTitle);
        const completed = getCompletedModulesCount(courseTitle);
        return total > 0 ? (completed / total) * 100 : 0;
    }, [getCompletedModulesCount, getTotalModulesCount]);

    const isCourseFullyCompletedAndPassed = useCallback((courseTitle) => {
        const total = getTotalModulesCount(courseTitle);
        const completed = getCompletedModulesCount(courseTitle);
        return total > 0 && completed === total;
    }, [getCompletedModulesCount, getTotalModulesCount]);

    const isCurrentModuleCompleted = currentModule()
        ? getCourseProgress(selectedCourse.title)[currentModule().name]?.completed || false
        : false;

    const isCurrentModulePassed = currentModule()
        ? getCourseProgress(selectedCourse.title)[currentModule().name]?.passed || false
        : false;

    // --- Helper to format time for display ---
    const formatTime = (seconds) => {
        if (seconds === null || seconds < 0) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // --- Render Logic ---
    if (authLoading) {
        return (
            <div className="trainx-loading">
                <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                <p>Loading user data...</p>
            </div>
        );
    }

    return (
        <div className="trainx-app-wrapper">
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            {showLeaderboard && (
                <LeaderboardModal
                    leaderboardData={leaderboardData}
                    onClose={() => setShowLeaderboard(false)}
                />
            )}

            {showCertificate && selectedCourse && loggedInUser && (
                <Certificate
                    user={loggedInUser}
                    course={selectedCourse}
                    onDownload={handleDownloadCertificate}
                    onClose={() => setShowCertificate(false)}
                />
            )}

            {!selectedCourse ? (
                // --- Course Listing View ---
                <main className="trainx-main-content">
                    <section className="hero-section">
                        <div className="hero-content">
                            <h1>TrainX: Elevate Your Medical Skills</h1>
                            <p>Unlock comprehensive courses designed for medical professionals. Learn, grow, and lead.</p>
                            <div className="hero-actions">
                                <button className="btn-primary" onClick={() => document.getElementById('courses-section').scrollIntoView({ behavior: 'smooth' })}>
                                    <FontAwesomeIcon icon={faBookOpen} /> Explore Courses
                                </button>
                                {isLoggedIn && (
                                    <button onClick={() => setShowLeaderboard(true)} className="btn-secondary">
                                        <FontAwesomeIcon icon={faTrophy} /> Global Leaderboard
                                    </button>
                                )}
                            </div>
                            {!isLoggedIn && (
                                <p className="login-prompt">Please log in to enroll in courses and track your progress.</p>
                            )}
                        </div>
                    </section>

                    {/* --- How TrainX Works Section --- */}
                    <section className="how-it-works-section">
                        <h2><FontAwesomeIcon icon={faLightbulb} /> How TrainX Works</h2>
                        <div className="works-steps">
                            <div className="step-card">
                                <h3>1. Enrollment <FontAwesomeIcon icon={faGraduationCap} /></h3>
                                <p>Browse courses from WHO & similar, tailored to market needs. Get a recommended roadmap based on your current level.</p>
                            </div>
                            <div className="step-card">
                                <h3>2. Modules & Quizzes <FontAwesomeIcon icon={faQuestionCircle} /></h3>
                                <p>Each course has time-bound modules with videos/reading. Score 80%+ on quizzes to unlock the next section early!</p>
                            </div>
                            <div className="step-card">
                                <h3>3. Engagement & Competition <FontAwesomeIcon icon={faBell} /></h3>
                                <p>Stay on track with smart notifications. Compete on leaderboards for fastest completions.</p>
                            </div>
                            <div className="step-card">
                                <h3>4. Certification <FontAwesomeIcon icon={faCertificate} /></h3>
                                <p>Earn co-branded, digitally verifiable certificates upon completion, enhancing your employability.</p>
                            </div>
                        </div>
                         <div className="feature-explainer">
                            <h3><FontAwesomeIcon icon={faStar} /> Why Choose TrainX?</h3>
                            <ul>
                                <li><strong><FontAwesomeIcon icon={faThumbsUp} /> Performance-based early access:</strong> Highly valued by 75% of users for better engagement.</li>
                                <li><strong><FontAwesomeIcon icon={faBell} /> Smart Notifications:</strong> 65% of users found notifications helpful in staying connected.</li>
                                <li><strong><FontAwesomeIcon icon={faCertificate} /> Enhanced Employability:</strong> 85% of users believed certification would enhance employability.</li>
                                <li><strong><FontAwesomeIcon icon={faHourglassHalf} /> Time-bound Courses:</strong> Preferred by 80% of users for better discipline and progress tracking.</li>
                            </ul>
                        </div>
                    </section>

                    {isLoggedIn && recommendedCourses.length > 0 && (
                        <section className="recommendations-section">
                            <h2><FontAwesomeIcon icon={faMapSigns} /> Recommended For You</h2>
                            <p>Based on your current progress and interests, here are courses tailored for your growth:</p>
                            <div className="course-list">
                                {recommendedCourses.map(course => {
                                    const courseProgressPercent = getCourseProgressPercent(course.title);
                                    let statusText = "Enroll Now";
                                    let statusClass = "";

                                    if (courseProgressPercent === 100) {
                                        statusText = "Completed!";
                                        statusClass = "completed";
                                    } else if (courseProgressPercent > 0) {
                                        statusText = "In Progress";
                                        statusClass = "in-progress";
                                    }

                                    return (
                                        <div key={course._id} className="course-card" onClick={() => handleCourseSelect(course)}>
                                            <h3>{course.title}</h3>
                                            <p>{course.description}</p>
                                            <div className="course-meta">
                                                <span>Difficulty: {course.difficulty}</span>
                                                <span>Duration: {course.duration}</span>
                                            </div>
                                            {isLoggedIn && courseProgressPercent > 0 && (
                                                <div className="course-progress-bar">
                                                    <div style={{ width: `${courseProgressPercent}%` }}></div>
                                                    <span>{courseProgressPercent.toFixed(0)}% Complete</span>
                                                </div>
                                            )}
                                            <button className={`btn-enroll ${statusClass}`} disabled={courseProgressPercent === 100}>
                                                {statusText}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section id="courses-section" className="available-courses-section">
                        <h2><FontAwesomeIcon icon={faBookOpen} /> Available Courses</h2>
                        <div className="course-list">
                            {courses.length > 0 ? (
                                courses.map(course => {
                                    const courseProgressPercent = getCourseProgressPercent(course.title);
                                    let statusText = "Enroll Now";
                                    let statusClass = "";

                                    if (courseProgressPercent === 100) {
                                        statusText = "Completed!";
                                        statusClass = "completed";
                                    } else if (courseProgressPercent > 0) {
                                        statusText = "In Progress";
                                        statusClass = "in-progress";
                                    }

                                    return (
                                        <div key={course._id} className="course-card" onClick={() => handleCourseSelect(course)}>
                                            <h3>{course.title}</h3>
                                            <p>{course.description}</p>
                                            <div className="course-meta">
                                                <span>Difficulty: {course.difficulty}</span>
                                                <span>Duration: {course.duration}</span>
                                            </div>
                                            {isLoggedIn && courseProgressPercent > 0 && (
                                                <div className="course-progress-bar">
                                                    <div style={{ width: `${courseProgressPercent}%` }}></div>
                                                    <span>{courseProgressPercent.toFixed(0)}% Complete</span>
                                                </div>
                                            )}
                                            <button className={`btn-enroll ${statusClass}`} disabled={!isLoggedIn && statusText !== "Enroll Now"}>
                                                {statusText}
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p>No courses available yet. Please check back later!</p>
                            )}
                        </div>
                    </section>
                </main>
            ) : (
                // --- Course Detail/Dashboard View ---
                <main className="course-detail-view">
                    <button className="back-to-courses-btn" onClick={() => setSelectedCourse(null)}>
                        <FontAwesomeIcon icon={faChevronLeft} /> Back to Courses
                    </button>
                    <h2>{selectedCourse.title}</h2>
                    <p className="course-description">{selectedCourse.description}</p>

                    <div className="course-overview-dashboard">
                        <div className="dashboard-item">
                            <h3><FontAwesomeIcon icon={faClock} /> Course Progress</h3>
                            <div className="overall-progress-bar">
                                <div style={{ width: `${getCourseProgressPercent(selectedCourse.title)}%` }}></div>
                            </div>
                            <p>{getCompletedModulesCount(selectedCourse.title)} / {getTotalModulesCount(selectedCourse.title)} Modules Completed</p>
                            {isCourseFullyCompletedAndPassed(selectedCourse.title) && (
                                <button className="btn-success" onClick={() => setShowCertificate(true)}>
                                    <FontAwesomeIcon icon={faCertificate} /> View Certificate
                                </button>
                            )}
                        </div>
                        <div className="dashboard-item">
                            <h3><FontAwesomeIcon icon={faUsers} /> Current Level</h3>
                            <p>Beginner (Dynamic based on user profile/AssessX scores)</p>
                            <p>Next Recommended: Advanced First Aid</p>
                        </div>
                    </div>

                    <div className="course-modules-section">
                        <h3><FontAwesomeIcon icon={faBookOpen} /> Modules</h3>
                        <div className="module-navigation">
                            {selectedCourse.modules.map((module, index) => {
                                const moduleProg = getCourseProgress(selectedCourse.title)[module.name] || {};
                                const isLocked = index > 0 && !(getCourseProgress(selectedCourse.title)[selectedCourse.modules[index - 1].name]?.completed && getCourseProgress(selectedCourse.title)[selectedCourse.modules[index - 1].name]?.passed);
                                const isPassed = moduleProg.completed && moduleProg.passed;
                                const isCurrent = index === currentModuleIdx;

                                return (
                                    <button
                                        key={module.name}
                                        className={`module-nav-item ${isCurrent ? 'active' : ''} ${isPassed ? 'passed' : ''} ${isLocked ? 'locked' : ''}`}
                                        onClick={() => {
                                            if (!isLocked) {
                                                setCurrentModuleIdx(index);
                                                setQuizState({ q: 0, selected: null, showExp: false, score: 0 }); // Reset quiz when changing modules
                                                showNotification(`Mapsd to module: ${module.name}`, "info");
                                            } else {
                                                showNotification("Complete the previous module to unlock this one!", "warning");
                                            }
                                        }}
                                        disabled={isLocked}
                                    >
                                        {module.name}
                                        {isPassed && <FontAwesomeIcon icon={faCheckCircle} className="module-status-icon" />}
                                        {isLocked && <FontAwesomeIcon icon={faLock} className="module-status-icon" />}
                                    </button>
                                );
                            })}
                        </div>

                        {currentModule() && (
                            <div className="current-module-content">
                                <h4>Module: {currentModule().name}</h4>
                                {currentModule().timeLimit && (
                                    <p className="module-timer">
                                        <FontAwesomeIcon icon={faClock} /> Time Left: <strong>{formatTime(timeLeft)}</strong>
                                    </p>
                                )}

                                {!isCurrentModuleCompleted || !isCurrentModulePassed ? (
                                    <>
                                        {/* Module Content */}
                                        <div className="module-resources">
                                            {currentModule().videoUrl && (
                                                <div className="video-player">
                                                    <p><FontAwesomeIcon icon={faVideo} /> Video Lecture:</p>
                                                    <iframe
                                                        src={currentModule().videoUrl}
                                                        title={currentModule().name}
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                </div>
                                            )}
                                            {currentModule().readingMaterial && (
                                                <div className="reading-material">
                                                    <p><FontAwesomeIcon icon={faBookOpen} /> Reading Material:</p>
                                                    {currentModule().readingMaterial.map((res, i) => (
                                                        <a key={i} href={res.url} target="_blank" rel="noopener noreferrer">
                                                            {res.title} ({res.language})
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quiz Section */}
                                        {currentModule().quiz && currentModule().quiz.length > 0 && (
                                            <div className="module-quiz">
                                                <h5><FontAwesomeIcon icon={faQuestionCircle} /> Quiz</h5>
                                                {quizState.q < currentModule().quiz.length ? (
                                                    <div className="quiz-question">
                                                        <p>Q{quizState.q + 1}: {currentModule().quiz[quizState.q].question}</p>
                                                        <div className="quiz-options">
                                                            {currentModule().quiz[quizState.q].options.map((option, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    className={`option-button ${quizState.selected === idx ? (idx === currentModule().quiz[quizState.q].answer ? 'correct' : 'incorrect') : ''} ${quizState.showExp && idx === currentModule().quiz[quizState.q].answer && quizState.selected !== idx ? 'correct-unselected' : ''}`}
                                                                    onClick={() => handleQuizAnswer(idx)}
                                                                    disabled={quizState.showExp || timeLeft <= 0}
                                                                >
                                                                    {option}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {quizState.showExp && (
                                                            <div className="explanation">
                                                                <p><strong>Explanation:</strong> {currentModule().quiz[quizState.q].explanation}</p>
                                                                <button className="btn-next-quiz" onClick={handleNextQuizOrModule}>
                                                                    {quizState.q + 1 < currentModule().quiz.length ? 'Next Question' : 'Finish Quiz'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="quiz-results">
                                                        <h5>Quiz Complete!</h5>
                                                        <p>Your Score: {quizState.score} / {currentModule().quiz.length}</p>
                                                        <p>{(quizState.score / currentModule().quiz.length) * 100 >= 80 ? "You passed!" : "You need to score at least 80% to pass."}</p>
                                                        {(quizState.score / currentModule().quiz.length) * 100 < 80 && (
                                                            <div className="additional-resources">
                                                                <h6>Additional Resources:</h6>
                                                                {currentModule().additionalResources?.length > 0 ? (
                                                                    <ul>
                                                                        {currentModule().additionalResources.map((res, i) => (
                                                                            <li key={i}><a href={res.url} target="_blank" rel="noopener noreferrer">{res.title}</a></li>
                                                                        ))}
                                                                    </ul>
                                                                ) : (
                                                                    <p>No specific additional resources. Please review module content.</p>
                                                                )}
                                                                <button className="btn-retry-module" onClick={handleModuleRetry}>
                                                                    <FontAwesomeIcon icon={faSyncAlt} /> Retry Quiz
                                                                </button>
                                                            </div>
                                                        )}
                                                        {(quizState.score / currentModule().quiz.length) * 100 >= 80 && (
                                                             <button className="btn-next-module" onClick={handleNextQuizOrModule}>
                                                                {currentModuleIdx + 1 < selectedCourse.modules.length ? 'Go to Next Module' : 'Complete Course'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="module-completed-message">
                                        <p><FontAwesomeIcon icon={faCheckCircle} /> This module is completed and passed!</p>
                                        <p>You scored <strong>{(quizState.score / (currentModule().quiz?.length || 1)) * 100}%</strong> on the quiz.</p>
                                        {currentModuleIdx + 1 < selectedCourse.modules.length ? (
                                            <button className="btn-next-module" onClick={() => {
                                                setCurrentModuleIdx(idx => idx + 1);
                                                setQuizState({ q: 0, selected: null, showExp: false, score: 0 }); // Reset quiz when changing modules
                                                showNotification("Moving to the next module!", "info");
                                            }}>
                                                <FontAwesomeIcon icon={faChevronRight} /> Go to Next Module
                                            </button>
                                        ) : (
                                            <p>All modules for this course are completed. You can now view or download your certificate!</p>
                                        )}
                                        <button className="btn-secondary" onClick={handleModuleRetry}>
                                            <FontAwesomeIcon icon={faSyncAlt} /> Review Module / Retry Quiz
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            )}
        </div>
    );
};

export default TrainX;