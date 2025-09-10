// src/components/RegistrationDialog.tsx
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { setDeviceToken } from "../lib/auth";

type Room = { id: string; number: string };
type RegisterOut = { device_token: string; device_id: string; room_id: string; tab_id: string };

type Props = { open: boolean; onRegistered: () => void };

export default function RegistrationDialog({ open, onRegistered }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setError(null);
      try {
        // you should have an endpoint like GET /rooms that returns [{id, number}, ...]
        const data = await api<Room[]>("/rooms");
        setRooms(data);
        if (data.length && !roomId) setRoomId(data[0].id);
      } catch (e: any) {
        setError(e.message || "Failed to load rooms");
      }
    })();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !roomId) {
      setError("Please enter your name and pick a room.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // If your API expects room_number instead of room_id, swap accordingly
      const room = rooms.find(r => r.id === roomId);
      const payload: any = room
        ? { name: name.trim(), room_number: room.number }
        : { name: name.trim(), room_id: roomId };

      const res = await api<RegisterOut>("/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setDeviceToken(res.device_token);
      onRegistered();
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Quick registration</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tell us your name and choose your room to start ordering.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Room</label>
            <select
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black text-white py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
