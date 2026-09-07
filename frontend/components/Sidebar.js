'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  MessageSquare,
  Grid3X3,
  MoreHorizontal,
  Settings,
  Plus,
  Video,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',     icon: Home,           label: 'Home',      href: '/' },
  { id: 'meetings', icon: Video,          label: 'Meetings',  href: '/meetings' },
  { id: 'chat',     icon: MessageSquare,  label: 'Chat',      href: '/chat' },
  { id: 'hub',      icon: Grid3X3,        label: 'Hub',       href: '/hub' },
  { id: 'more',     icon: MoreHorizontal, label: 'More',      href: '/more' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div>
          <span className="sidebar-logo-text">zoom</span>
          <span className="sidebar-logo-sub">Workplace</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, icon: Icon, label, href }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={id}
              href={href}
              className={`sidebar-item${isActive ? ' active' : ''}`}
            >
              <Icon size={20} />
              <span className="sidebar-label">{label}</span>
            </Link>
          );
        })}

        {/* New Button */}
        <div className="sidebar-new-btn">
          <Plus size={16} color="#aaa" />
          <span className="sidebar-new-chip">New</span>
        </div>
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <Link href="/settings" className="sidebar-item">
          <Settings size={20} />
          <span className="sidebar-label">Settings</span>
        </Link>
        <div className="sidebar-avatar" title="test one">T</div>
      </div>
    </aside>
  );
}
