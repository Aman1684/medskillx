// src/components/JobPostForm.jsx

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaPlusCircle, FaSave, FaTimesCircle } from 'react-icons/fa';
import { RiSendPlaneFill } from 'react-icons/ri';

const JobPostForm = ({ onJobPosted, recruiterId, authToken, API_BASE_URL }) => {
    const [jobData, setJobData] = useState({
        title: '',
        description: '',
        company: '',
        location: '',
        salary: '',
        workTypes: [],
        requiredScore: 0,
        experienceLevel: '',
        qualifications: '',
        applicationDeadline: '',
        contactEmail: '',
        skillsRequired: [],
        customQuestions: [],
    });
    const [loading, setLoading] = useState(false);
    const [currentSkill, setCurrentSkill] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setJobData(prev => ({
                ...prev,
                workTypes: checked
                    ? [...prev.workTypes, value]
                    : prev.workTypes.filter(type => type !== value)
            }));
        } else {
            setJobData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddSkill = () => {
        if (currentSkill.trim() && !jobData.skillsRequired.includes(currentSkill.trim())) {
            setJobData(prev => ({
                ...prev,
                skillsRequired: [...prev.skillsRequired, currentSkill.trim()]
            }));
            setCurrentSkill('');
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setJobData(prev => ({
            ...prev,
            skillsRequired: prev.skillsRequired.filter(skill => skill !== skillToRemove)
        }));
    };

    const handleAddQuestion = () => {
        if (currentQuestion.trim() && !jobData.customQuestions.includes(currentQuestion.trim())) {
            setJobData(prev => ({
                ...prev,
                customQuestions: [...prev.customQuestions, currentQuestion.trim()]
            }));
            setCurrentQuestion('');
        }
    };

    const handleRemoveQuestion = (questionToRemove) => {
        setJobData(prev => ({
            ...prev,
            customQuestions: prev.customQuestions.filter(q => q !== questionToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // --- Prepare the data payload to match backend's expected fields ---
        const payload = {
            title: jobData.title,
            description: jobData.description,
            company: jobData.company,
            location: jobData.location,
            salary: jobData.salary,
            // Map frontend `workTypes` to backend `type`.
            // If `workTypes` can be multiple, you might send it as a comma-separated string
            // or modify backend to accept an array. For now, sending the first one or a join.
            // Assuming your backend's 'type' expects a single string value from 'Daily Shifts', 'Monthly Contracts', 'Permanent Roles'.
            // If backend expects a single string, you might pick the first or join them.
            // Let's assume for simplicity you pick the first or ensure only one is selected if 'type' is singular.
            // If backend `type` expects a string like "Full-time", "Part-time", etc., adjust this mapping.
            // For now, I'll map `workTypes` to `type` by taking the first one if selected, otherwise an empty string.
            // You might need to change your backend `type` to `workTypes` or adjust this.
            type: jobData.workTypes.length > 0 ? jobData.workTypes[0] : '', // Or join with ', ' if backend expects that.

            // Map frontend `experienceLevel` to backend `experience`.
            experience: jobData.experienceLevel,

            requiredScore: jobData.requiredScore,
            qualifications: jobData.qualifications,
            applicationDeadline: jobData.applicationDeadline,
            contactEmail: jobData.contactEmail,
            skills: jobData.skillsRequired, // Backend likely expects 'skills' not 'skillsRequired'
            customQuestions: jobData.customQuestions, // Backend likely expects 'customQuestions'
            employerId: recruiterId // Make sure backend also expects this or sets it from req.user.userId
        };

        // --- IMPORTANT: Add console.log to see the exact payload being sent ---
        console.log("Payload being sent:", payload);
        // --- End console.log ---

        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload) // Send the constructed payload
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to post job.');
            }

            setJobData({
                title: '', description: '', company: '', location: '', salary: '', workTypes: [], requiredScore: 0,
                experienceLevel: '', qualifications: '', applicationDeadline: '', contactEmail: '', skillsRequired: [], customQuestions: []
            });
            toast.success("Job posted successfully!"); // Success toast
            onJobPosted(); // Trigger refresh in parent
        } catch (err) {
            console.error('Error posting job:', err);
            toast.error(`Error posting job: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="job-post-form-container">
            <form onSubmit={handleSubmit} className="job-post-form">
                <div className="form-group">
                    <label htmlFor="title">Job Title <span className="required">*</span></label>
                    <input type="text" id="title" name="title" value={jobData.title} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Job Description <span className="required">*</span></label>
                    <textarea id="description" name="description" value={jobData.description} onChange={handleChange} required></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="company">Company <span className="required">*</span></label>
                    <input type="text" id="company" name="company" value={jobData.company} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="location">Location <span className="required">*</span></label>
                    <input type="text" id="location" name="location" value={jobData.location} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="salary">Salary Range <span className="required">*</span></label>
                    <input type="text" id="salary" name="salary" value={jobData.salary} onChange={handleChange} required />
                </div>
                <div className="form-group work-types-group">
                    <label>Work Type(s) <span className="required">*</span></label>
                    <div className="checkbox-options">
                        <label>
                            <input type="checkbox" name="workTypes" value="Daily Shifts" checked={jobData.workTypes.includes('Daily Shifts')} onChange={handleChange} />
                            Daily Shifts
                        </label>
                        <label>
                            <input type="checkbox" name="workTypes" value="Monthly Contracts" checked={jobData.workTypes.includes('Monthly Contracts')} onChange={handleChange} />
                            Monthly Contracts
                        </label>
                        <label>
                            <input type="checkbox" name="workTypes" value="Permanent Roles" checked={jobData.workTypes.includes('Permanent Roles')} onChange={handleChange} />
                            Permanent Roles
                        </label>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="requiredScore">Min. AssessX Score (0 for none)</label>
                    <input type="number" id="requiredScore" name="requiredScore" value={jobData.requiredScore} onChange={handleChange} min="0" max="100" />
                </div>

                <div className="form-group">
                    <label htmlFor="experienceLevel">Experience Level <span className="required">*</span></label> {/* Added required for this field */}
                    <select id="experienceLevel" name="experienceLevel" value={jobData.experienceLevel} onChange={handleChange} required> {/* Added required for this field */}
                        <option value="">Select Level</option>
                        <option value="Entry-Level">Entry-Level</option>
                        <option value="Mid-Level">Mid-Level</option>
                        <option value="Senior-Level">Senior-Level</option>
                        <option value="Manager">Manager</option>
                        <option value="Director">Director</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="qualifications">Required Qualifications</label>
                    <input type="text" id="qualifications" name="qualifications" value={jobData.qualifications} onChange={handleChange} placeholder="e.g., MD, RN, BSN" />
                </div>
                <div className="form-group">
                    <label htmlFor="applicationDeadline">Application Deadline</label>
                    <input type="date" id="applicationDeadline" name="applicationDeadline" value={jobData.applicationDeadline} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="contactEmail">Contact Email</label>
                    <input type="email" id="contactEmail" name="contactEmail" value={jobData.contactEmail} onChange={handleChange} placeholder="hr@example.com" />
                </div>

                <div className="form-group multi-input-group">
                    <label htmlFor="skillsRequired">Skills Required</label>
                    <div className="input-with-button">
                        <input
                            type="text"
                            id="skillsRequired"
                            value={currentSkill}
                            onChange={(e) => setCurrentSkill(e.target.value)}
                            placeholder="Add a skill (e.g., 'Phlebotomy')"
                            onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                        />
                        <button type="button" onClick={handleAddSkill} className="add-btn"><FaPlusCircle /> Add</button>
                    </div>
                    <div className="tags-container">
                        {jobData.skillsRequired.map((skill, index) => (
                            <span key={index} className="tag">
                                {skill} <button type="button" onClick={() => handleRemoveSkill(skill)}><FaTimesCircle /></button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="form-group multi-input-group">
                    <label htmlFor="customQuestions">Custom Application Questions</label>
                    <div className="input-with-button">
                        <input
                            type="text"
                            id="customQuestions"
                            value={currentQuestion}
                            onChange={(e) => setCurrentQuestion(e.target.value)}
                            placeholder="Add a question (e.g., 'Why are you a good fit?')"
                            onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuestion(); } }}
                        />
                        <button type="button" onClick={handleAddQuestion} className="add-btn"><FaPlusCircle /> Add</button>
                    </div>
                    <div className="tags-container">
                        {jobData.customQuestions.map((question, index) => (
                            <span key={index} className="tag">
                                {question} <button type="button" onClick={() => handleRemoveQuestion(question)}><FaTimesCircle /></button>
                            </span>
                        ))}
                    </div>
                </div>

                <button type="submit" className="btn-submit-job" disabled={loading}>
                    {loading ? (
                        <>
                            <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Posting...
                        </>
                    ) : (
                        <><RiSendPlaneFill /> Post Job</>
                    )}
                </button>
            </form>
        </div>
    );
};

export default JobPostForm;