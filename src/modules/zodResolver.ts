import type { Resolver, FieldValues } from "react-hook-form";
import type { ZodType } from "zod";

/** Lightweight zod resolver to avoid version mismatch with @hookform/resolvers. */
export function zResolver<V extends FieldValues>(schema: ZodType<V>): Resolver<V> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data as any, errors: {} };
    const errors: any = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!path) continue;
      // set nested error path
      const keys = issue.path as (string | number)[];
      let cur = errors;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = cur[keys[i]] ?? {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = { type: issue.code, message: issue.message };
    }
    return { values: {} as any, errors };
  };
}