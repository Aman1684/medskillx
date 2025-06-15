import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './AssessX.css'; // Your main CSS file
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faQuestionCircle, faTrophy, faChartLine, faLightbulb, faCreditCard, faSyncAlt, faBookOpen, faBriefcase, faHome, faSpinner, faExclamationTriangle, faCheckCircle, faInfoCircle, faTimesCircle, faClock } from '@fortawesome/free-solid-svg-icons';


const AssessX = () => {
    const { isLoggedIn, loggedInUser, authToken, authLoading, updateUserData, updateAssessXScores } = useAuth();
    const navigate = useNavigate();

    const [questionBank, setQuestionBank] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [categoryScores, setCategoryScores] = useState({});
    const [timer, setTimer] = useState(30);

    const [attemptsLeft, setAttemptsLeft] = useState(0);
    const [latestAssessXScore, setLatestAssessXScore] = useState(0);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [isTestStarted, setIsTestStarted] = useState(false);
    const [userSelectedOption, setUserSelectedOption] = useState(null);
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

    // Helper to find the latest score from assessxScores object
    const getLatestScore = useCallback((assessxScores) => {
        if (!assessxScores || Object.keys(assessxScores).length === 0) return 0;
        const scoresArray = Object.values(assessxScores);
        scoresArray.sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted));
        return scoresArray[0].totalScore || 0;
    }, []);

    // Mock function for TrainX course completion (replace with actual backend check)
    // This function checks if *any* TrainX course is fully completed and passed.
    const checkTrainXCourseCompletion = useCallback((userData) => {
        const progress = userData?.trainxProgress;
        if (!progress) return false;

        // Assuming TrainX progress structure is:
        // { "Course Title 1": { "Module 1 Name": { completed: true, passed: true }, "Module 2 Name": { completed: true, passed: true } } }
        // We need to iterate through courses and then their modules.
        for (const courseTitle in progress) {
            if (Object.prototype.hasOwnProperty.call(progress, courseTitle)) {
                const courseModules = progress[courseTitle];
                let allModulesForCourseCompletedAndPassed = true;
                if (Object.keys(courseModules).length === 0) { // If a course has no modules tracked, it's not "completed"
                    allModulesForCourseCompletedAndPassed = false;
                } else {
                    for (const moduleName in courseModules) {
                        if (Object.prototype.hasOwnProperty.call(courseModules, moduleName)) {
                            const moduleStatus = courseModules[moduleName];
                            if (!moduleStatus.completed || !moduleStatus.passed) {
                                allModulesForCourseCompletedAndPassed = false;
                                break; // Found an incomplete/failed module in this course
                            }
                        }
                    }
                }
                if (allModulesForCourseCompletedAndPassed) {
                    return true; // Found at least one fully completed and passed course
                }
            }
        }
        return false; // No fully completed and passed TrainX course found
    }, []);


    // --- Sync Component State with AuthContext's loggedInUser & Handle Free Attempts ---
    useEffect(() => {
        if (!authLoading && isLoggedIn && loggedInUser) {
            let currentAttempts = loggedInUser.attemptsLeft || 0;
            let currentFreeAttemptUsed = loggedInUser.freeAttemptUsed || false;
            let currentHasAccessedAssessXBefore = loggedInUser.hasAccessedAssessXBefore || false;

            setLatestAssessXScore(getLatestScore(loggedInUser.assessxScores));

            let shouldUpdateBackend = false;

            // Scenario 1: Earned free attempt from TrainX course completion
            if (!currentFreeAttemptUsed && checkTrainXCourseCompletion(loggedInUser)) {
                if (currentAttempts === 0) { // Only grant if no attempts *and* it's the first time due to TrainX completion
                    currentAttempts = Math.max(currentAttempts, 1);
                    currentFreeAttemptUsed = true;
                    toast.info("You earned a free AssessX attempt by completing a TrainX course!");
                    shouldUpdateBackend = true;
                }
            }
            // Scenario 2: First access ever, grant a free attempt (if not already granted by TrainX)
            else if (!currentFreeAttemptUsed && currentAttempts === 0 && !currentHasAccessedAssessXBefore) {
                currentAttempts = 1;
                currentFreeAttemptUsed = true;
                currentHasAccessedAssessXBefore = true;
                toast.info("Welcome! Here's your first free AssessX attempt.");
                shouldUpdateBackend = true;
            }

            setAttemptsLeft(currentAttempts);

            if (shouldUpdateBackend) {
                updateUserData({
                    attemptsLeft: currentAttempts,
                    freeAttemptUsed: currentFreeAttemptUsed,
                    hasAccessedAssessXBefore: currentHasAccessedAssessXBefore
                });
            }

        } else if (!authLoading && !isLoggedIn) {
            // Reset state if logged out
            setAttemptsLeft(0);
            setLatestAssessXScore(0);
            setIsTestStarted(false);
            setCurrentQ(0);
            setScore(0);
            setShowResult(false);
            setCategoryScores({});
            setTimer(30);
            setUserSelectedOption(null);
            setShowCorrectAnswer(false);
        }
    }, [authLoading, isLoggedIn, loggedInUser, updateUserData, getLatestScore, checkTrainXCourseCompletion]);

    const goToAssessXHome = useCallback(() => {
        setIsTestStarted(false);
        setShowResult(false);
        setCurrentQ(0);
        setScore(0);
        setCategoryScores({});
        setTimer(30);
        setUserSelectedOption(null);
        setShowCorrectAnswer(false);
        toast.info("Back to AssessX home!");
    }, []);


    // --- Backend Integration: Fetch Questions ---
    useEffect(() => {
        // Only fetch questions if not already started or if question bank is empty
        if (!isTestStarted && questionBank.length === 0) {
            fetch('http://localhost:5000/api/questions')
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    const questionsWithIds = data.map((q, index) => ({ ...q, id: q.id || uuidv4() }));
                    setQuestionBank(questionsWithIds);
                })
                .catch(err => {
                    console.error('Error loading questions from backend:', err);
                    toast.error("Failed to load questions. Please check server connection.", { autoClose: false });
                });
        }
    }, [isTestStarted, questionBank.length]);

    // --- Handle Answer Submission ---
    const handleAnswer = useCallback(async (selected) => {
        if (showCorrectAnswer) return; // Prevent multiple answers per question

        const current = questionBank[currentQ];
        const isCorrect = selected === current.answer;

        setUserSelectedOption(selected);
        setShowCorrectAnswer(true); // Show correct answer immediately after selection

        let newScore = score;
        let newCategoryScores = { ...categoryScores };

        if (isCorrect) {
            toast.success("Correct!", { autoClose: 1000 });
            newScore = score + 1;
            setScore(newScore);
            newCategoryScores = {
                ...categoryScores,
                [current.category]: (categoryScores[current.category] || 0) + 1
            };
            setCategoryScores(newCategoryScores);
        } else {
            toast.error(`Incorrect. Correct: ${current.answer}`, { autoClose: 1500 });
        }

        // Delay moving to the next question/result to allow user to see feedback
        setTimeout(async () => {
            if (currentQ + 1 < questionBank.length) {
                setCurrentQ(prev => prev + 1);
                setTimer(30); // Reset timer for next question
                setUserSelectedOption(null);
                setShowCorrectAnswer(false); // Hide explanation for next question
            } else {
                // End of test
                const finalScoreRaw = newScore;
                const finalScoreOutOf100 = (finalScoreRaw / questionBank.length) * 100;
                setScore(finalScoreOutOf100);
                setShowResult(true);
                setIsTestStarted(false); // Mark test as finished
                setUserSelectedOption(null);
                setShowCorrectAnswer(false);

                if (loggedInUser?.id && authToken) {
                    const scoreDetailsToSend = {
                        totalScore: finalScoreOutOf100,
                        totalQuestions: questionBank.length,
                        correctAnswers: finalScoreRaw,
                        categoryBreakdown: newCategoryScores,
                        dateCompleted: new Date().toISOString(),
                        questionIdsUsed: questionBank.map(q => q.id)
                    };

                    const result = await updateAssessXScores(scoreDetailsToSend);

                    if (result.success) {
                        setLatestAssessXScore(getLatestScore(result.user.assessxScores));
                        toast.success("Results saved!");
                    } else {
                        toast.error(`Failed to save results: ${result.message}`);
                    }
                }
                toast.info(`Test complete! Score: ${finalScoreOutOf100.toFixed(0)}/100`);
            }
        }, 1500); // 1.5 second delay
    }, [currentQ, questionBank, score, categoryScores, loggedInUser, authToken, updateAssessXScores, getLatestScore, showCorrectAnswer]);

    // --- Timer countdown ---
    useEffect(() => {
        let timerId;
        if (isTestStarted && timer > 0 && !showResult && !showCorrectAnswer) {
            timerId = setInterval(() => setTimer(prev => prev - 1), 1000);
        } else if (timer === 0 && isTestStarted && !showResult && !showCorrectAnswer) {
            handleAnswer(""); // Auto skip if time runs out and no answer selected
        }
        return () => clearInterval(timerId);
    }, [timer, isTestStarted, showResult, showCorrectAnswer, handleAnswer]);

    // --- Test Start Logic ---
    const startAssessment = useCallback(async () => {
        if (!isLoggedIn) {
            toast.error("Login required to start.");
            return;
        }
        if (attemptsLeft <= 0) {
            toast.warning("No attempts left. Purchase more to continue.");
            setShowPaymentModal(true);
            return;
        }

        const newAttemptsLeft = attemptsLeft - 1;
        setAttemptsLeft(newAttemptsLeft);
        // Update user data on backend immediately after decreasing attempt
        const result = await updateUserData({ attemptsLeft: newAttemptsLeft });

        if (!result.success) {
            toast.error(`Failed to start test: ${result.message}`);
            setAttemptsLeft(prev => prev + 1); // Revert attempt if backend update fails
            return;
        }

        const allAvailableQuestions = [...questionBank];
        // Get question IDs from the last 5 taken assessments to avoid repetition
        const lastTakenAssessments = loggedInUser?.assessxScores ? Object.values(loggedInUser.assessxScores).sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted)).slice(0, 5) : [];
        const recentlyUsedQuestionIds = new Set(lastTakenAssessments.flatMap(test => test.questionIdsUsed || []));

        let uniqueQuestions = allAvailableQuestions.filter(q => !recentlyUsedQuestionIds.has(q.id));

        if (uniqueQuestions.length < 10) {
            console.warn("Not enough truly unique questions available. Reusing some questions.");
            uniqueQuestions = allAvailableQuestions; // Fallback to all questions if not enough unique ones
        }

        // Shuffle questions
        for (let i = uniqueQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueQuestions[i], uniqueQuestions[j]] = [uniqueQuestions[j], uniqueQuestions[i]];
        }
        const selectedTestQuestions = uniqueQuestions.slice(0, 10); // Select 10 questions

        if (selectedTestQuestions.length < 10) {
            toast.error("Not enough questions available to start the assessment. Please contact support.", { autoClose: false });
            setAttemptsLeft(prev => prev + 1); // Revert attempt
            return;
        }

        setQuestionBank(selectedTestQuestions);
        setCurrentQ(0);
        setScore(0);
        setShowResult(false);
        setCategoryScores({});
        setTimer(30); // Initial timer value
        setIsTestStarted(true);
        setUserSelectedOption(null);
        setShowCorrectAnswer(false);

        toast.success("Assessment started! Good luck!");
    }, [attemptsLeft, isLoggedIn, loggedInUser, questionBank, updateUserData]);


    // --- Handle Retake ---
    const handleRetake = () => {
        if (attemptsLeft <= 0) {
            setShowPaymentModal(true);
        } else {
            startAssessment();
        }
    };

    // --- Dummy Payment Handler ---
    const handlePurchaseAttempt = async () => {
        setIsPaying(true);
        toast.info("Processing payment...");
        try {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate payment processing

            const newAttempts = attemptsLeft + 1;
            const result = await updateUserData({ attemptsLeft: newAttempts });

            if (result.success) {
                setAttemptsLeft(newAttempts);
                toast.success("Payment successful! 1 new attempt added.");
                setShowPaymentModal(false);
            } else {
                throw new Error(result.message || "Failed to update attempts after payment.");
            }
        } catch (error) {
            console.error("Payment failed:", error);
            toast.error(`Payment failed: ${error.message || 'Please try again.'}`);
        } finally {
            setIsPaying(false);
        }
    };

    // Conditional render for auth/loading states
    if (authLoading) {
        return (
            <div className={`assessx-container loading`}>
                <div className="loading-content">
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                    <p>Loading user data...</p>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className={`assessx-container login-required`}>
                <h2 className="main-title"><FontAwesomeIcon icon={faExclamationTriangle} /> Access Denied</h2>
                <p className="login-message">Please **log in** to your MedSkillX account to take the AssessX examination.</p>
                <button className="go-to-login-button" onClick={() => navigate('/login')}>Go to Login</button>
            </div>
        );
    }

    if (questionBank.length === 0 && !isTestStarted) {
        return (
            <div className={`assessx-container loading`}>
                <div className="loading-content">
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                    <p>Fetching questions...</p>
                </div>
            </div>
        );
    }

    const displayQuestion = isTestStarted ? questionBank[currentQ] : null;

    return (
        <div className="assessx-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

            {showPaymentModal && (
                <div className="payment-modal-overlay">
                    <div className="payment-modal-content">
                        <h3>Purchase Attempt</h3>
                        <p>No attempts left. Purchase one for <span className="price">$9.99</span>.</p>
                        <div className="modal-actions">
                            <button onClick={handlePurchaseAttempt} disabled={isPaying} className="btn-primary">
                                {isPaying ? (<><FontAwesomeIcon icon={faSpinner} spin /> Processing...</>) : (<><FontAwesomeIcon icon={faCreditCard} /> Pay Now ($9.99)</>)}
                            </button>
                            <button onClick={() => setShowPaymentModal(false)} disabled={isPaying} className="btn-secondary">
                                <FontAwesomeIcon icon={faTimesCircle} /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="assessx-header">
                <h1 className="main-title">
                    <FontAwesomeIcon icon={faLightbulb} /> AssessX Examination
                </h1>
            </div>

            {!isTestStarted && !showResult ? (
                <section className="assessx-info-section card">
                    <h2 className="section-heading">
                        <FontAwesomeIcon icon={faRocket} /> How it Works
                    </h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <FontAwesomeIcon icon={faCreditCard} className="info-icon" />
                            <h4>Attempts</h4>
                            <p>1 free attempt, earn more via TrainX or purchase retakes.</p>
                        </div>
                        <div className="info-item">
                            <FontAwesomeIcon icon={faQuestionCircle} className="info-icon" />
                            <h4>Test Format</h4>
                            <p>10 unique questions from diverse medical categories.</p>
                        </div>
                        <div className="info-item">
                            <FontAwesomeIcon icon={faTrophy} className="info-icon" />
                            <h4>Scoring</h4>
                            <p>Max 100 points, influences your HireX recommendations.</p>
                        </div>
                        <div className="info-item">
                            <FontAwesomeIcon icon={faChartLine} className="info-icon" />
                            <h4>Improvement</h4>
                            <p>Retake the assessment, or boost your skills with <button onClick={() => navigate('/trainx')} className="text-link">TrainX courses</button>.</p>
                        </div>
                    </div>
                    <div className="test-start-area">
                        <div className="score-and-attempts">
                            <p className="attempts-left">
                                Attempts Left: <strong className="highlight">{attemptsLeft}</strong>
                            </p>
                            <p className="latest-score-display">
                                Latest Score: <strong className="highlight">{latestAssessXScore.toFixed(0)}/100</strong>
                            </p>
                        </div>
                        <button
                            className="start-button btn-primary"
                            onClick={startAssessment}
                            disabled={attemptsLeft <= 0}
                        >
                            <FontAwesomeIcon icon={faRocket} /> {attemptsLeft > 0 ? `Start Assessment` : 'No Attempts Left'}
                        </button>
                        {attemptsLeft <= 0 && (
                            <p className="purchase-hint">You can purchase more attempts if needed.</p>
                        )}
                    </div>
                </section>
            ) : showResult ? (
                <div className="result-section card">
                    <h2 className="score-heading">
                        <FontAwesomeIcon icon={faTrophy} /> Your Score: <span className="score-value">{score.toFixed(0)}</span> / 100
                    </h2>
                    <p className={`result-message ${score >= 70 ? 'success-text' : 'fail-text'}`}>
                        {score >= 70 ? "🎉 Excellent! You're ready for HireX opportunities!" : "📚 Good effort! Review TrainX modules to improve your score."}
                    </p>

                    <h3 className="breakdown-heading"><FontAwesomeIcon icon={faChartLine} /> Category Breakdown</h3>
                    <ul className="category-scores-list">
                        {Object.entries(categoryScores).map(([cat, val]) => (
                            <li key={cat}>
                                <span>{cat}:</span> <span className="score-correct">{val} Correct</span>
                            </li>
                        ))}
                        {questionBank
                            .reduce((acc, q) => {
                                // Add categories not present in categoryScores with 0 correct answers
                                if (!Object.keys(categoryScores).includes(q.category) && !acc.includes(q.category)) {
                                    acc.push(q.category);
                                }
                                return acc;
                            }, [])
                            .sort()
                            .map((cat) => (
                                <li key={`zero-${cat}`}>
                                    <span>{cat}:</span> <span className="score-incorrect">0 Correct</span>
                                </li>
                            ))
                        }
                    </ul>

                    <div className="result-actions">
                        <button className="action-button btn-secondary" onClick={handleRetake}>
                            <FontAwesomeIcon icon={faSyncAlt} /> Retake
                        </button>
                        <button className="action-button btn-accent" onClick={() => navigate('/trainx')}>
                            <FontAwesomeIcon icon={faBookOpen} /> TrainX
                        </button>
                        <button className="action-button btn-primary" onClick={() => navigate('/hirex')}>
                            <FontAwesomeIcon icon={faBriefcase} /> HireX
                        </button>
                        <button className="action-button btn-text" onClick={goToAssessXHome}>
                            <FontAwesomeIcon icon={faHome} /> Home
                        </button>
                    </div>
                </div>
            ) : (
                <div className="question-section card">
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${((currentQ + 1) / questionBank.length) * 100}%` }}></div>
                    </div>
                    <div className="question-header">
                        <span className="question-number">Question {currentQ + 1} / {questionBank.length}</span>
                        <div className="time-left">
                            <FontAwesomeIcon icon={faClock} /> {timer}s
                        </div>
                    </div>
                    <h3 className="question-text">{displayQuestion?.question}</h3>
                    <div className="options-grid">
                        {displayQuestion?.options.map((opt, idx) => (
                            <button
                                key={idx}
                                className={`option-button
                                    ${userSelectedOption === opt
                                        ? (opt === displayQuestion.answer ? 'correct-selected' : 'incorrect-selected')
                                        : ''
                                    }
                                    ${showCorrectAnswer && opt === displayQuestion.answer && userSelectedOption !== opt
                                        ? 'correct-not-selected'
                                        : ''
                                    }
                                `}
                                onClick={() => handleAnswer(opt)}
                                disabled={showCorrectAnswer} // Disable after an answer is selected
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                    {showCorrectAnswer && (
                        <div className="explanation-section">
                            <p className="explanation-text">
                                <FontAwesomeIcon icon={faInfoCircle} /> Correct answer: <strong className="correct-answer-text">{displayQuestion.answer}</strong>.
                            </p>
                        </div>
                    )}
                    <div className="category-label">
                        Category: <strong className="category-name">{displayQuestion?.category}</strong>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessX;