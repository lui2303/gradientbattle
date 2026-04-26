import type { objectiveFunction, Optimizer, Point } from "../types";


export class DummyOptimizer implements Optimizer {
    name= "Dummy Gradient Descent"
    lr: number
    objective: objectiveFunction
    alpha: number
    startingPoint: Point
    id: string

    constructor(lr: number, objective: objectiveFunction, alpha: number, startingPoint: Point, id: string) {
        this.lr = lr
        this.objective = objective
        this.alpha = alpha
        this.startingPoint = startingPoint
        this.id = id
    }

    step(point: Point): Point {
        return {x: point.x + this.lr + this.alpha, y: point.y + this.lr}
    }
}