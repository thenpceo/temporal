import type { PylonTicket } from "../temporal/types";
import { mockTickets } from "./mockData";
import { env } from "../lib/env";

export async function getPylonTicket(ticketId: string): Promise<PylonTicket> {
  if (env.pylonApiKey && env.pylonApiBaseUrl && !env.useMocks) {
    const res = await fetch(`${env.pylonApiBaseUrl}/tickets/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${env.pylonApiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Pylon API error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { data?: PylonTicket } | PylonTicket;
    return "data" in data && data.data ? data.data : (data as PylonTicket);
  }

  const ticket = mockTickets[ticketId];
  if (!ticket) {
    throw new Error(`Mock Pylon ticket not found: ${ticketId}`);
  }
  return ticket;
}
