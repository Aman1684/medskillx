import React from 'react';
import { useParams } from 'react-router-dom';

const courseDetails = {
  1: {
    title: "Basic First Aid",
    content: "This course covers CPR, bleeding control, fractures, and shock handling.",
  },
  2: {
    title: "Patient Hygiene & Care",
    content: "This course covers patient bathing, oral care, bed making, and infection control.",
  },
  3: {
    title: "Vital Signs Monitoring",
    content: "This course covers temperature, pulse, respiration, and BP measurement.",
  },
};

const CourseDetail = () => {
  const { id } = useParams();
  const course = courseDetails[id];

  if (!course) return <h3>Course not found.</h3>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>{course.title}</h2>
      <p>{course.content}</p>
      <button>✅ Enroll / Start Course</button>
    </div>
  );
};

export default CourseDetail;
