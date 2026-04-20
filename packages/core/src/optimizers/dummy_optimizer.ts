import type { objectiveFunction, Optimizer, Point } from "../types";


export class DummyOptimizer implements Optimizer {
    name= "Dummy Gradient Descent"
    lr: number
    objective: objectiveFunction;

    constructor(lr: number, objective: objectiveFunction) {
        this.lr = lr
        this.objective = objective
    }

    step(point: Point): Point {
        return {x: point.x + this.lr, y: point.y + this.lr}
    }
}