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
      .then(data => {
        setOrders(data);
      })
      .catch(err => {
        console.error("Failed:", err);
        setOrders([]);
      });
  };

  useEffect(() => {
    fetchOrders();
    // Set up polling to refresh orders every 5 seconds
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const markReady = async (id) => {
    try {
      // Update backend status to completed
      await fetch(`${API}/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      
      // Optimistic UI: remove from IN_QUEUE list
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (error) {
      console.error("Failed to mark order ready:", error);
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case "in_progress":
        return "🔄";
      case "completed":
        return "✅";
      case "pending":
        return "⏳";
      default:
        return "📋";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "in_progress":
        return "#ffc107";
      case "completed":
        return "#28a745";
      case "pending":
        return "#17a2b8";
      default:
        return "#6c757d";
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url('/tehelne-pole.jpg'), url('https://upload.wikimedia.org/wikipedia/commons/7/75/Teheln%C3%A9_pole_stadium_2019.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      padding: "10px",
      boxSizing: "border-box"
    }}>
      <div style={{
        width: "100%",
        margin: "0 auto",
        background: "rgba(18, 20, 24, 0.95)",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        border: "1px solid #1e222a"
      }}>
        <div style={{
          textAlign: "center",
          marginBottom: "32px"
        }}>
          <h1 style={{
            color: "#e9ecef",
            fontSize: "2.5rem",
            fontWeight: "bold",
            margin: "0 0 8px 0",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)"
          }}>
            🍺 Staff Dashboard
          </h1>
          <p style={{
            color: "#adb5bd",
            fontSize: "1.1rem",
            margin: "0",
            fontWeight: "300"
          }}>
            Manage incoming beer orders
          </p>
        </div>

        {orders.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            background: "#1e222a",
            borderRadius: "12px",
            border: "1px solid #2d3748",
            color: "#adb5bd",
            fontSize: "1.2rem"
          }}>
            📭 No orders in queue at the moment
          </div>
        ) : (
          <div style={{
            background: "#1e222a",
            borderRadius: "12px",
            border: "1px solid #2d3748",
            overflow: "hidden",
            boxShadow: "0 8px 16px rgba(0,0,0,0.2)"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #2d3748 0%, #1e222a 100%)",
              padding: "16px 20px",
              borderBottom: "1px solid #2d3748"
            }}>
              <h3 style={{
                color: "#e9ecef",
                margin: "0",
                fontSize: "1.3rem",
                fontWeight: "600"
              }}>
                📋 Active Orders ({orders.length})
              </h3>
            </div>
            
            <div style={{
              overflow: "visible"
            }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed"
              }}>
                <thead>
                  <tr style={{
                    background: "linear-gradient(135deg, #2d3748 0%, #1e222a 100%)",
                    borderBottom: "2px solid #2d3748"
                  }}>
                    <th style={{
                      padding: "16px 20px",
                      textAlign: "left",
                      color: "#e9ecef",
                      fontWeight: "600",
                      fontSize: "1rem",
                      borderBottom: "1px solid #2d3748",
                      width: "50%"
                    }}>
                      Items
                    </th>
                    <th style={{
                      padding: "16px 20px",
                      textAlign: "left",
                      color: "#e9ecef",
                      fontWeight: "600",
                      fontSize: "1rem",
                      borderBottom: "1px solid #2d3748",
                      width: "25%"
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: "16px 20px",
                      textAlign: "center",
                      color: "#e9ecef",
                      fontWeight: "600",
                      fontSize: "1rem",
                      borderBottom: "1px solid #2d3748",
                      width: "25%"
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr key={order.id} style={{
                      background: index % 2 === 0 ? "#1e222a" : "#252a32",
                      borderBottom: "1px solid #2d3748",
                      transition: "background-color 0.2s ease"
                    }}>
                      <td style={{
                        padding: "16px 20px",
                        color: "#adb5bd",
                        verticalAlign: "top"
                      }}>
                        <div style={{ fontWeight: "600", color: "#e9ecef", marginBottom: "8px" }}>
                          Order #{order.id}
                        </div>
                        {order.items && order.items.map((item, idx) => (
                          <div key={idx} style={{
                            marginBottom: "4px",
                            fontSize: "0.95rem"
                          }}>
                            {item.qty}x {item.size} beer
                          </div>
                        ))}
                      </td>
                      <td style={{
                        padding: "16px 20px",
                        verticalAlign: "top"
                      }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.9rem",
                          fontWeight: "500",
                          background: `${getStatusColor(order.status)}20`,
                          color: getStatusColor(order.status),
                          border: `1px solid ${getStatusColor(order.status)}40`
                        }}>
                          {getStatusEmoji(order.status)} {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{
                        padding: "16px 20px",
                        textAlign: "center",
                        verticalAlign: "top"
                      }}>
                        {order.status === "in_progress" && (
                          <button
                            onClick={() => markReady(order.id)}
                            style={{
                              background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                              color: "white",
                              border: "none",
                              padding: "10px 20px",
                              borderRadius: "8px",
                              fontSize: "0.95rem",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 4px 8px rgba(40, 167, 69, 0.3)"
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = "translateY(-2px)";
                              e.target.style.boxShadow = "0 6px 12px rgba(40, 167, 69, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "0 4px 8px rgba(40, 167, 69, 0.3)";
                            }}
                          >
                            ✅ Mark Ready
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Staff;
