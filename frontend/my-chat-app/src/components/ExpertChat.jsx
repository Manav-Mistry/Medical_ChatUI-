import React, { useState, useEffect } from "react";
import "../styles/Chat.css";

const ExpertChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState(null);
  const [note, setNote] = useState(""); // for discharge note

  const expertId = "expert1"; // dynamically assigned later

  useEffect(() => {
    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/expert?user_id=${expertId}`);

    socket.onopen = () => console.log("Connected to Expert WebSocket");

    socket.onmessage = (event) => {
      const data = event.data;

      // Detect if it's the discharge note (prefixed)
      if (data.startsWith("[Discharge Note")) {
        const noteText = data.split("]:\n")[1];
        setNote(noteText);
      } else {
        const patientMessage = { sender: "patient", text: data };
        setMessages((prevMessages) => [...prevMessages, patientMessage]);
      }
    };

    socket.onerror = (error) => console.error("WebSocket error:", error);
    socket.onclose = () => console.log("Disconnected from Expert WebSocket");

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
        console.log("Closed Expert WebSocket connection");
      }
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    const expertMessage = { sender: "expert", text: input };
    setMessages((prevMessages) => [...prevMessages, expertMessage]);

    ws.send(input);
    setInput("");
  };

  return (
    <div className="main-container" style={{ display: "flex" }}>
      {/* Left Panel: Discharge Note */}
      <div className="discharge-note-section" >
        <h3>Patient Discharge Note</h3>
        <div className="discharge-note-box">
          {note ? (
            <pre style={{ whiteSpace: "pre-wrap" }}>{note}</pre>
          ) : (
            <i>No discharge note available.</i>
          )}
        </div>
      </div>

      {/* Right Panel: Chat UI */}
      <div className="chat-container-expert">
        <div className="chat-box-expert">
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
            placeholder="Type a response..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default ExpertChat;
