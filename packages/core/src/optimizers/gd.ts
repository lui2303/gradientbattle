import type { objectiveFunction, Optimizer, Point } from "../types";
import { scalarMultiplication, vectorAddition } from "../math_helper";

import {GD_NAME} from "./constants"
import { start } from "repl";

export class GradientDescent implements Optimizer {
    name= GD_NAME
    lr: number
    objective: objectiveFunction
    startingPoint: Point
    id: string
    lastIterate: Point

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.lastIterate = startingPoint
    }

    step(): Point {
        const gradientStep: Point = scalarMultiplication(this.objective.gradient(this.lastIterate), -this.lr)
        this.lastIterate = vectorAddition(gradientStep, this.lastIterate)
        return this.lastIterate
    }
    reset(): void {
        this.lastIterate = this.startingPoint
    }
}