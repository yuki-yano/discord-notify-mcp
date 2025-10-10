import { describe, expect, it, vi } from "vitest";

import { createDiscordClient } from "../src/discord";
import type { DiscordMessage, ValidatedConfig } from "../src/types";

const buildConfig = (overrides: Partial<ValidatedConfig> = {}): ValidatedConfig => ({
  webhookUrl: "https://discord.com/api/webhooks/123/abc",
  defaultUsername: "notify-bot",
  userId: "4242",
  avatarUrl: "https://example.com/avatar.png",
  ...overrides,
});

describe("createDiscordClient", () => {
  it("posts each message to the webhook in order", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createDiscordClient({ fetchImpl: fetchMock });

    const messages: readonly DiscordMessage[] = [{ content: "message-1", username: "alpha" }, { content: "message-2" }];

    await client.postMessages(messages, buildConfig());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCall = fetchMock.mock.calls[0];
    const secondCall = fetchMock.mock.calls[1];
    if (!firstCall || !secondCall) {
      throw new Error("expected fetch to be called twice");
    }
    const [, firstInit] = firstCall as unknown as [string, RequestInit];
    const [, secondInit] = secondCall as unknown as [string, RequestInit];
    expect(firstInit.body).toBeDefined();
    expect(secondInit.body).toBeDefined();
    const firstCallBody = JSON.parse(String(firstInit.body));
    const secondCallBody = JSON.parse(String(secondInit.body));
    expect(firstCallBody.content).toBe("message-1");
    expect(secondCallBody.content).toBe("message-2");
    expect(firstCallBody.avatar_url).toBe("https://example.com/avatar.png");
    expect(secondCallBody.avatar_url).toBe("https://example.com/avatar.png");
  });

  it("throws an error when Discord returns a non-2xx status", async () => {
    const fetchMock = vi.fn(async () => new Response("bad", { status: 400, statusText: "Bad Request" }));
    const client = createDiscordClient({ fetchImpl: fetchMock });
    const message: DiscordMessage = { content: "bad" };

    await expect(client.postMessages([message], buildConfig())).rejects.toThrowError(/Discord Webhook request failed/);
  });
});
