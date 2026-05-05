import type { objectiveFunction, Optimizer, Point } from "../types";
import { scalarMultiplication, vectorAddition } from "../math_helper";

import {GD_NAME} from "./constants"

export class GradientDescent implements Optimizer {
    name= GD_NAME
    lr: number
    objective: objectiveFunction
    startingPoint: Point
    id: string

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
    }

    step(point: Point): Point {
        const gradientStep: Point = scalarMultiplication(this.objective.gradient(point), -this.lr)

        return vectorAddition(gradientStep, point)
    }
    reset(): void {
        return
    }
}