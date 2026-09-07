'use client';
import { Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="topbar">
      {/* Nav arrows */}
      <div className="topbar-nav">
        <button className="topbar-nav-btn" disabled title="Back">
          <ChevronLeft size={15} />
        </button>
        <button className="topbar-nav-btn" disabled title="Forward">
          <ChevronRight size={15} />
        </button>
        <button className="topbar-nav-btn" title="Refresh">
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Search */}
      <div className="topbar-search">
        <div className="topbar-search-inner">
          <Search size={13} color="#999" />
          <input
            id="topbar-search-input"
            type="text"
            placeholder="Search Ctrl+K"
            readOnly
          />
        </div>
      </div>

      {/* Right side */}
      <div className="topbar-right">
        <button className="topbar-upgrade-btn" id="topbar-upgrade-btn">
          Upgrade
        </button>
        <div className="topbar-avatar" title="test one">
          t
          <span className="topbar-avatar-dot" />
        </div>
      </div>
    </header>
  );
}
