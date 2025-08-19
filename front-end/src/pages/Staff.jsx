import React, { useState } from "react";

function Staff() {
  const [orders, setOrders] = useState([
    { id: "1", status: "IN_QUEUE" },
    { id: "2", status: "PREPARING" },
  ]);

  const markReady = (id) => {
    setOrders(o => o.map(order => order.id === id ? { ...order, status: "READY" } : order));
  };

  return (
    <div className="card">
      <h2>Staff Dashboard</h2>
      {orders.map(order => (
        <div key={order.id}>
          <span>Order {order.id} — {order.status}</span>
          {order.status === "IN_QUEUE" && <button onClick={() => markReady(order.id)}>Mark Ready</button>}
        </div>
      ))}
    </div>
  );
}

export default Staff;
