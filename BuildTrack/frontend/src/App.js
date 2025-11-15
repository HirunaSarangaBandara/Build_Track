import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SitesTasks from "./pages/SitesTasks";
import LaborManagement from "./pages/LaborManagement";
import Inventory from "./pages/Inventory";
import Communication from "./pages/Communication";
import Reports from "./pages/Reports";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route (no Navbar) */}
        <Route path="/" element={<Login />} />

        {/* Protected routes with Navbar */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sites-tasks" element={<SitesTasks />} />
          <Route path="/labor-management" element={<LaborManagement />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/communication" element={<Communication />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;