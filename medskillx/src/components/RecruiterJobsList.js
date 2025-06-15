// src/components/RecruiterJobsList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import JobApplicantsModal from './JobApplicantsModal'; // New component

function RecruiterJobsList({ API_BASE_URL }) {
    const { loggedInUser, authLoading, authToken } = useAuth();
    const effectiveApiBaseUrl = API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showApplicantsModal, setShowApplicantsModal] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [selectedJobTitle, setSelectedJobTitle] = useState(''); // To display in modal header

    const fetchRecruiterJobs = useCallback(async () => {
        if (!loggedInUser || !loggedInUser.id || !authToken) {
            setError("User not authenticated or ID missing.");
            setLoading(false);
            return;
        }
        if (loggedInUser.role !== 'recruiter') {
            setError("Access denied: Only recruiters can view this page.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            console.log(`Fetching jobs for user ${loggedInUser.id}`);
            const response = await fetch(`${effectiveApiBaseUrl}/api/jobs/recruiter/${loggedInUser.id}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch recruiter jobs.');
            }

            if (Array.isArray(data.jobs)) {
                setJobs(data.jobs);
            } else {
                console.warn("Backend response for recruiter jobs did not contain an array 'jobs'. Received:", data);
                setJobs([]);
            }
        } catch (err) {
            console.error("Error fetching recruiter jobs:", err);
            setError(`Failed to fetch jobs: ${err.message}`);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    }, [loggedInUser, authToken, effectiveApiBaseUrl]);

    useEffect(() => {
        if (!authLoading && loggedInUser && loggedInUser.role === 'recruiter') {
            fetchRecruiterJobs();
        } else if (!authLoading && (!loggedInUser || loggedInUser.role !== 'recruiter')) {
            setLoading(false);
            setError("You must be logged in as a recruiter to view this page.");
        }
    }, [authLoading, loggedInUser, fetchRecruiterJobs]);

    const handleViewApplicants = (jobId, jobTitle) => {
        setSelectedJobId(jobId);
        setSelectedJobTitle(jobTitle);
        setShowApplicantsModal(true);
    };

    const handleCloseApplicantsModal = () => {
        setShowApplicantsModal(false);
        setSelectedJobId(null);
        setSelectedJobTitle('');
    };

    if (loading) {
        return <div className="text-center text-xl font-semibold p-6">Loading posted jobs...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500 text-xl font-semibold mt-4 p-6">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Posted Jobs</h2>
            {jobs.length === 0 ? (
                <p className="text-center text-gray-600 text-lg">You haven't posted any jobs yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                            <h3 className="text-xl font-semibold text-blue-700 mb-2">{job.title}</h3>
                            <p className="text-gray-600 mb-1">{job.company || 'N/A'}</p>
                            <p className="text-gray-500 text-sm">{job.location || 'Remote'}</p>
                            <p className="text-gray-700 mt-4">{job.description?.substring(0, 100)}...</p>
                            <p className="text-sm text-gray-400 mt-2">Applicants: {job.applicants ? job.applicants.length : 0}</p>
                            <button
                                onClick={() => handleViewApplicants(job.id, job.title)}
                                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                            >
                                View Applicants ({job.applicants ? job.applicants.length : 0})
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for displaying applicants */}
            {showApplicantsModal && selectedJobId && (
                <JobApplicantsModal
                    jobId={selectedJobId}
                    jobTitle={selectedJobTitle}
                    authToken={authToken}
                    API_BASE_URL={effectiveApiBaseUrl}
                    onClose={handleCloseApplicantsModal}
                />
            )}
        </div>
    );
}

export default RecruiterJobsList;