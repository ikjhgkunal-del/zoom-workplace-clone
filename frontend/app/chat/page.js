'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  ChevronDown, ChevronRight, Settings, Plus,
  AtSign, MessageSquareMore, MoreHorizontal,
} from 'lucide-react';

const SECTIONS = [
  { id: 'apps',    label: 'Apps' },
  { id: 'chats',   label: 'Chats & Channels' },
  { id: 'starred', label: 'Starred' },
  { id: 'shared',  label: 'Shared spaces' },
];

// Blue chat bubble illustration (matches Zoom's chat empty state)
function ChatIllustration() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back bubble (lighter) */}
      <circle cx="60" cy="48" r="30" fill="#B3D4F5" />
      {/* Front bubble */}
      <circle cx="44" cy="44" r="28" fill="#4A90D9" />
      {/* Three dots */}
      <circle cx="34" cy="44" r="3.5" fill="white" />
      <circle cx="44" cy="44" r="3.5" fill="white" />
      <circle cx="54" cy="44" r="3.5" fill="white" />
      {/* Tail */}
      <path d="M26 62 L18 74 L34 66 Z" fill="#4A90D9" />
    </svg>
  );
}

export default function ChatPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="right-section">
        <TopBar />

        <div className="main-content" style={{ display: 'flex', overflow: 'hidden' }}>
          {/* Left Chat Panel */}
          <div className="chat-left-panel">
            {/* Header */}
            <div className="chat-panel-header">
              <div className="chat-panel-title">
                Chat <ChevronDown size={14} />
              </div>
              <div className="chat-panel-actions">
                <button className="chat-panel-action-btn" title="Settings">
                  <Settings size={16} />
                </button>
                <button className="chat-panel-add-btn" title="New chat">
                  <Plus size={14} color="white" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="chat-filter-tabs">
              <button
                className={`chat-filter-tab${activeFilter === 'all' ? ' active' : ''}`}
                onClick={() => setActiveFilter('all')}
                id="chat-filter-all"
              >
                All
              </button>
              <button
                className={`chat-filter-tab${activeFilter === 'mention' ? ' active' : ''}`}
                onClick={() => setActiveFilter('mention')}
                id="chat-filter-mention"
                title="Mentions"
              >
                <AtSign size={13} />
              </button>
              <button
                className={`chat-filter-tab${activeFilter === 'threads' ? ' active' : ''}`}
                onClick={() => setActiveFilter('threads')}
                id="chat-filter-threads"
                title="Threads"
              >
                <MessageSquareMore size={13} />
              </button>
              <button
                className="chat-filter-tab"
                title="More"
              >
                <MoreHorizontal size={13} />
              </button>
            </div>

            {/* Sections */}
            <div className="chat-sections">
              {SECTIONS.map(({ id, label }) => (
                <div key={id}>
                  <div
                    className="chat-section-item"
                    id={`chat-section-${id}`}
                    onClick={() => toggle(id)}
                  >
                    {expanded[id]
                      ? <ChevronDown size={13} style={{ flexShrink: 0 }} />
                      : <ChevronRight size={13} style={{ flexShrink: 0 }} />
                    }
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area — Empty State */}
          <div className="chat-main-area">
            <ChatIllustration />
            <p className="chat-empty-text">
              Start chatting by clicking or creating a chat in the left sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
