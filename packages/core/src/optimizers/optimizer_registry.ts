import { objectiveFunction } from "../types"
import { VanillaGD } from "./vanilla_gd"

export const optimizationAlgorithms: Record<string, Record<string, string[]>> = {
    "Vanilla Gradient Descent": {"params": ["lr"]}
}
// "create": (lr: number, objectiveFunc: objectiveFunction) => new VanillaGD(lr, objectiveFunc)
export const optimizationAlgorithmsList: string[] = ["Vanilla Gradient Descent", "Another Opti Algo"]

// TODO: add min/max for parameters