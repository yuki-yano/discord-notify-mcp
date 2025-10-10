import { describe, expect, it, vi } from "vitest";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApplication } from "../src/server";
import type { NotificationPayload, ValidatedConfig } from "../src/types";

const stubConfig: ValidatedConfig = {
  webhookUrl: "https://discord.com/api/webhooks/123/abc",
  defaultUsername: "notify-bot",
};

type ServerShape = Pick<McpServer, "registerTool" | "connect">;
type TransportInstance = Parameters<ServerShape["connect"]>[0];

const createStubTransport = (): TransportInstance => ({
  start: async () => {},
  send: async () => {},
  close: async () => {},
});

describe("createApplication", () => {
  it("registers the Discord notification tool with expected metadata", async () => {
    const registerTool = vi.fn() as unknown as ServerShape["registerTool"];
    const connect = vi.fn(async () => {}) as unknown as ServerShape["connect"];
    const server: ServerShape = { registerTool, connect };
    const createApp = () => {
      const dependencies: Parameters<typeof createApplication>[0] = {
        configProvider: () => stubConfig,
        discordClient: {
          postMessages: vi.fn(async () => {}),
        },
        createMcpServer: () => server,
        createTransport: () => createStubTransport(),
      };
      return createApplication(dependencies);
    };

    const app = createApp();
    await app.start();

    expect(registerTool).toHaveBeenCalledWith(
      "notify",
      expect.objectContaining({
        description: expect.stringContaining("Discord"),
        inputSchema: expect.any(Object),
      }),
      expect.any(Function),
    );
    expect(connect).toHaveBeenCalled();
  });

  it("invokes the notification action when the tool handler runs", async () => {
    const postMessages = vi.fn(async () => {});
    let toolHandler: ((args: NotificationPayload) => Promise<unknown>) | undefined;
    const registerTool = vi.fn((name, _config, handler) => {
      toolHandler = handler;
    }) as unknown as ServerShape["registerTool"];
    const connect = vi.fn(async () => {}) as unknown as ServerShape["connect"];
    const server: ServerShape = { registerTool, connect };

    const dependencies: Parameters<typeof createApplication>[0] = {
      configProvider: () => stubConfig,
      discordClient: { postMessages },
      createMcpServer: () => server,
      createTransport: () => createStubTransport(),
    };

    const app = createApplication(dependencies);

    await app.start();
    await toolHandler?.({ content: "hello" });

    expect(postMessages).toHaveBeenCalled();
  });
});
