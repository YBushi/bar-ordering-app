import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import { getUserId } from "../userId";
import API from "../apiBase";
const WS_URL = (API || "").replace(/^http/, "ws") + "/ws";

window.addEventListener('error', (e) => alert('JS error: ' + e.message));
function Home() {
  const [smallQty, setSmallQty] = useState(1);
  const [largeQty, setLargeQty] = useState(1);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const sizeMap = { "0.3L": 0.3, "0.5L": 0.5 };
  const userId = getUserId();
  const ws = new WebSocket(WS_URL);
  const wsRef = useRef(null);
  const dismissedRef = useRef(new Set());

  /* handler for placing an order*/
  const placeOrder = (size, qty) => {
    alert(`Order placed: ${qty} × ${size}L`);
    // send the order to the DB
    const body = {
      size: Number(size),
      quantity: Number(qty),
      userId: userId
    }
    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    }
    fetch(`${API}/order`, requestOptions)
      .then(res => {if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();})
      .then(data => console.log('Created order: ', data))
      .catch(err => console.error('Order failed: ', err))
  };

  /*handler for retrieving orders*/
  const retrieveOrders = () => {
    setLoading(true);
    fetch(`${API}/orders?userID=${encodeURIComponent(userId)}`)
      .then(res => {if (!res.ok) throw new Error(`HTTP ${res.status}`);
       return res.json();})
      .then(setOrders)
      .catch(err => {console.error('Failed: ', err); setOrders([]);})
      .finally(() => setLoading(false));
  }

  // useEffect(() => {
  //   const ws = new WebSocket(WS_URL);

  //   ws.onmessage = (evt) => {
  //     const msg = JSON.parse(evt.data);
  //     if (msg.type !== "ORDER_STATUS") return ;
  //   };

  //   // keep-alive ping (matches server loop)
  //   const ping = setInterval(() => {
  //     if (ws.readyState === 1) ws.send("ping");
  //   }, 20000);

  //   return () => { clearInterval(ping); ws.close(); };
  // }, []);
  useEffect(() => {
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WS connected");
    ws.onerror = (e) => console.error("❌ WS error", e);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type !== "ORDER_STATUS") return;
        
        const id = msg.orderID;
        const status = String(msg.status || "").toUpperCase();
        if (!id || !status) return;
        setMessage({ id, status });
        setTimeout(() => setMessage(null), 3000);
        return () => { clearInterval(ping); ws.close(); };
      } catch {}
    };
  })
  

  // retrieve orders every 3 seconds
  useEffect(() => {
    retrieveOrders();
    const id = setInterval(retrieveOrders, 3000);
    return () => clearInterval(id);
  }, [userId]);

  return (
    <>
      <div style={{ 
        display: "flex", 
        gap: "20px", 
        marginBottom: "20px",
        justifyContent: "center",
        flexWrap: "nowrap"
      }}>
        <div className="card" style={{ 
          flex: "1", 
          minWidth: "200px", 
          maxWidth: "300px",
          height: "280px",
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          border: "2px solid #dee2e6",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.boxShadow = "0 12px 35px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
        }}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 12px",
              background: "linear-gradient(45deg, #ffd700, #ffed4e)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              boxShadow: "0 3px 10px rgba(255, 215, 0, 0.3)"
            }}>
              🍺
            </div>
            <h2 style={{ 
              margin: "0", 
              color: "#495057", 
              fontSize: "20px",
              fontWeight: "600"
            }}>Small Beer</h2>
            <p style={{ 
              margin: "6px 0 0", 
              color: "#6c757d", 
              fontSize: "14px",
              fontWeight: "500"
            }}>0.3L - Perfect Size</p>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "6px",
              fontWeight: "500",
              color: "#495057",
              fontSize: "14px"
            }}>
              Quantity
            </label>
            <input 
              type="number" 
              min="1" 
              value={smallQty} 
              onChange={e => setSmallQty(parseInt(e.target.value) || 1)} 
              style={{
                width: "100%",
                padding: "8px",
                border: "2px solid #ced4da",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#007bff"}
              onBlur={(e) => e.target.style.borderColor = "#ced4da"}
            />
          </div>
          
          <button 
            onClick={() => placeOrder(0.3, smallQty)}
            style={{
              width: "100%",
              padding: "10px",
              background: "linear-gradient(45deg, #28a745, #20c997)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.02)";
              e.target.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "none";
            }}
          >
            🛒 Order Small Beer
          </button>
        </div>

        <div className="card" style={{ 
          flex: "1", 
          minWidth: "200px", 
          maxWidth: "300px",
          height: "280px",
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          border: "2px solid #dee2e6",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.boxShadow = "0 12px 35px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
        }}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 12px",
              background: "linear-gradient(45deg, #dc3545, #fd7e14)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              boxShadow: "0 3px 10px rgba(220, 53, 69, 0.3)"
            }}>
              🍺
            </div>
            <h2 style={{ 
              margin: "0", 
              color: "#495057", 
              fontSize: "20px",
              fontWeight: "600"
            }}>Large Beer</h2>
            <p style={{ 
              margin: "6px 0 0", 
              color: "#6c757d", 
              fontSize: "14px",
              fontWeight: "500"
            }}>0.5L - Bigger & Better</p>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "6px",
              fontWeight: "500",
              color: "#495057",
              fontSize: "14px"
            }}>
              Quantity
            </label>
            <input 
              type="number" 
              min="1" 
              value={largeQty} 
              onChange={e => setLargeQty(parseInt(e.target.value) || 1)} 
              style={{
                width: "100%",
                padding: "8px",
                border: "2px solid #ced4da",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#007bff"}
              onBlur={(e) => e.target.style.borderColor = "#ced4da"}
            />
          </div>
          
          <button 
            onClick={() => placeOrder(0.5, largeQty)}
            style={{
              width: "100%",
              padding: "10px",
              background: "linear-gradient(45deg, #dc3545, #fd7e14)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.02)";
              e.target.style.boxShadow = "0 6px 20px rgba(220, 53, 69, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "none";
            }}
          >
            🛒 Order Large Beer
          </button>
        </div>
      </div>

      <div style={{ 
        marginTop: 16, 
        padding: "16px", 
        border: "2px solid #dee2e6", 
        borderRadius: "12px",
        background: "white",
        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        maxHeight: "300px",
        overflow: "auto"
      }}>
        <h3 style={{ 
          margin: "0 0 12px", 
          color: "#495057",
          fontSize: "18px",
          fontWeight: "600"
        }}>📋 Your Orders</h3>

        {loading && <p style={{ color: "#6c757d", fontSize: "14px" }}>⏳ Loading orders…</p>}
        {!loading && orders.length === 0 && (
          <p style={{ color: "#6c757d", fontSize: "14px" }}>
            No orders yet for <strong style={{ color: "#495057" }}>{userId}</strong>.
          </p>
        )}

        {!loading && orders.length > 0 && (
          <table style={{ 
            width: "100%", 
            marginTop: "0.5rem", 
            borderCollapse: "collapse",
            background: "white",
            borderRadius: "6px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            fontSize: "12px"
          }}>
            <thead>
              <tr style={{ background: "linear-gradient(45deg, #495057, #6c757d)" }}>
                <th style={{ padding: "8px", color: "white", textAlign: "left", fontSize: "12px" }}>⏰ Time</th>
                <th style={{ padding: "8px", color: "white", textAlign: "left", fontSize: "12px" }}>🆔 ID</th>
                <th style={{ padding: "8px", color: "white", textAlign: "left", fontSize: "12px" }}>📏 Size</th>
                <th style={{ padding: "8px", color: "white", textAlign: "left", fontSize: "12px" }}>🔢 Qty</th>
                <th style={{ padding: "8px", color: "white", textAlign: "left", fontSize: "12px" }}>💰 Price</th>
                <th style={{ padding: "8px", color: "white", textAlign: "left", fontSize: "12px" }}>📊 Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, index) => (
                <tr key={o.id} style={{ 
                  background: index % 2 === 0 ? "#f8f9fa" : "white",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e9ecef"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#f8f9fa" : "white"}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #dee2e6", fontSize: "12px" }}>{new Date(o.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #dee2e6", fontSize: "12px" }}>{o.id.slice(0, 8)}…</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #dee2e6", fontSize: "12px" }}>{o.size}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #dee2e6", fontSize: "12px" }}>{o.quantity}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #dee2e6", fontSize: "12px" }}>{o.price}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #dee2e6", fontSize: "12px" }}>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        <div
    aria-live="polite"
    style={{
      position: "fixed",
      top: 16,
      right: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      zIndex: 1000,
    }}
  >
    {message && (
  <div
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      padding: "16px 20px",
      background: "linear-gradient(45deg, #28a745, #20c997)",
      color: "white",
      border: "none",
      borderRadius: "12px",
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
      zIndex: 1000,
      fontSize: "14px",
      fontWeight: "500"
    }}
  >
    🎉 Order <b>{message.id}</b> is now <b>{message.status}</b>.
  </div>
)}
  </div>
    </>
  );  
}

export default Home;

