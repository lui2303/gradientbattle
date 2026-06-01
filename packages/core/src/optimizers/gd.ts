import type { objectiveFunction, Optimizer, Point } from "../types";
import { norm, scalarMultiplication, vectorAddition } from "../math_helper";

import {GD_NAME} from "./constants"

export class GradientDescent implements Optimizer {
    name= GD_NAME
    lr: number
    objective: objectiveFunction
    startingPoint: Point
    id: string
    lastIterate: Point
    reachedOptimum: boolean = false
    optimumTreshhold: number

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string, optimumTreshhold: number = 0.0001) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.lastIterate = startingPoint
        this.optimumTreshhold = optimumTreshhold
    }
    

    step(): Point {
        if(this.reachedOptimum) return this.lastIterate
        const gradientStep: Point = scalarMultiplication(this.objective.gradient(this.lastIterate), -this.lr)
        this.lastIterate = vectorAddition(gradientStep, this.lastIterate)

        if(norm(this.lastIterate) < this.optimumTreshhold) this.reachedOptimum = true

        return this.lastIterate
    }
    reset(): void {
        this.lastIterate = this.startingPoint
        this.reachedOptimum = false
    }
}