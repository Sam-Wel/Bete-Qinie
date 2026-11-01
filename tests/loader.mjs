// Lets Node's built-in test runner import the app's source as it is: files
// under src/ are ES modules written for Metro, with extensionless imports
// ("./verbQuiz"). No test framework is needed beyond `node --test`.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?jsx?$|\.json$/.test(specifier)) {
    for (const ext of [".js", ".jsx"]) {
      const url = new URL(specifier + ext, context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.includes("/src/") && url.endsWith(".js")) {
    return { format: "module", source: await readFile(fileURLToPath(url), "utf8"), shortCircuit: true };
  }
  return next(url, context);
}
