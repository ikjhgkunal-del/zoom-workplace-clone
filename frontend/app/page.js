'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import HomeActionButtons from '@/components/HomeActionButtons';
import UpcomingMeetings from '@/components/UpcomingMeetings';
import { Info } from 'lucide-react';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="clock-section">
      <div className="clock-time">{time}</div>
      <div className="clock-date">{date}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="right-section">
        <TopBar />

        <main className="main-content">
          <div className="dashboard">
            {/* Clock */}
            <LiveClock />

            {/* 3 Action Buttons — circles */}
            <HomeActionButtons />

            {/* Calendar connect banner */}
            <div className="calendar-banner">
              <Info size={16} color="#0E71EB" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                You haven&apos;t connected your calendar yet.{' '}
                <a href="#">Connect now</a> to manage all your meetings and events in one place.
              </span>
            </div>

            {/* Meetings section */}
            <UpcomingMeetings />
          </div>
        </main>
      </div>
    </div>
  );
}
