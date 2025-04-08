import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import PatientChat from "./components/PatientChat";  // Your Patient Chat Component
import ExpertChat from "./components/ExpertChat";    // Your Expert Chat Component
import './styles/Chat.css';

const App = () => {
  return (
    <Router>
      {/* <div className="nav-bar">
        <Link to="/patient">Patient Chat</Link>
        <Link to="/expert">Expert Chat</Link>
      </div> */}

      <Routes>
        <Route path="/" element={<PatientChat />} />
        <Route path="/patient" element={<PatientChat />} />
        <Route path="/expert" element={<ExpertChat />} />
      </Routes>
    </Router>
  );
};

export default App;
