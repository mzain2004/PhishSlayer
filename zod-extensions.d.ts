import "zod";
import type { ZodType } from "zod";

declare module "zod" {
  interface ZodString {
    ip(options?: { version?: "v4" | "v6" }): ZodType<string>;
  }
}

export {};
