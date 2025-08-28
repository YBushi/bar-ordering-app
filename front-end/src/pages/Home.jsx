import React, { useState, useEffect, useRef } from "react";
import toast, { Toaster } from 'react-hot-toast';
import { getUserId } from "../userId";
import API from "../apiBase";
const WS_URL = (API || "").replace(/^http/, "ws") + "/ws";

window.addEventListener('error', (e) => alert('JS error: ' + e.message));
function Home() {
  const [smallQty, setSmallQty] = useState("1");
  const [largeQty, setLargeQty] = useState("1");
  const [sodaQty, setSodaQty] = useState("1");
  const [waterQty, setWaterQty] = useState("1");
  const [wineQty, setWineQty] = useState("1");
  const [ciderQty, setCiderQty] = useState("1");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [currentOrder, setCurrentOrder] = useState({ smallQty: 0, largeQty: 0, sodaQty: 0, waterQty: 0, wineQty: 0, ciderQty: 0 });
  const SMALL_PRICE = 2.5;
  const LARGE_PRICE = 3.2;
  const SODA_PRICE = 2.0;   // placeholder
  const WATER_PRICE = 1.5;  // placeholder
  const WINE_PRICE = 4.0;   // placeholder
  const CIDER_PRICE = 3.5;  // placeholder
  const sizeMap = { "0.3L": 0.3, "0.5L": 0.5 };
  const userId = getUserId();
  const wsRef = useRef(null);
  const didConnect = useRef(null);

  useEffect(() => {
    if (didConnect.current) return;
    didConnect.current = true;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WS connected");
    
    /* handler for receiving message from the server */
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type !== "ORDER_STATUS") return;
      alert("ORDER COMPLETED!");
    }

    ws.onclose = () => console.log("WS closed");
    ws.onerror = (e) => console.error("WS error", e);
      return () => {
        try { ws.close(); } catch {}
        wsRef.current = null;
        didConnect.current = false;
      };
    }, []);

  /* handler for placing an order*/
  const placeOrder = (size, qty) => {
    const qtyNum = Math.max(1, parseInt(qty, 10) || 0);
    // send the order to the DB
    const body = {
      size: Number(size),
      quantity: Number(qtyNum),
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
      toast.success("Order has been placed!")
  };

  const addToCurrentOrder = (size, qty) => {
    const qtyNum = Math.max(1, parseInt(qty, 10) || 0);
    setCurrentOrder(prev => {
      if (size === 0.3) return { ...prev, smallQty: prev.smallQty + qtyNum };
      if (size === 0.5) return { ...prev, largeQty: prev.largeQty + qtyNum };
      if (size === 'soda') return { ...prev, sodaQty: prev.sodaQty + qtyNum };
      if (size === 'water') return { ...prev, waterQty: prev.waterQty + qtyNum };
      if (size === 'wine') return { ...prev, wineQty: prev.wineQty + qtyNum };
      if (size === 'cider') return { ...prev, ciderQty: prev.ciderQty + qtyNum };
      return prev;
    }); 
    toast.success("Added to order!")
    if (size === 0.3) setSmallQty("1");
    if (size === 0.5) setLargeQty("1");
    if (size === 'soda') setSodaQty("1");
    if (size === 'water') setWaterQty("1");
    if (size === 'wine') setWineQty("1");
    if (size === 'cider') setCiderQty("1");
  };

  const submitCurrentOrder = async () => {
    const ops = [];
    if (currentOrder.smallQty > 0) ops.push(placeOrder(0.3, String(currentOrder.smallQty)));
    if (currentOrder.largeQty > 0) ops.push(placeOrder(0.5, String(currentOrder.largeQty)));
    // Frontend-only for other drinks: do not push to backend
    if (ops.length === 0) return;
    try { await Promise.all(ops); } finally {
      setCurrentOrder({ smallQty: 0, largeQty: 0, sodaQty: 0, waterQty: 0, wineQty: 0, ciderQty: 0 });
      retrieveOrders();
    }
  };

  // Adjust quantities inside the order panel
  const incrementItem = (key) => {
    setCurrentOrder(prev => ({ ...prev, [key]: prev[key] + 1 }));
  };

  const decrementItem = (key) => {
    setCurrentOrder(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
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
  // useEffect(() => {
  //   wsRef.current = ws;

  //   ws.onopen = () => console.log("✅ WS connected");
  //   ws.onerror = (e) => console.error("❌ WS error", e);
  //   ws.onmessage = (evt) => {
  //     try {
  //       const msg = JSON.parse(evt.data)
  //       if (msg.type !== "ORDER_STATUS") return;
        
  //       const id = msg.orderID;
  //       const status = String(msg.status || "").toUpperCase();
  //       if (!id || !status) return;
  //       setMessage({ id, status });
  //       setTimeout(() => setMessage(null), 3000);
  //       return () => { clearInterval(ping); ws.close(); };
  //     } catch {}
  //   };
  // })
  

  // retrieve orders every 3 seconds
  useEffect(() => {
    retrieveOrders();
  }, [userId]);

  return (
    
      <div style={{
        backgroundImage: "url('/tehelne-pole.jpg'), url('https://upload.wikimedia.org/wikipedia/commons/7/75/Teheln%C3%A9_pole_stadium_2019.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
        width: "100%",
        padding: 16,
        boxSizing: "border-box"
      }}>
        <Toaster position="bottom-right" reverseOrder={false} />
      <div className="w-full max-w-screen-xl mx-auto px-4">
        <style>{`
          .gridLayout { display: grid; grid-template-columns: 3fr 1fr; gap: 28px; align-items: start; }
          .drinksGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
          @media (max-width: 1024px) { .gridLayout { grid-template-columns: 1fr; } }
          @media (max-width: 640px) { .drinksGrid { grid-template-columns: 1fr; } }
        `}</style>
        <div className="gridLayout" style={{ width: "100%", marginBottom: 24 }}>
          <div>
            <div className="drinksGrid">
          {/* Small Beer */}
          <div className="card" style={{ 
            width: "90%",
            minWidth: "0",
            height: "260px",
            background: "#121418",
            color: "#e9ecef",
            border: "1px solid #1e222a",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
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
                width: "64px",
                height: "64px",
                margin: "0 auto 10px",
                background: "linear-gradient(45deg, #ffd700, #ffed4e)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                boxShadow: "0 3px 10px rgba(255, 215, 0, 0.3)"
              }}>
                🍺
              </div>
              <h2 style={{ margin: 0, color: "#e9ecef", fontSize: 20, fontWeight: 700 }}>Small Beer</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>2,5 €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <input type="number" min="1" value={smallQty} onChange={e => setSmallQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder(0.3, smallQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Large Beer */}
          <div className="card" style={{ 
            width: "90%",
            minWidth: "0",
            height: "260px",
            background: "#121418",
            color: "#e9ecef",
            border: "1px solid #1e222a",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 10px", background: "linear-gradient(45deg, #dc3545, #fd7e14)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 3px 10px rgba(220, 53, 69, 0.3)" }}>🍺</div>
              <h2 style={{ margin: 0, color: "#e9ecef", fontSize: 20, fontWeight: 700 }}>Large Beer</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>3,2 €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <input type="number" min="1" value={largeQty} onChange={e => setLargeQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder(0.5, largeQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Soda */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 10px",
                background: "linear-gradient(45deg, #4dabf7, #228be6)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                boxShadow: "0 3px 10px rgba(34, 139, 230, 0.35)"
              }}>🥤</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Soda</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(SODA_PRICE).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={sodaQty} onChange={(e) => setSodaQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('soda', sodaQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Water */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 10px",
                background: "linear-gradient(45deg, #74c0fc, #4dabf7)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                boxShadow: "0 3px 10px rgba(77, 171, 247, 0.35)"
              }}>💧</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Water</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(WATER_PRICE).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={waterQty} onChange={(e) => setWaterQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('water', waterQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Wine */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 10px",
                background: "linear-gradient(45deg, #ff6b6b, #f06595)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                boxShadow: "0 3px 10px rgba(240, 101, 149, 0.35)"
              }}>🍷</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Wine</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(WINE_PRICE).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={wineQty} onChange={(e) => setWineQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('wine', wineQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Cider */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 10px",
                background: "linear-gradient(45deg, #ffd43b, #fab005)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                boxShadow: "0 3px 10px rgba(250, 176, 5, 0.35)"
              }}>🍎</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Cider</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(CIDER_PRICE).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={ciderQty} onChange={(e) => setCiderQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('cider', ciderQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>
            </div>
          </div>
          <div className="orderCol" style={{ position: "sticky", top: 24, paddingRight: 16 }}>
            <div className="card" style={{ width: "100%", minWidth: 0, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span>🛒</span>
              <strong>Your Order</strong>
            </div>
            <div style={{ fontSize: 14, color: "#c9ced6" }}>
              {currentOrder.smallQty > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Small Beer (0.3L)</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('smallQty')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.smallQty}</span>
                    <button onClick={() => incrementItem('smallQty')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.largeQty > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Large Beer (0.5L)</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('largeQty')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.largeQty}</span>
                    <button onClick={() => incrementItem('largeQty')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.sodaQty > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Soda</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('sodaQty')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.sodaQty}</span>
                    <button onClick={() => incrementItem('sodaQty')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.waterQty > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Water</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('waterQty')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.waterQty}</span>
                    <button onClick={() => incrementItem('waterQty')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.wineQty > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Wine</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('wineQty')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.wineQty}</span>
                    <button onClick={() => incrementItem('wineQty')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.ciderQty > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Cider</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('ciderQty')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.ciderQty}</span>
                    <button onClick={() => incrementItem('ciderQty')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.smallQty + currentOrder.largeQty + currentOrder.sodaQty + currentOrder.waterQty + currentOrder.wineQty + currentOrder.ciderQty === 0 && (
                <div style={{ color: "#818997", fontStyle: "italic" }}>No items added yet.</div>
              )}
              <div style={{ height: 1, background: "#1e222a", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total</span>
                <span>{(
                  currentOrder.smallQty * SMALL_PRICE +
                  currentOrder.largeQty * LARGE_PRICE +
                  currentOrder.sodaQty * SODA_PRICE +
                  currentOrder.waterQty * WATER_PRICE +
                  currentOrder.wineQty * WINE_PRICE +
                  currentOrder.ciderQty * CIDER_PRICE
                ).toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setCurrentOrder({ smallQty: 0, largeQty: 0, sodaQty: 0, waterQty: 0, wineQty: 0, ciderQty: 0 })} style={{ flex: 1, padding: 10, background: "#0e1116", color: "#e9ecef", border: "1px solid #2a2f39", borderRadius: 8, cursor: "pointer" }}>Clear</button>
            <button onClick={submitCurrentOrder} style={{ flex: 2, padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}>Make Order</button>
          </div>
        </div>
        </div>
      </div>

      <div style={{ 
        marginTop: 16, 
        padding: "16px", 
        border: "1px solid #1e222a", 
        borderRadius: 12,
        background: "#121418",
        color: "#e9ecef",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        maxHeight: "300px",
        overflow: "auto",
        boxSizing: "border-box",
        width: "100%",
        marginLeft: "auto",
        marginRight: "auto"
      }}>
        <h3 style={{ 
          margin: "0 0 12px", 
          color: "#e9ecef",
          fontSize: "18px",
          fontWeight: 700
        }}>📋 Your Orders</h3>

        {loading && <p style={{ color: "#c9ced6", fontSize: "14px" }}>⏳ Loading orders…</p>}
        {!loading && orders.length === 0 && (
          <p style={{ color: "#c9ced6", fontSize: "14px" }}>
            No orders yet for <strong style={{ color: "#e9ecef" }}>{userId}</strong>.
          </p>
        )}

        {!loading && orders.length > 0 && (
          <table style={{ 
            width: "100%", 
            marginTop: "0.5rem", 
            borderCollapse: "collapse",
            background: "transparent",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            fontSize: "12px"
          }}>
            <thead>
              <tr style={{ background: "linear-gradient(45deg, #1e222a, #2a2f39)" }}>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "12px" }}>⏰ Time</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "12px" }}>🆔 ID</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "12px" }}>📏 Size</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "12px" }}>🔢 Qty</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "12px" }}>💰 Price</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "12px" }}>📊 Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, index) => (
                <tr key={o.id} style={{ 
                  background: index % 2 === 0 ? "#0e1116" : "#161a21",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#222734"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#0e1116" : "#161a21"}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "12px", color: "#c9ced6" }}>{new Date(o.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "12px", color: "#c9ced6" }}>{o.id.slice(0, 8)}…</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "12px", color: "#c9ced6" }}>{o.size}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "12px", color: "#c9ced6" }}>{o.quantity}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "12px", color: "#c9ced6" }}>{o.price}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "12px", color: "#c9ced6" }}>{o.status}</td>
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
  </div>
  </div> 
  );  
}

export default Home;
