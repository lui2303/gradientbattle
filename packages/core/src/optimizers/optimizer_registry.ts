import { Point } from "../types"
import { ADAGRAD_NAME, ADAM_NAME, GD_MOMENTUM_NAME, GD_NAME, RMSPROP_NAME } from "./constants"

export type Param = {name: string, value: number}

const startingPoint = {x: 5, y: 5}

type OptimizationAlgorithm = Record<string,{params: Record<string, number>, startingPoint: Point}>


export const optimizationAlgorithms: OptimizationAlgorithm = {
    [GD_NAME]: {"params": {"lr": 0.05},"startingPoint": startingPoint},
    [GD_MOMENTUM_NAME]: {"params": {"lr": 0.1, "momentum": 0.8}, startingPoint: startingPoint},
    [ADAGRAD_NAME]: {"params": {"lr": 0.1}, startingPoint: startingPoint},
    [RMSPROP_NAME]: {"params": {"lr": 0.1, "momentum": 0.99}, startingPoint: startingPoint},
    [ADAM_NAME]: {"params": {"lr": 0.1, "beta1": 0.9, "beta2": 0.999}, startingPoint: startingPoint}
}

// "create": (lr: number, objectiveFunc: objectiveFunction) => new VanillaGD(lr, objectiveFunc)
export const optimizationAlgorithmsList: string[] = [GD_NAME, GD_MOMENTUM_NAME, ADAGRAD_NAME, RMSPROP_NAME, ADAM_NAME]

// TODO: add min/max for parameters

// How to register a new Optimizer:
// Add optimizer name in constants.ts and add them to optimizationAlgorithmsList and optimizationAlgorithms with const as key and their metadata