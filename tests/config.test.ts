import { describe, expect, it } from "vitest";

import { readConfig, resetConfigCache } from "../src/config";

const withEnv = (env: Record<string, string | undefined>, assertion: () => void) => {
  const original = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    assertion();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(original)) {
      process.env[key] = value;
    }
  }
};

describe("readConfig", () => {
  it("returns validated configuration when env variables are set", () => {
    withEnv(
      {
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc",
        DISCORD_USER_ID: "424242",
        DISCORD_NOTIFY_USER_NAME: undefined,
        DISCORD_NOTIFY_AVATAR_URL: undefined,
      },
      () => {
        resetConfigCache();
        const config = readConfig();
        expect(config.webhookUrl).toBe("https://discord.com/api/webhooks/123/abc");
        expect(config.userId).toBe("424242");
        expect(config.defaultUsername).toBe("notify-bot");
        expect(config.avatarUrl).toBeUndefined();
      },
    );
  });

  it("throws descriptive error when webhook URL is missing", () => {
    withEnv(
      {
        DISCORD_WEBHOOK_URL: undefined,
        DISCORD_USER_ID: undefined,
        DISCORD_NOTIFY_USER_NAME: undefined,
        DISCORD_NOTIFY_AVATAR_URL: undefined,
      },
      () => {
        resetConfigCache();
        expect(() => readConfig()).toThrowError(/DISCORD_WEBHOOK_URL/);
      },
    );
  });

  it("throws descriptive error when webhook URL is not a Discord webhook", () => {
    withEnv(
      {
        DISCORD_WEBHOOK_URL: "https://example.com/invalid",
        DISCORD_USER_ID: undefined,
        DISCORD_NOTIFY_USER_NAME: undefined,
        DISCORD_NOTIFY_AVATAR_URL: undefined,
      },
      () => {
        resetConfigCache();
        expect(() => readConfig()).toThrowError(/discord\.com\/api\/webhooks/);
      },
    );
  });

  it("uses DISCORD_NOTIFY_USER_NAME when provided", () => {
    withEnv(
      {
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc",
        DISCORD_USER_ID: undefined,
        DISCORD_NOTIFY_USER_NAME: "custom-bot",
        DISCORD_NOTIFY_AVATAR_URL: undefined,
      },
      () => {
        resetConfigCache();
        const config = readConfig();
        expect(config.defaultUsername).toBe("custom-bot");
      },
    );
  });

  it("uses DISCORD_NOTIFY_AVATAR_URL when provided", () => {
    withEnv(
      {
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc",
        DISCORD_USER_ID: undefined,
        DISCORD_NOTIFY_USER_NAME: undefined,
        DISCORD_NOTIFY_AVATAR_URL: "https://example.com/avatar.png",
      },
      () => {
        resetConfigCache();
        const config = readConfig();
        expect(config.avatarUrl).toBe("https://example.com/avatar.png");
      },
    );
  });

  it("rejects invalid DISCORD_NOTIFY_AVATAR_URL", () => {
    withEnv(
      {
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc",
        DISCORD_USER_ID: undefined,
        DISCORD_NOTIFY_USER_NAME: undefined,
        DISCORD_NOTIFY_AVATAR_URL: "not-a-url",
      },
      () => {
        resetConfigCache();
        expect(() => readConfig()).toThrowError(/DISCORD_NOTIFY_AVATAR_URL/);
      },
    );
  });
});
