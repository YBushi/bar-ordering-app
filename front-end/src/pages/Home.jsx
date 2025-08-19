import React, { useState } from "react";

function Home() {
  const [stand, setStand] = useState("A");
  const [size, setSize] = useState("0.5L");
  const [qty, setQty] = useState(1);
  const sizeMap = { "0.3L": 0.3, "0.5L": 0.5 };

  const placeOrder = () => {
    alert(`Order placed: ${qty} × ${size} at Stand ${stand}`);
    // send the order to the DB
    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({size: Number(sizeMap[size]), quantity: Number(qty)})
    }
    console.log("IM HERE!")
    fetch('http://localhost:8000/order', requestOptions)
      .then(res => {if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();})
      .then(data => console.log('Created order: ', data))
      .catch(err => console.error('Order failed: ', err))
  };

  return (
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
  );
}

export default Home;
