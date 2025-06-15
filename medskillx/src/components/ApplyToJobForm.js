// src/components/ApplyToJobForm.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

// Import the CSS Module
import styles from './ApplyToJobForm.css'; // Renamed to .module.css for clarity, common convention

/**
 * A form component for job applications.
 * Allows users to submit their details, resume, and answer custom questions for a job.
 *
 * @param {object} props - The component props.
 * @param {string} props.jobId - The ID of the job to apply for.
 * @param {string} [props.jobTitle] - Optional: The title of the job. If provided, API fetch for job details can be skipped.
 * @param {Array<object>} [props.customQuestions] - Optional: An array of custom questions for the job. If provided, API fetch for job details can be skipped.
 * @param {function} props.onClose - Callback function to close the form.
 * @param {function} props.onApplicationSubmitSuccess - Callback function to execute on successful application submission.
 * @param {string} [props.authToken] - Optional: Authentication token. Falls back to auth context token if not provided.
 * @param {string} [props.API_BASE_URL] - Optional: Base URL for the API. Falls back to environment variable or localhost if not provided.
 */
function ApplyToJobForm({
  jobId,
  jobTitle,
  customQuestions,
  onClose,
  onApplicationSubmitSuccess,
  authToken,
  API_BASE_URL,
}) {
  const { loggedInUser, authLoading: authContextLoading, authToken: authContextToken } = useAuth();

  // Use effective values for auth token and API base URL
  const effectiveAuthToken = useMemo(() => authToken || authContextToken, [authToken, authContextToken]);
  const effectiveApiBaseUrl = useMemo(
    () => API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    [API_BASE_URL]
  );

  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [answers, setAnswers] = useState({});

  // Form fields state
  const [fullName, setFullName] = useState(loggedInUser?.username || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  // Consent states
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [accuracyDeclaration, setAccuracyDeclaration] = useState(false);

  const [submitError, setSubmitError] = useState(null);

  // Initialize full name if logged in user's username is available
  useEffect(() => {
    if (loggedInUser?.username && !fullName) {
      setFullName(loggedInUser.username);
    }
  }, [loggedInUser, fullName]);

  const isLoggedIn = useMemo(() => loggedInUser && effectiveAuthToken, [loggedInUser, effectiveAuthToken]);

  // Fetch job details
  const fetchJobData = useCallback(async () => {
    if (!jobId) {
      setError('Job ID is missing. Cannot fetch job details.');
      setLoading(false);
      return;
    }

    // Skip API fetch if jobTitle and customQuestions are provided via props
    if (jobTitle && customQuestions) {
      setJobData({
        id: jobId,
        title: jobTitle,
        customQuestions: customQuestions,
      });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      console.log(`Fetching job details for jobId: ${jobId} from ${effectiveApiBaseUrl}/api/jobs/${jobId}`);
      const response = await fetch(`${effectiveApiBaseUrl}/api/jobs/${jobId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch job details.');
      }
      const data = await response.json();
      setJobData(data.job);
      setError(null);
    } catch (err) {
      console.error('Error fetching job data:', err);
      setError(`Failed to load job details: ${err.message}`);
      toast.error(`Error loading job details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [jobId, jobTitle, customQuestions, effectiveApiBaseUrl]);

  // Effect to manage job data fetching based on authentication status
  useEffect(() => {
    if (!authContextLoading) {
      if (isLoggedIn) {
        fetchJobData();
      } else {
        setLoading(false);
        setError('You must be logged in to apply for jobs.');
        toast.info('Please log in to apply for jobs.');
      }
    }
  }, [authContextLoading, isLoggedIn, fetchJobData]);

  // Handle changes to custom question answers
  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: value,
    }));
  }, []);

  // Handle resume file selection and validation
  const handleResumeChange = useCallback((e) => {
    setSubmitError(null); // Clear previous submission errors
    const file = e.target.files?.[0];

    if (!file) {
      setResumeFile(null);
      toast.warn('No resume file selected.');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setSubmitError('Invalid file type. Please upload a PDF or DOC/DOCX file.');
      setResumeFile(null);
      e.target.value = ''; // Clear file input
      return;
    }
    if (file.size > maxSize) {
      setSubmitError('File size exceeds 5MB. Please upload a smaller file.');
      setResumeFile(null);
      e.target.value = ''; // Clear file input
      return;
    }

    setResumeFile(file);
    toast.info(`Resume selected: ${file.name}`);
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null); // Clear previous submission errors

    // Pre-submission validation
    if (!isLoggedIn || !jobId || !loggedInUser?.id || !loggedInUser?.email) {
      setSubmitError('Authentication or essential user/job details missing. Cannot submit application.');
      setIsSubmitting(false);
      return;
    }
    if (!fullName.trim()) {
      setSubmitError('Please enter your full name.');
      setIsSubmitting(false);
      return;
    }
    if (!phoneNumber.trim()) {
      setSubmitError('Please enter your phone number.');
      setIsSubmitting(false);
      return;
    }
    if (!resumeFile) {
      setSubmitError('Please select a resume file to upload.');
      setIsSubmitting(false);
      return;
    }
    if (!dataProcessingConsent) {
      setSubmitError('You must consent to data processing.');
      setIsSubmitting(false);
      return;
    }
    if (!accuracyDeclaration) {
      setSubmitError('You must declare the accuracy of your information.');
      setIsSubmitting(false);
      return;
    }

    // Validate required custom questions
    if (jobData?.customQuestions) {
      for (const question of jobData.customQuestions) {
        if (question.required && (!answers[question.id] || String(answers[question.id]).trim() === '')) {
          setSubmitError(`Please answer the required question: "${question.text}"`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    // Prepare form data for submission
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('applicantId', loggedInUser.id);
    formData.append('fullName', fullName);
    formData.append('email', loggedInUser.email); // Use loggedInUser.email
    formData.append('phoneNumber', phoneNumber);
    formData.append('coverLetter', coverLetter);
    formData.append('customAnswers', JSON.stringify(answers));
    formData.append('dataProcessingConsent', dataProcessingConsent);
    formData.append('accuracyDeclaration', accuracyDeclaration);
    formData.append('resume', resumeFile);

    try {
      const response = await fetch(`${effectiveApiBaseUrl}/api/applications/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveAuthToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application.');
      }

      setApplicationSuccess(true);
      toast.success('Application submitted successfully!');
      onApplicationSubmitSuccess(); // Callback for parent component
    } catch (err) {
      console.error('Error submitting application:', err);
      setSubmitError(`Failed to submit application: ${err.message}`);
      toast.error(`Error submitting application: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Conditional Rendering ---
  if (loading) {
    return (
      <div className={styles.statusContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.statusText}>Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.statusContainer}>
        <p className={styles.statusError}>Error: {error}</p>
        <button onClick={onClose} className={styles.statusButton}>Close</button>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className={styles.statusContainer}>
        <p className={styles.statusError}>Job details not available.</p>
        <button onClick={onClose} className={styles.statusButton}>Close</button>
      </div>
    );
  }

  if (applicationSuccess) {
    return (
      <div className={`${styles.statusContainer} ${styles.animateFadeIn}`}>
        <p className={styles.successTitle}>Application Submitted Successfully! 🎉</p>
        <p className={styles.successText}>
          You have successfully applied for the position of "
          <span className={styles.successJobTitle}>{jobData.title}</span>".
        </p>
        <p className={styles.successNote}>We've received your application and will notify you of any updates.</p>
        <button onClick={onClose} className={styles.statusButton}>Close</button>
      </div>
    );
  }

  // --- Main Form Rendering ---
  return (
    <div className={styles.formContainer}>
      {/* The close button for the entire modal, if needed (often handled by parent Modal component) */}
      {/* <button onClick={onClose} className={styles.closeButton} aria-label="Close form">
        &times;
      </button> */}

      <h2 className={styles.formTitle}>
        Apply for: <span>{jobData.title}</span>
      </h2>
      {jobData.company && (
        <p className={styles.companyText}>
          at <span>{jobData.company}</span>
        </p>
      )}

      {!isLoggedIn && (
        <div className={`${styles.alertMessage} ${styles.alertInfo}`} role="alert" aria-live="polite">
          <p className={styles.alertBold}>Authentication Required</p>
          <p>Please log in to submit your application.</p>
        </div>
      )}

      {submitError && (
        <div className={`${styles.alertMessage} ${styles.alertError}`} role="alert" aria-live="assertive">
          <p className={styles.alertBold}>Submission Error:</p>
          <p>{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formLayout}>
        <div className={styles.gridCols2}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">
              Full Name <span className={styles.requiredIndicator}>*</span>
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., John Doe"
              required
              className={styles.inputField}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Your Email:</label>
            <input
              type="email"
              id="email"
              value={loggedInUser?.email || ''}
              readOnly
              disabled
              className={styles.inputField}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phoneNumber">
            Phone Number <span className={styles.requiredIndicator}>*</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., +1234567890"
            required
            className={styles.inputField}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="coverLetter">Cover Letter / Message to Recruiter (Optional)</label>
          <textarea
            id="coverLetter"
            rows="6"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Tell us why you're a great fit for this role, highlight relevant experience, or express your enthusiasm..."
            className={styles.textareaField}
          ></textarea>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="resume">
            Upload Resume <span className={styles.requiredIndicator}>*</span>
            <span className={styles.fileHint}>(PDF, DOC, DOCX - Max 5MB)</span>
          </label>
          <input
            type="file"
            id="resume"
            name="resume"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeChange}
            className={styles.fileInput}
            required
          />
          {resumeFile && (
            <p className={styles.resumeFileName}>
              Selected: <span>{resumeFile.name}</span> (
              {(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {jobData.customQuestions && jobData.customQuestions.length > 0 && (
          <div className={styles.customQuestionsSection}>
            <h3>Additional Questions:</h3>
            {jobData.customQuestions.map((question, index) => (
              <div key={question.id || `custom-q-${index}`} className={styles.formGroup}>
                <label htmlFor={`question-${question.id || `custom-q-${index}`}`}>
                  {question.text} {question.required && <span className={styles.requiredIndicator}>*</span>}
                </label>
                {question.type === 'textarea' ? (
                  <textarea
                    id={`question-${question.id || `custom-q-${index}`}`}
                    rows="4"
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    required={question.required}
                    className={styles.textareaField}
                  ></textarea>
                ) : (
                  <input
                    type={question.type || 'text'}
                    id={`question-${question.id || `custom-q-${index}`}`}
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    required={question.required}
                    className={styles.inputField}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.consentSection}>
          <h3>Consent and Declaration:</h3>
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="dataProcessingConsent"
              className={styles.checkboxInput}
              checked={dataProcessingConsent}
              onChange={(e) => setDataProcessingConsent(e.target.checked)}
              required
            />
            <label htmlFor="dataProcessingConsent" className={styles.checkboxLabel}>
              I consent to the processing of my data for this job application in accordance with the
              privacy policy. <span className={styles.requiredIndicator}>*</span>
            </label>
          </div>
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="accuracyDeclaration"
              className={styles.checkboxInput}
              checked={accuracyDeclaration}
              onChange={(e) => setAccuracyDeclaration(e.target.checked)}
              required
            />
            <label htmlFor="accuracyDeclaration" className={styles.checkboxLabel}>
              I declare that the information provided in this application is accurate and true to the
              best of my knowledge. <span className={styles.requiredIndicator}>*</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting || !isLoggedIn}
        >
          {isSubmitting ? (
            <>
              <svg className={styles.buttonSpinner} viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting Application...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
      </form>
    </div>
  );
}

export default ApplyToJobForm;