import React, { useState, useEffect } from "react";
import { getUserId } from "../userId";
import API from "../apiBase";
window.addEventListener('error', (e) => alert('JS error: ' + e.message));
function Home() {
  const [stand, setStand] = useState("A");
  const [size, setSize] = useState("0.5L");
  const [qty, setQty] = useState(1);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const sizeMap = { "0.3L": 0.3, "0.5L": 0.5 };
  const userId = getUserId();

  /* handler for placing an order*/
  const placeOrder = () => {
    alert(`Order placed: ${qty} × ${size} at Stand ${stand}`);
    // send the order to the DB
    const body = {
      size: Number(sizeMap[size]),
      quantity: Number(qty),
      userId: userId
    }
    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    }
    console.log("IM HERE!")
    fetch(`${API}/order`, requestOptions)
      .then(res => {if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();})
      .then(data => console.log('Created order: ', data))
      .catch(err => console.error('Order failed: ', err))
  };

  /*handler for retrieving orders*/
  const retrieveOrders = () => {
    setLoading(true);
    fetch(`${API}/orders/${encodeURIComponent(userId)}`)
      .then(res => {if (!res.ok) throw new Error(`HTTP ${res.status}`);
       return res.json();})
      .then(setOrders)
      .catch(err => {console.error('Failed: ', err); setOrders([]);})
      .finally(() => setLoading(false));
  }


  // retrieve orders every 3 seconds
  useEffect(() => {
    retrieveOrders();
    const id = setInterval(retrieveOrders, 3000);
    return () => clearInterval(id);
  }, [userId]);

  return (
    <>
      <div className="card">
        <h2>Order Beer</h2>
        <label>
          Stand
          <select value={stand} onChange={e => setStand(e.target.value)}>
            <option>A</option>
            <option>B</option>
          </select>
        </label>
  
        <label>
          Size
          <select value={size} onChange={e => setSize(e.target.value)}>
            <option>0.3L</option>
            <option>0.5L</option>
          </select>
        </label>
  
        <label>
          Quantity
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
        </label>
  
        <button onClick={placeOrder}>Pay & Order</button>
      </div>
  
      <div style={{ marginTop: 16, padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h3>Your Orders</h3>

        {loading && <p>Loading orders…</p>}
        {!loading && orders.length === 0 && (
          <p>No orders yet for <strong>{userId}</strong>.</p>
        )}

        {!loading && orders.length > 0 && (
          <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Time</th><th>ID</th><th>Size</th><th>Qty</th><th>Price</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{new Date(o.timestamp).toLocaleTimeString()}</td>
                  <td>{o.id.slice(0, 8)}…</td>
                  <td>{o.size}</td>
                  <td>{o.quantity}</td>
                  <td>{o.price}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );  
}

export default Home;

