import { describe, it, expect } from "vitest";
import { GradientDescent } from "../src/optimizers/gd";
import { GradientDescentMomentum } from "../src/optimizers/gd_momentum";
import { AdaGrad } from "../src/optimizers/adagrad";
import { RMSProp } from "../src/optimizers/rmsprop";
import { Adam } from "../src/optimizers/adam";
import { optimizerFactory } from "../src/optimizers/optimizer_factory";
import {
  ADAGRAD_NAME,
  ADAM_NAME,
  GD_MOMENTUM_NAME,
  GD_NAME,
  RMSPROP_NAME,
} from "../src/optimizers/constants";
import { quadraticFunction } from "../src/functions/quadratic_function";
import { Optimizer, Point } from "../src/types";
import { norm } from "../src/math_helper";

const sphere = () =>
  new quadraticFunction(
    [
      [1, 0],
      [0, 1],
    ],
    { x: 0, y: 0 },
    0,
  );

const START: Point = { x: 5, y: 5 };

function approx(p: Point, expected: Point, tol = 1e-6) {
  expect(p.x).toBeCloseTo(expected.x, -Math.log10(tol));
  expect(p.y).toBeCloseTo(expected.y, -Math.log10(tol));
}

function runSteps(opt: Optimizer, n: number): Point {
  let p: Point = { x: NaN, y: NaN };
  for (let i = 0; i < n; i++) p = opt.step();
  return p;
}

describe("GradientDescent", () => {
  it("performs the analytical first step on the sphere", () => {
    const opt = new GradientDescent(0.05, sphere(), START, "id");
    // grad(5,5) = (10,10); x_1 = x_0 - lr * grad = (5 - 0.5, 5 - 0.5) = (4.5, 4.5)
    approx(opt.step(), { x: 4.5, y: 4.5 });
  });

  it("converges to the minimum on the sphere", () => {
    const opt = new GradientDescent(0.05, sphere(), START, "id");
    const final = runSteps(opt, 100);
    expect(norm(final)).toBeLessThan(1e-3);
  });

  it("reset restores the starting iterate", () => {
    const opt = new GradientDescent(0.05, sphere(), START, "id");
    runSteps(opt, 10);
    opt.reset();
    expect(opt.lastIterate).toEqual(START);
    // First step after reset must reproduce the analytical first step.
    approx(opt.step(), { x: 4.5, y: 4.5 });
  });
});

describe("GradientDescentMomentum", () => {
  it("performs the analytical first two steps on the sphere", () => {
    const opt = new GradientDescentMomentum(0.1, sphere(), START, "id", 0.8);
    // v_1 = 0.8*0 + grad(5,5) = (10,10); x_1 = (5,5) - 0.1*(10,10) = (4,4)
    approx(opt.step(), { x: 4, y: 4 });
    // v_2 = 0.8*(10,10) + grad(4,4) = (16,16); x_2 = (4,4)-0.1*(16,16) = (2.4,2.4)
    approx(opt.step(), { x: 2.4, y: 2.4 });
  });

  it("converges to the minimum on the sphere", () => {
    const opt = new GradientDescentMomentum(0.1, sphere(), START, "id", 0.8);
    const final = runSteps(opt, 200);
    expect(norm(final)).toBeLessThan(1e-3);
  });

  it("reset zeros velocity and restores the starting iterate", () => {
    const opt = new GradientDescentMomentum(0.1, sphere(), START, "id", 0.8);
    runSteps(opt, 5);
    expect(opt.velocity.x).not.toBe(0);
    opt.reset();
    expect(opt.velocity).toEqual({ x: 0, y: 0 });
    expect(opt.lastIterate).toEqual(START);
    approx(opt.step(), { x: 4, y: 4 });
  });
});

describe("AdaGrad", () => {
  it("performs the analytical first step on the sphere", () => {
    const opt = new AdaGrad(0.1, sphere(), START, "id");
    // grad=(10,10); G_1=(100,100); update = -0.1*(10,10)/(sqrt(100)+eps) ~= (-0.1,-0.1)
    approx(opt.step(), { x: 4.9, y: 4.9 }, 1e-6);
  });

  it("monotonically reduces the iterate norm on the sphere", () => {
    const opt = new AdaGrad(0.1, sphere(), START, "id");
    let prev = norm(START);
    for (let i = 0; i < 50; i++) {
      const n = norm(opt.step());
      expect(n).toBeLessThanOrEqual(prev + 1e-12);
      prev = n;
    }
  });

  it("reset zeros the squared gradient sum and restores the starting iterate", () => {
    const opt = new AdaGrad(0.1, sphere(), START, "id");
    runSteps(opt, 5);
    expect(opt.squaredGradientSum.x).toBeGreaterThan(0);
    opt.reset();
    expect(opt.squaredGradientSum).toEqual({ x: 0, y: 0 });
    expect(opt.lastIterate).toEqual(START);
    approx(opt.step(), { x: 4.9, y: 4.9 }, 1e-6);
  });
});

describe("RMSProp", () => {
  it("performs the analytical first step on the sphere", () => {
    const opt = new RMSProp(0.1, sphere(), START, "id", 0.99);
    // v_1 = 0.99*0 + 0.01*(100,100) = (1,1); update = -0.1*(10,10)/(sqrt(1)+eps) ~= (-1,-1)
    approx(opt.step(), { x: 4, y: 4 }, 1e-6);
  });

  it("reduces the iterate norm by at least an order of magnitude", () => {
    // RMSProp without bias correction oscillates near the minimum, so we
    // assert order-of-magnitude reduction rather than convergence to zero.
    const opt = new RMSProp(0.01, sphere(), START, "id", 0.99);
    const final = runSteps(opt, 500);
    expect(norm(final)).toBeLessThan(norm(START) / 10);
  });

  it("reset zeros velocity and restores the starting iterate", () => {
    const opt = new RMSProp(0.1, sphere(), START, "id", 0.99);
    runSteps(opt, 5);
    expect(opt.velocity.x).toBeGreaterThan(0);
    opt.reset();
    expect(opt.velocity).toEqual({ x: 0, y: 0 });
    expect(opt.lastIterate).toEqual(START);
  });
});

describe("Adam", () => {
  it("performs the analytical first step on the sphere", () => {
    const opt = new Adam(0.1, sphere(), START, "id", 0.9, 0.999);
    // t=1: m_hat=g=(10,10), v_hat=g^2=(100,100); update = -0.1*(10,10)/(sqrt(100)+eps) ~= (-0.1,-0.1)
    approx(opt.step(), { x: 4.9, y: 4.9 }, 1e-6);
  });

  it("converges to the minimum on the sphere", () => {
    const opt = new Adam(0.1, sphere(), START, "id", 0.9, 0.999);
    const final = runSteps(opt, 500);
    expect(norm(final)).toBeLessThan(1e-2);
  });

  it("reset zeros moments, step counter, and restores the starting iterate", () => {
    const opt = new Adam(0.1, sphere(), START, "id", 0.9, 0.999);
    runSteps(opt, 5);
    expect(opt.stepsCount).toBe(5);
    opt.reset();
    expect(opt.meanEstimation).toEqual({ x: 0, y: 0 });
    expect(opt.varianceEstimation).toEqual({ x: 0, y: 0 });
    expect(opt.stepsCount).toBe(0);
    expect(opt.lastIterate).toEqual(START);
    approx(opt.step(), { x: 4.9, y: 4.9 }, 1e-6);
  });
});

describe("optimizerFactory", () => {
  const baseParams = { objective: sphere(), startingPoint: START, id: "id" };

  it.each([
    [GD_NAME, { ...baseParams, lr: 0.05 }, GradientDescent],
    [GD_MOMENTUM_NAME, { ...baseParams, lr: 0.1, momentum: 0.8 }, GradientDescentMomentum],
    [ADAGRAD_NAME, { ...baseParams, lr: 0.1 }, AdaGrad],
    [RMSPROP_NAME, { ...baseParams, lr: 0.1, momentum: 0.99 }, RMSProp],
    [ADAM_NAME, { ...baseParams, lr: 0.1, beta1: 0.9, beta2: 0.999 }, Adam],
  ])("returns a %s instance", (name, params, ctor) => {
    expect(optimizerFactory(name, params)).toBeInstanceOf(ctor);
  });

  it("falls back to GradientDescent for unknown names", () => {
    expect(
      optimizerFactory("nonexistent", { ...baseParams, lr: 0.1 }),
    ).toBeInstanceOf(GradientDescent);
  });
});
