import React, { useState } from "react";
import "../styles/Chat.css";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);  // State for typing indicator

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);

    // Show typing indicator
    setIsTyping(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      
      // Add bot response after the message is processed
      const botMessage = { sender: "bot", text: data.response };

      setMessages([...messages, userMessage, botMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // Hide typing indicator after receiving response
      setIsTyping(false);
    }

    // Clear input field
    setInput("");
  };

  return (
    <div className="chat-container">
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.text.includes("- ") ? (
              <ul>
                {msg.text.split("\n").map((line, i) =>
                  line.startsWith("- ") ? (
                    <li key={i}>{line.slice(2)}</li>
                  ) : (
                    <p key={i}>{line}</p>
                  )
                )}
              </ul>
            ) : (
              <pre>{msg.text}</pre>
            )}
          </div>
        ))}

        {/* Show typing indicator when the bot is typing */}
        {isTyping && (
          <div className="message bot">
            <i>typing...</i>
          </div>
        )}
      </div>

      <div className="input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
