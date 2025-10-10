import { z } from "zod";

import type { DiscordMessage, NotificationPayload, ValidatedConfig } from "./types";

export const notificationPayloadSchema = z.object({
  content: z.string().min(1, "content must not be empty"),
  embeds: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        color: z.number().int().optional(),
      }),
    )
    .optional(),
  username: z.string().optional(),
});

type DiscordClient = {
  readonly postMessages: (messages: readonly DiscordMessage[], config: ValidatedConfig) => Promise<void>;
};

type Dependencies = {
  readonly configProvider: () => ValidatedConfig;
  readonly discordClient: DiscordClient;
  readonly chunkSize?: number;
};

const createChunks = (value: string, chunkSize: number): readonly string[] => {
  if (value.length <= chunkSize) {
    return [value];
  }
  const result: string[] = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    result.push(value.slice(index, index + chunkSize));
  }
  return result;
};

const buildMessages = (
  content: string,
  payload: NotificationPayload,
  config: ValidatedConfig,
  chunkSize: number,
): readonly DiscordMessage[] => {
  const withMention = config.userId ? `<@${config.userId}> ${content}` : content;
  const chunks = createChunks(withMention, chunkSize);
  return chunks.map((chunk, chunkIndex) => ({
    content: chunk,
    username: payload.username ?? config.defaultUsername,
    ...(payload.embeds ? { embeds: payload.embeds } : {}),
    ...(config.userId && chunkIndex === 0
      ? {
          allowedMentions: {
            users: [config.userId],
          },
        }
      : {}),
  }));
};

const MAX_DISCORD_MESSAGE_LENGTH = 2000;

const resolveChunkSize = (value: number | undefined): number => {
  if (typeof value === "undefined") {
    return MAX_DISCORD_MESSAGE_LENGTH;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("chunkSize must be a positive finite number");
  }
  return Math.min(Math.floor(value), MAX_DISCORD_MESSAGE_LENGTH);
};

export const createNotificationAction = (dependencies: Dependencies) => {
  const chunkSize = resolveChunkSize(dependencies.chunkSize);

  return async (input: NotificationPayload): Promise<void> => {
    const parsed = notificationPayloadSchema.parse(input);
    const payload: NotificationPayload = {
      content: parsed.content,
      ...(parsed.username ? { username: parsed.username } : {}),
      ...(parsed.embeds ? { embeds: parsed.embeds } : {}),
    };
    const config = dependencies.configProvider();
    const messages = buildMessages(payload.content, payload, config, chunkSize);
    await dependencies.discordClient.postMessages(messages, config);
  };
};
