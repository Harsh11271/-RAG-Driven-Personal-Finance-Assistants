import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import './ChatPage.css';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';
const socket = io.connect(socketUrl);

const ChatPage = () => {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [messageList, setMessageList] = useState([]);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messageList]);

    const sendMessage = async (text) => {
        const msgText = text || message;
        if (msgText.trim() === '') return;

        const messageData = {
            room: 'general',
            author: user.username,
            message: msgText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        await socket.emit('send_message', messageData);
        setMessageList((list) => [...list, messageData]);
        setMessage('');

        setIsAiTyping(true);
        try {
            const response = await api.post('/chat/message', {
                message: msgText,
                userId: user.username,
                history: messageList.slice(-10).map(m => ({
                    role: m.author === user.username ? 'user' : 'assistant',
                    content: m.message
                }))
            });

            const aiMsg = {
                room: 'general',
                author: 'AI Assistant',
                message: response.data.answer,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessageList((list) => [...list, aiMsg]);
        } catch (error) {
            const errMsg = {
                room: 'general',
                author: 'AI Assistant',
                message: 'Sorry, I encountered an error. Please try again.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessageList((list) => [...list, errMsg]);
        } finally {
            setIsAiTyping(false);
        }
    };

    useEffect(() => {
        socket.emit('join_room', 'general');
        socket.on('receive_message', (data) => {
            if (data.author !== user.username) {
                setMessageList((list) => [...list, data]);
            }
        });
        return () => { socket.off('receive_message'); };
    }, [user.username]);

    const suggestions = [
        "What's my total spending this month?",
        "Do I have any compliance risks?",
        "Summarize my uploaded documents",
        "What are the AML rules?",
    ];

    return (
        <div className="page-layout">
            <Sidebar />
            <div className="chat-page">
                {/* Chat Header */}
                <div className="chat-top-bar">
                    <div className="chat-title-section">
                        <div className="chat-ai-avatar-sm">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                        </div>
                        <div>
                            <h2>AI Financial Assistant</h2>
                            <span className="online-status">
                                <span className="online-dot"></span>
                                Online
                            </span>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="chat-messages-area">
                    {messageList.length === 0 && !isAiTyping && (
                        <div className="chat-welcome">
                            <div className="welcome-icon">
                                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#3B82F6" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                            </div>
                            <h3>How can I help you today?</h3>
                            <p>Ask me about your finances, compliance rules, or uploaded documents.</p>
                            <div className="suggestions-grid">
                                {suggestions.map((s, i) => (
                                    <button key={i} className="suggestion-chip" onClick={() => sendMessage(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messageList.map((msg, index) => {
                        const isUser = user.username === msg.author;
                        return (
                            <div key={index} className={`chat-msg ${isUser ? 'user-msg' : 'ai-msg'}`}>
                                {!isUser && (
                                    <div className="msg-avatar ai-avatar-circle">
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /></svg>
                                    </div>
                                )}
                                <div className={`msg-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
                                    <p>{msg.message}</p>
                                    <span className="msg-time">{msg.time}</span>
                                </div>
                                {isUser && (
                                    <div className="msg-avatar user-avatar-circle">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {isAiTyping && (
                        <div className="chat-msg ai-msg">
                            <div className="msg-avatar ai-avatar-circle">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /></svg>
                            </div>
                            <div className="msg-bubble ai-bubble typing-bubble">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="chat-input-bar">
                    <div className="input-wrapper">
                        <input
                            type="text"
                            value={message}
                            placeholder="Ask about your finances..."
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button className="send-btn" onClick={() => sendMessage()} disabled={!message.trim()}>
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
