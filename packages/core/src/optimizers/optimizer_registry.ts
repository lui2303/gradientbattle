import { objectiveFunction } from "../types"
import { VanillaGD } from "./vanilla_gd"

export type Param = {name: string, value: number}
export const optimizationAlgorithms: Record<string, Record<string, Record<string, number>>> = {
    "Vanilla Gradient Descent": {"params": {"lr": 0.05}},
    "Dummy Optimization Algorithm": {"params": {"lr": 2, "alpha": 0.07}}
}

// "create": (lr: number, objectiveFunc: objectiveFunction) => new VanillaGD(lr, objectiveFunc)
export const optimizationAlgorithmsList: string[] = ["Vanilla Gradient Descent", "Dummy Optimization Algorithm"]

// TODO: add min/max for parameters