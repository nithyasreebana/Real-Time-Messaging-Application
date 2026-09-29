import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onOpenProfile }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span>💬</span> RealTime<span>Chat</span>
      </div>

      <div className="nav-user">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          onClick={onOpenProfile}
          title="Edit Profile"
        >
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
            alt={user?.username}
            className="nav-avatar"
          />
          <span className="nav-username">{user?.username}</span>
        </div>

        <button className="btn btn-outline btn-sm" onClick={onOpenProfile}>
          Profile
        </button>

        <button className="btn btn-danger btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
