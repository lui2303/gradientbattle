import { hadamardProduct, scalarMultiplication, vectorAddition } from "../math_helper";
import { objectiveFunction, Optimizer, Point } from "../types";
import { ADAGRAD_NAME } from "./constants";

export class AdaGrad implements Optimizer {
    lr: number
    objective: objectiveFunction
    name = ADAGRAD_NAME
    startingPoint: Point
    id: string
    squaredGradientSum: Point = {x: 0, y: 0}
    eps = 1e-8


    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
    }

    private adaGradSumManipulation(point: Point) {
        return {
            x: 1/ (Math.sqrt(this.eps + point.x)),
            y: 1/ (Math.sqrt(this.eps + point.y))
        }
    }

    step(point: Point): Point {
        const gradient = this.objective.gradient(point)
        this.squaredGradientSum = {x: this.squaredGradientSum.x + gradient.x*gradient.x, y: this.squaredGradientSum.y + gradient.y*gradient.y}
        return vectorAddition(point, hadamardProduct(scalarMultiplication(this.adaGradSumManipulation(this.squaredGradientSum),-this.lr), gradient))
    }
    
    reset(): void {
        this.squaredGradientSum = {x: 0, y:0}
    }
    
}