import React, { useState } from "react";

const Login = ({ onLogin }) => {
  const [role, setRole] = useState("patient");
  const [userId, setUserId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId.trim()) return alert("Please enter your ID");
    onLogin(role, userId);
  };

  return (
    <div className="outer-login-container">
      <div className="login-container">
        <h2>Select Role</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              <input
                type="radio"
                name="role"
                value="patient"
                checked={role === "patient"}
                onChange={() => setRole("patient")}
              />
              Patient
            </label>
            <label style={{ marginLeft: "1rem" }}>
              <input
                type="radio"
                name="role"
                value="expert"
                checked={role === "expert"}
                onChange={() => setRole("expert")}
              />
              Expert
            </label>
          </div>
          <input
            type="text"
            placeholder="Enter Id (e.g., patient1)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            
          />
          <br />
          <button type="submit" style={{ marginTop: "10px" }}>Enter Chat</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
