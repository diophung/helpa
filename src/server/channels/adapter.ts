export type CapabilityMode = "live" | "manual" | "unavailable";
export interface ChannelAdapter {
  capabilities(): Record<
    | "publish"
    | "fetchInbox"
    | "sendReply"
    | "fetchMetrics"
    | "verifyWebhook"
    | "refreshCredentials",
    CapabilityMode
  >;
  publish(payload: unknown): Promise<unknown>;
  fetchInbox(): Promise<unknown[]>;
  sendReply(payload: unknown): Promise<unknown>;
  fetchMetrics(): Promise<unknown[]>;
  verifyWebhook(body: Buffer, headers: Record<string, string>): boolean;
  refreshCredentials(): Promise<unknown>;
}
export class ManualAdapter implements ChannelAdapter {
  capabilities() {
    return {
      publish: "manual",
      fetchInbox: "manual",
      sendReply: "manual",
      fetchMetrics: "unavailable",
      verifyWebhook: "unavailable",
      refreshCredentials: "unavailable",
    } as const;
  }
  async publish(payload: unknown) {
    return { outcome: "needs_action", payload };
  }
  async sendReply(payload: unknown) {
    return { outcome: "needs_action", payload };
  }
  async fetchInbox() {
    return [];
  }
  async fetchMetrics() {
    return [];
  }
  verifyWebhook() {
    return false;
  }
  async refreshCredentials() {
    return { outcome: "needs_action", reason: "manual_channel" };
  }
}
