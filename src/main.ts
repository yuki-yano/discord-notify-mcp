#!/usr/bin/env node

import { createApplication } from "./server";

const logger = {
  info: (message: string) => {
    process.stderr.write(`${message}\n`);
  },
  error: (error: unknown) => {
    console.error(error);
  },
};

const run = async () => {
  const app = createApplication({ logger });
  await app.start();
};

run().catch((error) => {
  logger.error(error);
  process.exit(1);
});
