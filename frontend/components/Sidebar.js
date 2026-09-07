'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Video, MessageSquare, MoreHorizontal,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',     icon: Home,          label: 'Home',      href: '/' },
  { id: 'meetings', icon: Video,         label: 'Meetings',  href: '/meetings' },
  { id: 'chat',     icon: MessageSquare, label: 'Chat',      href: '/chat' },
  { id: 'more',     icon: MoreHorizontal,label: 'More',      href: '#' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">zoom</span>
        <span className="sidebar-logo-workplace">Workplace</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, icon: Icon, label, href }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href) && href !== '#';
          return (
            <Link
              key={id}
              href={href === '#' ? '/' : href}
              id={`sidebar-${id}`}
              className={`sidebar-item${isActive ? ' active' : ''}`}
            >
              <Icon size={19} strokeWidth={isActive ? 2 : 1.75} />
              <span className="sidebar-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <Link href="/settings" className="sidebar-item" id="sidebar-settings" title="Settings">
          <Settings size={20} strokeWidth={1.75} />
        </Link>
      </div>
    </aside>
  );
}
