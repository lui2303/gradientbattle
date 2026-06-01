import { adaGradSumManipulation, hadamardProduct, norm, scalarMultiplication, vectorAddition } from "../math_helper";
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
    lastIterate: Point
    optimumTreshhold: number
    reachedOptimum: boolean = false


    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string,optimumTreshhold: number = 0.001) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.lastIterate = startingPoint
        this.optimumTreshhold = optimumTreshhold
    }

    step(): Point {
        if (this.reachedOptimum) return this.lastIterate
        
        const gradient = this.objective.gradient(this.lastIterate)
        this.squaredGradientSum = {x: this.squaredGradientSum.x + gradient.x*gradient.x, y: this.squaredGradientSum.y + gradient.y*gradient.y}
        this.lastIterate = vectorAddition(this.lastIterate, hadamardProduct(scalarMultiplication(adaGradSumManipulation(this.squaredGradientSum, this.eps),-this.lr), gradient))
        
        if(norm(this.lastIterate) < this.optimumTreshhold) this.reachedOptimum = true

        return this.lastIterate
    }
    
    reset(): void {
        this.squaredGradientSum = {x: 0, y:0}
        this.lastIterate = this.startingPoint
        this.reachedOptimum = false
    }
    
}