// src/components/HireX.js
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import JobPostForm from '../components/JobPostForm';
import RecruiterJobsList from '../components/RecruiterJobsList';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Make sure these paths are correct for your project structure
import ApplyToJobForm from '../components/ApplyToJobForm';
import Modal from '../components/Modal';

// Icon imports (assuming you have react-icons installed)
import { FaLaptopCode, FaMapMarkerAlt, FaMoneyBillWave, FaClock, FaChartLine, FaBuilding, FaGraduationCap, FaUserTie, FaUsers, FaLightbulb } from 'react-icons/fa';
import { RiDashboardLine, RiFilterLine, RiBriefcaseLine, RiBarChartBoxLine, RiEyeOffLine } from 'react-icons/ri';

// Import the custom CSS file
import '../styles/HireX.css'; // <--- Ensure this path is correct

const HireX = () => {
    const { isLoggedIn, loggedInUser, authToken, authLoading, promoteToRecruiter } = useAuth();
    const navigate = useNavigate();

    // State for job seeker specific data and filters
    const [assessXScore, setAssessXScore] = useState(null);
    const [matchedJobs, setMatchedJobs] = useState([]);
    const [locationFilter, setLocationFilter] = useState('All');
    const [salaryFilter, setSalaryFilter] = useState('All');
    const [workTypeFilter, setWorkTypeFilter] = useState('All');
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [error, setError] = useState(null);

    // States for the new Modal and ApplyToJobForm integration
    const [selectedJob, setSelectedJob] = useState(null);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false); // Controls modal visibility

    // State for recruiter specific functionality
    const [recruiterJobRefresh, setRecruiterJobRefresh] = useState(0);
    const [showRecruiterPanel, setShowRecruiterPanel] = useState(false);
    const [promoteStatus, setPromoteStatus] = useState({ loading: false, error: null, success: null });

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const getLatestScore = useCallback((assessxScores) => {
        if (!assessxScores || Object.keys(assessxScores).length === 0) return 0;
        const scoresArray = Object.values(assessxScores);
        scoresArray.sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted));
        return scoresArray[0].totalScore;
    }, []);

    const fetchJobs = useCallback(async () => {
        setLoadingJobs(true);
        setError(null);

        if (!loggedInUser || !authToken) {
            setError("Authentication details missing. Cannot fetch jobs.");
            setLoadingJobs(false);
            return;
        }

        try {
            const latestUserScore = getLatestScore(loggedInUser.assessxScores);
            setAssessXScore(latestUserScore);

            console.log(`HireX: Fetching jobs for user ${loggedInUser.id} with score: ${latestUserScore}`);
            const response = await fetch(`${API_BASE_URL}/api/jobs?score=${latestUserScore}&location=${locationFilter}&salary=${salaryFilter}&workType=${workTypeFilter}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch jobs from backend.');
            }
            const data = await response.json();
            setMatchedJobs(data);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError(`Failed to fetch job opportunities: ${err.message}. Please ensure you are logged in and the backend is running.`);
            toast.error(`Error: ${err.message}`);
        } finally {
            setLoadingJobs(false);
        }
    }, [loggedInUser, authToken, getLatestScore, locationFilter, salaryFilter, workTypeFilter, API_BASE_URL]);

    useEffect(() => {
        if (!authLoading && isLoggedIn && loggedInUser) {
            fetchJobs();
            if (loggedInUser.role === 'recruiter') {
                setShowRecruiterPanel(true);
            }
        } else if (!authLoading && !isLoggedIn) {
            setLoadingJobs(false);
            setError("Please log in to view job opportunities.");
            setMatchedJobs([]);
            setAssessXScore(null);
        }
    }, [authLoading, isLoggedIn, loggedInUser, fetchJobs]);

    const handleJobPosted = () => {
        setRecruiterJobRefresh(prev => prev + 1);
        toast.success("Job posted successfully!");
    };

    const openApplyModal = useCallback((job) => {
        if (!isLoggedIn || !loggedInUser || loggedInUser.role === 'recruiter') {
            toast.info("Recruiters cannot apply for jobs. Please log in as a job seeker.");
            return;
        }
        setSelectedJob(job);
        setIsApplyModalOpen(true);
    }, [isLoggedIn, loggedInUser]);

    const closeApplyModal = useCallback(() => {
        setIsApplyModalOpen(false);
        setSelectedJob(null);
    }, []);

    const handleApplicationSubmitSuccess = useCallback(() => {
        closeApplyModal();
        toast.success("Application submitted successfully!");
    }, [closeApplyModal]);

    const handlePostJobClick = async () => {
        if (!isLoggedIn) {
            toast.info("Please log in to post jobs.");
            return;
        }

        if (loggedInUser.role === 'recruiter') {
            setShowRecruiterPanel(prev => !prev);
            return;
        }

        if (loggedInUser.role === 'jobSeeker') {
            const confirmPromote = window.confirm(
                "To post jobs, your account needs to be a 'recruiter'. This action cannot be easily undone. Do you wish to proceed and change your account role to Recruiter?"
            );

            if (confirmPromote) {
                setPromoteStatus({ loading: true, error: null, success: null });
                const result = await promoteToRecruiter();
                if (result.success) {
                    setPromoteStatus({ loading: false, error: null, success: result.message });
                    setShowRecruiterPanel(true);
                    toast.success(result.message);
                } else {
                    setPromoteStatus({ loading: false, error: result.message, success: null });
                    toast.error(result.message);
                }
            }
        }
    };

    const uniqueLocations = [...new Set(matchedJobs.map(job => job.location))];
    const uniqueSalaries = [...new Set(matchedJobs.map(job => job.salary))].sort((a, b) => {
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    });
    const uniqueWorkTypes = [...new Set(matchedJobs.flatMap(job => job.workTypes))];

    if (authLoading) {
        return (
            <div className="hirex-loading-screen">
                <div className="loading-content">
                    <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Checking login status...</span>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="hirex-access-denied-screen">
                <div className="access-denied-card">
                    <h2 className="access-denied-title">Access Denied 👋</h2>
                    <p className="access-denied-message">
                        Please <span className="highlight">log in</span> to your MedSkillX account to explore personalized job opportunities and manage your career.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-primary" // Changed class name
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="hirex-container">
            {/* Hero Section */}
            <header className="hirex-hero-section">
                <h1 className="hirex-main-title">
                    <span className="icon"><FaLaptopCode /></span> {/* Simplified icon class */}
                    HireX: Your Next Career Opportunity Awaits
                </h1>
                <p className="hirex-subtitle">
                    Discover tailored job opportunities powered by your AssessX scores. Connect with top employers in healthcare and elevate your career with MedSkillX.
                </p>
                <div className="user-info-bar">
                    <div className="assessx-score-display"> {/* Changed class name */}
                        Your Latest AssessX Score:{' '}
                        <span className="score-value">{assessXScore !== null ? assessXScore : 'N/A'}</span>
                    </div>
                    <div className="welcome-message">
                        Welcome, <span className="username">{loggedInUser?.username || 'User'}</span>! Role:{' '}
                        <span className="user-role">{loggedInUser?.role}</span>
                    </div>
                </div>

                {/* Post a Job Button for all logged-in users */}
                <div className="action-button-group"> {/* Changed class name */}
                    <button
                        onClick={handlePostJobClick}
                        className="btn-secondary" // Changed class name
                    >
                        <span className="btn-icon"> {/* Changed class name */}
                            {loggedInUser?.role === 'recruiter' ? <RiDashboardLine /> : <FaUserTie />}
                        </span>
                        {loggedInUser?.role === 'recruiter' ? 'Toggle Recruiter Panel' : 'Become a Recruiter & Post a Job'}
                    </button>
                    {promoteStatus.loading && <p className="status-message loading"><svg className="spinner-small" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Promoting your account to recruiter...</p>}
                    {promoteStatus.error && <p className="status-message error">{promoteStatus.error}</p>}
                    {promoteStatus.success && <p className="status-message success">{promoteStatus.success}</p>}
                </div>
            </header>

            {/* Conditionally render Recruiter Panel */}
            {showRecruiterPanel && loggedInUser?.role === 'recruiter' && (
                <section className="recruiter-panel-section card-section"> {/* Added card-section */}
                    <h2 className="section-title-with-button"> {/* Changed class name */}
                        <span className="icon"><RiDashboardLine /></span> Recruiter Panel
                        <button
                            onClick={() => setShowRecruiterPanel(false)}
                            className="btn-outline-secondary" // Changed class name
                            title="Hide Recruiter Panel"
                        >
                            <RiEyeOffLine className="btn-icon" /> Hide Panel
                        </button>
                    </h2>
                    <div className="recruiter-panel-content">
                        <JobPostForm onJobPosted={handleJobPosted} recruiterId={loggedInUser.id} authToken={authToken} API_BASE_URL={API_BASE_URL} />
                        <RecruiterJobsList refreshTrigger={recruiterJobRefresh} recruiterId={loggedInUser.id} authToken={authToken} API_BASE_URL={API_BASE_URL} />
                    </div>
                </section>
            )}

            {/* How HireX Works Sections */}
            <section className="how-it-works-section">
                <div className="how-it-works-card card-shadow primary-gradient"> {/* Added card-shadow, primary-gradient */}
                    <h2 className="card-header"> {/* Changed class name */}
                        <FaLightbulb className="icon-large" /> How HireX Works
                    </h2>
                    <div className="card-content-grid"> {/* Changed class name */}
                        <div>
                            <h3 className="sub-heading-icon"><FaUsers className="icon-small" /> 1. Smart Job Matching</h3> {/* Changed class name */}
                            <p className="description-text"> {/* Changed class name */}
                                Candidates are matched with jobs based on their AssessX scores (if available)
                                or their current education level. Advanced filters help you pinpoint the perfect fit.
                            </p>
                        </div>
                        <div>
                            <h3 className="sub-heading-icon"><FaClock className="icon-small" /> 2. Flexible Work Modes</h3>
                            <p className="description-text">
                                We offer unparalleled flexibility for job seekers to choose from:
                            </p>
                            <ul className="feature-list">
                                <li><span className="feature-highlight">Daily Shifts:</span> Temporary or on-demand roles.</li>
                                <li><span className="feature-highlight">Monthly Contracts:</span> Short-term positions with clear timelines.</li>
                                <li><span className="feature-highlight">Permanent Roles:</span> Full-time opportunities with stable income.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="sub-heading-icon"><FaGraduationCap className="icon-small" /> 3. Upskilling via TrainX</h3>
                            <p className="description-text">
                                Users are suggested additional training modules on TrainX, empowering job seekers to upskill,
                                enhance their profiles, and unlock even better job roles and career prospects.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="how-it-works-card card-shadow secondary-gradient"> {/* Added card-shadow, secondary-gradient */}
                    <h2 className="card-header">
                        <RiBarChartBoxLine className="icon-large" /> Maximize Your Opportunities
                    </h2>
                    <div className="card-content-grid">
                        <div>
                            <h3 className="sub-heading-icon"><FaChartLine className="icon-small" /> Improve Your AssessX Score</h3>
                            <p className="description-text">
                                A higher AssessX score directly correlates with more and better job matches.
                                Take relevant assessments in the AssessX section to showcase your expertise.
                            </p>
                        </div>
                        <div>
                            <h3 className="sub-heading-icon"><FaBuilding className="icon-small" /> Complete TrainX Courses</h3>
                            <p className="description-text">
                                Our TrainX modules help you gain new skills and certifications, making your profile
                                more attractive to employers and qualifying you for a wider range of positions.
                            </p>
                        </div>
                        <div>
                            <h3 className="sub-heading-icon"><RiFilterLine className="icon-small" /> Refine Your Search</h3>
                            <p className="description-text">
                                Use the powerful filters below to pinpoint jobs that perfectly align with your preferred
                                location, salary expectations, and work arrangements.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters Section */}
            <section className="filters-section card-section"> {/* Added card-section */}
                <h2 className="section-title"> {/* Changed class name */}
                    <span className="icon"><RiFilterLine /></span> Filter Job Opportunities
                </h2>
                <div className="filter-grid">
                    <div className="filter-group">
                        <label htmlFor="locationFilter" className="filter-label"><FaMapMarkerAlt className="label-icon" /> Location</label>
                        <div className="custom-select">
                            <select
                                id="locationFilter"
                                className="input-field" // Changed class name
                                onChange={e => setLocationFilter(e.target.value)}
                                value={locationFilter}
                            >
                                <option value="All">All Locations</option>
                                {uniqueLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                            <div className="select-arrow">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="salaryFilter" className="filter-label"><FaMoneyBillWave className="label-icon" /> Salary Range</label>
                        <div className="custom-select">
                            <select
                                id="salaryFilter"
                                className="input-field" // Changed class name
                                onChange={e => setSalaryFilter(e.target.value)}
                                value={salaryFilter}
                            >
                                <option value="All">All Salaries</option>
                                {uniqueSalaries.map(sal => (
                                    <option key={sal} value={sal}>{sal}</option>
                                ))}
                            </select>
                            <div className="select-arrow">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="workTypeFilter" className="filter-label"><FaClock className="label-icon" /> Work Type</label>
                        <div className="custom-select">
                            <select
                                id="workTypeFilter"
                                className="input-field" // Changed class name
                                onChange={e => setWorkTypeFilter(e.target.value)}
                                value={workTypeFilter}
                            >
                                <option value="All">All Work Types</option>
                                {uniqueWorkTypes.map(wt => (
                                    <option key={wt} value={wt}>{wt}</option>
                                ))}
                            </select>
                            <div className="select-arrow">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                    <div className="apply-filters-wrapper">
                        <button
                            onClick={fetchJobs}
                            className="btn-primary" // Changed class name
                        >
                            <RiFilterLine className="btn-icon" /> Apply Filters
                        </button>
                    </div>
                </div>
            </section>

            {/* Matched Jobs Section */}
            <section className="matched-jobs-section card-section"> {/* Added card-section */}
                <h2 className="section-title"> {/* Changed class name */}
                    <span className="icon"><RiBriefcaseLine /></span> Matched Job Opportunities
                </h2>

                {loadingJobs ? (
                    <div className="status-info-box loading"> {/* Changed class name */}
                        <div className="loading-content">
                            <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Loading job opportunities...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="status-info-box error"> {/* Changed class name */}
                        <p className="error-message">Error: {error}</p>
                        <p className="hint-text">Please try refreshing the page or contact support if the issue persists.</p> {/* Changed class name */}
                    </div>
                ) : matchedJobs.length === 0 ? (
                    <div className="status-info-box no-results"> {/* Changed class name */}
                        <p className="no-jobs-message">
                            No jobs matched your current filters.
                        </p>
                        <p className="hint-text">
                            Try adjusting your location, salary, or work type filters.
                            You might also consider improving your AssessX score to unlock more opportunities!
                        </p>
                    </div>
                ) : (
                    <div className="job-cards-grid">
                        {matchedJobs.map(job => (
                            <div key={job.id} className="job-card fade-in"> {/* Added fade-in */}
                                <h3 className="job-card-title">{job.title}</h3>
                                <p className="job-card-description">{job.description}</p>
                                <div className="job-card-details">
                                    <p className="detail-item"><FaBuilding className="detail-icon" /> <span className="detail-label">Company:</span> {job.company}</p>
                                    <p className="detail-item"><FaMapMarkerAlt className="detail-icon" /> <span className="detail-label">Location:</span> {job.location}</p>
                                    <p className="detail-item"><FaMoneyBillWave className="detail-icon" /> <span className="detail-label">Salary:</span> {job.salary}</p>
                                    <p className="detail-item"><FaClock className="detail-icon" /> <span className="detail-label">Work Type:</span> {job.workTypes?.join(', ') || 'N/A'}</p>
                                    {job.requiredScore > 0 && (
                                        <p className="detail-item"><FaChartLine className="detail-icon" /> <span className="detail-label">Min. AssessX Score:</span> {job.requiredScore}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => openApplyModal(job)}
                                    className="btn-apply-job"
                                    disabled={loggedInUser?.role === 'recruiter'}
                                >
                                    {loggedInUser?.role === 'recruiter' ? 'Recruiters Cannot Apply' : 'Apply Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Suggested Action for Low Score */}
            {assessXScore !== null && assessXScore < 70 && (
                <section className="suggested-action-section card-section alert-warning"> {/* Added card-section, alert-warning */}
                    <div className="action-icon-wrapper"> {/* Changed class name */}
                        <span className="action-icon">💡</span>
                    </div>
                    <div className="action-content">
                        <h2 className="action-title">Suggested Action: Enhance Your Profile!</h2>
                        <p className="action-message">
                            Your AssessX score is currently <span className="score-highlight">{assessXScore}</span>.
                            To unlock even more premium job opportunities, consider enhancing your skills with relevant
                            <span className="highlight-text"> TrainX modules</span> and retaking assessments in the <span className="highlight-text">AssessX section</span>.
                            A higher score can significantly boost your career prospects!
                        </p>
                        <button
                            onClick={() => navigate('/assessx')}
                            className="btn-info" // Changed class name
                        >
                            <FaChartLine className="btn-icon" /> Improve My Score
                        </button>
                    </div>
                </section>
            )}

            {/* Modal for Job Application */}
            <Modal isOpen={isApplyModalOpen} onClose={closeApplyModal}>
                {selectedJob ? (
                    <ApplyToJobForm
                        jobId={selectedJob.id}
                        jobTitle={selectedJob.title}
                        customQuestions={selectedJob.customQuestions || []}
                        onClose={closeApplyModal}
                        onApplicationSubmitSuccess={handleApplicationSubmitSuccess}
                        authToken={authToken}
                        API_BASE_URL={API_BASE_URL}
                    />
                ) : (
                    <p className="loading-message">Preparing application form...</p>
                )}
            </Modal>
        </div>
    );
};

export default HireX;