import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import { logout, getRole, getUserName, isAuthenticated } from "../services/auth";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Use state to track role and name (as finalized for robustness)
  const [userRole, setUserRole] = useState(getRole());
  const [currentUserName, setCurrentUserName] = useState(getUserName());
  
  const navigate = useNavigate();

  // Use the state variables for rendering
  const role = userRole; 

  // Re-read data periodically to catch asynchronous login/logout events
  useEffect(() => {
    // Initial sync check
    const storedRole = getRole();
    const storedName = getUserName();
    
    if (storedRole !== userRole || storedName !== currentUserName) {
        setUserRole(storedRole);
        setCurrentUserName(storedName);
    }
    
    // Set up an interval to regularly check auth status (resolves race condition)
    const intervalId = setInterval(() => {
        const newRole = getRole();
        const newName = getUserName();
        
        if (newRole !== userRole || newName !== currentUserName) {
            setUserRole(newRole);
            setCurrentUserName(newName);
        }
    }, 1000); 

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [userRole, currentUserName]);
  
  // Logic to determine the display name
  const greetingName = (role) => {
    if (!role) {
      return "Guest"; 
    }
    
    if (role.toLowerCase() === 'admin') {
        return "Admin"; 
    }
    
    // Use the retrieved name, or capitalize the role as a fallback
    return currentUserName || role.charAt(0).toUpperCase() + role.slice(1);
  };
  
  const getRoleAbbreviation = (role) => {
    // If role is undefined/null, return '?'
    return role ? role[0].toUpperCase() : '?'; 
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false); // Close menu on logout
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h2 className="navbar-logo" onClick={() => navigate("/dashboard")}>
          BuildTrack
        </h2>
      </div>

      {/* Hamburger for mobile */}
      <div
        className={`hamburger ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Navigation Links */}
      <nav className={`navbar-links ${menuOpen ? "show" : ""}`}>
        <NavLink to="/dashboard" className="nav-item" onClick={() => setMenuOpen(false)}>
          Dashboard
        </NavLink>
        <NavLink to="/sites-tasks" className="nav-item" onClick={() => setMenuOpen(false)}>
          Sites & Tasks
        </NavLink>
        <NavLink to="/labor-management" className="nav-item" onClick={() => setMenuOpen(false)}>
          Labor
        </NavLink>
        <NavLink to="/inventory" className="nav-item" onClick={() => setMenuOpen(false)}>
          Inventory
        </NavLink>
        <NavLink to="/communication" className="nav-item" onClick={() => setMenuOpen(false)}>
          Communication
        </NavLink>
        <NavLink to="/reports" className="nav-item" onClick={() => setMenuOpen(false)}>
          Reports
        </NavLink>

        {/* Mobile Logout Button (Visible only in collapsed menu on mobile) */}
        {isAuthenticated() && (
            <button 
                className="logout-btn mobile-only" 
                onClick={handleLogout}
            >
                Logout ({greetingName(role)})
            </button>
        )}
        
      </nav>

      <div className="navbar-right">
        
        {/* User Profile and Greeting Container */}
        <div className="user-profile">
            <div className="profile-icon"> 
                {getRoleAbbreviation(role)}
            </div>
            
            <div className="profile-text">
                <span className="user-greeting">Hello, {greetingName(role)}!</span>
                <span className="role-text">{role?.toUpperCase() || 'GUEST'}</span>
            </div>
        </div>
        
        {/* Desktop Logout Button */}
        <button className="logout-btn desktop-only" onClick={handleLogout}>
          Logout 
        </button>
      </div>
    </header>
  );
}

export default Navbar;