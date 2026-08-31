export async function broadcastMessage(client, message) {
  await client.broadcast({
    messages: [message],
  });

  return { sentCount: 1 };
}
