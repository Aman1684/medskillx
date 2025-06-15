// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode'; // Make sure you have this installed: npm install jwt-decode

// Define your backend API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// --- AUTH CONTEXT ---
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // ===============================================
    // Define core utility functions FIRST
    // ===============================================

    // Logout function clears state and local storage
    const logout = useCallback(() => {
        setIsLoggedIn(false);
        setLoggedInUser(null);
        setAuthToken(null);
        localStorage.removeItem('medskillx_user');
        localStorage.removeItem('medskillx_token');
        localStorage.removeItem('medskillx_userId');
        console.log('AuthContext: User logged out.');
    }, []);

    // Internal login function to update context state and local storage
    const handleLogin = useCallback((user, token) => {
        setIsLoggedIn(true);
        setLoggedInUser(user);
        setAuthToken(token);
        localStorage.setItem('medskillx_user', JSON.stringify(user));
        localStorage.setItem('medskillx_token', token);
        localStorage.setItem('medskillx_userId', user.id);
        console.log('AuthContext: User logged in locally.');
    }, []);

    // Function to fetch the most current user data from backend
    // This is crucial for keeping loggedInUser state synchronized.
    const fetchCurrentUser = useCallback(async (userId, token) => {
        if (!userId || !token) {
            console.log("AuthContext: No userId or token, cannot fetch current user.");
            setLoggedInUser(null);
            setIsLoggedIn(false);
            return null; // Return null if fetch fails or cannot proceed
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.warn("AuthContext: Token invalid or expired during fetchCurrentUser. Logging out.");
                    logout();
                    return null;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch current user data.');
            }
            const userData = await response.json();
            setLoggedInUser(userData.user); // Assuming backend returns { success: true, user: userData }
            setIsLoggedIn(true);
            console.log('AuthContext: User data refreshed from backend:', userData.user);
            // Update localStorage with fresh user data too
            localStorage.setItem('medskillx_user', JSON.stringify(userData.user));
            return userData.user;
        } catch (error) {
            console.error('AuthContext: Failed to fetch current user data:', error);
            logout();
            return null;
        }
    }, [logout]);

    // Check for stored login on component mount
    useEffect(() => {
        const initAuth = async () => {
            setAuthLoading(true);
            const storedToken = localStorage.getItem('medskillx_token');
            const storedUserId = localStorage.getItem('medskillx_userId');

            if (storedToken && storedUserId) {
                try {
                    const decodedToken = jwtDecode(storedToken);
                    if (decodedToken.exp * 1000 < Date.now()) {
                        console.warn('AuthContext: Stored token expired. Logging out.');
                        logout();
                    } else {
                        setAuthToken(storedToken);
                        // Fetch the full user data from the backend to ensure it's up-to-date
                        await fetchCurrentUser(storedUserId, storedToken);
                    }
                } catch (error) {
                    console.error('AuthContext: Error decoding or using stored token:', error);
                    logout();
                }
            }
            setAuthLoading(false);
        };

        initAuth();
    }, [fetchCurrentUser, logout]); // Dependencies on fetchCurrentUser and logout

    // Exposed login function (calls API, then updates context state)
    const loginUser = useCallback(async (username, password) => {
        console.log("Frontend: Attempting login for username:", username);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            console.log("Frontend: Raw response object:", response);
            console.log("Frontend: Response status:", response.status);
            console.log("Frontend: Response OK status (response.ok):", response.ok);

            const data = await response.json(); // Parse the JSON body
            console.log("Frontend: Parsed response data:", data);

            // Check if the response was successful (HTTP 200-299) AND the 'success' flag is true
            if (response.ok && data.success) { // Important: check response.ok and data.success
                if (data.user && data.token) {
                    handleLogin(data.user, data.token); // Call handleLogin with the actual data
                    // Immediately fetch full user data after login to get all current fields (e.g., attemptsLeft)
                    // This is redundant if handleLogin already sets user data, but good for refresh
                    await fetchCurrentUser(data.user.id, data.token);
                    console.log("Frontend: Login successful, AuthContext state updated.");
                } else {
                    console.error("Frontend: Login successful, but user or token missing from response data.");
                    throw new Error('Login successful, but user or token data is incomplete.');
                }
            } else {
                console.error("Frontend: Login failed from API response. Message:", data.message || "Unknown error.");
                throw new Error(data.message || 'Login failed due to server response.');
            }
            return data; // Return the full data object
        } catch (error) {
            console.error("Frontend: Error during login API call:", error);
            // Re-throw the error so calling components can catch it
            throw error;
        }
    }, [handleLogin, fetchCurrentUser]);

    // Exposed register function (calls API, then updates context state)
    // Added 'role' parameter to allow registration of different user types
    const registerUser = useCallback(async (username, email, password, role = 'jobSeeker') => { // Default to 'jobSeeker'
        console.log("Frontend: Attempting registration for username:", username, "with role:", role);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role }), // Pass the role to the backend
            });
            const data = await response.json(); // Parse the JSON body

            if (response.ok && data.success) {
                console.log("Frontend: Registration successful. Message:", data.message);
            } else {
                console.error("Frontend: Registration failed. Message:", data.message || "Unknown error.");
                throw new Error(data.message || 'Registration failed due to server response.');
            }
            return data;
        } catch (error) {
            console.error("Frontend: Error during registration API call:", error);
            throw error;
        }
    }, []);

    // Generic function to update any top-level user fields (e.g., attemptsLeft, hasAccessedAssessXBefore)
    const updateUserData = useCallback(async (updates) => {
        if (!loggedInUser || !authToken) {
            console.warn("AuthContext: User not logged in or token missing. Cannot update user data.");
            return { success: false, message: 'Authentication required.' };
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${loggedInUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update user data on backend.');
            }
            const updatedUser = await response.json(); // Backend should return the updated user object
            setLoggedInUser(updatedUser.user); // Update the central state with the fresh user data
            // Also update localStorage to reflect the change
            localStorage.setItem('medskillx_user', JSON.stringify(updatedUser.user));
            console.log("AuthContext: User data (general) updated:", updatedUser.user);
            return { success: true, user: updatedUser.user };
        } catch (err) {
            console.error("AuthContext: Error updating user data via AuthContext:", err);
            return { success: false, message: `Failed to save progress: ${err.message}` };
        }
    }, [loggedInUser, authToken]);


    // Function to specifically add a new AssessX score attempt
    const updateAssessXScores = useCallback(async (scoreDetails) => {
        console.log("AuthContext: updateAssessXScores received:", scoreDetails);

        if (!loggedInUser || !authToken) {
            console.warn("AuthContext: User not logged in or token missing. Cannot update AssessX scores.");
            return { success: false, message: 'Authentication required.' };
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${loggedInUser.id}/assessx-scores`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(scoreDetails)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update AssessX scores on backend.');
            }
            const updatedUser = await response.json(); // Backend should return the updated user object
            setLoggedInUser(updatedUser.user); // Update the central state with the fresh user data
            // Also update localStorage to reflect the change
            localStorage.setItem('medskillx_user', JSON.stringify(updatedUser.user));
            console.log("AuthContext: AssessX scores updated:", updatedUser.user.assessxScores);
            return { success: true, user: updatedUser.user };
        } catch (err) {
            console.error("AuthContext: Error updating AssessX scores via AuthContext:", err);
            return { success: false, message: `Failed to save scores: ${err.message}` };
        }
    }, [loggedInUser, authToken]);

    // New Feature: Promote User to Recruiter
    // This function calls the backend endpoint to change a user's role to 'recruiter'
    // and updates the `loggedInUser` state accordingly.
    const promoteToRecruiter = useCallback(async () => {
        if (!authToken || !loggedInUser || !loggedInUser.id) {
            console.error('AuthContext: Cannot promote to recruiter - user not logged in or ID missing.');
            return { success: false, message: 'User not authenticated.' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/${loggedInUser.id}/promote-to-recruiter`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` // Send the current auth token
                }
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('AuthContext: Failed to promote to recruiter:', data.message || 'Unknown error');
                return { success: false, message: data.message || 'Failed to become a recruiter.' };
            }

            console.log('AuthContext: User successfully promoted to recruiter:', data.user);

            // CRITICAL CHANGE: Check if the backend returned a new token and update it
            if (data.token) {
                console.log('AuthContext: Received new token after promotion. Updating AuthToken and localStorage.');
                handleLogin(data.user, data.token); // This will update loggedInUser, authToken, and localStorage
            } else {
                // If backend did NOT return a new token, only update the user object
                setLoggedInUser(data.user); // Update local state with the new user object
                localStorage.setItem('medskillx_user', JSON.stringify(data.user)); // Also update localStorage
                console.warn('AuthContext: Backend did not return a new token after promotion. Token might be stale for subsequent requests.');
                console.warn('Consider logging out and logging back in if issues persist for permission-gated actions.');
            }

            return { success: true, message: data.message || 'You are now a recruiter!', user: data.user };

        } catch (error) {
            console.error('AuthContext: Error promoting to recruiter:', error);
            return { success: false, message: `Network error: ${error.message}` };
        }
    }, [authToken, loggedInUser, handleLogin]); // Added handleLogin to dependencies


    return (
        <AuthContext.Provider value={{
            isLoggedIn,
            loggedInUser,
            authToken,
            authLoading,
            login: loginUser,
            logout,
            register: registerUser,
            fetchCurrentUser,
            updateUserData,
            updateAssessXScores,
            promoteToRecruiter // EXPOSE THE NEW FUNCTION HERE
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};