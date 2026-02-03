/**
 * ChannelUI - Enhanced UI Components for Grudge Channels
 * Dropdown menus, channel panels, and communication interfaces
 */

class ChannelUI {
  constructor() {
    this.activeDropdown = null;
    this.channelPanels = new Map();
    this.currentView = null;
  }

  // ============ DROPDOWN MENU SYSTEM ============

  createDropdownMenu(config) {
    const dropdown = document.createElement('div');
    dropdown.className = 'grudge-dropdown';
    dropdown.dataset.dropdownId = config.id;
    
    dropdown.innerHTML = `
      <button class="dropdown-trigger" data-testid="dropdown-${config.id}">
        <span class="dropdown-icon">${config.icon || '📁'}</span>
        <span class="dropdown-label">${config.label}</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="dropdown-content">
        ${config.channels.map(ch => this.renderChannelItem(ch)).join('')}
      </div>
    `;

    // Event handling
    const trigger = dropdown.querySelector('.dropdown-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown(dropdown);
    });

    // Channel item clicks
    dropdown.querySelectorAll('.channel-item').forEach(item => {
      item.addEventListener('click', () => {
        const channelId = item.dataset.channelId;
        const channelType = item.dataset.channelType;
        this.openChannel(channelId, channelType);
      });
    });

    return dropdown;
  }

  renderChannelItem(channel) {
    const typeIcons = {
      text: '💬',
      voice: '🔊',
      video: '📹',
      stream: '📺',
      stage: '🎭'
    };

    const statusClass = channel.active ? 'active' : '';
    const liveIndicator = channel.live ? '<span class="live-indicator">LIVE</span>' : '';

    return `
      <div class="channel-item ${statusClass}" 
           data-channel-id="${channel.id}" 
           data-channel-type="${channel.type}"
           data-testid="channel-${channel.id}">
        <span class="channel-type-icon">${typeIcons[channel.type] || '💬'}</span>
        <span class="channel-name">${channel.name}</span>
        ${liveIndicator}
        <span class="channel-count">${channel.memberCount || ''}</span>
      </div>
    `;
  }

  toggleDropdown(dropdown) {
    const content = dropdown.querySelector('.dropdown-content');
    const isOpen = content.classList.contains('open');

    // Close all dropdowns
    document.querySelectorAll('.dropdown-content.open').forEach(d => {
      d.classList.remove('open');
    });

    if (!isOpen) {
      content.classList.add('open');
      dropdown.querySelector('.dropdown-arrow').textContent = '▲';
      this.activeDropdown = dropdown;
    } else {
      dropdown.querySelector('.dropdown-arrow').textContent = '▼';
      this.activeDropdown = null;
    }
  }

  // ============ CHANNEL PANEL ============

  createChannelPanel(channel) {
    const panel = document.createElement('div');
    panel.className = `channel-panel channel-type-${channel.type}`;
    panel.dataset.channelId = channel.id;

    panel.innerHTML = `
      <div class="channel-header">
        <div class="channel-info">
          <span class="channel-icon">${channel.icon}</span>
          <h3 class="channel-title">${channel.name}</h3>
          <span class="channel-type-badge">${channel.type.toUpperCase()}</span>
        </div>
        <div class="channel-actions">
          ${this.renderChannelActions(channel.type)}
        </div>
      </div>
      <div class="channel-body">
        ${this.renderChannelContent(channel)}
      </div>
      <div class="channel-input-area">
        ${this.renderInputArea(channel.type)}
      </div>
    `;

    this.attachPanelEvents(panel, channel);
    this.channelPanels.set(channel.id, panel);
    
    return panel;
  }

  renderChannelActions(type) {
    const actions = {
      text: `
        <button class="action-btn" data-action="pin" title="Pinned Messages" data-testid="btn-pin">📌</button>
        <button class="action-btn" data-action="members" title="Members" data-testid="btn-members">👥</button>
        <button class="action-btn" data-action="search" title="Search" data-testid="btn-search">🔍</button>
      `,
      voice: `
        <button class="action-btn" data-action="mute" title="Mute" data-testid="btn-mute">🎤</button>
        <button class="action-btn" data-action="deafen" title="Deafen" data-testid="btn-deafen">🔊</button>
        <button class="action-btn" data-action="settings" title="Settings" data-testid="btn-settings">⚙️</button>
        <button class="action-btn danger" data-action="leave" title="Leave" data-testid="btn-leave">📴</button>
      `,
      video: `
        <button class="action-btn" data-action="mute" title="Mute" data-testid="btn-mute">🎤</button>
        <button class="action-btn" data-action="camera" title="Camera" data-testid="btn-camera">📷</button>
        <button class="action-btn" data-action="screen" title="Share Screen" data-testid="btn-screen">🖥️</button>
        <button class="action-btn danger" data-action="leave" title="Leave" data-testid="btn-leave">📴</button>
      `,
      stream: `
        <button class="action-btn primary" data-action="go-live" title="Go Live" data-testid="btn-live">🔴 GO LIVE</button>
        <button class="action-btn" data-action="viewers" title="Viewers" data-testid="btn-viewers">👁️</button>
        <button class="action-btn" data-action="chat" title="Stream Chat" data-testid="btn-chat">💬</button>
      `
    };
    
    return actions[type] || actions.text;
  }

  renderChannelContent(channel) {
    switch (channel.type) {
      case 'text':
        return `
          <div class="messages-container" id="messages-${channel.id}">
            <div class="messages-list"></div>
          </div>
        `;
      
      case 'voice':
        return `
          <div class="voice-grid">
            <div class="voice-participants" id="voice-${channel.id}"></div>
          </div>
        `;
      
      case 'video':
        return `
          <div class="video-grid" id="video-${channel.id}">
            <div class="video-placeholder">
              <span>📹</span>
              <p>Join to start video chat</p>
            </div>
          </div>
        `;
      
      case 'stream':
        return `
          <div class="stream-container" id="stream-${channel.id}">
            <div class="stream-player">
              <div class="stream-offline">
                <span>📺</span>
                <p>No active stream</p>
                <button class="btn-go-live" data-testid="btn-start-stream">Start Streaming</button>
              </div>
            </div>
            <div class="stream-chat">
              <div class="stream-chat-messages"></div>
            </div>
          </div>
        `;
      
      default:
        return '<div class="channel-placeholder">Channel content</div>';
    }
  }

  renderInputArea(type) {
    if (type === 'voice' || type === 'video') {
      return `
        <div class="voice-controls">
          <button class="control-btn mute" data-testid="btn-toggle-mute">
            <span class="icon">🎤</span>
            <span class="label">Mute</span>
          </button>
          <button class="control-btn camera" data-testid="btn-toggle-camera">
            <span class="icon">📷</span>
            <span class="label">Camera</span>
          </button>
          <button class="control-btn screen" data-testid="btn-toggle-screen">
            <span class="icon">🖥️</span>
            <span class="label">Share</span>
          </button>
          <button class="control-btn disconnect danger" data-testid="btn-disconnect">
            <span class="icon">📴</span>
            <span class="label">Leave</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="message-input-container">
        <button class="attach-btn" data-testid="btn-attach">📎</button>
        <button class="emoji-btn" data-testid="btn-emoji">😊</button>
        <input type="text" class="message-input" placeholder="Type a message..." data-testid="input-message">
        <button class="send-btn" data-testid="btn-send">➤</button>
      </div>
    `;
  }

  attachPanelEvents(panel, channel) {
    // Message sending
    const messageInput = panel.querySelector('.message-input');
    const sendBtn = panel.querySelector('.send-btn');

    if (messageInput && sendBtn) {
      const sendMessage = async () => {
        const content = messageInput.value.trim();
        if (!content) return;

        if (typeof grudgeChannels !== 'undefined') {
          await grudgeChannels.sendMessage(channel.id, {
            content,
            author: { id: 'local', name: 'You' }
          });
        }

        messageInput.value = '';
        this.appendMessage(channel.id, { content, author: { name: 'You' }, timestamp: new Date() });
      };

      sendBtn.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }

    // Action buttons
    panel.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleAction(btn.dataset.action, channel);
      });
    });

    // Voice controls
    panel.querySelectorAll('.control-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.classList.contains('mute') ? 'mute' :
                       btn.classList.contains('camera') ? 'camera' :
                       btn.classList.contains('screen') ? 'screen' : 'disconnect';
        this.handleVoiceControl(action, channel, btn);
      });
    });
  }

  handleAction(action, channel) {
    console.log(`Action: ${action} on channel: ${channel.name}`);
    
    switch (action) {
      case 'mute':
        if (typeof grudgeChannels !== 'undefined') {
          const muted = grudgeChannels.toggleMute();
          console.log('Muted:', muted);
        }
        break;
      case 'camera':
        if (typeof grudgeChannels !== 'undefined') {
          const videoOn = grudgeChannels.toggleVideo();
          console.log('Video:', videoOn);
        }
        break;
      case 'go-live':
        this.startStreaming(channel);
        break;
      case 'leave':
        if (typeof grudgeChannels !== 'undefined') {
          grudgeChannels.leaveVoiceChannel();
        }
        break;
    }
  }

  handleVoiceControl(action, channel, btn) {
    btn.classList.toggle('active');
    this.handleAction(action === 'disconnect' ? 'leave' : action, channel);
  }

  async startStreaming(channel) {
    if (typeof grudgeChannels !== 'undefined') {
      try {
        const stream = await grudgeChannels.startStream(channel.id, {
          title: 'My Stream',
          audio: true
        });
        console.log('Stream started:', stream);
      } catch (e) {
        console.error('Failed to start stream:', e);
      }
    }
  }

  // ============ MESSAGE RENDERING ============

  appendMessage(channelId, message) {
    const panel = this.channelPanels.get(channelId);
    if (!panel) return;

    const messagesList = panel.querySelector('.messages-list');
    if (!messagesList) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'message-item';
    msgEl.innerHTML = `
      <div class="message-avatar">${message.author.avatar || message.author.name[0]}</div>
      <div class="message-body">
        <div class="message-header">
          <span class="message-author">${message.author.name}</span>
          <span class="message-time">${this.formatTime(message.timestamp)}</span>
        </div>
        <div class="message-content">${this.formatMessageContent(message.content)}</div>
      </div>
    `;

    messagesList.appendChild(msgEl);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatMessageContent(content) {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  // ============ CHANNEL NAVIGATION ============

  async openChannel(channelId, channelType) {
    console.log(`Opening channel: ${channelId} (${channelType})`);

    let channel;
    if (typeof grudgeChannels !== 'undefined') {
      channel = await grudgeChannels.getChannel(channelId);
    }

    if (!channel) {
      channel = {
        id: channelId,
        name: channelId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: channelType || 'text',
        icon: this.getIconForType(channelType)
      };
    }

    // Close previous panel
    if (this.currentView) {
      this.currentView.classList.remove('active');
    }

    // Get or create panel
    let panel = this.channelPanels.get(channelId);
    if (!panel) {
      panel = this.createChannelPanel(channel);
      document.body.appendChild(panel);
    }

    panel.classList.add('active');
    this.currentView = panel;

    // Join voice/video if needed
    if ((channelType === 'voice' || channelType === 'video') && typeof grudgeChannels !== 'undefined') {
      await grudgeChannels.joinVoiceChannel(channelId, { video: channelType === 'video' });
    }

    // Load messages for text channels
    if (channelType === 'text' && typeof grudgeChannels !== 'undefined') {
      const messages = await grudgeChannels.getMessages(channelId);
      messages.forEach(msg => this.appendMessage(channelId, msg));
    }
  }

  getIconForType(type) {
    const icons = { text: '💬', voice: '🔊', video: '📹', stream: '📺', stage: '🎭' };
    return icons[type] || '💬';
  }
}

// Create global instance
const channelUI = new ChannelUI();

// Export
if (typeof window !== 'undefined') {
  window.ChannelUI = ChannelUI;
  window.channelUI = channelUI;
}

if (typeof module !== 'undefined') {
  module.exports = { ChannelUI, channelUI };
}
