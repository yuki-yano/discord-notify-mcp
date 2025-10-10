import type { DiscordMessage, ValidatedConfig } from "./types";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

type Dependencies = {
  readonly fetchImpl?: FetchLike;
};

const buildRequestBody = (message: DiscordMessage, config: ValidatedConfig) => ({
  content: message.content,
  username: message.username ?? config.defaultUsername,
  embeds: message.embeds,
  allowed_mentions: message.allowedMentions
    ? {
        users: message.allowedMentions.users,
      }
    : undefined,
});

export const createDiscordClient = (dependencies: Dependencies = {}) => {
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  const postMessages = async (messages: readonly DiscordMessage[], config: ValidatedConfig): Promise<void> => {
    for (const message of messages) {
      const response = await fetchImpl(config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(message, config)),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "<no body>");
        throw new Error(
          `Discord Webhook request failed with status ${response.status} ${response.statusText}: ${bodyText}`,
        );
      }
    }
  };

  return {
    postMessages,
  };
};
