import React, { useState } from "react";

function Status() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("");

  const checkStatus = () => {
    setStatus("READY (demo)");
  };

  return (
    <div className="card">
      <h2>Check Order Status</h2>
      <label>
        Order ID
        <input value={orderId} onChange={e => setOrderId(e.target.value)} />
      </label>
      <button onClick={checkStatus}>Check</button>
      {status && <p><strong>Status:</strong> {status}</p>}
    </div>
  );
}

export default Status;
