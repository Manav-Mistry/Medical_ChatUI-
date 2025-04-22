import React, { useState, useEffect } from "react";
import "../styles/Chat.css";

const PatientChat = ({ userId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [file, setFile] = useState(null);

  // Set backend URL (you can load from .env or config later)
  const BACKEND_URL = "https://medical-chatui.onrender.com";
  const BACKEND_WS = "wss://medical-chatui.onrender.com";

  // Determine mode (LLM or expert) from user ID
  const initialMode =
    userId.startsWith("patient6") ||
    userId.startsWith("patient7") ||
    userId.startsWith("patient8") ||
    userId.startsWith("patient9") ||
    userId.startsWith("patient10")
      ? "llm"
      : "expert";

  const [mode] = useState(initialMode);

  // Setup WebSocket connection
  useEffect(() => {
    const endpoint = `${BACKEND_WS}/ws/patient?user_id=${userId}`;
    const socket = new WebSocket(endpoint);

    socket.onopen = () => {
      console.log(`Connected to ${mode.toUpperCase()} WebSocket`);
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const sender = mode === "expert" ? "expert" : "llm";
      setMessages((prev) => [...prev, { sender, text: event.data }]);
      setIsTyping(false);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error);
    socket.onclose = () => console.log("WebSocket closed");

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [userId, mode]);

  // Send chat message
  const sendMessage = () => {
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [...prev, { sender: "patient", text: input }]);
    setIsTyping(true);
    ws.send(input);
    setInput("");
  };

  // Upload discharge note file
  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${BACKEND_URL}/upload-note?patient_id=${userId}`,
        { method: "POST", body: formData }
      );
      const result = await response.json();
      alert(result.message || "Discharge note uploaded successfully.");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
    }
  };

  return (
    <div className="main-container">
      {/* Upload panel */}
      <div className="upload-panel">
        <form className="upload-section" onSubmit={uploadFile}>
          <h3>Upload Discharge Note</h3>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* Chat container */}
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
                <div>{msg.text}</div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="message bot">
              <i>typing...</i>
            </div>
          )}
        </div>

        {/* Input field */}
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
