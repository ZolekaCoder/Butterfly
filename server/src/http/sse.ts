import type { Response } from "express";

/**
 * Minimal Server-Sent Events fan-out. One-directional (server -> browser) is
 * all this demo needs: human intervention travels over a plain POST, and the
 * live feed of semantic events/turns travels here. SSE over a raw WebSocket
 * keeps the reliability surface small for a hackathon demo.
 */

const clients = new Set<Response>();

export function addClient(res: Response): void {
  clients.add(res);
}

export function removeClient(res: Response): void {
  clients.delete(res);
}

export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

export function clientCount(): number {
  return clients.size;
}
