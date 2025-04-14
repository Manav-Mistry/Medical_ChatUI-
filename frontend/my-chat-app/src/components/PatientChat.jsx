import React, { useState, useEffect } from "react";
import "../styles/Chat.css";

const PatientChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("expert"); // "expert" or "llm"
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Dynamically choose the WebSocket endpoint
    const endpoint =
      mode === "expert"
        ? "ws://127.0.0.1:8000/ws/patient"
        : "ws://127.0.0.1:8000/ws/llm";

    const socket = new WebSocket(endpoint);

    socket.onopen = () => {
      console.log(`Connected to ${mode.toUpperCase()} WebSocket`);
    };

    socket.onmessage = (event) => {
      const sender = mode === "expert" ? "expert" : "llm";
      const message = { sender, text: event.data };
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log(`${mode.toUpperCase()} WebSocket disconnected`);
    };

    setWs(socket);

    // Cleanup on unmount or mode change
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [mode]);

  const sendMessage = () => {
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    const userMessage = { sender: "patient", text: input };
    setMessages((prev) => [...prev, userMessage]);

    ws.send(input);
    setInput("");
  };

  return (
    <div className="main-container">
      {/* Mode Toggle */}
      <div className="mode-toggle">
        <label>
          <input
            type="radio"
            value="expert"
            checked={mode === "expert"}
            onChange={() => {
              setMessages([]);
              setMode("expert");
            }}
          />
          Talk to Human Expert
        </label>
        <label>
          <input
            type="radio"
            value="llm"
            checked={mode === "llm"}
            onChange={() => {
              setMessages([]);
              setMode("llm");
            }}
          />
          Talk to LLM (AI)
        </label>
      </div>

      {/* Chat UI */}
      <div className="chat-container">
        <div className="chat-box">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
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
    </div>
  );
};

export default PatientChat;
