import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Staff from "./pages/Staff";

function App() {
  return (
    <Router>
      <header>
        <h1>Chalupa u Kajka</h1>
      </header>
      <div className="container">
        <Routes>
          <Route path="/" element={<Staff />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
