'use client';
import { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

export default function ProfileSetupModal({ onSave }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter your name'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    onSave(trimmed);
  };

  return (
    <div className="profile-modal-backdrop">
      <div className="profile-modal">
        {/* Zoom-style header */}
        <div className="profile-modal-header">
          <div className="profile-modal-logo">
            <span className="sidebar-logo-text">zoom</span>
            <span className="sidebar-logo-workplace">Workplace</span>
          </div>
        </div>

        <div className="profile-modal-body">
          {/* Avatar placeholder */}
          <div className="profile-modal-avatar">
            <User size={32} color="#6B7280" />
          </div>

          <h2 className="profile-modal-title">Welcome! What's your name?</h2>
          <p className="profile-modal-subtitle">
            This is how you'll appear in meetings and chats.
          </p>

          <form onSubmit={handleSubmit} className="profile-modal-form">
            <input
              id="profile-name-input"
              className="profile-modal-input"
              type="text"
              placeholder="Enter your display name"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              autoFocus
              maxLength={50}
            />
            {error && <div className="profile-modal-error">{error}</div>}
            <button
              id="profile-save-btn"
              type="submit"
              className="profile-modal-btn"
            >
              Get Started
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
