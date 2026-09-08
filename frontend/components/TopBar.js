'use client';
import { Search, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useProfile } from '@/lib/useProfile';

export default function TopBar() {
  const { name, setShowSetup } = useProfile();

  const displayName = name || 'User';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toLowerCase();

  return (
    <header className="topbar">
      {/* Centered Cluster: Nav buttons + Search bar */}
      <div className="topbar-center-group">
        <div className="topbar-nav">
          <button className="topbar-nav-btn" disabled title="Back">
            <ChevronLeft size={16} />
          </button>
          <button className="topbar-nav-btn" disabled title="Forward">
            <ChevronRight size={16} />
          </button>
          <button className="topbar-nav-btn" title="History">
            <Clock size={14} />
          </button>
        </div>

        <div className="topbar-search-inner">
          <Search size={14} color="#6B7280" style={{ flexShrink: 0 }} />
          <input
            id="topbar-search-input"
            type="text"
            placeholder="Search Ctrl+K"
            readOnly
          />
        </div>
      </div>

      {/* Right side: Avatar */}
      <div className="topbar-right">
        {/* Avatar — click to edit name */}
        <div
          className="topbar-avatar"
          title={`${displayName} — Click to edit profile`}
          onClick={() => setShowSetup(true)}
          style={{ cursor: 'pointer' }}
          id="topbar-avatar"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

