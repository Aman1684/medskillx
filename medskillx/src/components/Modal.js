// src/components/Modal.js
import React, { useEffect, useRef } from 'react';
import './Modal.css'; // Import the new CSS file

const Modal = ({ isOpen, onClose, children, title }) => {
    const modalRef = useRef(null);

    // Close modal if clicking outside content
    const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
            onClose();
        }
    };

    // Add event listeners when modal is open
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden'; // Prevent scrolling on body when modal is open
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset'; // Restore scrolling
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'open' : ''}`}>
            <div className="modal-content" ref={modalRef}>
                <button className="modal-close-button" onClick={onClose}>
                    &times; {/* HTML entity for multiplication sign, often used for close */}
                </button>
                {title && <h2 className="modal-title">{title}</h2>} {/* Optional modal title */}
                {children}
            </div>
        </div>
    );
};

export default Modal;