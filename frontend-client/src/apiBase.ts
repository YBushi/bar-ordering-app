const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

let WS: string;
if (import.meta.env.VITE_WS_URL) {
  WS = import.meta.env.VITE_WS_URL; 
} else {
  WS = API.replace(/^http/, "ws"); 
  WS = WS.replace(/\/$/, "");                     
}

export { API, WS };

