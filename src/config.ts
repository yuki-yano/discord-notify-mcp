import { z } from "zod";

import type { ValidatedConfig } from "./types";

const webhookPrefix = "https://discord.com/api/webhooks/";
const fallbackUsername = "notify-bot";
const envSchema = z.object({
  DISCORD_WEBHOOK_URL: z
    .string({ invalid_type_error: "DISCORD_WEBHOOK_URL must be a string" })
    .min(1, "DISCORD_WEBHOOK_URL is required")
    .refine((url) => url.startsWith(webhookPrefix), {
      message: `DISCORD_WEBHOOK_URL must start with ${webhookPrefix}`,
    }),
  DISCORD_USER_ID: z.string({ invalid_type_error: "DISCORD_USER_ID must be a string" }).optional(),
  DISCORD_NOTIFY_USER_NAME: z.string({ invalid_type_error: "DISCORD_NOTIFY_USER_NAME must be a string" }).optional(),
});

let cachedConfig: ValidatedConfig | undefined;

type ValidatedEnv = z.infer<typeof envSchema>;

const parseEnv = (inputEnv: NodeJS.ProcessEnv): ValidatedEnv => {
  const candidate = {
    DISCORD_WEBHOOK_URL: inputEnv.DISCORD_WEBHOOK_URL?.trim(),
    DISCORD_USER_ID: inputEnv.DISCORD_USER_ID?.trim(),
    DISCORD_NOTIFY_USER_NAME: inputEnv.DISCORD_NOTIFY_USER_NAME?.trim(),
  };
  const result = envSchema.safeParse(candidate);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((issue) => `- ${issue.message}`);
  const guidance = [
    "Discord notification configuration is incomplete. Set the following environment variables:",
    '  export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/<id>/<token>"',
    '  # optional: export DISCORD_USER_ID="<target-user-id>"',
    '  # optional: export DISCORD_NOTIFY_USER_NAME="notify-bot"',
    ...issues,
  ].join("\n");
  throw new Error(guidance);
};

export const readConfig = (): ValidatedConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = parseEnv(process.env);
  cachedConfig = {
    webhookUrl: parsed.DISCORD_WEBHOOK_URL,
    defaultUsername: parsed.DISCORD_NOTIFY_USER_NAME || fallbackUsername,
    ...(parsed.DISCORD_USER_ID ? { userId: parsed.DISCORD_USER_ID } : {}),
  };
  return cachedConfig;
};

export const resetConfigCache = (): void => {
  cachedConfig = undefined;
};
