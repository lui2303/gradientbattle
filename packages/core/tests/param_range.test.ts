import { describe, it, expect } from "vitest";
import { optimizationAlgorithms, paramRangeError } from "../src/optimizers/optimizer_registry";
import { ADAM_NAME, GD_NAME, RMSPROP_NAME } from "../src/optimizers/constants";

const defaultsOf = (name: string) =>
  Object.fromEntries(
    Object.entries(optimizationAlgorithms[name].params).map(([key, { value }]) => [key, { enabled: true, value }]),
  );

describe("paramRangeError", () => {
  it("accepts every optimizer's default params, and every default lies within its range", () => {
    for (const [name, { params }] of Object.entries(optimizationAlgorithms)) {
      expect(paramRangeError(name, defaultsOf(name))).toBeNull();
      for (const { value, min, max } of Object.values(params)) {
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    }
  });

  it("accepts values exactly at min and max", () => {
    const { min, max } = optimizationAlgorithms[ADAM_NAME].params.beta2;
    expect(paramRangeError(ADAM_NAME, { ...defaultsOf(ADAM_NAME), beta2: { value: min } })).toBeNull();
    expect(paramRangeError(ADAM_NAME, { ...defaultsOf(ADAM_NAME), beta2: { value: max } })).toBeNull();
  });

  it("rejects values below min or above max", () => {
    expect(paramRangeError(GD_NAME, { lr: { value: -0.01 } })).toMatch(/lr of Gradient Descent/);
    expect(paramRangeError(GD_NAME, { lr: { value: 10.01 } })).toMatch(/between 0 and 10/);
    expect(paramRangeError(RMSPROP_NAME, { ...defaultsOf(RMSPROP_NAME), momentum: { value: 1 } })).toMatch(/momentum/);
    expect(paramRangeError(ADAM_NAME, { ...defaultsOf(ADAM_NAME), beta1: { value: 1 } })).toMatch(/beta1/);
  });

  it("rejects non-finite and non-numeric values", () => {
    for (const value of [NaN, Infinity, -Infinity, "0.5", null, undefined, {}, [0.5], true]) {
      expect(paramRangeError(GD_NAME, { lr: { value } })).not.toBeNull();
    }
  });

  it("rejects missing params", () => {
    expect(paramRangeError(ADAM_NAME, { lr: { value: 0.1 }, beta1: { value: 0.9 } })).toMatch(/beta2/);
    expect(paramRangeError(GD_NAME, {})).not.toBeNull();
    expect(paramRangeError(GD_NAME, undefined)).not.toBeNull();
    expect(paramRangeError(GD_NAME, { lr: null } as unknown as Record<string, { value: unknown }>)).not.toBeNull();
  });

  it("rejects unknown optimizers, including inherited object keys", () => {
    for (const name of ["SGD", "constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(paramRangeError(name, { lr: { value: 0.1 } })).toMatch(/Unknown optimizer/);
    }
  });
});
