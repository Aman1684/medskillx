// src/components/JobApplicantsModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import ApplicantDetailsCard from './ApplicantDetailsCard'; // Import the new card component

function JobApplicantsModal({ jobId, jobTitle, authToken, API_BASE_URL, onClose }) {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const effectiveApiBaseUrl = API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const fetchJobApplicants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log(`Fetching applicants for job ID: ${jobId}`);
            const response = await fetch(`${effectiveApiBaseUrl}/api/applications/job/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch applicants.');
            }

            setApplicants(data.applications || []);
            toast.success(`Fetched ${data.applications?.length || 0} applicants.`);
        } catch (err) {
            console.error("Error fetching job applicants:", err);
            setError(`Failed to load applicants: ${err.message}`);
            toast.error(`Error loading applicants: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [jobId, authToken, effectiveApiBaseUrl]);

    useEffect(() => {
        if (jobId && authToken) {
            fetchJobApplicants();
        }
    }, [jobId, authToken, fetchJobApplicants]);

    if (!jobId) {
        return null; // Don't render if no job ID is provided
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-800">Applicants for: <span className="text-blue-700">{jobTitle}</span></h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-3xl leading-none font-bold"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8 text-blue-600 font-semibold">Loading applicants...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-600 font-semibold">{error}</div>
                    ) : applicants.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 text-lg">No applicants for this job yet.</div>
                    ) : (
                        <div className="space-y-6">
                            {applicants.map(applicant => (
                                <ApplicantDetailsCard
                                    key={applicant.id} // Ensure a unique key
                                    applicant={applicant}
                                    API_BASE_URL={effectiveApiBaseUrl}
                                    authToken={authToken}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-gray-200 text-right">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-lg transition-colors duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default JobApplicantsModal;