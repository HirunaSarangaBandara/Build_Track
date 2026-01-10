import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import { logout, getRole, getUserName, isAuthenticated } from "../services/auth";
import { useLanguage } from "../contexts/LanguageContext";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Use state to track role and name (as finalized for robustness)
  const [userRole, setUserRole] = useState(getRole());
  const [currentUserName, setCurrentUserName] = useState(getUserName());
  
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

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
          {t("navDashboard")}
        </NavLink>
        <NavLink to="/sites-tasks" className="nav-item" onClick={() => setMenuOpen(false)}>
          {t("navSitesTasks")}
        </NavLink>
        <NavLink to="/labor-management" className="nav-item" onClick={() => setMenuOpen(false)}>
          {t("navLabor")}
        </NavLink>
        <NavLink to="/inventory" className="nav-item" onClick={() => setMenuOpen(false)}>
          {t("navInventory")}
        </NavLink>
        <NavLink to="/communication" className="nav-item" onClick={() => setMenuOpen(false)}>
          {t("navCommunication")}
        </NavLink>
        <NavLink to="/reports" className="nav-item" onClick={() => setMenuOpen(false)}>
          {t("navReports")}
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            className="language-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language selector"
          >
            <option value="en">EN</option>
            <option value="ta">TA</option>
            <option value="si">SI</option>
          </select>
        </div>
        
        {/* User Profile and Greeting Container */}
        <div className="user-profile">
            <div className="profile-icon"> 
                {getRoleAbbreviation(role)}
            </div>
            
            <div className="profile-text">
              <span className="user-greeting">{t('hello')}, {greetingName(role)}!</span>
              <span className="role-text">{role?.toUpperCase() || t('guest').toUpperCase()}</span>
            </div>
        </div>
        
        {/* Desktop Logout Button */}
        <button className="logout-btn desktop-only" onClick={handleLogout}>
          {t('logout')}
        </button>
      </div>
    </header>
  );
}

export default Navbar;