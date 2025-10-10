import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import { readConfig } from "./config";
import { createDiscordClient } from "./discord";
import { createNotificationAction, notificationPayloadSchema } from "./notification-action";
import type { NotificationPayload, ValidatedConfig } from "./types";

type DiscordClient = ReturnType<typeof createDiscordClient>;

type Logger = {
  readonly info?: (message: string) => void;
  readonly error?: (error: unknown) => void;
};

type ServerShape = Pick<McpServer, "registerTool" | "connect">;

type Dependencies = {
  readonly configProvider?: () => ValidatedConfig;
  readonly discordClient?: DiscordClient;
  readonly createMcpServer?: () => ServerShape;
  readonly createTransport?: () => Transport;
  readonly logger?: Logger;
};

const serverInfo = {
  name: "discord-notify-mcp",
  version: "0.1.0",
};

const createDefaultServer = (): ServerShape => new McpServer(serverInfo);
const createDefaultTransport = (): Transport => new StdioServerTransport();

export const createApplication = (dependencies: Dependencies = {}) => {
  const configProvider = dependencies.configProvider ?? readConfig;
  const discordClient = dependencies.discordClient ?? createDiscordClient();
  const instantiateServer = dependencies.createMcpServer ?? createDefaultServer;
  const instantiateTransport = dependencies.createTransport ?? createDefaultTransport;
  const notificationAction = createNotificationAction({
    configProvider,
    discordClient,
  });

  const server = instantiateServer();

  server.registerTool(
    "notify",
    {
      title: "Send a Discord notification",
      description: "Deliver a message via the configured Discord webhook.",
      inputSchema: notificationPayloadSchema.shape,
    },
    async (args) => {
      await notificationAction(args as NotificationPayload);
      return {
        content: [
          {
            type: "text",
            text: "Discord notification sent.",
          },
        ],
      };
    },
  );

  const start = async (): Promise<void> => {
    const transport = instantiateTransport();
    await server.connect(transport);
    dependencies.logger?.info?.("notify server started.");
  };

  return {
    start,
    server,
  };
};
