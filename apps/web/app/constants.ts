import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry";
import { Optimizer } from "./types";
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic_function";


export const defaultOptimizer: Optimizer = {
          "name": optimizationAlgorithmsList[0],
          "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"],
          "startingPoint": { x: 5, y: 5 },
          "color": "#0bf565"
}

export const defaultFunc = new quadraticFunction([[1, 0], [0, 1]], { x: 0, y: 0 }, 0)

export const treshhold = 0.001

export const MAX_SUBMISSIONS = 2