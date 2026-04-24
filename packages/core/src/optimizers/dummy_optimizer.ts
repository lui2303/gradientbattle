import type { objectiveFunction, Optimizer, Point } from "../types";


export class DummyOptimizer implements Optimizer {
    name= "Dummy Gradient Descent"
    lr: number
    objective: objectiveFunction
    alpha: number
    startingPoint: Point;

    constructor(lr: number, objective: objectiveFunction, alpha: number, startingPoint: Point) {
        this.lr = lr
        this.objective = objective
        this.alpha = alpha
        this.startingPoint = startingPoint
    }

    step(point: Point): Point {
        return {x: point.x + this.lr + this.alpha, y: point.y + this.lr}
    }
}