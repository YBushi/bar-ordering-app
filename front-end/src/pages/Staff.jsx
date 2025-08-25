import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Staff() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = () => {
    fetch(`${API}/orders`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setOrders(data))
      .catch(err => {
        console.error("Failed:", err);
        setOrders([]);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const markReady = async (id) => {
    // Update backend status to completed
    await fetch(`${API}/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    // Optimistic UI: remove from IN_QUEUE list
    setOrders((prev) => prev.filter((o) => o.id !== id));
    // send a notification to the user

  };

  return (
    <div className="card" style={{ padding: 16, gap: 12 }}>
      <h2>Staff Dashboard</h2>
      {orders.length === 0 && <div>No orders in queue.</div>}
      {orders.map((order) => (
        <div key={order.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span>
            Order {order.id} — <b>{order.status}</b>
          </span>
          {order.status == "in_progress" && (
            <button onClick={() => markReady(order.id)}>Mark Ready</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default Staff;
