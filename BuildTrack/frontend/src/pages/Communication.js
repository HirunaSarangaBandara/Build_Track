import React, { useState } from "react";
import "../styles/communication.css";

function Communication() {
  const [messages, setMessages] = useState([
    { id: 1, sender: "Manager", text: "Meeting at 10 AM tomorrow." },
    { id: 2, sender: "Worker", text: "Noted, thank you!" },
  ]);

  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim() === "") return;

    const msg = {
      id: messages.length + 1,
      sender: "You",
      text: newMessage,
    };

    setMessages([...messages, msg]);
    setNewMessage("");
  };

  return (
    <div className="communication-container">
      <h1>Communication</h1>
      <p>Send messages and stay connected with your site team.</p>

      <div className="chat-box">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${
                msg.sender === "You" ? "sent" : "received"
              }`}
            >
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default Communication;