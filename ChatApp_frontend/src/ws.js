import { io } from "socket.io-client";

// In production, the URL will be provided via environment variables.
// In development, it defaults to localhost:3000.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function connectWS() {
    console.log(`Connecting to backend at: ${BACKEND_URL}`);
    return io(BACKEND_URL);
}