'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import HomeActionButtons from '@/components/HomeActionButtons';
import UpcomingMeetings from '@/components/UpcomingMeetings';
import { Bell, Search, X } from 'lucide-react';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="clock-section">
      <div className="clock-time">{time}</div>
      <div className="clock-date">{date}</div>
    </div>
  );
}

export default function HomePage() {
  const [showGetStarted, setShowGetStarted] = useState(true);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <div className="dashboard">
          {/* Top search bar */}
          <div className="dashboard-topbar">
            <div style={{ width: 32 }} />
            <div className="dashboard-search">
              <Search size={14} color="#888" />
              <input placeholder="Search (Ctrl+E)" />
            </div>
            <div className="dashboard-topbar-right">
              <Bell size={18} />
            </div>
          </div>

          {/* Clock */}
          <LiveClock />

          {/* Action Buttons */}
          <HomeActionButtons />

          {/* Upcoming Meetings */}
          <UpcomingMeetings />
        </div>
      </main>

      {/* Get Started Card */}
      {showGetStarted && (
        <div className="get-started-card">
          <div className="get-started-header">
            <div className="get-started-title">
              <span>🚀</span>
              <span>Get started</span>
            </div>
            <button className="get-started-close" onClick={() => setShowGetStarted(false)}>
              <X size={16} />
            </button>
          </div>
          <p className="get-started-text">
            Kickstart your Zoom experience by completing your profile setup.
          </p>
          <div className="get-started-progress">
            <div className="progress-bar">
              <div className="progress-fill" />
            </div>
            <span className="progress-text">1/3</span>
          </div>
        </div>
      )}
    </div>
  );
}
