// import React from "react";
// import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// import PatientChat from "./components/PatientChat";  // Your Patient Chat Component
// import ExpertChat from "./components/ExpertChat";    // Your Expert Chat Component
// import Login from "./components/Login";
// import './styles/Chat.css';
// import React, { useState } from "react";


// const App = () => {
//   // return (
//   //   <Router>
//   //     {/* <div className="nav-bar">
//   //       <Link to="/patient">Patient Chat</Link>
//   //       <Link to="/expert">Expert Chat</Link>
//   //     </div> */}

//   //     <Routes>
//   //       <Route path="/" element={<PatientChat />} />
//   //       <Route path="/patient" element={<PatientChat />} />
//   //       <Route path="/expert" element={<ExpertChat />} />
//   //     </Routes>
//   //   </Router>
//   // );

//     const [role, setRole] = useState(null);
//     const [userId, setUserId] = useState("");
  
//     const handleLogin = (selectedRole, id) => {
//       setRole(selectedRole);
//       setUserId(id);
//     };
  
//     if (!role || !userId) {
//       return <Login onLogin={handleLogin} />;
//     }
  
//     return role === "patient" ? (
//       <PatientChat userId={userId} />
//     ) : (
//       <ExpertChat userId={userId} />
//     );
  
// };

// export default App;

import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import PatientChat from "./components/PatientChat";
import ExpertChat from "./components/ExpertChat";
import Login from "./components/Login";

const App = () => {
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState("");

  return (
    <Router>
      <Routes>
        {/* Initial Login Route */}
        <Route path="/" element={<LoginWrapper setRole={setRole} setUserId={setUserId} />} />

        {/* Patient and Expert Chat Routes */}
        <Route
          path="/patient"
          element={
            role === "patient" && userId ? (
              <PatientChat userId={userId} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/expert"
          element={
            role === "expert" && userId ? (
              <ExpertChat userId={userId} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

// Helper wrapper to redirect after login
const LoginWrapper = ({ setRole, setUserId }) => {
  const navigate = useNavigate();

  const handleLogin = (selectedRole, id) => {
    setRole(selectedRole);
    setUserId(id);
    navigate(`/${selectedRole}`); // redirect to /patient or /expert
  };

  return <Login onLogin={handleLogin} />;
};

export default App;

