const API = import.meta.env.VITE_API_BASE;
if (!API) {
  console.warn("VITE_API_BASE missing — defaulting to http://localhost:8000 for dev");
}
export default API || "http://localhost:8000";

