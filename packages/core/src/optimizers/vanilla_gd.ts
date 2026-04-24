import type { objectiveFunction, Optimizer, Point } from "../types";
import { scalarMultiplication, vectorAddition } from "../math_helper";


export class VanillaGD implements Optimizer {
    name= "Vanilla Gradient Descent"
    lr: number
    objective: objectiveFunction;
    startingPoint: Point;

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
    }

    step(point: Point): Point {
        console.log(this.objective)
        const gradientStep: Point = scalarMultiplication(this.objective.gradient(point), -this.lr)

        return vectorAddition(gradientStep, point)
    }
}