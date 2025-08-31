export function getUserId() {
    // retrieve user id or if it does not exist create a new one
    let id = localStorage.getItem("user_id");
    if (!id) {
        id = generateUUID();
        localStorage.setItem("user_id", id);
    }
    return id;
}

function generateUUID(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    // Fallback (RFC4122 v4 compatible enough for dev)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }