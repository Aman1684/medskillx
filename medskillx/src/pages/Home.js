// src/pages/Home.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaSun, FaMoon, FaLinkedin, FaTwitter, FaEnvelope, FaGlobe, FaGraduationCap, FaHandsHelping, FaAward, FaArrowUp } from 'react-icons/fa';

// Import useAuth hook from the central context file
import { useAuth } from '../contexts/AuthContext';


// Define your backend API base URL
const API_BASE_URL = 'http://localhost:5000/api'; // Keep API_BASE_URL here if other components also use it

// --- API Calls (Keep only those specific to Home.js data fetching, not auth) ---
/**
 * API call to subscribe an email to the newsletter.
 * @param {string} email - The email address to subscribe.
 * @returns {Promise<{success: boolean, message: string}>}
 */
const subscribeToNewsletterApi = async (email) => {
  const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  return data;
};

/**
 * API call to fetch testimonials from the backend.
 * @returns {Promise<Array<{name: string, text: string, avatar: string}>>}
 */
const fetchTestimonialsApi = async () => {
  const response = await fetch(`${API_BASE_URL}/data/testimonials`);
  if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
  const data = await response.json();
  return data;
};

/**
 * API call to fetch dynamic data for feature cards from the backend.
 * @returns {Promise<Array<{title: string, description: string, link: string, buttonText: string, dynamicStat: string}>>}
 */
const fetchFeatureCardDataApi = async () => {
  const response = await fetch(`${API_BASE_URL}/data/feature-cards`);
  if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
  const data = await response.json();
  return data;
};

/**
 * API call to fetch impact metrics data from the backend.
 * @returns {Promise<Array<{id: string, label: string, value: number, icon: string, unit: string}>>}
 */
const fetchImpactMetricsApi = async () => {
  const response = await fetch(`${API_BASE_URL}/data/impact-metrics`);
  if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
  const data = await response.json();
  return data;
};


// --- HOME COMPONENT ---
const Home = () => {
  // Access authentication state from AuthContext
  const { isLoggedIn, loggedInUser } = useAuth(); // You don't need login/logout here directly, as Header handles it.

  // General UI states
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Newsletter specific states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Data loading states and data storage
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);

  const [featureCards, setFeatureCards] = useState([]);
  const [featureCardsLoading, setFeatureCardsLoading] = useState(true);

  const [impactMetrics, setImpactMetrics] = useState([]);
  const [impactMetricsLoading, setImpactMetricsLoading] = useState(true);
  const metricsSectionRef = useRef(null); // Ref for Intersection Observer
  const [metricsInView, setMetricsInView] = useState(false); // To trigger animations

  const whyChooseUsRef = useRef(null); // Ref for Intersection Observer
  const [whyChooseUsInView, setWhyChooseUsInView] = useState(false); // To trigger animations

  // Scroll-to-top button visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);


  // Effect for responsive layout adjustments based on window width
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth < 768; // Helper to determine if screen is mobile size

  // Effect to listen for system theme preference changes (light/dark mode)
  useEffect(() => {
    const listener = e => setDarkMode(e.matches);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);
    return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', listener);
  }, []);

  // Generalized data fetching effect for reusability
  useEffect(() => {
    const getData = async (fetchApi, setLoading, setData) => {
      setLoading(true);
      try {
        const data = await fetchApi();
        setData(data);
      } catch (error) {
        console.error(`Failed to fetch data:`, error);
        setData([]); // Set empty array on error to prevent render issues
      } finally {
        setLoading(false);
      }
    };
    // Fetch all necessary data on component mount
    getData(fetchTestimonialsApi, setTestimonialsLoading, setTestimonials);
    getData(fetchFeatureCardDataApi, setFeatureCardsLoading, setFeatureCards);
    getData(fetchImpactMetricsApi, setImpactMetricsLoading, setImpactMetrics);
  }, []); // Empty dependency array means this runs once on mount

  // Helper to create Intersection Observers for animating sections into view
  const createObserver = (ref, setInView) => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target); // Stop observing once section is in view
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.3 } // Trigger when 30% of the section is visible
    );
    if (ref.current) { observer.observe(ref.current); }
    return () => { if (ref.current) { observer.unobserve(ref.current); } }; // Cleanup
  };

  // Effects to attach Intersection Observers for specific sections
  useEffect(() => createObserver(metricsSectionRef, setMetricsInView), [metricsInView]); // Only runs once on initial view
  useEffect(() => createObserver(whyChooseUsRef, setWhyChooseUsInView), [whyChooseUsInView]); // Only runs once on initial view

  // Carousel auto-advance logic for testimonials
  useEffect(() => {
    if (testimonials.length > 0) {
      const timer = setInterval(() => {
        setTestimonialIdx(idx => (idx + 1) % testimonials.length);
      }, 5000);
      return () => clearInterval(timer); // Cleanup timer on unmount
    }
  }, [testimonials]);

  // Newsletter form submission handler
  async function handleNewsletter(e) {
    e.preventDefault();
    setNewsletterMsg('');
    if (!newsletterEmail.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setNewsletterMsg('Please enter a valid email address.');
      return;
    }
    setIsSubscribing(true);
    try {
      const response = await subscribeToNewsletterApi(newsletterEmail);
      if (response.success) {
        setNewsletterMsg(response.message);
        setNewsletterEmail('');
      } else {
        setNewsletterMsg(response.message);
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setNewsletterMsg('Failed to subscribe due to a network error. Please try again.');
    } finally {
      setTimeout(() => setNewsletterMsg(''), 4000); // Clear message after 4 seconds
      setIsSubscribing(false);
    }
  }

  // Scroll-to-Top button logic
  const handleScroll = useCallback(() => {
    if (window.scrollY > 300) { setShowScrollTop(true); } else { setShowScrollTop(false); }
  }, []);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Determine current theme colors based on darkMode state
  const theme = darkMode ? darkTheme : lightTheme;

  // No need to apply theme to body here, App.js's Header will handle it.
  // useEffect(() => {
  //   document.body.style.background = theme.bg;
  //   document.body.style.color = theme.text;
  //   return () => { document.body.style.background = ''; document.body.style.color = ''; };
  // }, [theme]);

  return (
    <div style={{ ...containerStyle, background: theme.bg, color: theme.text }}>
      {/* No Header, LoginModal, RegisterModal here anymore. App.js handles them. */}

      {/* HERO SECTION - Main introductory section */}
      <section style={{
        ...heroSectionStyle,
        background: `${darkMode ? darkTheme.heroBg : lightTheme.heroBg}, url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: darkMode ? 'multiply' : 'overlay',
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)'
      }}>
        {/* Decorative background shape */}
        <div style={{ ...heroBgShape, opacity: darkMode ? 0.3 : 0.6 }}></div>
        <div style={heroContentStyle}>
          <h1 style={{ ...heroTitle, color: theme.primary }}>
            👩‍⚕️ MedSkillX
          </h1>
          <p style={{
            ...heroSubtitle,
            color: darkMode ? '#a2d2ff' : '#023e8a',
            textShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.8)' : '0 2px 10px rgba(0,0,0,0.4)'
          }}>
            Bridging the Healthcare Workforce Gap
          </p>
          <p style={{
            ...heroDesc,
            color: darkMode ? '#bbb' : '#555',
            textShadow: darkMode ? '0 1px 8px rgba(0,0,0,0.6)' : '0 1px 8px rgba(0,0,0,0.2)'
          }}>
            From world-class training (TrainX) to real-world skill evaluation (AssessX) and job connections (HireX), we equip you for the healthcare future.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link to="/trainx" style={{ ...heroCTA, background: theme.primary, color: '#fff' }}>
              🚀 Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS SECTION - TrainX, AssessX, HireX */}
      <section
        style={{
          ...cardGridStyle,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
        }}
      >
        {featureCardsLoading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: theme.text, padding: '40px 0' }}>
            Loading exciting features...
          </div>
        ) : featureCards.length > 0 ? (
          featureCards.map((card, index) => (
            <FeatureCard
              key={index}
              title={card.title}
              description={`${card.description} ${card.dynamicStat ? `(${card.dynamicStat})` : ''}`}
              link={card.link}
              buttonText={card.buttonText}
              gradient={theme.cardGradients[index % theme.cardGradients.length]}
              theme={theme}
            />
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: theme.text, padding: '40px 0' }}>
            Could not load features at the moment. Please try again.
          </div>
        )}
      </section>

      {/* IMPACT METRICS SECTION - Displays key statistics with counting animations */}
      <section ref={metricsSectionRef} style={impactMetricsSectionStyle}>
        <h3 style={{ marginBottom: 40, color: theme.text }}>Our Impact in Numbers</h3>
        {impactMetricsLoading ? (
          <div style={{ color: theme.text, padding: '30px 0' }}>Calculating our impact...</div>
        ) : impactMetrics.length > 0 ? (
          <div style={{
            ...impactMetricsGridStyle,
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))'
          }}>
            {impactMetrics.map(metric => (
              <MetricDisplay
                key={metric.id}
                {...metric}
                theme={theme}
                animate={metricsInView}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: theme.text, padding: '30px 0' }}>No impact data available.</div>
        )}
      </section>

      {/* WHY CHOOSE MEDSKILLX SECTION - Highlights key benefits */}
      <section ref={whyChooseUsRef} style={whyChooseUsSectionStyle}>
        <h3 style={{ marginBottom: 40, color: theme.text }}>Why Choose MedSkillX?</h3>
        <div style={{
          ...whyChooseUsGridStyle,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))'
        }}>
          <WhyChooseUsCard
            icon={<FaGraduationCap />}
            title="Expert-Led Training"
            description="Learn from industry leaders and WHO-certified content."
            theme={theme}
            animate={whyChooseUsInView}
            delay={0}
          />
          <WhyChooseUsCard
            icon={<FaAward />}
            title="Recognized Certifications"
            description="Boost your career with verified and industry-recognized skills."
            theme={theme}
            animate={whyChooseUsInView}
            delay={200}
          />
          <WhyChooseUsCard
            icon={<FaHandsHelping />}
            title="Dedicated Support"
            description="Get personalized mentorship and job assistance."
            theme={theme}
            animate={whyChooseUsInView}
            delay={400}
          />
          <WhyChooseUsCard
            icon={<FaGlobe />}
            title="Global Opportunities"
            description="Connect with top healthcare employers worldwide."
            theme={theme}
            animate={whyChooseUsInView}
            delay={600}
          />
        </div>
      </section>


      {/* TESTIMONIALS CAROUSEL SECTION */}
      <section style={testimonialSectionStyle}>
        <h3 style={{ marginBottom: 10 }}>What our users say</h3>
        {testimonialsLoading ? (
          <div style={{ color: theme.text, padding: '30px 0' }}>Loading inspiring stories...</div>
        ) : testimonials.length > 0 ? (
          <>
            <div style={carouselOuterStyle}>
              <button
                aria-label="Previous testimonial"
                style={carouselNavStyle}
                onClick={() => setTestimonialIdx(idx => (idx - 1 + testimonials.length) % testimonials.length)}
                disabled={testimonials.length <= 1}
              >&lt;</button>
              <div style={{
                ...testimonialCardStyle,
                background: theme.card,
                color: theme.text,
                boxShadow: theme.cardShadow,
                minWidth: isMobile ? '90vw' : 350,
                transition: 'background 0.3s, color 0.3s'
              }}
                tabIndex={0}
                aria-label={`Testimonial from ${testimonials[testimonialIdx].name}`}
              >
                <span style={{ fontSize: '2.2rem' }}>{testimonials[testimonialIdx].avatar}</span>
                <p style={{ fontStyle: 'italic', margin: '12px 0' }}>"{testimonials[testimonialIdx].text}"</p>
                <p style={{ fontWeight: 'bold', marginBottom: 0 }}>{testimonials[testimonialIdx].name}</p>
              </div>
              <button
                aria-label="Next testimonial"
                style={carouselNavStyle}
                onClick={() => setTestimonialIdx(idx => (idx + 1) % testimonials.length)}
                disabled={testimonials.length <= 1}
              >&gt;</button>
            </div>
            {testimonials.length > 1 && (
              <div style={{ marginTop: 8 }}>
                {testimonials.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      width: 10, height: 10, borderRadius: '50%',
                      background: i === testimonialIdx ? theme.primary : '#bbb',
                      margin: '0 4px', cursor: 'pointer'
                    }}
                    onClick={() => setTestimonialIdx(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    tabIndex={0}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: theme.text, padding: '30px 0' }}>No testimonials available at the moment.</div>
        )}
      </section>

      {/* NEWSLETTER SIGNUP SECTION */}
      <section style={{
        ...newsletterSectionStyle,
        background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
        boxShadow: darkMode ? '0 4px 18px rgba(0,0,0,0.2)' : '0 4px 18px rgba(0,0,0,0.08)'
      }}>
        <h4 style={{ marginBottom: 6 }}>Stay Updated!</h4>
        <form onSubmit={handleNewsletter} style={newsletterFormStyle} autoComplete="off">
          <input
            type="email"
            placeholder="Your email address"
            value={newsletterEmail}
            onChange={e => setNewsletterEmail(e.target.value)}
            style={{ ...newsletterInputStyle, background: theme.card, color: theme.text, border: `1px solid ${darkMode ? '#555' : '#bbb'}` }}
            aria-label="Email address"
            required
            disabled={isSubscribing}
          />
          <button
            type="submit"
            style={{
              ...newsletterBtnStyle,
              background: theme.primary,
              color: '#fff',
            }}
            disabled={isSubscribing}
          >
            {isSubscribing ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        <div style={{
          minHeight: 22,
          color: newsletterMsg.includes('Thank') ? theme.primary : '#e63946',
          fontWeight: 'bold'
        }}>{newsletterMsg}</div>
      </section>

      {/* FOOTER SECTION */}
      <footer style={{ ...footerStyle, color: theme.text }}>
        <div style={footerSocialStyle}>
          {socials.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              style={{
                color: theme.primary,
                margin: '0 10px',
                fontSize: 22,
                transition: 'color 0.2s'
              }}
            >{s.icon}</a>
          ))}
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '0.98rem', color: darkMode ? '#aaa' : '#888' }}>
          🚀 Empowering 10,000+ healthcare professionals | 🌐 MedSkillX © 2025
        </p>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          style={{
            ...scrollTopButtonStyle,
            background: theme.primary,
            color: '#fff',
            boxShadow: theme.cardShadowHover
          }}
        >
          <FaArrowUp />
        </button>
      )}

      {/* Global CSS Keyframe Animations (keep them here or in a global CSS file) */}
      <style>
        {`
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(-40px) scale(0.98);}
          to { opacity: 1; transform: translateY(0) scale(1);}
        }
        @keyframes cardPop {
          from { opacity: 0; transform: scale(0.97);}
          to { opacity: 1; transform: none;}
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        `}
      </style>
    </div>
  );
};

export default Home;


// --- Component Definitions (These were previously inside Home.js, now external or locally defined if not reusable) ---

// You need to define all the styles and sub-components used in Home.js that are no longer
// defined within Home.js itself. This includes:
// lightTheme, darkTheme, containerStyle, heroImage, heroSectionStyle, heroContentStyle, heroTitle,
// heroSubtitle, heroDesc, heroCTA, heroBgShape, cardGridStyle, impactMetricsSectionStyle,
// impactMetricsGridStyle, whyChooseUsSectionStyle, whyChooseUsGridStyle, testimonialSectionStyle,
// carouselOuterStyle, carouselNavStyle, testimonialCardStyle, newsletterSectionStyle,
// newsletterFormStyle, newsletterInputStyle, newsletterBtnStyle, footerStyle, footerSocialStyle,
// scrollTopButtonStyle, socials (array), FeatureCard, MetricDisplay, WhyChooseUsCard.

// For brevity, I'm not including all those styles/component definitions here,
// but ensure they are either in the same file (if only used by Home) or
// moved to shared utility/style files.

// Example: Theme definitions (can be in src/theme.js or similar)
const lightTheme = {
  primary: '#1a73e8', // A nice blue
  text: '#333',
  bg: '#f0f2f5',
  card: '#fff',
  cardShadow: '0 4px 12px rgba(0,0,0,0.08)',
  cardShadowHover: '0 8px 24px rgba(0,0,0,0.12)',
  heroBg: 'linear-gradient(135deg, #e0f2f7, #c1e4f4)',
  cardGradients: [
    'linear-gradient(45deg, #a1c4fd, #c2e9fb)',
    'linear-gradient(45deg, #fbc2eb, #a6c1ee)',
    'linear-gradient(45deg, #84fab0, #8fd3f4)',
  ],
};

const darkTheme = {
  primary: '#42a5f5', // Lighter blue for dark mode
  text: '#f0f0f0',
  bg: '#1a1a1a',
  card: '#2c2c2c',
  cardShadow: '0 4px 12px rgba(0,0,0,0.3)',
  cardShadowHover: '0 8px 24px rgba(0,0,0,0.4)',
  heroBg: 'linear-gradient(135deg, #2c3e50, #34495e)',
  cardGradients: [
    'linear-gradient(45deg, #4b6cb7, #182848)',
    'linear-gradient(45deg, #ee9ca7, #ffdde1)',
    'linear-gradient(45deg, #c2e59c, #64b3f4)',
  ],
};

const containerStyle = {
    fontFamily: "'Inter', sans-serif",
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'background 0.3s, color 0.3s',
};

const heroImage = '/path/to/your/hero-image.jpg'; // **IMPORTANT: Update this path to your actual image**

const heroSectionStyle = {
    width: '100%',
    padding: '80px 20px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '550px',
    zIndex: 1,
};

const heroBgShape = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at top left, rgba(255,255,255,0.7) 0%, transparent 50%), radial-gradient(circle at bottom right, rgba(255,255,255,0.7) 0%, transparent 50%)',
    pointerEvents: 'none',
    transition: 'opacity 0.3s',
};

const heroContentStyle = {
    maxWidth: '800px',
    zIndex: 2,
    animation: 'heroFadeIn 0.8s ease-out forwards',
};

const heroTitle = {
    fontSize: '4.5rem',
    fontWeight: 800,
    marginBottom: '20px',
    lineHeight: 1.1,
    textShadow: '0 4px 15px rgba(0,0,0,0.2)',
};

const heroSubtitle = {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: '25px',
    letterSpacing: '-0.5px',
};

const heroDesc = {
    fontSize: '1.2rem',
    lineHeight: 1.8,
    maxWidth: '600px',
    margin: '0 auto 30px',
};

const heroCTA = {
    display: 'inline-block',
    padding: '16px 32px',
    borderRadius: '50px',
    textDecoration: 'none',
    fontSize: '1.25rem',
    fontWeight: 700,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
};

const cardGridStyle = {
    display: 'grid',
    gap: '30px',
    padding: '60px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
};

const impactMetricsSectionStyle = {
    width: '100%',
    padding: '80px 20px',
    textAlign: 'center',
    backgroundColor: 'inherit',
};

const impactMetricsGridStyle = {
    display: 'grid',
    gap: '30px',
    justifyContent: 'center',
    maxWidth: '1000px',
    margin: '0 auto',
};

const whyChooseUsSectionStyle = {
    width: '100%',
    padding: '80px 20px',
    textAlign: 'center',
    backgroundColor: 'inherit',
};

const whyChooseUsGridStyle = {
    display: 'grid',
    gap: '30px',
    justifyContent: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
};

const testimonialSectionStyle = {
    width: '100%',
    padding: '80px 20px',
    textAlign: 'center',
    backgroundColor: 'inherit',
};

const carouselOuterStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    margin: '40px auto 20px',
};

const carouselNavStyle = {
    background: 'none',
    border: '1px solid #ccc',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#888',
    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
};

const testimonialCardStyle = {
    padding: '30px',
    borderRadius: '15px',
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'auto', // Adjust height as needed
    minHeight: '200px', // Min height for consistent card size
    boxSizing: 'border-box', // Include padding in width/height
    transition: 'background 0.3s, color 0.3s',
};

const newsletterSectionStyle = {
    width: '100%',
    padding: '60px 20px',
    textAlign: 'center',
    marginTop: '60px',
    borderRadius: '15px',
    maxWidth: '800px',
    margin: '60px auto',
    boxSizing: 'border-box',
};

const newsletterFormStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    flexWrap: 'wrap',
    marginTop: '20px',
};

const newsletterInputStyle = {
    flexGrow: 1,
    maxWidth: '350px',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '1.05rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

const newsletterBtnStyle = {
    padding: '14px 25px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.05rem',
    fontWeight: 600,
    transition: 'background 0.3s, transform 0.2s',
};

const footerStyle = {
    width: '100%',
    padding: '40px 20px',
    textAlign: 'center',
    borderTop: '1px solid #eee',
    marginTop: 'auto',
    backgroundColor: 'inherit',
};

const footerSocialStyle = {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
};

const scrollTopButtonStyle = {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.5rem',
    cursor: 'pointer',
    transition: 'transform 0.3s, box-shadow 0.3s, background 0.3s, color 0.3s',
    zIndex: 999,
};

const socials = [
    { icon: <FaLinkedin />, label: 'LinkedIn', url: 'https://linkedin.com/company/medskillx' },
    { icon: <FaTwitter />, label: 'Twitter', url: 'https://twitter.com/medskillx' },
    { icon: <FaEnvelope />, label: 'Email', url: 'mailto:info@medskillx.com' },
];


// FeatureCard Component
function FeatureCard({ title, description, link, buttonText, gradient, theme }) {
  return (
    <div style={{
      ...featureCardStyle,
      background: gradient,
      boxShadow: theme.cardShadow,
      transition: 'transform 0.3s, box-shadow 0.3s',
    }}>
      <h4 style={{ color: '#fff', marginBottom: '10px' }}>{title}</h4>
      <p style={{ color: '#eee', fontSize: '0.95rem', lineHeight: 1.5 }}>{description}</p>
      <Link to={link} style={{
        ...featureCardBtnStyle,
        background: 'rgba(255,255,255,0.2)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.4)',
      }}>
        {buttonText}
      </Link>
    </div>
  );
}
const featureCardStyle = {
    padding: '30px',
    borderRadius: '15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'center',
    minHeight: '220px',
    boxSizing: 'border-box',
};
const featureCardBtnStyle = {
    marginTop: 'auto', // Push to bottom
    padding: '10px 20px',
    borderRadius: '25px',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 600,
    transition: 'background 0.2s, transform 0.2s',
};

// MetricDisplay Component
function MetricDisplay({ label, value, icon, unit, theme, animate }) {
  const [currentValue, setCurrentValue] = useState(0);
  const ref = useRef(null); // Local ref for each metric

  useEffect(() => {
    if (animate) {
      const start = 0;
      const end = value;
      let startTime = null;
      const duration = 1500; // milliseconds

      const animateValue = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCurrentValue(Math.floor(progress * (end - start) + start));
        if (progress < 1) {
          requestAnimationFrame(animateValue);
        } else {
          setCurrentValue(value); // Ensure final value is exact
        }
      };
      requestAnimationFrame(animateValue);
    }
  }, [animate, value]);

  const IconComponent = ({ iconName }) => {
    switch (iconName) {
     // case 'FaUsers': return <FaUserCircle />;
      case 'FaGraduationCap': return <FaGraduationCap />;
      case 'FaAward': return <FaAward />;
      default: return null;
    }
  };

  return (
    <div ref={ref} style={{
      ...metricDisplayCardStyle,
      background: theme.card,
      boxShadow: theme.cardShadow,
      color: theme.text,
      opacity: animate ? 1 : 0,
      transform: animate ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
    }}>
      <div style={{ fontSize: '2.5rem', color: theme.primary, marginBottom: '10px' }}>
        <IconComponent iconName={icon} />
      </div>
      <div style={{ fontSize: '2.8rem', fontWeight: 800, color: theme.primary, lineHeight: 1 }}>
        {currentValue}{unit}
      </div>
      <p style={{ fontSize: '1.1rem', marginTop: '10px', color: theme.text }}>{label}</p>
    </div>
  );
}
const metricDisplayCardStyle = {
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '180px',
    boxSizing: 'border-box',
};

// WhyChooseUsCard Component
function WhyChooseUsCard({ icon, title, description, theme, animate, delay }) {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) { observer.observe(ref.current); }
    return () => { if (ref.current) { observer.unobserve(ref.current); } };
  }, [animate]); // Rerun observer when animate prop changes

  const cardAnimation = {
    opacity: inView ? 1 : 0,
    transform: inView ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
    transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
  };

  return (
    <div ref={ref} style={{
      ...whyChooseUsCardStyle,
      background: theme.card,
      boxShadow: theme.cardShadow,
      color: theme.text,
      ...cardAnimation,
    }}>
      <div style={{ fontSize: '3rem', color: theme.primary, marginBottom: '15px' }}>{icon}</div>
      <h4 style={{ marginBottom: '10px', fontSize: '1.4rem' }}>{title}</h4>
      <p style={{ fontSize: '1rem', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}
const whyChooseUsCardStyle = {
    padding: '30px',
    borderRadius: '15px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '250px',
    boxSizing: 'border-box',
};