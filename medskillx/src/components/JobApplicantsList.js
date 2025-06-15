// src/components/JobApplicantsList.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const JobApplicantsList = () => {
    const { jobId } = useParams();
    const { token, user } = useAuth();

    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [jobTitle, setJobTitle] = useState('');

    useEffect(() => {
        const fetchApplicants = async () => {
            if (!token || !jobId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Fetch job details to get the title
                const jobResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/jobs`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const currentJob = jobResponse.data.find(j => j.id === jobId);
                if (currentJob) {
                    setJobTitle(currentJob.title);
                }

                const applicantsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/jobs/${jobId}/applicants`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setApplicants(applicantsResponse.data.applicants);
            } catch (err) {
                console.error('Error fetching applicants:', err.response?.data?.message || err.message);
                setError(err.response?.data?.message || 'Failed to load applicants for this job.');
            } finally {
                setLoading(false);
            }
        };
        fetchApplicants();
    }, [jobId, token]);

    if (!user || user.role !== 'recruiter') {
        return <div className="text-red-500 p-4">You must be logged in as a recruiter to view applicants.</div>;
    }
    if (loading) return <p className="p-4">Loading applicants...</p>;
    if (error) return <p className="text-red-500 p-4">{error}</p>;
    if (applicants.length === 0) return <p className="p-4">No applicants for this job yet.</p>;

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-center">Applicants for "{jobTitle || 'Loading Job...'}"</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <ul className="divide-y divide-gray-200">
                    {applicants.map(applicant => (
                        <li key={applicant.applicationId} className="py-4 flex items-center justify-between">
                            <div>
                                <p className="text-lg font-semibold text-gray-800">{applicant.applicantName}</p>
                                <p className="text-sm text-gray-600">Applied on: {new Date(applicant.appliedDate).toLocaleDateString()}</p>
                                <p className="text-sm text-gray-600">Status: <span className="font-medium capitalize">{applicant.status}</span></p>
                            </div>
                            <Link
                                to={`/recruiter/jobs/${jobId}/applicants/${applicant.applicationId}`}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            >
                                View Details
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default JobApplicantsList;