'use client';
import { Search, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

export default function TopBar() {
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

      {/* Right side: Upgrade + Avatar */}
      <div className="topbar-right">
        <button className="topbar-upgrade-btn" id="topbar-upgrade-btn">
          Upgrade
        </button>
        <div className="topbar-avatar" title="test one">
          t
        </div>
      </div>
    </header>
  );
}
