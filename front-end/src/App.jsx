import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Staff from "./pages/Staff";

function App() {
  return (
    <Router>
      <header>
        <h1>🍺 Beer Order MVP</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/staff">Staff</Link>
        </nav>
      </header>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/staff" element={<Staff />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
