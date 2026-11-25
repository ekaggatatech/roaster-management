import { useState } from "react";

import EmployeeManagement from "./components/EmployeeManagement";
import ShiftManagement from "./components/ShiftManagement";
import DailyRoster from "./components/DailyRoster";
import WeeklyRoster from "./components/WeeklyRoster";
import MonthlyRoster from "./components/MonthlyRoster";
import ShiftSwapManagement from "./components/ShiftSwapManagement";
import EmployeeAvailability from "./components/EmployeeAvailability";
import ShiftRequirementManagement from "./components/ShiftRequirementManagement";

import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("employees");

  const menuItems = [
    { id: "employees", label: "Employee Management", icon: "👥" },
    { id: "shifts", label: "Shift Management", icon: "🕒" },
    { id: "roster", label: "Daily Roster", icon: "📅" },
    { id: "weekly", label: "Weekly Roster", icon: "📆" },
    { id: "monthly", label: "Monthly Roster", icon: "🗓️" },
    { id: "swaps", label: "Shift Swap Management", icon: "🔄" },
    { id: "availability", label: "Employee Availability", icon: "✅" },
    { id: "requirements", label: "Shift Requirements", icon: "📋" },
  ];

  const renderActivePage = () => {
    switch (activePage) {
      case "employees":
        return <EmployeeManagement />;
      case "shifts":
        return <ShiftManagement />;
      case "roster":
        return <DailyRoster />;
      case "weekly":
        return <WeeklyRoster />;
      case "monthly":
        return <MonthlyRoster />;
      case "swaps":
        return <ShiftSwapManagement />;
      case "availability":
        return <EmployeeAvailability />;
      case "requirements":
        return <ShiftRequirementManagement />;
      default:
        return <EmployeeManagement />;
    }
  };

  const activeMenu = menuItems.find((item) => item.id === activePage);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">H</div>
          <h2>HourMaker</h2>
        </div>

        <p className="menu-heading">MAIN MENU</p>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-button ${activePage === item.id ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>HourMaker</p>
          <span>Roster Management System</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div>
            <h1>{activeMenu?.label}</h1>
            <p>Welcome to HourMaker Roster Management System</p>
          </div>

          <div className="header-profile">
            <span className="profile-icon">👤</span>
            <span>Manager</span>
          </div>
        </header>

        <section className="content-area">{renderActivePage()}</section>
      </main>
    </div>
  );
}

export default App;
