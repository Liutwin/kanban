import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";
import "../styles/layout.css";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">KANBAN</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">▦</span>
            <span>Tableaux</span>
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">≡</span>
            <span>Journal</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.pseudo?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="user-details">
              <span className="user-pseudo">{user?.pseudo ?? "Utilisateur"}</span>
              <span className="user-mail">{user?.email ?? ""}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Déconnexion">
            ⏻
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="top-bar">
          <h1 className="page-title">{title ?? ""}</h1>
          <div className="top-bar-right">
            <span className="status-dot" />
            <span className="status-text">connecté</span>
          </div>
        </header>
        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}
