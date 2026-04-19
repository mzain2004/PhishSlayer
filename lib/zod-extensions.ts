import net from "node:net";
import { z, type ZodType } from "zod";

declare module "zod" {
  interface ZodString {
    ip(options?: { version?: "v4" | "v6" }): ZodType<string>;
  }
}

const ipMethod = function ip(
  this: z.ZodString,
  options?: { version?: "v4" | "v6" },
) {
  const version = options?.version;
  return this.refine(
    (value) => {
      const ipType = net.isIP(value);
      if (version === "v4") return ipType === 4;
      if (version === "v6") return ipType === 6;
      return ipType !== 0;
    },
    { message: "Invalid IP address" },
  );
};

if (!(z.ZodString.prototype as unknown as { ip?: unknown }).ip) {
  (z.ZodString.prototype as unknown as { ip: typeof ipMethod }).ip = ipMethod;
}
