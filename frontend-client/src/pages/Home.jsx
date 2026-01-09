import React, { useState, useEffect, useRef, useCallback } from "react";
import toast, { Toaster } from 'react-hot-toast';
import { getUserId } from "../userId";
import {API, WS} from "../apiBase";
import RegistrationDialog from "../components/RegistrationDialog";
import { getDeviceToken, deleteDeviceToken } from "../lib/auth";
import { api } from "../lib/api";

window.addEventListener('error', (e) => alert('JS error: ' + e.message));

// Mock cocktail bar menu data
const MENU_ITEMS = [
  // Signatures
  { id: 'smoked_old_fashioned', name: 'Smoked Old Fashioned', category: 'signatures', price: 16.00, description: 'Woodford Reserve, demerara, angostura, smoked with cherry wood', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop' },
  { id: 'truffle_fries', name: 'Truffle Fries', category: 'signatures', price: 12.00, description: 'Crispy hand-cut fries with truffle oil and parmesan', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop' },
  { id: 'espresso_martini', name: 'Espresso Martini', category: 'signatures', price: 14.00, description: 'Vodka, fresh espresso, coffee liqueur, vanilla', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop' },
  
  // Beer
  { id: 'small_beer', name: 'Craft Lager (0.3L)', category: 'beer', price: 2.70, description: 'Local craft brewery, crisp and refreshing', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop' },
  { id: 'large_beer', name: 'Craft Lager (0.5L)', category: 'beer', price: 3.20, description: 'Local craft brewery, crisp and refreshing', image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=300&fit=crop' },
  { id: 'ipa', name: 'IPA', category: 'beer', price: 4.50, description: 'Hoppy, citrusy, bold flavor profile', image: 'https://images.unsplash.com/photo-1608270586621-376a0e8e0f7b?w=400&h=300&fit=crop' },
  
  // Wine
  { id: 'wine', name: 'House Red Wine', category: 'wine', price: 4.00, description: 'Rich and elegant, perfect pairing', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop' },
  { id: 'wine_white', name: 'House White Wine', category: 'wine', price: 4.00, description: 'Crisp and refreshing, light notes', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop' },
  { id: 'champagne', name: 'Prosecco', category: 'wine', price: 8.00, description: 'Italian sparkling wine, celebratory', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop' },
  
  // Spirits
  { id: 'whiskey', name: 'Premium Whiskey', category: 'spirits', price: 3.00, description: 'Aged to perfection, smooth finish', image: 'https://images.unsplash.com/photo-1608847891746-451a0b65b0c1?w=400&h=300&fit=crop' },
  { id: 'vodka', name: 'Premium Vodka', category: 'spirits', price: 2.50, description: 'Smooth and clean, versatile', image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=400&h=300&fit=crop' },
  { id: 'borovicka', name: 'Borovička', category: 'spirits', price: 2.00, description: 'Traditional juniper-flavored spirit', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop' },
  
  // Starters
  { id: 'bruschetta', name: 'Bruschetta Trio', category: 'starters', price: 9.00, description: 'Tomato, basil, mozzarella on toasted bread', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop' },
  { id: 'wings', name: 'Buffalo Wings', category: 'starters', price: 11.00, description: 'Spicy buffalo sauce, blue cheese dip', image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop' },
  { id: 'nachos', name: 'Loaded Nachos', category: 'starters', price: 10.00, description: 'Cheese, jalapeños, sour cream, guacamole', image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop' },
];

const CATEGORIES = ['signatures', 'beer', 'wine', 'spirits', 'starters'];
const CATEGORY_LABELS = {
  signatures: 'Signatures',
  beer: 'Beer',
  wine: 'Wine',
  spirits: 'Spirits',
  starters: 'Starters'
};

const ACCENT_COLOR = '#FFB800'; // Neon Amber
const BG_DARK = '#0A0A0A'; // Almost black
const BG_SLATE = '#1A1A1A'; // Charcoal
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#E5E5E5';

function Home() {
  const [selectedCategory, setSelectedCategory] = useState('signatures');
  const [currentOrder, setCurrentOrder] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState({});
  const userId = getUserId();
  const wsRef = useRef(null);
  const didConnect = useRef(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const cartRef = useRef(null);

  // Initialize currentOrder from menu items
  useEffect(() => {
    const initialOrder = {};
    MENU_ITEMS.forEach(item => {
      initialOrder[item.id] = 0;
    });
    setCurrentOrder(initialOrder);
  }, []);

  useEffect(() => {
    if (didConnect.current) return;
    didConnect.current = true;

    const ws = new WebSocket(WS);
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WS connected");
    
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type !== "ORDER_STATUS") return;
      toast.success("Order completed!");
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
      toast.success("Order placed successfully!");
      return data;
    } catch (err) {
      console.error('Order failed: ', err);
      toast.error(err instanceof Error ? err.message : "Failed to place order");
      throw err;
    }
  };

  const addToOrder = (itemId, quantity = 1) => {
    setCurrentOrder(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + quantity
    }));
    toast.success("Added to order!", { duration: 1500 });
  };

  const updateQuantity = (itemId, delta) => {
    setCurrentOrder(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  const removeItem = (itemId) => {
    setCurrentOrder(prev => {
      const newOrder = { ...prev };
      delete newOrder[itemId];
      return newOrder;
    });
  };

  const submitOrder = async () => {
    const totalCount = Object.values(currentOrder).reduce((a, b) => a + (b || 0), 0);
    if (totalCount === 0) return;
    try {
      await placeOrder();
      setCurrentOrder({});
      setIsCartOpen(false);
      retrieveOrders();
    } catch (err) {
      // Error handled in placeOrder
    }
  };

  const retrieveOrders = () => {
    setLoading(true);
    fetch(`${API}/orders?userID=${encodeURIComponent(userId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setOrders)
      .catch(err => {
        console.error('Failed: ', err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  };

  const checkAuth = useCallback(async () => {
    const token = getDeviceToken();
    if (!token) {
      setNeedsRegistration(true);
      return;
    }
    try {
      await api("/me/tab");
      setNeedsRegistration(false);
    } catch (e) {
      if (e.message === "UNAUTHENTICATED") {
        deleteDeviceToken();
        setNeedsRegistration(true);
      } else {
        setNeedsRegistration(false);
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
    retrieveOrders();
  }, [checkAuth]);

  const filteredItems = MENU_ITEMS.filter(item => item.category === selectedCategory);
  const orderItems = Object.entries(currentOrder)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = MENU_ITEMS.find(i => i.id === id);
      return item ? { ...item, quantity: qty } : null;
    })
    .filter(Boolean);

  const totalItems = Object.values(currentOrder).reduce((a, b) => a + (b || 0), 0);
  const totalPrice = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleImageLoad = (itemId) => {
    setImageLoaded(prev => ({ ...prev, [itemId]: true }));
  };

  // Close cart when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target) && isCartOpen) {
        // Don't close if clicking the floating order summary
        if (!event.target.closest('.floating-order-summary')) {
          setIsCartOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCartOpen]);

  return (
    <div style={{
      background: BG_DARK,
      minHeight: "100vh",
      width: "100%",
      color: TEXT_PRIMARY,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
      paddingBottom: "100px" // Space for floating order summary
    }}>
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        toastOptions={{
          style: {
            background: BG_SLATE,
            color: TEXT_PRIMARY,
            border: `1px solid ${ACCENT_COLOR}40`,
            borderRadius: '12px',
          },
        }}
      />
      <RegistrationDialog
        open={needsRegistration}
        onRegistered={() => setNeedsRegistration(false)}
      />

      {/* Sticky Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: `linear-gradient(180deg, ${BG_SLATE}E6 0%, ${BG_SLATE}CC 100%)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${ACCENT_COLOR}20`,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{
          margin: 0,
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: TEXT_PRIMARY
        }}>
          Midnight Bar
        </h1>
        <div style={{
          padding: "6px 16px",
          background: ACCENT_COLOR,
          color: BG_DARK,
          borderRadius: "20px",
          fontSize: "14px",
          fontWeight: 600,
          letterSpacing: "0.3px"
        }}>
          Table 12
        </div>
      </div>

      {/* Category Navigation */}
      <div style={{
        padding: "16px 20px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none"
      }}>
        <div style={{
          display: "flex",
          gap: "12px",
          width: "max-content"
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "10px 20px",
                background: selectedCategory === cat ? ACCENT_COLOR : "transparent",
                color: selectedCategory === cat ? BG_DARK : TEXT_SECONDARY,
                border: `2px solid ${selectedCategory === cat ? ACCENT_COLOR : ACCENT_COLOR}40`,
                borderRadius: "24px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                outline: "none"
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div style={{
        padding: "20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "20px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        {filteredItems.map(item => {
          const quantity = currentOrder[item.id] || 0;
          const isLoaded = imageLoaded[item.id];
          
          return (
            <div
              key={item.id}
              style={{
                background: BG_SLATE,
                borderRadius: "20px",
                overflow: "hidden",
                border: `1px solid ${ACCENT_COLOR}15`,
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 12px 24px ${ACCENT_COLOR}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Image */}
              <div style={{
                width: "100%",
                height: "200px",
                background: BG_DARK,
                position: "relative",
                overflow: "hidden"
              }}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: isLoaded ? 1 : 0,
                    transition: "opacity 0.3s ease"
                  }}
                  onLoad={() => handleImageLoad(item.id)}
                />
                {!isLoaded && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    color: TEXT_SECONDARY,
                    fontSize: "14px"
                  }}>
                    Loading...
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{
                    margin: "0 0 6px",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    letterSpacing: "-0.3px"
                  }}>
                    {item.name}
                  </h3>
                  <p style={{
                    margin: "0 0 8px",
                    fontSize: "14px",
                    color: TEXT_SECONDARY,
                    lineHeight: "1.5",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {item.description}
                  </p>
                  <div style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: ACCENT_COLOR,
                    marginTop: "8px"
                  }}>
                    ${item.price.toFixed(2)}
                  </div>
                </div>

                {/* Add Button or Quantity Controller */}
                {quantity === 0 ? (
                  <button
                    onClick={() => addToOrder(item.id, 1)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: ACCENT_COLOR,
                      color: BG_DARK,
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      marginTop: "auto"
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    Add
                  </button>
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginTop: "auto",
                    padding: "8px",
                    background: `${ACCENT_COLOR}20`,
                    borderRadius: "12px"
                  }}>
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{
                        width: "40px",
                        height: "40px",
                        background: BG_DARK,
                        color: TEXT_PRIMARY,
                        border: `2px solid ${ACCENT_COLOR}`,
                        borderRadius: "10px",
                        fontSize: "20px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      −
                    </button>
                    <span style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: "18px",
                      fontWeight: 700,
                      color: TEXT_PRIMARY
                    }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{
                        width: "40px",
                        height: "40px",
                        background: ACCENT_COLOR,
                        color: BG_DARK,
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "20px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Order Summary */}
      {totalItems > 0 && (
        <div
          className="floating-order-summary"
          onClick={() => setIsCartOpen(true)}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: `linear-gradient(180deg, ${BG_SLATE}E6 0%, ${BG_SLATE}FF 100%)`,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `2px solid ${ACCENT_COLOR}40`,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 90,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(180deg, ${BG_SLATE}FF 0%, ${BG_SLATE}FF 100%)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `linear-gradient(180deg, ${BG_SLATE}E6 0%, ${BG_SLATE}FF 100%)`;
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: TEXT_PRIMARY }}>
              {totalItems} {totalItems === 1 ? 'Item' : 'Items'} • ${totalPrice.toFixed(2)}
            </div>
          </div>
          <button
            style={{
              padding: "12px 24px",
              background: ACCENT_COLOR,
              color: BG_DARK,
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.currentTarget.style.transform = "scale(0.95)";
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsCartOpen(true);
            }}
          >
            View Order
          </button>
        </div>
      )}

      {/* Bottom Sheet Cart Drawer */}
      {isCartOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
            animation: "fadeIn 0.2s ease"
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div
            ref={cartRef}
            style={{
              width: "100%",
              maxHeight: "85vh",
              background: BG_SLATE,
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              padding: "24px",
              overflowY: "auto",
              animation: "slideUp 0.3s ease",
              maxWidth: "600px",
              margin: "0 auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px"
            }}>
              <h2 style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 700,
                color: TEXT_PRIMARY,
                letterSpacing: "-0.5px"
              }}>
                Your Order
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                style={{
                  width: "40px",
                  height: "40px",
                  background: BG_DARK,
                  color: TEXT_PRIMARY,
                  border: `2px solid ${ACCENT_COLOR}40`,
                  borderRadius: "12px",
                  fontSize: "24px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = ACCENT_COLOR;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${ACCENT_COLOR}40`;
                }}
              >
                ×
              </button>
            </div>

            {orderItems.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "60px 20px",
                color: TEXT_SECONDARY
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
                <div style={{ fontSize: "18px", fontWeight: 600 }}>Your cart is empty</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "24px" }}>
                  {orderItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        gap: "16px",
                        padding: "16px",
                        background: BG_DARK,
                        borderRadius: "16px",
                        marginBottom: "12px",
                        alignItems: "center"
                      }}
                    >
                      <div style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: BG_SLATE,
                        flexShrink: 0
                      }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: TEXT_PRIMARY,
                          marginBottom: "4px"
                        }}>
                          {item.name}
                        </div>
                        <div style={{
                          fontSize: "14px",
                          color: TEXT_SECONDARY,
                          marginBottom: "8px"
                        }}>
                          ${item.price.toFixed(2)} each
                        </div>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px"
                        }}>
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            style={{
                              width: "32px",
                              height: "32px",
                              background: BG_SLATE,
                              color: TEXT_PRIMARY,
                              border: `2px solid ${ACCENT_COLOR}40`,
                              borderRadius: "8px",
                              fontSize: "18px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease"
                            }}
                            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            −
                          </button>
                          <span style={{
                            minWidth: "30px",
                            textAlign: "center",
                            fontSize: "16px",
                            fontWeight: 600,
                            color: TEXT_PRIMARY
                          }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            style={{
                              width: "32px",
                              height: "32px",
                              background: ACCENT_COLOR,
                              color: BG_DARK,
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "18px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease"
                            }}
                            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            +
                          </button>
                          <div style={{
                            marginLeft: "auto",
                            fontSize: "18px",
                            fontWeight: 700,
                            color: ACCENT_COLOR
                          }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: "20px",
                  background: BG_DARK,
                  borderRadius: "16px",
                  marginBottom: "20px"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px"
                  }}>
                    <span style={{ fontSize: "18px", fontWeight: 600, color: TEXT_PRIMARY }}>
                      Total
                    </span>
                    <span style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: ACCENT_COLOR
                    }}>
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={submitOrder}
                  style={{
                    width: "100%",
                    padding: "18px",
                    background: ACCENT_COLOR,
                    color: BG_DARK,
                    border: "none",
                    borderRadius: "16px",
                    fontSize: "18px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "20px"
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  Pay & Order
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${BG_DARK};
        }
        ::-webkit-scrollbar-thumb {
          background: ${ACCENT_COLOR}60;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${ACCENT_COLOR}80;
        }
      `}</style>
    </div>
  );
}

export default Home;
