import { describe, expect, it } from "vitest";

import { prepareDatabase } from "../src/migrate.js";
import { testConfig } from "./helpers.js";

describe("the tables of the auth service", () => {
  it("leaves the in-memory adapter alone", async () => {
    const config = testConfig();

    await expect(prepareDatabase(config)).resolves.toBeUndefined();
  });
});
