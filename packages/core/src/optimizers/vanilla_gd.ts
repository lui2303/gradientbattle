import type { objectiveFunction, Optimizer, Point } from "../types";
import { scalarMultiplication, vectorAddition } from "../math_helper";


export class VanillaGD implements Optimizer {
    name= "Vanilla Gradient Descent"
    lr: number
    objective: objectiveFunction;

    constructor(lr: number, objective: objectiveFunction) {
        this.lr = lr
        this.objective = objective
    }

    step(point: Point): Point {
        console.log(this.objective)
        const gradientStep: Point = scalarMultiplication(this.objective.gradient(point), -this.lr)

        return vectorAddition(gradientStep, point)
    }
}