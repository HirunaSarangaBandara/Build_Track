import React, { useState, useEffect, useCallback, useRef } from "react";
import API from "../services/api";
import { getRole } from "../services/auth";
import { io } from "socket.io-client";
import "../styles/communication.css";

const socket = io("http://localhost:5000");

const Communication = () => {
  const [recipients, setRecipients] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const selectedUserRef = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const myRole = getRole();

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await API.get("/messages/recipients");
      setRecipients(data);
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.id) socket.emit("join", user.id);

    socket.on("new_message", (msg) => {
      if (selectedUserRef.current?._id === msg.sender) {
        setMessages((prev) => [...prev, msg]);
        API.put(`/messages/read/${msg.sender}`);
      } else {
        setRecipients((prev) =>
          prev.map((u) =>
            u._id === msg.sender
              ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
              : u
          )
        );
      }
    });

    return () => socket.off("new_message");
  }, [fetchContacts]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelect = async (user) => {
    setSelectedUser(user);
    setIsMobileChatOpen(true); // open chat on mobile
    try {
      const { data } = await API.get(`/messages/chat/${user._id}`);
      setMessages(data);
      if (user.unreadCount > 0) {
        await API.put(`/messages/read/${user._id}`);
        setRecipients((prev) =>
          prev.map((u) =>
            u._id === user._id ? { ...u, unreadCount: 0 } : u
          )
        );
      }
    } catch (err) {
      console.error("Error loading chat:", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    const formData = new FormData();
    formData.append("receiver", selectedUser._id);
    formData.append("content", text);
    if (file) formData.append("attachment", file);

    try {
      const { data } = await API.post("/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessages([...messages, data]);
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send");
    }
  };

  const handleBack = () => {
    setIsMobileChatOpen(false);
    // optional: if you want to fully close chat and show empty state on desktop too:
    // setSelectedUser(null);
  };

  return (
    <div className="comm-page">
      <div
        className={`comm-glass-container ${
          isMobileChatOpen ? "mobile-chat-active" : ""
        }`}
      >
        {/* --- Sidebar: Contact List --- */}
        <aside className="comm-sidebar">
          <div className="sidebar-top">
            <h2>BuildTrack</h2>
            <span className="my-role-badge">{myRole}</span>
          </div>
          <div className="contact-list-container">
            {recipients.map((u) => (
              <div
                key={u._id}
                className={`contact-row-item ${
                  selectedUser?._id === u._id ? "selected" : ""
                }`}
                onClick={() => handleSelect(u)}
              >
                <div
                  className={`avatar-box ${
                    u.role === "admin" ? "admin-box" : ""
                  }`}
                >
                  {u.role === "admin" ? "🛡️" : u.name[0]}
                </div>
                <div className="contact-meta">
                  <div className="contact-name-line">
                    <strong>{u.name}</strong>
                    {u.unreadCount > 0 && (
                      <span className="unread-badge">{u.unreadCount}</span>
                    )}
                  </div>
                  <div className="contact-sub-line">
                    <span className="role-label">{u.role}</span>
                    {u.sites && u.sites.length > 0 && (
                      <div className="site-tag-container">
                        {u.sites.map((site, index) => (
                          <span key={index} className="site-pill">
                            {site}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* --- Main: Chat Interface --- */}
        <main className="chat-interface">
          {selectedUser ? (
            <>
              <header className="chat-header-bar">
                <button className="comm-back-btn" onClick={handleBack}>
                  ←
                </button>
                <div className="header-info">
                  <h3>{selectedUser.name}</h3>
                  <div className="header-sub-info">
                    <span className="header-status">{selectedUser.role}</span>
                    {selectedUser.sites?.map((s, i) => (
                      <span key={i} className="header-site-pill">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </header>

              <div className="chat-messages-area">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`comm-bubble ${
                      m.sender === selectedUser._id ? "received" : "sent"
                    }`}
                  >
                    {m.fileUrl && (
                      <div className="attachment-content">
                        {m.fileType === "image" ? (
                          <img
                            src={`http://localhost:5000${m.fileUrl}`}
                            alt="Attachment"
                            className="comm-img-preview"
                            onClick={() =>
                              window.open(`http://localhost:5000${m.fileUrl}`)
                            }
                          />
                        ) : (
                          <a
                            href={`http://localhost:5000${m.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="comm-file-link"
                          >
                            📄 {m.fileName || "View Document"}
                          </a>
                        )}
                      </div>
                    )}
                    {m.content && <p className="m-0">{m.content}</p>}
                    <span className="comm-timestamp">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {file && (
                <div className="file-selection-preview">
                  <span>📎 {file.name}</span>
                  <button
                    className="remove-file-btn"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <form className="comm-input-bar" onSubmit={handleSend}>
                <button
                  type="button"
                  className="comm-attach-btn"
                  onClick={() => fileInputRef.current.click()}
                >
                  📎
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  onChange={(e) => setFile(e.target.files[0])}
                  accept="image/*,.pdf"
                />
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit" disabled={!text.trim() && !file}>
                  ➤
                </button>
              </form>
            </>
          ) : (
            <div className="comm-empty-state">
              <div className="empty-visual">💬</div>
              <p>Select a colleague to start chatting</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Communication;