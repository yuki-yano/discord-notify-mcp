import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const listSourceFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const resolved = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(resolved));
      continue;
    }
    if (resolved.endsWith(".ts")) {
      files.push(resolved);
    }
  }
  return files;
};

describe("coding conventions", () => {
  it("does not use class or function declarations in source files", () => {
    const sources = listSourceFiles(join(process.cwd(), "src"));
    const violations = sources.flatMap((file) => {
      const content = readFileSync(file, "utf8");
      const hits = [] as string[];
      if (/\bclass\s/.test(content)) {
        hits.push("class");
      }
      if (/\bfunction\s/.test(content)) {
        hits.push("function");
      }
      return hits.length > 0 ? [`${file}: ${hits.join(", ")}`] : [];
    });

    expect(violations).toEqual([]);
  });
});
