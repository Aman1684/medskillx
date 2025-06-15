const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV !== 'production') {
    console.warn('WARNING: JWT_SECRET is not defined in your .env file. JWT-related functionalities will not work without it. Please set a strong secret for production!');
} else if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL ERROR: JWT_SECRET is not defined. Please set it in your .env file for production.');
    process.exit(1);
}

// --- File Paths ---
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const TESTIMONIALS_FILE = path.join(__dirname, 'testimonials.json');
const FEATURE_CARDS_FILE = path.join(__dirname, 'featureCards.json');
const NEWSLETTER_SUBSCRIBERS_FILE = path.join(__dirname, 'newsletterSubscribers.json');
const IMPACT_METRICS_FILE = path.join(__dirname, 'impactMetrics.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const COURSES_FILE = path.join(__dirname, 'courses.json');
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');
const APPLICATIONS_FILE = path.join(__dirname, 'applications.json');
const CERTIFICATES_DIR = path.join(__dirname, 'certificates');
const ASSETS_DIR = path.join(__dirname, 'assets');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// IMPORTANT: Use both fs (synchronous) and fsp (promises-based)
const fs = require('fs');
const fsp = require('fs').promises;

const DATA_DIR = path.join(__dirname, 'data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

// Ensure necessary directories exist
if (!fs.existsSync(CERTIFICATES_DIR)) {
    fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}
if (!fs.existsSync(ASSETS_DIR)) {
    console.warn(`Assets directory not found at ${ASSETS_DIR}. Certificate background image might not load.`);
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`Created uploads directory at ${UPLOADS_DIR}`);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const userId = req.user ? req.user.userId : 'unknown';
        cb(null, `${userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed for resume upload!'));
        }
    }
});

// --- Middleware ---
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/certificates', express.static(CERTIFICATES_DIR));

// --- Helper Functions ---
async function ensureDataDirectoryExists() {
    try {
        await fsp.access(DATA_DIR);
        console.log('Data directory already exists.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Data directory not found. Creating it...');
            await fsp.mkdir(DATA_DIR, { recursive: true });
            console.log('Data directory created successfully.');
        } else {
            console.error('Error checking or creating data directory:', error);
            throw error;
        }
    }
}

async function readJsonFile(filePath, defaultData = []) {
    try {
        await fsp.access(filePath);
        const data = await fsp.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`File not found: ${filePath}. Initializing with default data.`);
            await writeJsonFile(filePath, defaultData);
            return defaultData;
        } else {
            console.error(`Error reading ${filePath}:`, error);
            throw error;
        }
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await ensureDataDirectoryExists();
        await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        throw error;
    }
}

const generateJwtToken = (userId, username, role) => {
    return jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn: '24h' });
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.status(401).json({ success: false, message: 'Authentication token required.' });
    }
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined. Cannot verify token.');
        return res.status(500).json({ success: false, message: 'Server configuration error: JWT secret missing.' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT Verification Error:', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: 'Authentication token expired. Please log in again.' });
            }
            return res.status(403).json({ success: false, message: 'Invalid authentication token.' });
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ success: false, message: 'Access denied: User role not identified.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied: Insufficient permissions.' });
        }
        next();
    };
};

const generateCertificate = async (doc, user, course, certificateFilePath) => {
    if (!doc) {
        doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
    }
    const stream = fs.createWriteStream(certificateFilePath);
    doc.pipe(stream);

    const backgroundImagePath = path.join(ASSETS_DIR, 'certificate_background.png');
    if (fs.existsSync(backgroundImagePath)) {
        doc.image(backgroundImagePath, 0, 0, { width: doc.page.width, height: doc.page.height });
    } else {
        console.warn(`Certificate background image not found at ${backgroundImagePath}. Generating without background.`);
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F0F8FF');
    }

    doc.fillColor('#333366')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF COMPLETION', 0, 100, { align: 'center' })
        .fontSize(16)
        .text('This is to certify that', 0, 180, { align: 'center' });

    doc.fillColor('#0056B3')
        .fontSize(36)
        .font('Helvetica-Bold')
        .text(user.username.toUpperCase(), 0, 220, { align: 'center' });

    doc.fillColor('#333366')
        .fontSize(16)
        .font('Helvetica')
        .text('has successfully completed the course', 0, 280, { align: 'center' });

    doc.fillColor('#007BFF')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text(course.title.toUpperCase(), 0, 320, { align: 'center' });

    doc.fillColor('#333366')
        .fontSize(14)
        .font('Helvetica')
        .text(`On ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 0, 380, { align: 'center' });

    doc.fontSize(12)
        .text('_________________________', 100, 450)
        .text('MedSkillX Authority', 100, 470)
        .text('_________________________', doc.page.width - 250, 450)
        .text('Date Issued', doc.page.width - 250, 470, { align: 'right' });

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve());
        stream.on('error', reject);
    });
};

// --- Routes ---
app.get('/api/questions', async (req, res) => {
    try {
        const data = await readJsonFile(QUESTIONS_FILE, []);
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: "Unable to retrieve questions data." });
    }
});

app.get('/api/jobs', async (req, res) => {
    const { score = 0, location, salary, workType } = req.query;
    const userScore = parseInt(score);
    try {
        let jobs = await readJsonFile(JOBS_FILE, []);
        jobs = jobs.filter(job => userScore >= job.requiredScore);
        if (location && location !== 'All') {
            jobs = jobs.filter(job => job.location === location);
        }
        if (salary && salary !== 'All') {
            jobs = jobs.filter(job => job.salary === salary);
        }
        if (workType && workType !== 'All') {
            jobs = jobs.filter(job => job.workTypes.includes(workType));
        }
        res.json(jobs);
    } catch (err) {
        console.error('Error in /api/jobs:', err);
        res.status(500).json({ success: false, error: "Unable to retrieve jobs data." });
    }
});

app.get('/api/data/testimonials', async (req, res) => {
    try {
        const data = await readJsonFile(TESTIMONIALS_FILE, []);
        res.json(data);
    } catch (err) {
        console.error('Error in /api/data/testimonials:', err);
        res.status(500).json({ success: false, message: "Unable to retrieve testimonials data." });
    }
});

app.get('/api/data/feature-cards', async (req, res) => {
    try {
        const data = await readJsonFile(FEATURE_CARDS_FILE, []);
        res.json(data);
    } catch (err) {
        console.error('Error in /api/data/feature-cards:', err);
        res.status(500).json({ success: false, message: "Unable to retrieve feature cards data." });
    }
});

app.get('/api/data/impact-metrics', async (req, res) => {
    try {
        const data = await readJsonFile(IMPACT_METRICS_FILE, []);
        res.json(data);
    } catch (err) {
        console.error('Error in /api/data/impact-metrics:', err);
        res.status(500).json({ success: false, message: "Unable to retrieve impact metrics data." });
    }
});

app.post('/api/newsletter/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (email.includes('testfail@')) {
        console.warn(`Simulating subscription failure for: ${email}`);
        return res.status(500).json({ success: false, message: 'Server error: Could not process subscription (simulated).' });
    }
    try {
        let subscribers = await readJsonFile(NEWSLETTER_SUBSCRIBERS_FILE, []);
        if (subscribers.includes(email)) {
            return res.status(409).json({ success: false, message: 'Email already subscribed.' });
        }
        subscribers.push(email);
        await writeJsonFile(NEWSLETTER_SUBSCRIBERS_FILE, subscribers);
        res.status(200).json({ success: true, message: 'Thank you for subscribing!' });
    } catch (err) {
        console.error('Error in /api/newsletter/subscribe:', err);
        res.status(500).json({ success: false, message: 'Failed to process subscription.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!JWT_SECRET) {
        return res.status(500).json({ success: false, message: 'Server configuration error: JWT secret missing for login.' });
    }
    try {
        const users = await readJsonFile(USERS_FILE, []);
        const user = users.find(u => (u.username === username || u.email === username));
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
            const token = generateJwtToken(user.id, user.username, user.role);
            const userSafe = { ...user };
            delete userSafe.password;
            return res.status(200).json({
                success: true,
                message: 'Login successful!',
                user: userSafe,
                token: token
            });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
        }
    } catch (err) {
        console.error('Error in /api/auth/login:', err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, role = 'jobSeeker' } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!['jobSeeker', 'recruiter'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role provided. Must be "jobSeeker" or "recruiter".' });
    }
    try {
        let users = await readJsonFile(USERS_FILE, []);
        const usernameExists = users.some(u => u.username === username);
        if (usernameExists) {
            return res.status(409).json({ success: false, message: 'Username already taken.' });
        }
        const emailExists = users.some(u => u.email === email);
        if (emailExists) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: crypto.randomUUID(),
            username,
            email,
            password: hashedPassword,
            role,
            profileImage: `https://placehold.co/100x100/A0B4D8/ffffff?text=${username.charAt(0).toUpperCase()}`,
            trainxProgress: {},
            assessxScores: {},
            jobPostings: role === 'recruiter' ? [] : undefined,
            appliedJobs: [],
            attemptsLeft: 3,
            freeAttemptUsed: false,
            hasAccessedAssessXBefore: false
        };
        users.push(newUser);
        await writeJsonFile(USERS_FILE, users);
        const userSafe = { ...newUser };
        delete userSafe.password;
        res.status(201).json({ success: true, message: 'Registration successful!', user: userSafe });
    } catch (err) {
        console.error('Error in /api/auth/register:', err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

app.get('/api/trainx/courses', async (req, res) => {
    try {
        const courses = await readJsonFile(COURSES_FILE, []);
        res.json(courses);
    } catch (err) {
        console.error('Error in /api/trainx/courses:', err);
        res.status(500).json({ success: false, error: "Unable to retrieve courses." });
    }
});

app.get('/api/trainx/progress/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    if (req.user.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only view your own progress.' });
    }
    try {
        const users = await readJsonFile(USERS_FILE, []);
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({ success: true, progress: user.trainxProgress || {} });
    } catch (err) {
        console.error(`Error fetching progress for user ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to retrieve progress.' });
    }
});

app.post('/api/trainx/progress/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { progress } = req.body;
    if (req.user.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only update your own progress.' });
    }
    if (!progress) {
        return res.status(400).json({ success: false, message: 'Progress data is required.' });
    }
    try {
        let users = await readJsonFile(USERS_FILE, []);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        users[userIndex].trainxProgress = progress;
        await writeJsonFile(USERS_FILE, users);
        res.status(200).json({ success: true, message: 'Progress saved successfully!' });
    } catch (err) {
        console.error(`Error saving progress for user ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to save progress.' });
    }
});

app.get('/api/users/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    if (req.user.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You can only view your own profile.' });
    }
    try {
        const users = await readJsonFile(USERS_FILE, []);
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const userSafe = { ...user };
        delete userSafe.password;
        res.status(200).json({ success: true, user: userSafe });
    } catch (err) {
        console.error(`Error fetching user data for ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to retrieve user data.' });
    }
});

app.put('/api/users/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const updates = req.body;
    if (req.user.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only update your own profile.' });
    }
    try {
        let users = await readJsonFile(USERS_FILE, []);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const userToUpdate = users[userIndex];
        const allowedFields = [
            'username', 'email', 'profileImage',
            'attemptsLeft', 'freeAttemptUsed', 'hasAccessedAssessXBefore'
        ];
        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                userToUpdate[field] = updates[field];
            }
        }
        users[userIndex] = userToUpdate;
        await writeJsonFile(USERS_FILE, users);
        const userSafe = { ...users[userIndex] };
        delete userSafe.password;
        res.status(200).json({ success: true, message: 'User data updated successfully!', user: userSafe });
    } catch (err) {
        console.error(`Error updating user profile data for ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to update user data.' });
    }
});

app.put('/api/users/:userId/assessx-scores', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { totalScore, totalQuestions, categoryBreakdown, dateCompleted } = req.body;
    if (req.user.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only update your own scores.' });
    }
    if (totalScore === undefined || totalQuestions === undefined || !categoryBreakdown || !dateCompleted) {
        return res.status(400).json({ success: false, message: 'Missing score data (totalScore, totalQuestions, categoryBreakdown, dateCompleted are required).' });
    }
    try {
        let users = await readJsonFile(USERS_FILE, []);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const user = users[userIndex];
        user.assessxScores = user.assessxScores || {};
        const assessmentAttemptId = crypto.randomUUID();
        user.assessxScores[assessmentAttemptId] = {
            totalScore,
            totalQuestions,
            categoryBreakdown,
            dateCompleted
        };
        await writeJsonFile(USERS_FILE, users);
        const userSafe = { ...user };
        delete userSafe.password;
        res.status(200).json({ success: true, message: 'Assessment scores saved successfully!', user: userSafe, newAttemptId: assessmentAttemptId });
    } catch (err) {
        console.error(`Error saving AssessX scores for user ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to save assessment scores.' });
    }
});

app.put('/api/users/:userId/promote-to-recruiter', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const requestingUser = req.user;
    if (requestingUser.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only modify your own account.' });
    }
    try {
        let users = await readJsonFile(USERS_FILE, []);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const user = users[userIndex];
        if (user.role === 'recruiter') {
            const newToken = generateJwtToken(user.id, user.username, user.role);
            const userSafe = { ...user };
            delete userSafe.password;
            return res.status(200).json({ success: true, message: 'User is already a recruiter.', user: userSafe, token: newToken });
        }
        user.role = 'recruiter';
        if (!user.jobPostings) {
            user.jobPostings = [];
        }
        await writeJsonFile(USERS_FILE, users);
        const newToken = generateJwtToken(user.id, user.username, user.role);
        const userSafe = { ...user };
        delete userSafe.password;
        res.status(200).json({
            success: true,
            message: 'Successfully promoted to recruiter! You can now post jobs.',
            user: userSafe,
            token: newToken
        });
    } catch (err) {
        console.error(`Error promoting user ${userId} to recruiter:`, err);
        res.status(500).json({ success: false, message: 'Failed to promote user to recruiter.' });
    }
});

app.post('/api/jobs', authenticateToken, authorizeRoles(['recruiter']), async (req, res) => {
    const {
        title, description, company, location, salary, type,
        experience, requiredScore, qualifications, applicationDeadline, contactEmail,
        skills, customQuestions, employerId
    } = req.body;
    const jobEmployerId = req.user.userId;
    if (!title || !description || !location || !salary || !type || !experience || !company) {
        return res.status(400).json({ success: false, message: 'All core job fields (title, description, company, location, salary, work type, experience level) are required.' });
    }
    if (!jobEmployerId) {
        return res.status(400).json({ success: false, message: 'Employer ID not found from token.' });
    }
    try {
        let jobs = await readJsonFile(JOBS_FILE, []);
        const newJob = {
            id: crypto.randomBytes(16).toString('hex'),
            title,
            description,
            company,
            location,
            salary,
            type,
            experience,
            requiredScore: parseInt(requiredScore, 10) || 0,
            qualifications: qualifications || '',
            applicationDeadline: applicationDeadline || '',
            contactEmail: contactEmail || '',
            skills: skills || [],
            customQuestions: customQuestions || [],
            employerId: jobEmployerId,
            postedAt: new Date().toISOString(),
            applicants: []
        };
        jobs.push(newJob);
        await writeJsonFile(JOBS_FILE, jobs);
        res.status(201).json({ success: true, message: 'Job posted successfully!', job: newJob });
    } catch (error) {
        console.error('Error posting job (backend):', error);
        res.status(500).json({ success: false, message: 'Failed to post job. Internal Server Error.' });
    }
});

app.post('/api/applications/submit', authenticateToken, authorizeRoles(['jobSeeker']), (req, res, next) => {
    upload.single('resume')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ success: false, message: 'Resume file is too large. Max 5MB allowed.' });
            }
            return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, async (req, res) => {
    const jobSeekerId = req.user.userId;
    const resumeFile = req.file;
    if (!resumeFile) {
        return res.status(400).json({ success: false, message: 'Resume file is required after upload processing.' });
    }
    let { jobId, personalInfo, education, workExperience, skills, customAnswers, consent } = req.body;
    try {
        personalInfo = typeof personalInfo === 'string' ? JSON.parse(personalInfo) : personalInfo;
        education = typeof education === 'string' ? JSON.parse(education) : education;
        workExperience = typeof workExperience === 'string' ? JSON.parse(workExperience) : workExperience;
        skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
        customAnswers = typeof customAnswers === 'string' ? JSON.parse(customAnswers) : customAnswers;
        consent = typeof consent === 'string' ? JSON.parse(consent) : consent;
    } catch (parseError) {
        if (resumeFile && fs.existsSync(resumeFile.path)) {
            fs.unlinkSync(resumeFile.path);
        }
        console.error('JSON parsing error:', parseError);
        return res.status(400).json({ success: false, message: `Invalid JSON format for one or more fields: ${parseError.message}` });
    }
    if (!jobId || !personalInfo || !education || !workExperience || !skills || !customAnswers || !consent) {
        if (resumeFile && fs.existsSync(resumeFile.path)) {
            fs.unlinkSync(resumeFile.path);
        }
        return res.status(400).json({ success: false, message: 'All application fields are required.' });
    }
    if (!consent.dataProcessing || !consent.accuracyDeclaration) {
        if (resumeFile && fs.existsSync(resumeFile.path)) {
            fs.unlinkSync(resumeFile.path);
        }
        return res.status(400).json({ success: false, message: 'Consent for data processing and accuracy declaration is required.' });
    }
    try {
        let applications = await readJsonFile(APPLICATIONS_FILE, []);
        let users = await readJsonFile(USERS_FILE, []);
        let jobs = await readJsonFile(JOBS_FILE, []);
        const job = jobs.find(j => j.id === jobId);
        if (!job) {
            if (resumeFile && fs.existsSync(resumeFile.path)) {
                fs.unlinkSync(resumeFile.path);
            }
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        const applicantUser = users.find(u => u.id === jobSeekerId);
        if (!applicantUser) {
            if (resumeFile && fs.existsSync(resumeFile.path)) {
                fs.unlinkSync(resumeFile.path);
            }
            return res.status(404).json({ success: false, message: 'Applicant user not found.' });
        }
        if (applicantUser.appliedJobs.includes(jobId)) {
            if (resumeFile && fs.existsSync(resumeFile.path)) {
                fs.unlinkSync(resumeFile.path);
            }
            return res.status(409).json({ success: false, message: 'You have already applied for this job.' });
        }
        const newApplication = {
            id: crypto.randomBytes(16).toString('hex'),
            jobId,
            userId: jobSeekerId,
            applicantName: `${personalInfo.firstName} ${personalInfo.lastName}`,
            email: personalInfo.email,
            personalInfo,
            education,
            workExperience,
            skills,
            customAnswers,
            consent,
            resumePath: path.basename(resumeFile.path),
            status: 'Pending',
            appliedAt: new Date().toISOString()
        };
        applications.push(newApplication);
        await writeJsonFile(APPLICATIONS_FILE, applications);
        job.applicants = job.applicants || [];
        job.applicants.push({ userId: jobSeekerId, applicationId: newApplication.id, status: 'Pending' });
        await writeJsonFile(JOBS_FILE, jobs);
        applicantUser.appliedJobs.push(jobId);
        await writeJsonFile(USERS_FILE, users);
        res.status(201).json({ success: true, message: 'Application submitted successfully!', application: newApplication });
    } catch (error) {
        console.error('Application submission (internal) error:', error);
        if (resumeFile && fs.existsSync(resumeFile.path)) {
            fs.unlinkSync(resumeFile.path);
        }
        res.status(500).json({ success: false, message: 'Failed to submit application. Please try again. Internal Server Error.' });
    }
});

app.get('/api/jobs/:jobId/applicants', authenticateToken, authorizeRoles(['recruiter']), async (req, res) => {
    const jobId = req.params.jobId;
    const recruiterId = req.user.userId;
    try {
        let jobs = await readJsonFile(JOBS_FILE, []);
        let users = await readJsonFile(USERS_FILE, []);
        const job = jobs.find(j => j.id === jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        if (job.employerId !== recruiterId) {
            return res.status(403).json({ success: false, message: 'You can only view applicants for jobs you posted.' });
        }
        const enrichedApplicants = job.applicants.map(applicant => {
            const user = users.find(u => u.id === applicant.userId);
            if (user) {
                return {
                    userId: user.id,
                    username: user.username,
                    email: user.email,
                    profileImage: user.profileImage || 'https://placehold.co/100x100/A0B4D8/ffffff?text=U',
                    trainxProgress: user.trainxProgress || { score: 0, completedModules: 0 },
                    appliedDate: applicant.appliedDate,
                    status: applicant.status,
                    customQuestionAnswers: applicant.customQuestionAnswers || {}
                };
            }
            return null;
        }).filter(Boolean);
        res.status(200).json({ success: true, applicants: enrichedApplicants, jobTitle: job.title });
    } catch (error) {
        console.error('Error fetching job applicants:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch job applicants. Internal Server Error.' });
    }
});

app.get('/api/users/:userId/applications', authenticateToken, authorizeRoles(['jobSeeker']), async (req, res) => {
    const { userId } = req.params;
    if (req.user.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only view your own applications.' });
    }
    try {
        const applications = await readJsonFile(APPLICATIONS_FILE, []);
        const userApplications = applications.filter(app => app.userId === userId);
        const allJobs = await readJsonFile(JOBS_FILE, []);
        const detailedApplications = userApplications.map(app => {
            const job = allJobs.find(j => j.id === app.jobId);
            return {
                ...app,
                jobTitle: job ? job.title : 'Unknown Job',
                company: job ? job.company : 'Unknown Company'
            };
        });
        res.status(200).json({ success: true, applications: detailedApplications });
    } catch (err) {
        console.error(`Error fetching applications for user ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to retrieve applications.' });
    }
});

app.get('/api/users/:userId/posted-jobs', authenticateToken, authorizeRoles(['recruiter']), async (req, res) => {
    const { userId } = req.params;
    if (req.user.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only view jobs you posted.' });
    }
    try {
        const users = await readJsonFile(USERS_FILE, []);
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Recruiter user not found.' });
        }
        const allJobs = await readJsonFile(JOBS_FILE, []);
        const postedJobs = allJobs.filter(job => job.employerId === userId);
        const allApplications = await readJsonFile(APPLICATIONS_FILE, []);
        const postedJobsWithCounts = postedJobs.map(job => {
            const applicantCount = allApplications.filter(app => app.jobId === job.id).length;
            return {
                ...job,
                applicantCount,
                applicants: undefined
            };
        });
        res.status(200).json({ success: true, postedJobs: postedJobsWithCounts });
    } catch (err) {
        console.error(`Error fetching posted jobs for recruiter ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to retrieve posted jobs.' });
    }
});

app.get('/api/jobs/:jobId/applications-overview', authenticateToken, authorizeRoles(['recruiter']), async (req, res) => {
    const { jobId } = req.params;
    const recruiterId = req.user.userId;
    try {
        const jobs = await readJsonFile(JOBS_FILE, []);
        const job = jobs.find(j => j.id === jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        if (job.employerId !== recruiterId) {
            return res.status(403).json({ success: false, message: 'You can only view applications for jobs you posted.' });
        }
        const allApplications = await readJsonFile(APPLICATIONS_FILE, []);
        const users = await readJsonFile(USERS_FILE, []);
        const jobApplications = allApplications.filter(app => app.jobId === jobId);
        const applicationsOverview = jobApplications.map(app => {
            const applicantUser = users.find(u => u.id === app.userId);
            const latestAssessXScore = applicantUser && applicantUser.assessxScores ?
                Object.values(applicantUser.assessxScores).sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))[0] : null;
            return {
                applicationId: app.id,
                applicantId: app.userId,
                applicantUsername: applicantUser ? applicantUser.username : app.applicantName.split(' ')[0],
                applicantEmail: app.email,
                appliedDate: app.appliedAt,
                status: app.status,
                applicantProfileImage: applicantUser ? applicantUser.profileImage : null,
                latestAssessXScore: latestAssessXScore ? latestAssessXScore.totalScore : 'N/A'
            };
        });
        res.status(200).json({ success: true, applications: applicationsOverview });
    } catch (err) {
        console.error(`Error fetching applications overview for job ${jobId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to retrieve applications overview.' });
    }
});

app.get('/api/applications/:applicationId', authenticateToken, authorizeRoles(['recruiter']), async (req, res) => {
    const { applicationId } = req.params;
    const recruiterId = req.user.userId;
    try {
        const applications = await readJsonFile(APPLICATIONS_FILE, []);
        const application = applications.find(app => app.id === applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
        }
        const jobs = await readJsonFile(JOBS_FILE, []);
        const job = jobs.find(j => j.id === application.jobId);
        if (!job || job.employerId !== recruiterId) {
            return res.status(403).json({ success: false, message: 'You can only view applications for jobs you posted.' });
        }
        const users = await readJsonFile(USERS_FILE, []);
        const applicantUser = users.find(u => u.id === application.userId);
        const detailedApplication = {
            ...application,
            applicantTrainXProgress: applicantUser ? applicantUser.trainxProgress : {},
            applicantAssessXScores: applicantUser ? applicantUser.assessxScores : {}
        };
        res.status(200).json({ success: true, application: detailedApplication });
    } catch (err) {
        console.error(`Error fetching detailed application ${applicationId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to retrieve detailed application.' });
    }
});

app.get('/api/jobs/recruiter/:userId', authenticateToken, authorizeRoles(['recruiter']), async (req, res) => {
    const recruiterId = req.params.userId;
    if (req.user.userId !== recruiterId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own posted jobs.' });
    }
    try {
        let jobs = await readJsonFile(JOBS_FILE, []);
        const recruiterJobs = jobs.filter(job => job.employerId === recruiterId);
        res.status(200).json({ success: true, jobs: recruiterJobs });
    } catch (error) {
        console.error('Error fetching recruiter jobs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch jobs posted by recruiter. Internal Server Error.' });
    }
});

app.put('/api/applications/:applicationId/status', authenticateToken, authorizeRoles(['recruiter']), async (req, res) => {
    const { applicationId } = req.params;
    const { status } = req.body;
    const recruiterId = req.user.userId;
    if (!status || !['pending', 'reviewed', 'interview', 'rejected', 'hired'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status provided. Must be one of: pending, reviewed, interview, rejected, hired.' });
    }
    try {
        let applications = await readJsonFile(APPLICATIONS_FILE, []);
        const applicationIndex = applications.findIndex(app => app.id === applicationId);
        if (applicationIndex === -1) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
        }
        const application = applications[applicationIndex];
        const jobs = await readJsonFile(JOBS_FILE, []);
        const job = jobs.find(j => j.id === application.jobId);
        if (!job || job.employerId !== recruiterId) {
            return res.status(403).json({ success: false, message: 'You can only update applications for jobs you posted.' });
        }
        application.status = status;
        applications[applicationIndex] = application;
        await writeJsonFile(APPLICATIONS_FILE, applications);
        res.status(200).json({ success: true, message: `Application status updated to ${status}.`, application });
    } catch (err) {
        console.error(`Error updating application status for ${applicationId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to update application status.' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await readJsonFile(USERS_FILE, []);
        const leaderboard = users
            .filter(user => Object.keys(user.assessxScores || {}).length > 0)
            .map(user => {
                const latestScore = Object.values(user.assessxScores).sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))[0];
                return {
                    userId: user.id,
                    username: user.username,
                    profileImage: user.profileImage,
                    totalScore: latestScore.totalScore,
                    dateCompleted: latestScore.dateCompleted
                };
            })
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 10);
        res.json(leaderboard);
    } catch (err) {
        console.error('Error in /api/leaderboard:', err);
        res.status(500).json({ success: false, error: "Unable to retrieve leaderboard data." });
    }
});

app.get('/api/jobs/:jobId/questions', authenticateToken, authorizeRoles(['jobSeeker']), async (req, res) => {
    const { jobId } = req.params;
    try {
        const jobs = await readJsonFile(JOBS_FILE, []);
        const job = jobs.find(j => j.id === jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        res.json({ success: true, customQuestions: job.customQuestions || [] });
    } catch (err) {
        console.error(`Error fetching custom questions for job ${jobId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to retrieve custom questions.' });
    }
});
// Remove duplicate endpoint and fix error handling
app.get('/api/certificate/download/:userId/:courseTitle', authenticateToken, async (req, res) => {
  try {
    const { userId, courseTitle } = req.params;
    const decodedCourseTitle = decodeURIComponent(courseTitle);

    // Validate user exists
    const users = await readJsonFile(USERS_FILE, []);
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Validate course exists
    const courses = await readJsonFile(COURSES_FILE, []);
    const course = courses.find(c => c.title === decodedCourseTitle);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Validate certificate file
    const certFileName = `certificate_${userId}_${encodeURIComponent(course.title)}.pdf`;
    const certPath = path.join(CERTIFICATES_DIR, certFileName);
    
    if (!fs.existsSync(certPath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not generated yet. Complete the course first.'
      });
    }

    // Stream file with proper error handling
    const fileStream = fs.createReadStream(certPath);
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming certificate file' });
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certFileName}"`);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Certificate download error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error'
    });
  }
});

// Remove the duplicate /api/certificate/download/:userId/:courseId endpoint

// Add this new endpoint for direct PDF download
// app.get('/api/certificate/download/:userId/:courseId', authenticateToken, async (req, res) => {
//     const { userId, courseId } = req.params;
    
//     if (req.user.userId !== userId) {
//         return res.status(403).json({ success: false, message: 'Access denied.' });
//     }

//     try {
//         const users = await readJsonFile(USERS_FILE, []);
//         const user = users.find(u => u.id === userId);
//         const courses = await readJsonFile(COURSES_FILE, []);
//         const course = courses.find(c => c.title === decodeURIComponent(courseId));

//         if (!user || !course) {
//             return res.status(404).json({ success: false, message: 'User or course not found' });
//         }

//         const certificateFileName = `certificate_${userId}_${encodeURIComponent(course.title)}.pdf`;
//         const certificateFilePath = path.join(CERTIFICATES_DIR, certificateFileName);

//         if (!fs.existsSync(certificateFilePath)) {
//             return res.status(404).json({ success: false, message: 'Certificate not generated yet' });
//         }

//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `attachment; filename="${certificateFileName}"`);
//         fs.createReadStream(certificateFilePath).pipe(res);

//     } catch (error) {
//         console.error('Certificate download error:', error);
//         res.status(500).json({ success: false, message: 'Failed to download certificate' });
//     }
// });




// app.get('/api/certificate/generate/:userId/:courseId', authenticateToken, async (req, res) => {
//     const { userId, courseId } = req.params;
//     if (req.user.userId !== userId) {
//         return res.status(403).json({ success: false, message: 'Access denied: You can only generate your own certificates.' });
//     }
//     try {
//         const users = await readJsonFile(USERS_FILE, []);
//         const user = users.find(u => u.id === userId);
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found.' });
//         }
//         const courses = await readJsonFile(COURSES_FILE, []);
//         const course = courses.find(c => c.id === courseId);
//         if (!course) {
//             return res.status(404).json({ success: false, message: 'Course not found.' });
//         }
//         const userProgress = user.trainxProgress[courseId];
//         if (!userProgress || userProgress.completed !== true) {
//             return res.status(400).json({ success: false, message: 'Course not completed by this user.' });
//         }
//         const certificateFileName = `certificate_${userId}_${courseId}.pdf`;
//         const certificateFilePath = path.join(CERTIFICATES_DIR, certificateFileName);
//         if (fs.existsSync(certificateFilePath)) {
//             return res.status(200).json({
//                 success: true,
//                 message: 'Certificate already generated.',
//                 certificateUrl: `/certificates/${certificateFileName}`
//             });
//         }
//         const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
//         await generateCertificate(doc, user, course, certificateFilePath);
//         res.status(201).json({
//             success: true,
//             message: 'Certificate generated successfully!',
//             certificateUrl: `/certificates/${certificateFileName}`
//         });
//     } catch (err) {
//         console.error('Error generating certificate:', err);
//         res.status(500).json({ success: false, message: 'Failed to generate certificate.' });
//     }
// });

app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected server error occurred.';
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
        return res.status(400).json({ success: false, message: 'Invalid JSON format in request body.' });
    }
    res.status(statusCode).json({
        success: false,
        message: 'Failed to submit application. Please try again. ' + message,
    });
});

async function startServer() {
    await ensureDataDirectoryExists();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer();
