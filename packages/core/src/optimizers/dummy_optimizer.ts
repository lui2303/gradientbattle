import type { objectiveFunction, Optimizer, Point } from "../types";


export class DummyOptimizer implements Optimizer {
    name= "Dummy Gradient Descent"
    lr: number
    objective: objectiveFunction
    alpha: number

    constructor(lr: number, objective: objectiveFunction, alpha: number) {
        this.lr = lr
        this.objective = objective
        this.alpha = alpha
    }

    step(point: Point): Point {
        return {x: point.x + this.lr + this.alpha, y: point.y + this.lr}
    }
}