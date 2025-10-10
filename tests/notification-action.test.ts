import { describe, expect, it, vi } from "vitest";

import { createNotificationAction } from "../src/notification-action";
import type { DiscordMessage, NotificationPayload, ValidatedConfig } from "../src/types";

type PostMessages = (messages: readonly unknown[], config: ValidatedConfig) => Promise<void>;

const baseConfig: ValidatedConfig = {
  webhookUrl: "https://discord.com/api/webhooks/123/abc",
  defaultUsername: "notify-bot",
  userId: "777",
};

const createAction = (
  config: ValidatedConfig = baseConfig,
  postMessages: PostMessages | undefined = undefined,
  chunkSize: number | undefined = undefined,
) =>
  createNotificationAction({
    configProvider: () => config,
    discordClient: {
      postMessages: postMessages ?? (async () => {}),
    },
    ...(typeof chunkSize === "undefined" ? {} : { chunkSize }),
  });

describe("createNotificationAction", () => {
  it("adds mention when user id exists and forwards message to the client", async () => {
    const postMessagesMock = vi.fn(async () => {});
    const action = createAction(baseConfig, postMessagesMock);
    const payload: NotificationPayload = {
      title: "Deployment finished",
      body: "All services are healthy.",
      username: "bot",
    };

    await action(payload);

    expect(postMessagesMock).toHaveBeenCalledTimes(1);
    const call = postMessagesMock.mock.calls[0];
    if (!call) {
      throw new Error("expected postMessages to be called");
    }
    const [messages, config] = call as unknown as [readonly DiscordMessage[], ValidatedConfig];
    expect(config).toBe(baseConfig);
    const firstMessage = messages[0];
    expect(firstMessage).toBeDefined();
    expect(firstMessage?.content).toContain("<@777>");
    expect(firstMessage?.content.startsWith("<@777> **Deployment finished**")).toBe(true);
    expect(firstMessage?.allowedMentions?.users).toContain("777");
    expect(firstMessage?.username).toBe("bot");
  });

  it("splits long content into 2000 character chunks", async () => {
    const longContent = "a".repeat(2500);
    const postMessagesMock = vi.fn(async () => {});
    const configWithoutUser: ValidatedConfig = {
      webhookUrl: baseConfig.webhookUrl,
      defaultUsername: baseConfig.defaultUsername,
    };
    const action = createAction(configWithoutUser, postMessagesMock);

    await action({ title: "Summary", body: longContent });

    const call = postMessagesMock.mock.calls[0];
    if (!call) {
      throw new Error("expected postMessages to be called");
    }
    const [messages] = call as unknown as [readonly DiscordMessage[], ValidatedConfig];
    expect(messages).toHaveLength(2);
    expect(messages[0]?.content.length).toBeLessThanOrEqual(2000);
    expect(messages[1]?.content.length).toBeLessThanOrEqual(2000);
    const combined = messages.map((message) => message.content).join("");
    expect(combined).toContain("**Summary**");
    expect(combined.replace("**Summary**", "").replace(/\n/g, "")).toContain(longContent);
  });

  it("throws when content is empty", async () => {
    const action = createAction();

    await expect(action({ title: "" })).rejects.toThrowError(/title/i);
  });

  it("throws when chunk size is zero or negative", () => {
    expect(() => createAction(baseConfig, undefined, 0)).toThrowError(/chunkSize must be a positive finite number/);
    expect(() => createAction(baseConfig, undefined, -1)).toThrowError(/chunkSize must be a positive finite number/);
  });

  it("caps chunk size to Discord's maximum when a larger value is provided", async () => {
    const postMessagesMock = vi.fn(async () => {});
    const longContent = "a".repeat(2500);
    const action = createAction(
      {
        webhookUrl: baseConfig.webhookUrl,
        defaultUsername: baseConfig.defaultUsername,
      },
      postMessagesMock,
      5000,
    );

    await action({ title: "Large", body: longContent });

    const call = postMessagesMock.mock.calls[0];
    if (!call) {
      throw new Error("expected postMessages to be called");
    }
    const [messages] = call as unknown as [readonly DiscordMessage[], ValidatedConfig];
    expect(messages).toHaveLength(2);
    for (const message of messages) {
      expect(message.content.length).toBeLessThanOrEqual(2000);
    }
  });
});
