import React, { useState, useEffect, useRef, useCallback } from "react";
import toast, { Toaster } from 'react-hot-toast';
import { getUserId } from "../userId";
import {API, WS} from "../apiBase";
// import RegistrationDialog from "../components/RegistrationDialog";
// import { getDeviceToken, deleteDeviceToken } from "../lib/auth";
import { api } from "../lib/api";

window.addEventListener('error', (e) => alert('JS error: ' + e.message));

// Menu data
const MENU_ITEMS = [
  // Alcoholic Drinks
  { id: 'vodka', name: 'Vodka (0.02L)', category: 'alcoholic', price: 2.30, description: '' },
  { id: 'borovicka', name: 'Borovicka (0.02L)', category: 'alcoholic', price: 2.10, description: '' },
  { id: 'slivovica', name: 'Slivovica (0.02L)', category: 'alcoholic', price: 2.50, description: '' },
  { id: 'small_beer', name: 'Small Beer (0.3L)', category: 'alcoholic', price: 2.30, description: '' },
  { id: 'aperol_spritz', name: 'Aperol Spritz', category: 'alcoholic', price: 4.50, description: '' },
  { id: 'wine', name: 'Wine (0.2L)', category: 'alcoholic', price: 3.50, description: '' },
  
  // Non-Alcoholic Drinks
  { id: 'coca_cola', name: 'Coca cola (330ml)', category: 'non_alcoholic', price: 2.50, description: '' },
  { id: 'sprite', name: 'Sprite (330ml)', category: 'non_alcoholic', price: 2.50, description: '' },
  { id: 'fanta', name: 'Fanta (330ml)', category: 'non_alcoholic', price: 2.50, description: '' },
  { id: 'orange_juice', name: 'Orange Juice (330ml)', category: 'non_alcoholic', price: 2.50, description: '' },
  { id: 'apple_juice', name: 'Apple Juice (330ml)', category: 'non_alcoholic', price: 2.50, description: '' },
  
  // Snacks
  { id: 'chips', name: 'Chips', category: 'snacks', price: 2.20, description: '' },
  { id: 'bread_sticks', name: 'Bread Sticks', category: 'snacks', price: 2.40, description: '' },
];

const CATEGORIES = ['alcoholic', 'non_alcoholic', 'snacks'];
const CATEGORY_LABELS = {
  alcoholic: 'Alcoholic Drinks',
  non_alcoholic: 'Non-Alcoholic Drinks',
  snacks: 'Snacks'
};

const ACCENT_COLOR = '#FFB800'; // Neon Amber
const BG_DARK = '#0A0A0A'; // Almost black
const BG_SLATE = '#1A1A1A'; // Charcoal
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#E5E5E5';

// Helper function to get image path for menu items
// Images should be named: {item_id}_image.{ext}
// Example: coca_cola_image.jpg, vodka_image.png, etc.
const getMenuItemImage = (itemId) => {
  // Default to .jpg - you can change this or add logic to try multiple extensions
  return `/menu_photos/${itemId}_image.jpg`;
};

function Home() {
  const [selectedCategory, setSelectedCategory] = useState('alcoholic');
  const [currentOrder, setCurrentOrder] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const userId = getUserId();
  const wsRef = useRef(null);
  const didConnect = useRef(null);
  // const [needsRegistration, setNeedsRegistration] = useState(false);
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

  // const checkAuth = useCallback(async () => {
  //   const token = getDeviceToken();
  //   if (!token) {
  //     setNeedsRegistration(true);
  //     return;
  //   }
  //   try {
  //     await api("/me/tab");
  //     setNeedsRegistration(false);
  //   } catch (e) {
  //     if (e.message === "UNAUTHENTICATED") {
  //       deleteDeviceToken();
  //       setNeedsRegistration(true);
  //     } else {
  //       setNeedsRegistration(false);
  //     }
  //   }
  // }, []);

  useEffect(() => {
    // checkAuth();
    retrieveOrders();
  }, []); // [checkAuth]

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

  const handleImageError = (itemId) => {
    setImageError(prev => ({ ...prev, [itemId]: true }));
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
      {/* <RegistrationDialog
        open={needsRegistration}
        onRegistered={() => setNeedsRegistration(false)}
      /> */}

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
          const imagePath = getMenuItemImage(item.id);
          const isLoaded = imageLoaded[item.id];
          const hasError = imageError[item.id];
          
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
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {!hasError ? (
                  <>
                    <img
                      src={imagePath}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: isLoaded ? 1 : 0,
                        transition: "opacity 0.3s ease"
                      }}
                      onLoad={() => handleImageLoad(item.id)}
                      onError={() => handleImageError(item.id)}
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
                  </>
                ) : (
                  <div style={{
                    color: TEXT_SECONDARY,
                    fontSize: "14px",
                    textAlign: "center",
                    padding: "20px"
                  }}>
                    No image available
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{
                    margin: "0 0 8px",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    letterSpacing: "-0.3px"
                  }}>
                    {item.name}
                  </h3>
                  {item.description && (
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
                  )}
                  <div style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: ACCENT_COLOR,
                    marginTop: "8px"
                  }}>
                    {item.price.toFixed(2)} €
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
              {totalItems} {totalItems === 1 ? 'Item' : 'Items'} • {totalPrice.toFixed(2)} €
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
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {!imageError[item.id] ? (
                          <img
                            src={getMenuItemImage(item.id)}
                            alt={item.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                            onError={() => handleImageError(item.id)}
                          />
                        ) : (
                          <div style={{
                            color: TEXT_SECONDARY,
                            fontSize: "10px",
                            textAlign: "center",
                            padding: "8px"
                          }}>
                            No image
                          </div>
                        )}
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
                          {item.price.toFixed(2)} € each
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
                            {(item.price * item.quantity).toFixed(2)} €
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
                      {totalPrice.toFixed(2)} €
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
