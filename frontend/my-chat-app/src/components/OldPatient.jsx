// import React, { useState, useEffect } from "react";
// import "../styles/Chat.css";

// const PatientChat = () => {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [ws, setWs] = useState(null);

//   useEffect(() => {
//     // Toggle ws/chat to ws/expert to expect answer from expert
//     const socket = new WebSocket("ws://127.0.0.1:8000/ws/patient");
    
//     socket.onopen = () => console.log("Connected to Patient WebSocket");
//     socket.onclose = () => console.log("Disconnected from Patient WebSocket");
//     socket.onerror = (error) => console.error("WebSocket error:", error);

//     socket.onmessage = (event) => {
//       const data = event.data;
//       const expertMessage = { sender: "expert", text: data };
//       setMessages(prevMessages => [...prevMessages, expertMessage]);
//     };

//     setWs(socket);

//     return () => {
//         if (socket.readyState === WebSocket.OPEN) {  // Ensure socket is open before closing
//             socket.close();
//             console.log("Closed Expert WebSocket connection");
//         }
//     };
//   }, []);

//   const sendMessage = () => {
//     if (!input.trim() || !ws) return;

//     const patientMessage = { sender: "patient", text: input };
//     setMessages([...messages, patientMessage]);

//     ws.send(input);
//     setInput("");
//   };

//   return (
//     <div className="main-container">
//       <div className="chat-container">
//         <div className="chat-box">
//           {messages.map((msg, index) => (
//             <div key={index} className={`message ${msg.sender}`}>
//               {msg.text}
//             </div>
//           ))}
//         </div>
  
//         <div className="input-box">
//           <input
//             type="text"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             placeholder="Type a message..."
//           />
//           <button onClick={sendMessage}>Send</button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PatientChat;


import React, { useState, useEffect } from "react";
import "../styles/Chat.css";

const PatientChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("expert"); // 'expert' or 'llm'
  const [ws, setWs] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [file, setFile] = useState(null);

  // Setup WebSocket when mode changes
  useEffect(() => {
    const endpoint =
      mode === "expert"
        ? "ws://127.0.0.1:8000/ws/patient"
        : "ws://127.0.0.1:8000/ws/llm";

    const socket = new WebSocket(endpoint);

    socket.onopen = () => console.log(`Connected to ${mode.toUpperCase()} WebSocket`);
    socket.onmessage = (event) => {
      const sender = mode === "expert" ? "expert" : "llm";
      const message = { sender, text: event.data };
      setMessages((prev) => [...prev, message]);
      setIsTyping(false);
    };
    socket.onerror = (error) => console.error("WebSocket error:", error);
    socket.onclose = () => console.log(`Disconnected from ${mode.toUpperCase()} WebSocket`);

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [mode]);

  // Send message
  const sendMessage = () => {
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    const patientMessage = { sender: "patient", text: input };
    setMessages((prev) => [...prev, patientMessage]);
    setIsTyping(true);
    ws.send(input);
    setInput("");
  };

  // Upload file (discharge note)
  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload-note", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      alert(result.message || "Discharge note uploaded successfully.");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
    }
  };

  return (
    <div className="main-container">
      {/* Left panel: Upload form + mode toggle */}
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

        <div className="mode-toggle">
          <h3>Chat Mode</h3>
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
      </div>

      {/* Right panel: Chat UI */}
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
