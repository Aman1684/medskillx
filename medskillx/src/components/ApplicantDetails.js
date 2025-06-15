// src/components/ApplicantDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ApplicantDetails = () => {
    const { jobId, applicationId } = useParams();
    const { token, user } = useAuth();

    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [jobTitle, setJobTitle] = useState('');

    useEffect(() => {
        const fetchApplicationDetails = async () => {
            if (!token || !jobId || !applicationId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Fetch job title for context
                const jobResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/jobs`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const currentJob = jobResponse.data.find(j => j.id === jobId);
                if (currentJob) {
                    setJobTitle(currentJob.title);
                }

                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/jobs/${jobId}/applicants/${applicationId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setApplication(response.data.application);
            } catch (err) {
                console.error('Error fetching applicant details:', err.response?.data?.message || err.message);
                setError(err.response?.data?.message || 'Failed to load applicant details.');
            } finally {
                setLoading(false);
            }
        };
        fetchApplicationDetails();
    }, [jobId, applicationId, token]);

    if (!user || user.role !== 'recruiter') {
        return <div className="text-red-500 p-4">You must be logged in as a recruiter to view applicant details.</div>;
    }
    if (loading) return <p className="p-4">Loading applicant details...</p>;
    if (error) return <p className="text-red-500 p-4">{error}</p>;
    if (!application) return <p className="p-4">Application not found.</p>;

    const { personalInfo, resumePath, education, workExperience, skills, customAnswers, consent, appliedDate, status } = application;

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2 text-center">Applicant Details</h1>
            <h2 className="text-xl font-semibold mb-6 text-center">for "{jobTitle || 'Loading Job...'}"</h2>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-2xl font-semibold mb-4 text-blue-700">Personal Information</h3>
                <p><strong>Name:</strong> {personalInfo.firstName} {personalInfo.lastName}</p>
                <p><strong>Email:</strong> {personalInfo.email}</p>
                <p><strong>Phone:</strong> {personalInfo.phone || 'N/A'}</p>
                <p><strong>Address:</strong> {personalInfo.address || 'N/A'}</p>
                {personalInfo.linkedIn && <p><strong>LinkedIn:</strong> <a href={personalInfo.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{personalInfo.linkedIn}</a></p>}
                {personalInfo.portfolio && <p><strong>Portfolio:</strong> <a href={personalInfo.portfolio} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{personalInfo.portfolio}</a></p>}
                <p><strong>Resume:</strong> {resumePath ? <a href={`${process.env.REACT_APP_API_URL}${resumePath}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View Resume</a> : 'Not available'}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-2xl font-semibold mb-4 text-blue-700">Education</h3>
                {education && education.length > 0 ? (
                    education.map((edu, index) => (
                        <div key={index} className="mb-4 border-b pb-4 last:border-b-0">
                            <p className="font-semibold">{edu.degree} in {edu.major}</p>
                            <p>{edu.institution} ({edu.graduationDate})</p>
                        </div>
                    ))
                ) : <p>No education details provided.</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-2xl font-semibold mb-4 text-blue-700">Work Experience</h3>
                {workExperience && workExperience.length > 0 ? (
                    workExperience.map((exp, index) => (
                        <div key={index} className="mb-4 border-b pb-4 last:border-b-0">
                            <p className="font-semibold">{exp.title} at {exp.company}</p>
                            <p>{exp.startDate} - {exp.endDate}</p>
                            <p className="text-gray-700 text-sm mt-1">{exp.responsibilities}</p>
                        </div>
                    ))
                ) : <p>No work experience details provided.</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-2xl font-semibold mb-4 text-blue-700">Skills</h3>
                {skills && skills.length > 0 ? (
                    <p>{skills.join(', ')}</p>
                ) : <p>No skills provided.</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-2xl font-semibold mb-4 text-blue-700">Job-Specific Answers</h3>
                {customAnswers && customAnswers.length > 0 ? (
                    customAnswers.map((answer, index) => (
                        <div key={index} className="mb-4 border-b pb-4 last:border-b-0">
                            <p className="font-semibold">{answer.questionText}</p>
                            <p className="text-gray-700">{answer.answer}</p>
                        </div>
                    ))
                ) : <p>No custom answers provided.</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4 text-blue-700">Consent & Application Details</h3>
                <p><strong>Data Processing Consent:</strong> {consent.dataProcessing ? 'Yes' : 'No'}</p>
                <p><strong>Accuracy Declaration:</strong> {consent.accuracyDeclaration ? 'Yes' : 'No'}</p>
                <p><strong>Applied Date:</strong> {new Date(appliedDate).toLocaleString()}</p>
                <p><strong>Current Status:</strong> <span className="font-medium capitalize">{status}</span></p>
                <div className="mt-4">
                    <button type="button" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2">Shortlist</button>
                    <button type="button" className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Reject</button>
                </div>
            </div>
            <div className="mt-6 text-center">
                <Link to={`/recruiter/jobs/${jobId}/applicants`} className="text-blue-500 hover:underline">Back to Applicants List</Link>
            </div>
        </div>
    );
};

export default ApplicantDetails;