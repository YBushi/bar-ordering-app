import React, { useState, useEffect, useRef, useCallback } from "react";
import toast, { Toaster } from 'react-hot-toast';
import { getUserId } from "../userId";
import {API, WS} from "../apiBase";
import RegistrationDialog from "../components/RegistrationDialog";
import { getDeviceToken, deleteDeviceToken } from "../lib/auth";
import { api } from "../lib/api";

window.addEventListener('error', (e) => alert('JS error: ' + e.message));
function Home() {
  const [smallBeerQty, setSmallBeerQty] = useState("1");
  const [largeBeerQty, setLargeBeerQty] = useState("1");
  const [whiskeyQty, setWhiskeyQty] = useState("1");
  const [wineQty, setWineQty] = useState("1");
  const [vodkaQty, setVodkaQty] = useState("1");
  const [borovickaQty, setBorovickaQty] = useState("1");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [currentOrder, setCurrentOrder] = useState({ small_beer: 0, large_beer: 0, whiskey: 0, wine: 0, vodka: 0, borovicka: 0 });
  const PRICES = { small_beer: 2.7, large_beer: 3.2, whiskey: 3.0, wine: 4.0, vodka: 2.5, borovicka: 2.0 };
  const userId = getUserId();
  const wsRef = useRef(null);
  const didConnect = useRef(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  useEffect(() => {
    if (didConnect.current) return;
    didConnect.current = true;

    const ws = new WebSocket(WS);
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WS connected");
    
    /* handler for receiving message from the server */
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type !== "ORDER_STATUS") return;
      alert("ORDER COMPLETED!");
      retrieveOrders();
    }

    ws.onclose = () => console.log("WS closed");
    ws.onerror = (e) => console.error("WS error", e);
      return () => {
        try { ws.close(); } catch {}
        wsRef.current = null;
        didConnect.current = false;
      };
    }, []);

  /* handler for placing an order (posts entire currentOrder items)*/
  const placeOrder = () => {
    const items = Object.fromEntries(
      Object.entries(currentOrder)
        .map(([k, v]) => [k, Number(v)])     
        .filter(([, q]) => q > 0)            
    );
    if (Object.keys(items).length === 0) {
      toast.error("Choose at least one item");
      return Promise.reject(new Error("empty order"));
    }
    const body = { items, userId };
    return fetch(`${API}/order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { toast.success("Order has been placed!"); return data; })
      .catch(err => { console.error('Order failed: ', err); throw err; });
  };

  const addToCurrentOrder = (key, qty) => {
    const qtyNum = Math.max(1, parseInt(qty, 10) || 0);
    setCurrentOrder(prev => {
      return { ...prev, [key]: (prev[key] || 0) + qtyNum };
    }); 
    toast.success("Added to order!")
    if (key === 'small_beer') setSmallBeerQty("1");
    if (key === 'large_beer') setLargeBeerQty("1");
    if (key === 'whiskey') setWhiskeyQty("1");
    if (key === 'wine') setWineQty("1");
    if (key === 'vodka') setVodkaQty("1");
    if (key === 'borovicka') setBorovickaQty("1");
  };

  const submitCurrentOrder = async () => {
    const totalCount = Object.values(currentOrder).reduce((a, b) => a + (b || 0), 0);
    if (totalCount === 0) return;
    try {
      await placeOrder();
    } finally {
      setCurrentOrder({ small_beer: 0, large_beer: 0, whiskey: 0, wine: 0, vodka: 0, borovicka: 0 });
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

  const checkAuth = useCallback(async () => {
    const token = getDeviceToken();
    if (!token) {
      setNeedsRegistration(true);
      return;
    }
    try {
      // Only Home requires auth, so we verify here
      await api("/me/tab"); // lightweight protected ping
      setNeedsRegistration(false);
    } catch (e) {
      if (e.message === "UNAUTHENTICATED") {
        deleteDeviceToken();
        setNeedsRegistration(true);
      } else {
        // Not auth-related; show your normal UI and maybe a toast
        setNeedsRegistration(false);
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    
      <div style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
        width: "100%",
        padding: 16,
        boxSizing: "border-box"
      }}>
        <Toaster position="bottom-right" reverseOrder={false} />
        <RegistrationDialog
          open={needsRegistration}
          onRegistered={() => setNeedsRegistration(false)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button
            onClick={() => { deleteDeviceToken(); setNeedsRegistration(true); }}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #2a2f39", background: "#0e1116", color: "#e9ecef", cursor: "pointer" }}
          >
            Change device / re-register
          </button>
        </div>

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
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(PRICES.small_beer).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <input type="number" min="1" value={smallBeerQty} onChange={e => setSmallBeerQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => needsRegistration ? setNeedsRegistration(true) : addToCurrentOrder('small_beer', smallBeerQty)} disabled={needsRegistration} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
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
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(PRICES.large_beer).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <input type="number" min="1" value={largeBeerQty} onChange={e => setLargeBeerQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('large_beer', largeBeerQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Whiskey */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 10px", background: "linear-gradient(45deg, #8d5524, #c97b45)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 3px 10px rgba(201, 123, 69, 0.35)" }}>🥃</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Whiskey</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(PRICES.whiskey).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={whiskeyQty} onChange={(e) => setWhiskeyQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('whiskey', whiskeyQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Vodka */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 10px", background: "linear-gradient(45deg, #a1c4fd, #c2e9fb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 3px 10px rgba(161,196,253,0.35)" }}>🍸</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Vodka</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(PRICES.vodka).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={vodkaQty} onChange={(e) => setVodkaQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('vodka', vodkaQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Wine */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 10px", background: "linear-gradient(45deg, #ff6b6b, #f06595)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 3px 10px rgba(240, 101, 149, 0.35)" }}>🍷</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Wine</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(PRICES.wine).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={wineQty} onChange={(e) => setWineQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('wine', wineQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
          </div>

          {/* Borovička */}
          <div className="card" style={{ width: "90%", minWidth: 0, height: 260, background: "#121418", color: "#e9ecef", border: "1px solid #1e222a", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 10px", background: "linear-gradient(45deg, #74c69d, #34a853)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 3px 10px rgba(52,168,83,0.35)" }}>🌿</div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e9ecef", fontWeight: 700 }}>Borovička</h2>
              <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{String(PRICES.borovicka).replace('.', ',')} €</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                <input type="number" min="1" value={borovickaQty} onChange={(e) => setBorovickaQty(e.target.value)} style={{ width: 100, padding: "6px 8px", border: "2px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => addToCurrentOrder('borovicka', borovickaQty)} style={{ width: "100%", padding: 10, background: "linear-gradient(90deg,#ffd166,#fca311)", color: "#0b0d12", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🛒 Add To Order</button>
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
              {currentOrder.small_beer > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Small Beer (0.3L)</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('small_beer')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.small_beer}</span>
                    <button onClick={() => incrementItem('small_beer')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.large_beer > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Large Beer (0.5L)</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('large_beer')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.large_beer}</span>
                    <button onClick={() => incrementItem('large_beer')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.whiskey > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Whiskey</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('whiskey')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.whiskey}</span>
                    <button onClick={() => incrementItem('whiskey')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.vodka > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Vodka</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('vodka')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.vodka}</span>
                    <button onClick={() => incrementItem('vodka')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.wine > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Wine</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('wine')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.wine}</span>
                    <button onClick={() => incrementItem('wine')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.borovicka > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>Borovička</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: 140 }}>
                    <button onClick={() => decrementItem('borovicka')} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2f39', background: '#0e1116', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ minWidth: 36, textAlign: 'center' }}>{currentOrder.borovicka}</span>
                    <button onClick={() => incrementItem('borovicka')} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg,#ffd166,#fca311)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {Object.values(currentOrder).reduce((a, b) => a + (b || 0), 0) === 0 && (
                <div style={{ color: "#818997", fontStyle: "italic" }}>No items added yet.</div>
              )}
              <div style={{ height: 1, background: "#1e222a", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total</span>
                <span>{(Object.entries(currentOrder).reduce((sum, [k, v]) => sum + (PRICES[k] || 0) * (v || 0), 0)).toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setCurrentOrder({ small_beer: 0, large_beer: 0, whiskey: 0, wine: 0, vodka: 0, borovicka: 0 })} style={{ flex: 1, padding: 10, background: "#0e1116", color: "#e9ecef", border: "1px solid #2a2f39", borderRadius: 8, cursor: "pointer" }}>Clear</button>
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
          fontSize: "20px",
          fontWeight: 700
        }}>📋 Your Orders</h3>

        {loading && <p style={{ color: "#c9ced6", fontSize: "16px" }}>⏳ Loading orders…</p>}
        {!loading && orders.length === 0 && (
          <p style={{ color: "#c9ced6", fontSize: "16px" }}>
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
            fontSize: "14px"
          }}>
            <thead>
              <tr style={{ background: "linear-gradient(45deg, #1e222a, #2a2f39)" }}>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "16px" }}>⏰ Order Time</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "16px" }}>📦 Items</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "16px" }}>💰 Price</th>
                <th style={{ padding: "8px", color: "#e9ecef", textAlign: "left", fontSize: "16px" }}>📊 Status</th>
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
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "14px", color: "#c9ced6" }}>{new Date(o.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "14px", color: "#c9ced6" }}>
                    {o.items && o.items.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {o.items.filter(item => item.quantity > 0).map((item, idx) => (
                          <span key={idx} style={{ fontSize: "13px" }}>
                            {item.name}: {item.quantity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: "13px", color: "#818997" }}>No items</span>
                    )}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "14px", color: "#c9ced6" }}>
                    {o.totalPrice ? `${o.totalPrice.toFixed(2).replace('.', ',')} €` : 'N/A'}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #2a2f39", fontSize: "14px", color: "#c9ced6" }}>{o.status}</td>
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
