import { Client } from '@stomp/stompjs';

// Singleton STOMP WebSocket client.
// Connect once on login, disconnect on logout.
// Components subscribe to receive real-time notifications.
class WebSocketService {
  constructor() {
    this.client = null;
    this.listeners = new Set();
  }

  connect(token) {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: `ws://localhost:8080/ws?token=${encodeURIComponent(token)}`,
      reconnectDelay: 5000,
      onConnect: () => {
        this.client.subscribe('/user/queue/notifications', (frame) => {
          try {
            const notification = JSON.parse(frame.body);
            this.listeners.forEach(fn => fn(notification));
          } catch (_) {}
        });
      },
      onDisconnect: () => {},
      onStompError: () => {},
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  // Returns an unsubscribe function
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

const wsService = new WebSocketService();
export default wsService;
