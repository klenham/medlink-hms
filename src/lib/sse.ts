const clients = new Map<string, any>();

export function registerSSEClient(doctorId: string, res: any) {
  clients.set(doctorId, res);
}

export function unregisterSSEClient(doctorId: string) {
  clients.delete(doctorId);
}

export function sendSSE(doctorId: string, event: string, data: object) {
  const client = clients.get(doctorId);
  if (!client) return;
  try {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    clients.delete(doctorId);
  }
}
