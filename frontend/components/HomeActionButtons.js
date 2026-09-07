'use client';
import { useRouter } from 'next/navigation';
import { Video, Plus, Calendar, Monitor, FileText, ChevronDown } from 'lucide-react';
import { createInstantMeeting } from '@/lib/api';
import { useState } from 'react';

const ACTIONS = [
  {
    id: 'new-meeting',
    icon: Video,
    label: 'New Meeting',
    iconClass: 'orange',
    hasChevron: true,
  },
  {
    id: 'join',
    icon: Plus,
    label: 'Join',
    iconClass: 'blue',
    href: '/join',
  },
  {
    id: 'schedule',
    icon: Calendar,
    label: 'Schedule',
    iconClass: 'blue-schedule',
    href: '/schedule',
  },
  {
    id: 'share-screen',
    icon: Monitor,
    label: 'Share Screen',
    iconClass: 'blue-share',
    href: '#',
  },
  {
    id: 'my-notes',
    icon: FileText,
    label: 'My Notes',
    iconClass: 'blue-notes',
    href: '#',
  },
];

export default function HomeActionButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNewMeeting = async () => {
    setLoading(true);
    try {
      const meeting = await createInstantMeeting('test one');
      router.push(`/meeting/${meeting.meeting_id}`);
    } catch (e) {
      alert('Could not create meeting. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action.id === 'new-meeting') return handleNewMeeting();
    if (action.href && action.href !== '#') router.push(action.href);
  };

  return (
    <div className="action-buttons">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            id={`action-btn-${action.id}`}
            className="action-btn"
            onClick={() => handleAction(action)}
            disabled={loading && action.id === 'new-meeting'}
            title={action.label}
          >
            <div className={`action-btn-icon ${action.iconClass}`}>
              <Icon size={24} color="white" strokeWidth={2} />
            </div>
            <span className="action-btn-label">
              {loading && action.id === 'new-meeting' ? 'Starting…' : action.label}
              {action.hasChevron && !loading && (
                <ChevronDown size={10} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
