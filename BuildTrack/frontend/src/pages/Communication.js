import React, { useState, useEffect, useCallback, useRef } from "react";
import API from "../services/api";
import { getRole, getUserId, getUserName } from "../services/auth";
import { io } from "socket.io-client";
import "../styles/communication.css";
import { useLanguage } from "../contexts/LanguageContext";

const socket = io("http://localhost:5000");

const Communication = () => {
  const { t } = useLanguage();

  const myId = getUserId();
  const myName = getUserName();

  const [recipients, setRecipients] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  // controls mobile slide state
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

    const uid = getUserId();
    if (uid) socket.emit("join", uid);

    socket.on("new_message", (msg) => {
      const senderId = String(msg.sender && (msg.sender._id || msg.sender));

      if (String(selectedUserRef.current?._id) === senderId) {
        const normalized = {
          ...msg,
          sender: senderId,
          senderName: msg.sender?.name || msg.senderName,
        };
        setMessages((prev) => [...prev, normalized]);
        API.put(`/messages/read/${senderId}`);
      } else {
        setRecipients((prev) =>
          prev.map((u) =>
            String(u._id) === senderId
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
    setIsMobileChatOpen(true); // open chat view on mobile

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
    if (!selectedUser) return;
    if (!text.trim() && !file) return;

    const formData = new FormData();
    formData.append("receiver", selectedUser._id);
    formData.append("content", text);
    if (file) formData.append("attachment", file);

    try {
      const { data } = await API.post("/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessages((prev) => [...prev, data]);
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send message");
    }
  };

  const handleBack = () => {
    // in mobile: slide back to contacts list
    setIsMobileChatOpen(false);
  };

  return (
    <div className="comm-page">
      <h1>{t("Communication") || "Communication"}</h1>

      <div
        className={`comm-card ${
          isMobileChatOpen ? "mobile-chat-active" : ""
        }`}
      >
        {/* Sidebar */}
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
                  {u.role === "admin" ? "🛡️" : u.name?.[0]}
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
                    {u.sites?.length > 0 && (
                      <div className="site-tag-container">
                        {u.sites.map((site, i) => (
                          <span key={i} className="site-pill">
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

        {/* Chat Area */}
        <main className="chat-interface">
          {selectedUser ? (
            <>
              <header className="chat-header-bar">
                <button className="comm-back-btn" onClick={handleBack}>
                  ←
                </button>
                <div className="header-info">
                  <h3>{selectedUser.name}</h3>
                  <span className="header-status">{selectedUser.role}</span>
                </div>
              </header>

              <div className="chat-messages-area">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`comm-bubble ${
                      m.sender === myId ? "sent" : "received"
                    }`}
                  >
                    {m.fileUrl && (
                      <a
                        href={`http://localhost:5000${m.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="comm-file-link"
                      >
                        📎 {m.fileName || "Attachment"}
                      </a>
                    )}
                    {m.content && <p>{m.content}</p>}
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
                  <button onClick={() => setFile(null)}>✕</button>
                </div>
              )}

              <form className="comm-input-bar" onSubmit={handleSend}>
                <button
                  type="button"
                  className="comm-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <input
                  type="text"
                  placeholder={t("messagePlaceholder") || "Type a message..."}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button type="submit">➤</button>
              </form>
            </>
          ) : (
            <div className="comm-empty-state">
              <div className="empty-visual">💬</div>
              <p>
                {t("communicationHint") ||
                  "Select a user to start chatting"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Communication;