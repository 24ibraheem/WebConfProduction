import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, ThumbsUp, Heart, CheckCircle, AlertCircle, Copy } from 'lucide-react';

const REACTION_ICONS = {
  thumbsUp: { icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  heart: { icon: Heart, label: 'Love', color: 'text-red-500' },
  check: { icon: CheckCircle, label: 'Agree', color: 'text-emerald-500' },
  alert: { icon: AlertCircle, label: 'Important', color: 'text-amber-500' },
};

export default function Chat({ messages = [], onSendMessage, onReactToMessage, currentUserId, currentRole }) {
  const [messageText, setMessageText] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    onSendMessage(messageText);
    setMessageText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getReactionIcon = (reactionType) => {
    const reaction = REACTION_ICONS[reactionType];
    if (reaction) {
      const Icon = reaction.icon;
      return { Icon, ...reaction };
    }
    return null;
  };

  return (
    <div className="flex flex-col h-96 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl shadow-black/20 overflow-hidden ring-1 ring-white/5">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl ring-1 ring-indigo-500/20">
            <MessageCircle size={18} className="text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 tracking-tight">
            Discussion
          </h3>
          <span className="text-xs text-slate-400 px-2.5 py-0.5 bg-slate-800/80 rounded-full border border-slate-700/50 font-medium">
            {messages.length}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent"
        onMouseLeave={() => setHoveredMessageId(null)}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No messages yet</p>
              <p className="text-xs text-slate-600 mt-1">Start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.userId === currentUserId;
            
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
              >
                <div className={`flex gap-2 max-w-xs ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isOwnMessage 
                      ? 'bg-indigo-500 text-white' 
                      : msg.userRole === 'instructor'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-600 text-slate-100'
                  }`}>
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>

                  {/* Message Content */}
                  <div className="flex flex-col gap-1">
                    {/* User info and time */}
                    {!isOwnMessage && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-medium text-slate-200">{msg.userName}</span>
                        {msg.userRole === 'instructor' && (
                          <span className="text-xs px-2 py-0.5 bg-amber-500 bg-opacity-20 text-amber-300 rounded-full">
                            Instructor
                          </span>
                        )}
                        <span className="text-xs text-slate-500">{formatTime(msg.timestamp)}</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`px-4 py-2.5 rounded-lg ${
                        isOwnMessage
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-700 text-slate-100 rounded-bl-none'
                      } shadow-md break-words text-sm leading-relaxed`}
                    >
                      {msg.text}
                    </div>

                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex gap-1 mt-1 flex-wrap ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(msg.reactions).map(([reactionType, users]) => {
                          const reaction = getReactionIcon(reactionType);
                          if (!reaction) return null;
                          
                          const Icon = reaction.Icon;
                          return (
                            <button
                              key={reactionType}
                              onClick={() => onReactToMessage(msg.id, reactionType)}
                              className="group relative px-2.5 py-1 rounded-full bg-slate-600 hover:bg-slate-500 transition text-xs flex items-center gap-1 cursor-pointer"
                              title={users.join(', ')}
                            >
                              <Icon size={13} className={reaction.color} />
                              <span className="text-slate-300">{users.length}</span>
                              
                              {/* Tooltip */}
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-slate-200 text-xs rounded px-2.5 py-1.5 whitespace-nowrap z-10 border border-slate-600">
                                {users.join(', ')}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Reaction Buttons (show on hover) */}
                    {hoveredMessageId === msg.id && (
                      <div className="flex gap-1 mt-1 pl-1">
                        {Object.entries(REACTION_ICONS).map(([type, reaction]) => {
                          const Icon = reaction.icon;
                          return (
                            <button
                              key={type}
                              onClick={() => onReactToMessage(msg.id, type)}
                              className="p-1.5 hover:bg-slate-600 rounded-lg transition"
                              title={reaction.label}
                            >
                              <Icon size={14} className="text-slate-400 hover:text-slate-200 transition" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Own message time */}
                    {isOwnMessage && (
                      <span className="text-xs text-slate-400 px-1">{formatTime(msg.timestamp)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800 flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        />
        <button
          onClick={handleSendMessage}
          disabled={!messageText.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center gap-2 duration-200 hover:shadow-lg hover:shadow-indigo-500/30"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
