'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  ChevronDown, ChevronRight, Settings, Plus,
  AtSign, MessageSquare, MoreHorizontal, Calendar,
  Star, Video, Users, PanelRight, Send, Smile, Paperclip,
  Type, Camera, X, Hash
} from 'lucide-react';
import { getChatChannels, getChatMessages, sendChatMessage, createChatChannel } from '@/lib/api';

export default function ChatPage() {
  const router = useRouter();

  // Navigation & Tree
  const [activeFilter, setActiveFilter] = useState('all');
  const [expanded, setExpanded] = useState({
    apps: false,
    chats: true,
    starred: false,
    shared: false,
  });

  // Channels & Active Chat
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // Tabs & Features
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'resources' | 'overview'
  const [isStarred, setIsStarred] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const messagesEndRef = useRef(null);

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch channels from backend
  useEffect(() => {
    getChatChannels()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setChannels(data);
          setActiveChannel(data[0]);
        } else {
          setChannels([]);
          setActiveChannel(null);
        }
      })
      .catch(() => {
        setChannels([]);
        setActiveChannel(null);
      });
  }, []);

  const handleSelectChannel = (chan) => {
    if (chan.id === activeChannel?.id) return;
    setActiveChannel(chan);
    setMessages([]);
  };

  // Fetch messages for active channel
  useEffect(() => {
    if (!activeChannel?.id) {
      setMessages([]);
      return;
    }
    let isCurrent = true;
    getChatMessages(activeChannel.id)
      .then(data => {
        if (isCurrent) {
          if (Array.isArray(data)) {
            setMessages(data);
          } else {
            setMessages([]);
          }
        }
      })
      .catch(() => {
        if (isCurrent) setMessages([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeChannel?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // Handle Send Message
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !activeChannel) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const newMsg = {
      id: Date.now(),
      channel_id: activeChannel.id,
      sender_name: 'You',
      is_self: 1,
      is_guest: 0,
      text: trimmed,
      created_at: timeStr
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Persist to backend
    try {
      await sendChatMessage(activeChannel.id, {
        sender_name: 'You',
        is_self: true,
        is_guest: false,
        text: trimmed,
        created_at: timeStr
      });
    } catch {
      // Offline fallback
    }
  };

  // Handle Create New Channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    const name = newChannelName.trim();
    if (!name) return;

    const channelId = `ch-${Date.now()}`;
    const newChan = {
      id: channelId,
      name: name,
      type: 'channel'
    };

    try {
      const saved = await createChatChannel(newChan);
      setChannels(prev => [...prev, saved]);
      setActiveChannel(saved);
    } catch {
      setChannels(prev => [...prev, newChan]);
      setActiveChannel(newChan);
    }

    setNewChannelName('');
    setShowNewChatModal(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="right-section">
        <TopBar />

        <div className="main-content" style={{ display: 'flex', overflow: 'hidden', padding: 0 }}>
          <div className="team-chat-container">

            {/* ── Sub-Sidebar: Chat Nav Column ── */}
            <div className="chat-left-panel">
              {/* Header */}
              <div className="chat-panel-header">
                <div className="chat-panel-title">
                  <span>Chat</span>
                  <ChevronDown size={14} />
                </div>
                <div className="chat-panel-actions">
                  <button className="chat-panel-action-btn" title="Settings">
                    <Settings size={16} />
                  </button>
                  <button
                    className="chat-panel-add-btn"
                    title="New chat"
                    id="new-chat-btn"
                    onClick={() => setShowNewChatModal(true)}
                  >
                    <Plus size={15} />
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
                  title="Chat Messages"
                >
                  <MessageSquare size={13} />
                </button>
                <button className="chat-filter-tab" title="More">
                  <MoreHorizontal size={13} />
                </button>
              </div>

              {/* Collapsible Sections Tree */}
              <div className="chat-sections">
                {/* 1. Apps */}
                <div
                  className="chat-section-header"
                  onClick={() => toggleSection('apps')}
                >
                  {expanded.apps ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Apps</span>
                </div>

                {/* 2. Chats & Channels */}
                <div
                  className="chat-section-header"
                  onClick={() => toggleSection('chats')}
                >
                  {expanded.chats ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Chats &amp; Channels</span>
                </div>

                {expanded.chats && (
                  <div className="chat-channels-list">
                    {channels.length === 0 && (
                      <div style={{ padding: '8px 16px', fontSize: 12, color: '#888' }}>
                        No channels yet
                      </div>
                    )}
                    {channels.map(chan => (
                      <div
                        key={chan.id}
                        id={`chat-channel-${chan.id}`}
                        className={`chat-channel-item${activeChannel?.id === chan.id ? ' active' : ''}`}
                        onClick={() => handleSelectChannel(chan)}
                      >
                        {chan.type === 'meeting' ? (
                          <Calendar size={14} className="chat-item-icon" />
                        ) : (
                          <Hash size={14} className="chat-item-icon" />
                        )}
                        <span className="truncate">{chan.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Starred */}
                <div
                  className="chat-section-header"
                  onClick={() => toggleSection('starred')}
                >
                  {expanded.starred ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Starred</span>
                </div>

                {/* 4. Shared spaces */}
                <div
                  className="chat-section-header"
                  onClick={() => toggleSection('shared')}
                >
                  {expanded.shared ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Shared spaces</span>
                </div>
              </div>
            </div>

            {/* ── Main Chat Conversation Area ── */}
            {activeChannel ? (
              <div className="chat-main-area">
                {/* Header Bar */}
                <div className="chat-topbar-header">
                  <div className="chat-topbar-title-row">
                    <div className="chat-title-group">
                      {activeChannel.type === 'meeting' ? (
                        <Calendar size={18} color="#555B66" />
                      ) : (
                        <Hash size={18} color="#555B66" />
                      )}
                      <span>{activeChannel.name}</span>
                    </div>

                    <div className="chat-header-actions">
                      <button className="chat-header-btn" title="Participants">
                        <Users size={15} />
                        <span style={{ fontSize: 12 }}>1</span>
                      </button>
                      <button
                        className={`chat-header-btn${isStarred ? ' starred' : ''}`}
                        onClick={() => setIsStarred(s => !s)}
                        title={isStarred ? 'Unstar' : 'Star channel'}
                      >
                        <Star size={15} fill={isStarred ? '#F5A623' : 'none'} color={isStarred ? '#F5A623' : '#555B66'} />
                      </button>
                      {activeChannel.type === 'meeting' && (
                        <button
                          className="chat-header-btn"
                          title="Join meeting"
                          onClick={() => router.push(`/meeting/${activeChannel.meeting_id || activeChannel.id}`)}
                        >
                          <Video size={16} />
                        </button>
                      )}
                      <button className="chat-header-btn" title="More options">
                        <MoreHorizontal size={15} />
                      </button>
                      <button className="chat-header-btn" title="Side panel">
                        <PanelRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="chat-tabs-row">
                    <button
                      className={`chat-tab-btn${activeTab === 'chat' ? ' active' : ''}`}
                      onClick={() => setActiveTab('chat')}
                      id="chat-tab-messages"
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>
                    <button
                      className={`chat-tab-btn${activeTab === 'resources' ? ' active' : ''}`}
                      onClick={() => setActiveTab('resources')}
                      id="chat-tab-resources"
                    >
                      <span>Resources</span>
                    </button>
                    <button
                      className={`chat-tab-btn${activeTab === 'overview' ? ' active' : ''}`}
                      onClick={() => setActiveTab('overview')}
                      id="chat-tab-overview"
                    >
                      <span>Chat Overview</span>
                    </button>
                    <button className="chat-tab-btn icon-only" title="Add tab">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Content by Tab */}
                {activeTab === 'chat' && (
                  <div className="chat-messages-container dark-scroll">
                    {/* Continuous meeting note */}
                    {activeChannel.type === 'meeting' && (
                      <div className="chat-system-note" style={{ marginBottom: 12 }}>
                        <div>This is a continuous meeting chat</div>
                        <div>Messages sent during the meeting or here are visible to participants.</div>
                      </div>
                    )}

                    {/* Date separator */}
                    {messages.length > 0 && (
                      <div className="chat-date-separator">
                        <span>Today</span>
                      </div>
                    )}

                    {/* Dynamic messages or empty state */}
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#8E8E93', margin: '60px auto', fontSize: 13, lineHeight: 1.6 }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                        <strong style={{ fontSize: 15, color: '#18191C' }}>
                          {activeChannel.type === 'meeting'
                            ? `Welcome to ${activeChannel.name}!`
                            : `Welcome to #${activeChannel.name}!`}
                        </strong>
                        <p style={{ marginTop: 6, color: '#666' }}>
                          {activeChannel.type === 'meeting'
                            ? 'No messages yet. Any conversation from the meeting or typed below will appear here.'
                            : 'Send a message below to start the conversation.'}
                        </p>
                      </div>
                    ) : (
                      messages.map((m, idx) => {
                        const isSelf = m.is_self || m.sender_name === 'You';
                        const avatarBg = isSelf ? '#5B6EAB' : '#D1D5DB';
                        const avatarColor = isSelf ? '#FFFFFF' : '#4B5563';
                        const avatarText = (m.sender_name?.[0] || 'u').toLowerCase();
                        return (
                          <div key={m.id || idx} className="chat-msg-row">
                            <div
                              className="chat-avatar"
                              style={{ background: avatarBg, color: avatarColor }}
                            >
                              {avatarText}
                            </div>
                            <div className="chat-msg-content">
                              <div className="chat-msg-header">
                                <span className="chat-sender-name">{m.sender_name}</span>
                                {m.is_guest ? <span className="chat-guest-badge">GUEST</span> : null}
                                <span className="chat-timestamp">{m.created_at || 'Just now'}</span>
                              </div>
                              <div className="chat-bubble">{m.text}</div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}

                {activeTab === 'resources' && (
                  <div style={{ padding: 32, color: '#555B66', fontSize: 13, lineHeight: 1.6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#18191C', marginBottom: 8 }}>
                      Meeting Resources
                    </h3>
                    <p>Shared files, meeting summaries, and whiteboards will appear here.</p>
                  </div>
                )}

                {activeTab === 'overview' && (
                  <div style={{ padding: 32, color: '#555B66', fontSize: 13, lineHeight: 1.6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#18191C', marginBottom: 8 }}>
                      Chat Overview
                    </h3>
                    <p><strong>Channel:</strong> {activeChannel.name}</p>
                    <p><strong>Type:</strong> {activeChannel.type === 'meeting' ? 'Continuous meeting chat' : 'Channel'}</p>
                    {activeChannel.meeting_id && (
                      <p><strong>Meeting ID:</strong> {activeChannel.meeting_id}</p>
                    )}
                  </div>
                )}

              {/* ── Bottom Compose Box (Matching Screenshot 1) ── */}
              <div className="chat-compose-container">
                <textarea
                  id="chat-compose-input"
                  className="chat-input-textarea"
                  placeholder="Write a message or type / for more"
                  rows={2}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />

                <div className="chat-compose-tools">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="chat-tool-btn" title="Add item" type="button">
                      <Plus size={16} />
                    </button>
                    <button className="chat-tool-btn" title="Format text" type="button">
                      <Type size={16} />
                    </button>
                    <button className="chat-tool-btn" title="Insert emoji" type="button">
                      <Smile size={16} />
                    </button>
                    <button className="chat-tool-btn" title="Attach file" type="button">
                      <Paperclip size={16} />
                    </button>
                    <button className="chat-tool-btn" title="Capture screen" type="button">
                      <Camera size={16} />
                    </button>
                  </div>

                  <button
                    id="chat-compose-send-btn"
                    className={`chat-send-plane-btn${inputText.trim() ? ' active' : ''}`}
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    title="Send message"
                    type="button"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>

            </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8E8E93',
                textAlign: 'center',
                padding: 32
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#18191C', marginBottom: 6 }}>
                  No chats yet
                </div>
                <p style={{ maxWidth: 360, lineHeight: 1.5, fontSize: 13, marginBottom: 16 }}>
                  When a meeting occurs or when you create a channel, your continuous conversations will appear here.
                </p>
                <button
                  className="zoom-blue-btn"
                  onClick={() => setShowNewChatModal(true)}
                >
                  Create a Channel
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── New Chat Modal ── */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="new-chat-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#18191C' }}>New Chat or Channel</div>
              <button
                onClick={() => setShowNewChatModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <input
                id="new-channel-name-input"
                className="new-chat-input"
                placeholder="Enter channel name or contact"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                autoFocus
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 6,
                    border: '1px solid #D5D9E0', background: 'none',
                    fontSize: 13, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="zoom-blue-btn"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
