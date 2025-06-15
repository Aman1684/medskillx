// src/components/JobApplicantsModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faSpinner,
    faExclamationCircle,
    faUser,
    faEnvelope,
    faChartLine,
    faCalendarAlt,
    faInfoCircle,
    faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';

function JobApplicantsModal({ jobId, jobTitle, authToken, API_BASE_URL, onClose }) {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchApplicants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/applicants`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch applicants.');
            }

            if (Array.isArray(data.applicants)) {
                setApplicants(data.applicants);
            } else {
                console.warn("Backend response for job applicants did not contain an array 'applicants'. Received:", data);
                setApplicants([]);
            }
        } catch (err) {
            console.error('Error fetching applicants:', err);
            setError(`Failed to load applicants: ${err.message}`);
            toast.error(`Failed to load applicants: ${err.message}`);
            setApplicants([]);
        } finally {
            setLoading(false);
        }
    }, [jobId, authToken, API_BASE_URL]);

    useEffect(() => {
        fetchApplicants();
    }, [fetchApplicants]);

    // Base styles for the modal overlay and content
    const modalOverlayClasses = "fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000] p-4";
    const modalContentClasses = "bg-white p-8 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 scale-100 opacity-100";

    if (loading) {
        return (
            <div className={modalOverlayClasses}>
                <div className={`${modalContentClasses} text-center flex flex-col items-center justify-center min-h-[300px]`}>
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-blue-500 mb-4" />
                    <p className="text-2xl font-semibold text-gray-700">Loading applicants...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={modalOverlayClasses}>
                <div className={`${modalContentClasses} flex flex-col items-center justify-center min-h-[300px]`}>
                    <FontAwesomeIcon icon={faExclamationCircle} size="3x" className="text-red-500 mb-4" />
                    <h3 className="text-3xl font-bold mb-4 text-red-700">Error!</h3>
                    <p className="text-red-600 text-lg mb-6 text-center">{error}</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={modalOverlayClasses}>
            <div className={modalContentClasses}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors duration-200 text-3xl font-bold leading-none"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} />
                </button>
                <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center border-b pb-4 border-gray-200">
                    Applicants for "<span className="text-blue-600">{jobTitle}</span>"
                </h2>

                {applicants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                        <FontAwesomeIcon icon={faInfoCircle} size="4x" className="mb-6 text-blue-400" />
                        <p className="text-2xl font-semibold mb-2">No Applicants Yet!</p>
                        <p className="text-lg text-center max-w-prose">
                            It looks like no one has applied for this job opening at the moment. Share your job listing widely to attract more candidates!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {applicants.map(applicant => (
                            <div key={applicant.userId} className="bg-white border border-gray-200 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
                                <div className="flex items-center mb-5 border-b pb-4 border-gray-100">
                                    <img
                                        src={applicant.profileImage || `https://ui-avatars.com/api/?name=${applicant.username}&background=random&color=fff&size=128`}
                                        alt={applicant.username}
                                        className="w-20 h-20 rounded-full mr-5 object-cover border-2 border-blue-400 shadow-sm"
                                    />
                                    <div>
                                        <h4 className="text-2xl font-bold text-gray-900 mb-1">{applicant.username}</h4>
                                        <p className="text-blue-600 text-md flex items-center">
                                            <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-sm" />
                                            {applicant.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-6">
                                    <p className="text-gray-700 text-lg flex items-center">
                                        <FontAwesomeIcon icon={faChartLine} className="mr-3 text-green-500" />
                                        <span className="font-semibold">TrainX Score:</span> <span className="ml-2 font-bold text-green-700">{applicant.trainxProgress?.score || 'N/A'}</span>
                                    </p>
                                    <p className="text-gray-700 text-lg flex items-center">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-purple-500" />
                                        <span className="font-semibold">Applied On:</span> <span className="ml-2">{applicant.appliedDate ? new Date(applicant.appliedDate).toLocaleDateString() : 'N/A'}</span>
                                    </p>
                                    <p className="text-gray-700 text-lg flex items-center">
                                        <FontAwesomeIcon icon={faInfoCircle} className="mr-3 text-orange-500" />
                                        <span className="font-semibold">Status:</span> <span className="ml-2 capitalize text-orange-700 font-bold">{applicant.status || 'Pending'}</span>
                                    </p>
                                </div>

                                {/* Display custom questions and answers if available */}
                                {applicant.customQuestionAnswers && Object.keys(applicant.customQuestionAnswers).length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h5 className="font-bold text-gray-800 text-xl mb-3 flex items-center">
                                            <FontAwesomeIcon icon={faQuestionCircle} className="mr-2 text-blue-500" />
                                            Application Answers:
                                        </h5>
                                        <div className="space-y-3">
                                            {Object.entries(applicant.customQuestionAnswers).map(([question, answer], idx) => (
                                                <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                                    <p className="font-medium text-gray-800 text-md mb-1">{question}</p>
                                                    <p className="text-gray-700 text-sm italic leading-relaxed">{answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Add a button to view resume if you implement that */}
                                {/* Example: */}
                                {/* {applicant.resumeUrl && (
                                    <div className="mt-6 text-center">
                                        <a href={applicant.resumeUrl} target="_blank" rel="noopener noreferrer"
                                           className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out">
                                            <FontAwesomeIcon icon={faFilePdf} className="mr-2" /> View Resume
                                        </a>
                                    </div>
                                )} */}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobApplicantsModal;