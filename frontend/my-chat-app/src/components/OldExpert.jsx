// import React, { useState, useEffect } from "react";
// import "../styles/Chat.css";

// const ExpertChat = () => {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [ws, setWs] = useState(null);

//   useEffect(() => {
//     const socket = new WebSocket("ws://127.0.0.1:8000/ws/expert");
    
//     socket.onopen = () => console.log("Connected to Expert WebSocket");
//     socket.onclose = () => console.log("Disconnected from Expert WebSocket");
//     socket.onerror = (error) => console.error("WebSocket error:", error);

//     socket.onmessage = (event) => {
//       const data = event.data;
//       const patientMessage = { sender: "patient", text: data };
//       setMessages(prevMessages => [...prevMessages, patientMessage]);
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

//     const expertMessage = { sender: "expert", text: input };
//     setMessages([...messages, expertMessage]);

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
//             placeholder="Type a response..."
//           />
//           <button onClick={sendMessage}>Send</button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ExpertChat;
