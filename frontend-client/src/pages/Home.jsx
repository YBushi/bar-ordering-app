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
  const placeOrder = async () => {
    const items = Object.fromEntries(
      Object.entries(currentOrder)
        .map(([k, v]) => [k, Number(v)])     
        .filter(([, q]) => q > 0)            
    );
    if (Object.keys(items).length === 0) {
      toast.error("Choose at least one item");
      throw new Error("empty order");
    }
    const body = { items, userId };
    try {
      const data = await api("/order", {
        method: 'POST',
        body: JSON.stringify(body)
      });
      toast.success("Order has been placed!");
      return data;
    } catch (err) {
      console.error('Order failed: ', err);
      toast.error(err instanceof Error ? err.message : "Failed to place order");
      throw err;
    }
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
    retrieveOrders();
  }, [checkAuth]);

  // Drink images - using high-quality Unsplash URLs
  const drinkImages = {
    small_beer: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop",
    large_beer: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=300&fit=crop",
    whiskey: "https://images.unsplash.com/photo-1608847891746-451a0b65b0c1?w=400&h=300&fit=crop",
    wine: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
    vodka: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=400&h=300&fit=crop",
    borovicka: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop"
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0f1419 100%)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      minHeight: "100vh",
      width: "100%",
      padding: "24px 16px",
      boxSizing: "border-box",
      position: "relative"
    }}>
      {/* Background overlay for depth */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "radial-gradient(circle at 20% 50%, rgba(255, 209, 102, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(252, 163, 17, 0.08) 0%, transparent 50%)",
        pointerEvents: "none",
        zIndex: 0
      }} />
      
      <div style={{ position: "relative", zIndex: 1 }}>
        <Toaster position="bottom-right" reverseOrder={false} />
        <RegistrationDialog
          open={needsRegistration}
          onRegistered={() => setNeedsRegistration(false)}
        />
        
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 32,
          maxWidth: "1400px",
          margin: "0 auto 32px",
          padding: "0 16px"
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: "32px", 
            fontWeight: 800,
            background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.5px"
          }}>
            🍻 Bar Menu
          </h1>
          <button
            onClick={() => { deleteDeviceToken(); setNeedsRegistration(true); }}
            style={{ 
              fontSize: 13, 
              padding: "8px 16px", 
              borderRadius: 10, 
              border: "1px solid rgba(255, 255, 255, 0.1)", 
              background: "rgba(18, 20, 24, 0.8)",
              backdropFilter: "blur(10px)",
              color: "#e9ecef", 
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(18, 20, 24, 0.8)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            Change Device
          </button>
        </div>

      <div className="w-full max-w-screen-xl mx-auto px-4">
        <style>{`
          .gridLayout { display: grid; grid-template-columns: 3fr 1fr; gap: 32px; align-items: start; }
          .drinksGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
          @media (max-width: 1024px) { .gridLayout { grid-template-columns: 1fr; } }
          @media (max-width: 768px) { .drinksGrid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 640px) { .drinksGrid { grid-template-columns: 1fr; } }
          .drinkCard {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .drinkCard:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          }
        `}</style>
        <div className="gridLayout" style={{ width: "100%", marginBottom: 32 }}>
          <div>
            <div className="drinksGrid">
          {/* Small Beer */}
          <div className="drinkCard" style={{ 
            width: "100%",
            minWidth: "0",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(20px)",
            color: "#e9ecef",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer"
          }}>
            {/* Image Header */}
            <div style={{
              width: "100%",
              height: "180px",
              backgroundImage: `url(${drinkImages.small_beer})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)"
              }} />
              <div style={{
                position: "absolute",
                top: 12,
                right: 12,
                padding: "6px 12px",
                background: "rgba(255, 209, 102, 0.95)",
                backdropFilter: "blur(10px)",
                color: "#0b0d12",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}>
                {String(PRICES.small_beer).replace('.', ',')} €
              </div>
            </div>
            
            {/* Content */}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div>
                <h2 style={{ margin: "0 0 8px", color: "#e9ecef", fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Small Beer</h2>
                <p style={{ margin: 0, color: "#adb5bd", fontSize: 13, fontWeight: 400 }}>0.3L • Fresh & Crisp</p>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="number" 
                  min="1" 
                  value={smallBeerQty} 
                  onChange={e => setSmallBeerQty(e.target.value)} 
                  style={{ 
                    flex: 1,
                    padding: "10px 12px", 
                    border: "2px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: 10, 
                    fontSize: 15, 
                    outline: "none", 
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e9ecef",
                    fontWeight: 600,
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 209, 102, 0.5)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>
              
              <button 
                onClick={() => needsRegistration ? setNeedsRegistration(true) : addToCurrentOrder('small_beer', smallBeerQty)} 
                disabled={needsRegistration} 
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                  color: "#0b0d12", 
                  border: "none", 
                  borderRadius: 12, 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: needsRegistration ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)",
                  opacity: needsRegistration ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!needsRegistration) {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 209, 102, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.3)";
                }}
              >
                🛒 Add To Order
              </button>
            </div>
          </div>

          {/* Large Beer */}
          <div className="drinkCard" style={{ 
            width: "100%",
            minWidth: "0",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(20px)",
            color: "#e9ecef",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer"
          }}>
            <div style={{
              width: "100%",
              height: "180px",
              backgroundImage: `url(${drinkImages.large_beer})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)"
              }} />
              <div style={{
                position: "absolute",
                top: 12,
                right: 12,
                padding: "6px 12px",
                background: "rgba(255, 209, 102, 0.95)",
                backdropFilter: "blur(10px)",
                color: "#0b0d12",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}>
                {String(PRICES.large_beer).replace('.', ',')} €
              </div>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div>
                <h2 style={{ margin: "0 0 8px", color: "#e9ecef", fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Large Beer</h2>
                <p style={{ margin: 0, color: "#adb5bd", fontSize: 13, fontWeight: 400 }}>0.5L • Premium Quality</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="number" 
                  min="1" 
                  value={largeBeerQty} 
                  onChange={e => setLargeBeerQty(e.target.value)} 
                  style={{ 
                    flex: 1,
                    padding: "10px 12px", 
                    border: "2px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: 10, 
                    fontSize: 15, 
                    outline: "none", 
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e9ecef",
                    fontWeight: 600,
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 209, 102, 0.5)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>
              <button 
                onClick={() => addToCurrentOrder('large_beer', largeBeerQty)} 
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                  color: "#0b0d12", 
                  border: "none", 
                  borderRadius: 12, 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 209, 102, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.3)";
                }}
              >
                🛒 Add To Order
              </button>
            </div>
          </div>

          {/* Whiskey */}
          <div className="drinkCard" style={{ 
            width: "100%",
            minWidth: "0",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(20px)",
            color: "#e9ecef",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer"
          }}>
            <div style={{
              width: "100%",
              height: "180px",
              backgroundImage: `url(${drinkImages.whiskey})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)"
              }} />
              <div style={{
                position: "absolute",
                top: 12,
                right: 12,
                padding: "6px 12px",
                background: "rgba(255, 209, 102, 0.95)",
                backdropFilter: "blur(10px)",
                color: "#0b0d12",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}>
                {String(PRICES.whiskey).replace('.', ',')} €
              </div>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div>
                <h2 style={{ margin: "0 0 8px", color: "#e9ecef", fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Whiskey</h2>
                <p style={{ margin: 0, color: "#adb5bd", fontSize: 13, fontWeight: 400 }}>Premium • Aged to Perfection</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="number" 
                  min="1" 
                  value={whiskeyQty} 
                  onChange={(e) => setWhiskeyQty(e.target.value)} 
                  style={{ 
                    flex: 1,
                    padding: "10px 12px", 
                    border: "2px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: 10, 
                    fontSize: 15, 
                    outline: "none", 
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e9ecef",
                    fontWeight: 600,
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 209, 102, 0.5)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>
              <button 
                onClick={() => addToCurrentOrder('whiskey', whiskeyQty)} 
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                  color: "#0b0d12", 
                  border: "none", 
                  borderRadius: 12, 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 209, 102, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.3)";
                }}
              >
                🛒 Add To Order
              </button>
            </div>
          </div>

          {/* Vodka */}
          <div className="drinkCard" style={{ 
            width: "100%",
            minWidth: "0",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(20px)",
            color: "#e9ecef",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer"
          }}>
            <div style={{
              width: "100%",
              height: "180px",
              backgroundImage: `url(${drinkImages.vodka})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)"
              }} />
              <div style={{
                position: "absolute",
                top: 12,
                right: 12,
                padding: "6px 12px",
                background: "rgba(255, 209, 102, 0.95)",
                backdropFilter: "blur(10px)",
                color: "#0b0d12",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}>
                {String(PRICES.vodka).replace('.', ',')} €
              </div>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div>
                <h2 style={{ margin: "0 0 8px", color: "#e9ecef", fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Vodka</h2>
                <p style={{ margin: 0, color: "#adb5bd", fontSize: 13, fontWeight: 400 }}>Premium • Smooth & Clean</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="number" 
                  min="1" 
                  value={vodkaQty} 
                  onChange={(e) => setVodkaQty(e.target.value)} 
                  style={{ 
                    flex: 1,
                    padding: "10px 12px", 
                    border: "2px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: 10, 
                    fontSize: 15, 
                    outline: "none", 
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e9ecef",
                    fontWeight: 600,
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 209, 102, 0.5)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>
              <button 
                onClick={() => addToCurrentOrder('vodka', vodkaQty)} 
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                  color: "#0b0d12", 
                  border: "none", 
                  borderRadius: 12, 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 209, 102, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.3)";
                }}
              >
                🛒 Add To Order
              </button>
            </div>
          </div>

          {/* Wine */}
          <div className="drinkCard" style={{ 
            width: "100%",
            minWidth: "0",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(20px)",
            color: "#e9ecef",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer"
          }}>
            <div style={{
              width: "100%",
              height: "180px",
              backgroundImage: `url(${drinkImages.wine})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)"
              }} />
              <div style={{
                position: "absolute",
                top: 12,
                right: 12,
                padding: "6px 12px",
                background: "rgba(255, 209, 102, 0.95)",
                backdropFilter: "blur(10px)",
                color: "#0b0d12",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}>
                {String(PRICES.wine).replace('.', ',')} €
              </div>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div>
                <h2 style={{ margin: "0 0 8px", color: "#e9ecef", fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Wine</h2>
                <p style={{ margin: 0, color: "#adb5bd", fontSize: 13, fontWeight: 400 }}>Fine Selection • Rich & Elegant</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="number" 
                  min="1" 
                  value={wineQty} 
                  onChange={(e) => setWineQty(e.target.value)} 
                  style={{ 
                    flex: 1,
                    padding: "10px 12px", 
                    border: "2px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: 10, 
                    fontSize: 15, 
                    outline: "none", 
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e9ecef",
                    fontWeight: 600,
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 209, 102, 0.5)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>
              <button 
                onClick={() => addToCurrentOrder('wine', wineQty)} 
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                  color: "#0b0d12", 
                  border: "none", 
                  borderRadius: 12, 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 209, 102, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.3)";
                }}
              >
                🛒 Add To Order
              </button>
            </div>
          </div>

          {/* Borovička */}
          <div className="drinkCard" style={{ 
            width: "100%",
            minWidth: "0",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(20px)",
            color: "#e9ecef",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer"
          }}>
            <div style={{
              width: "100%",
              height: "180px",
              backgroundImage: `url(${drinkImages.borovicka})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)"
              }} />
              <div style={{
                position: "absolute",
                top: 12,
                right: 12,
                padding: "6px 12px",
                background: "rgba(255, 209, 102, 0.95)",
                backdropFilter: "blur(10px)",
                color: "#0b0d12",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}>
                {String(PRICES.borovicka).replace('.', ',')} €
              </div>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div>
                <h2 style={{ margin: "0 0 8px", color: "#e9ecef", fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Borovička</h2>
                <p style={{ margin: 0, color: "#adb5bd", fontSize: 13, fontWeight: 400 }}>Traditional • Juniper Flavored</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="number" 
                  min="1" 
                  value={borovickaQty} 
                  onChange={(e) => setBorovickaQty(e.target.value)} 
                  style={{ 
                    flex: 1,
                    padding: "10px 12px", 
                    border: "2px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: 10, 
                    fontSize: 15, 
                    outline: "none", 
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e9ecef",
                    fontWeight: 600,
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 209, 102, 0.5)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>
              <button 
                onClick={() => addToCurrentOrder('borovicka', borovickaQty)} 
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                  color: "#0b0d12", 
                  border: "none", 
                  borderRadius: 12, 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 209, 102, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.3)";
                }}
              >
                🛒 Add To Order
              </button>
            </div>
          </div>
            </div>
          </div>
          <div className="orderCol" style={{ position: "sticky", top: 24, paddingRight: 16 }}>
            <div className="card" style={{ 
              width: "100%", 
              minWidth: 0, 
              background: "rgba(18, 20, 24, 0.95)",
              backdropFilter: "blur(20px)",
              color: "#e9ecef", 
              border: "1px solid rgba(255, 255, 255, 0.1)", 
              borderRadius: 20, 
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)", 
              padding: 24, 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "space-between" 
            }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}>
                🛒
              </div>
              <strong style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>Your Order</strong>
            </div>
            <div style={{ fontSize: 15, color: "#c9ced6" }}>
              {currentOrder.small_beer > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>Small Beer</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, width: 120 }}>
                    <button 
                      onClick={() => decrementItem('small_beer')} 
                      style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 8, 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        color: '#e9ecef', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 600,
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                      }}
                    >-</button>
                    <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{currentOrder.small_beer}</span>
                    <button 
                      onClick={() => incrementItem('small_beer')} 
                      style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 8, 
                        border: 'none', 
                        background: 'linear-gradient(135deg, #ffd166 0%, #fca311 100%)', 
                        color: '#0b0d12', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 700,
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(255, 209, 102, 0.3)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.1)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 209, 102, 0.3)";
                      }}
                    >+</button>
                  </div>
                </div>
              )}
              {currentOrder.large_beer > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>Large Beer</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, width: 120 }}>
                    <button onClick={() => decrementItem('large_beer')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}>-</button>
                    <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{currentOrder.large_beer}</span>
                    <button onClick={() => incrementItem('large_beer')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ffd166 0%, #fca311 100%)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: "all 0.2s ease", boxShadow: "0 2px 8px rgba(255, 209, 102, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 209, 102, 0.3)"; }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.whiskey > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>Whiskey</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, width: 120 }}>
                    <button onClick={() => decrementItem('whiskey')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}>-</button>
                    <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{currentOrder.whiskey}</span>
                    <button onClick={() => incrementItem('whiskey')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ffd166 0%, #fca311 100%)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: "all 0.2s ease", boxShadow: "0 2px 8px rgba(255, 209, 102, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 209, 102, 0.3)"; }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.vodka > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>Vodka</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, width: 120 }}>
                    <button onClick={() => decrementItem('vodka')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}>-</button>
                    <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{currentOrder.vodka}</span>
                    <button onClick={() => incrementItem('vodka')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ffd166 0%, #fca311 100%)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: "all 0.2s ease", boxShadow: "0 2px 8px rgba(255, 209, 102, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 209, 102, 0.3)"; }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.wine > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>Wine</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, width: 120 }}>
                    <button onClick={() => decrementItem('wine')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}>-</button>
                    <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{currentOrder.wine}</span>
                    <button onClick={() => incrementItem('wine')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ffd166 0%, #fca311 100%)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: "all 0.2s ease", boxShadow: "0 2px 8px rgba(255, 209, 102, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 209, 102, 0.3)"; }}>+</button>
                  </div>
                </div>
              )}
              {currentOrder.borovicka > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>Borovička</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, width: 120 }}>
                    <button onClick={() => decrementItem('borovicka')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: '#e9ecef', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}>-</button>
                    <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{currentOrder.borovicka}</span>
                    <button onClick={() => incrementItem('borovicka')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ffd166 0%, #fca311 100%)', color: '#0b0d12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: "all 0.2s ease", boxShadow: "0 2px 8px rgba(255, 209, 102, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 209, 102, 0.3)"; }}>+</button>
                  </div>
                </div>
              )}
              {Object.values(currentOrder).reduce((a, b) => a + (b || 0), 0) === 0 && (
                <div style={{ color: "#818997", fontStyle: "italic", textAlign: "center", padding: "20px", fontSize: 14 }}>No items added yet.</div>
              )}
              <div style={{ height: 1, background: "rgba(255, 255, 255, 0.1)", margin: "16px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, padding: "12px", background: "rgba(255, 209, 102, 0.1)", borderRadius: 12, border: "1px solid rgba(255, 209, 102, 0.2)" }}>
                <span>Total</span>
                <span style={{ color: "#ffd166" }}>{(Object.entries(currentOrder).reduce((sum, [k, v]) => sum + (PRICES[k] || 0) * (v || 0), 0)).toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button 
              onClick={() => setCurrentOrder({ small_beer: 0, large_beer: 0, whiskey: 0, wine: 0, vodka: 0, borovicka: 0 })} 
              style={{ 
                flex: 1, 
                padding: "14px", 
                background: "rgba(255, 255, 255, 0.05)", 
                color: "#e9ecef", 
                border: "1px solid rgba(255, 255, 255, 0.1)", 
                borderRadius: 12, 
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            >
              Clear
            </button>
            <button 
              onClick={submitCurrentOrder} 
              style={{ 
                flex: 2, 
                padding: "14px", 
                background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
                color: "#0b0d12", 
                border: "none", 
                borderRadius: 12, 
                fontWeight: 700, 
                fontSize: 15,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 209, 102, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 209, 102, 0.3)";
              }}
            >
              Make Order
            </button>
          </div>
        </div>
        </div>
      </div>
  
      <div style={{ 
        marginTop: 32, 
        padding: "28px", 
        border: "1px solid rgba(255, 255, 255, 0.1)", 
        borderRadius: 20,
        background: "rgba(18, 20, 24, 0.95)",
        backdropFilter: "blur(20px)",
        color: "#e9ecef",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        maxHeight: "400px",
        overflow: "auto",
        boxSizing: "border-box",
        width: "100%",
        marginLeft: "auto",
        marginRight: "auto",
        maxWidth: "1400px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #ffd166 0%, #fca311 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 4px 12px rgba(255, 209, 102, 0.3)"
          }}>
            📋
          </div>
          <h3 style={{ 
            margin: 0, 
            color: "#e9ecef",
            fontSize: "24px",
            fontWeight: 700,
            letterSpacing: "-0.3px"
          }}>Your Orders</h3>
        </div>

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
