import { ADAGRAD_NAME, GD_MOMENTUM_NAME, GD_NAME } from "./constants"

export type Param = {name: string, value: number}

const startingPoint = {x: 5, y: 5}

export const optimizationAlgorithms: Record<string, Record<string, Record<string, number>>> = {
    [GD_NAME]: {"params": {"lr": 0.05},"startingPoint": startingPoint},
    [GD_MOMENTUM_NAME]: {"params": {"lr": 0.1, "momentum": 0.8}, startingPoint: startingPoint},
    [ADAGRAD_NAME]: {"params": {"lr": 0.1}, startingPoint: startingPoint}
}

// "create": (lr: number, objectiveFunc: objectiveFunction) => new VanillaGD(lr, objectiveFunc)
export const optimizationAlgorithmsList: string[] = [GD_NAME, GD_MOMENTUM_NAME, ADAGRAD_NAME]

// TODO: add min/max for parameters

// How to register a new Optimizer:
// Add optimizer name in constants.ts and add them to optimizationAlgorithmsList and optimizationAlgorithms with const as key and their metadata