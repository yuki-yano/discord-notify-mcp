export type DiscordEmbed = {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly url?: string | undefined;
  readonly color?: number | undefined;
};

export type DiscordMessage = {
  readonly content: string;
  readonly username?: string;
  readonly embeds?: DiscordEmbed[] | undefined;
  readonly allowedMentions?: {
    readonly users?: string[] | undefined;
  };
};

export type NotificationPayload = {
  readonly title: string;
  readonly body?: string | undefined;
  readonly embeds?: DiscordEmbed[] | undefined;
  readonly username?: string | undefined;
};

export type ValidatedConfig = {
  readonly webhookUrl: string;
  readonly userId?: string;
  readonly defaultUsername: string;
};
