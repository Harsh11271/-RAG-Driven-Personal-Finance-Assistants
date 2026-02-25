import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import './ChatPage.css';

const socket = io.connect('http://localhost:3002');

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

    const sendMessage = async () => {
        if (message !== '') {
            const messageData = {
                room: 'general',
                author: user.username,
                message: message,
                time: new Date().toLocaleTimeString(),
            };

            // 1. Send to local WebSocket for storage/history (Phase 2)
            await socket.emit('send_message', messageData);

            // 2. Optimistically add to list
            setMessageList((list) => [...list, messageData]);
            const userMsg = message;
            setMessage('');

            // 3. Call LLM Service (Phase 5)
            setIsAiTyping(true);
            try {
                const response = await api.post('/chat/message', {
                    message: userMsg,
                    history: messageList.slice(-10).map(m => ({
                        role: m.author === user.username ? 'user' : 'assistant',
                        content: m.message
                    }))
                });

                const aiMsg = {
                    room: 'general',
                    author: 'AI Assistant',
                    message: response.data.answer,
                    time: new Date().toLocaleTimeString(),
                };
                setMessageList((list) => [...list, aiMsg]);
            } catch (error) {
                console.error('LLM Error:', error);
            } finally {
                setIsAiTyping(false);
            }
        }
    };

    useEffect(() => {
        // Join default room
        socket.emit('join_room', 'general');

        socket.on('receive_message', (data) => {
            // Check if message is from self to avoid duplicates if optimistic update used
            if (data.author !== user.username) {
                setMessageList((list) => [...list, data]);
            }
        });

        return () => {
            socket.off('receive_message');
        };
    }, [user.username]);

    return (
        <div className="chat-container">
            <Sidebar />
            <div className="chat-content">
                <div className="chat-header">
                    <h2>Chat Room</h2>
                </div>
                <div className="chat-messages">
                    {messageList.map((msg, index) => (
                        <div key={index} className={`message ${user.username === msg.author ? 'sent' : 'received'}`}>
                            <div className="message-bubble">
                                <p>{msg.message}</p>
                                <span className="message-meta">{msg.author} • {msg.time}</span>
                            </div>
                        </div>
                    ))}
                    {isAiTyping && (
                        <div className="message received">
                            <div className="message-bubble typing">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="chat-input">
                    <input
                        type="text"
                        value={message}
                        placeholder="Type a message..."
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
