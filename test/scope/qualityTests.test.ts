import { getFirstLine } from "../utils/utils";

describe("Quality checks", () => {
  it("Check if the first line of scope.ts is correct (sometimes there is 'nodeimport' there)", async () => {
    const EXPECTED_FIRST_LINE = "#!/usr/bin/env node";

    const firstLine = await getFirstLine("./src/scope.ts");
    expect(firstLine).toBe(EXPECTED_FIRST_LINE);
  });
});
