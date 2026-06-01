import { adaGradSumManipulation, hadamardProduct, norm, scalarMultiplication, vectorAddition } from "../math_helper";
import { objectiveFunction, Optimizer, Point } from "../types";
import { RMSPROP_NAME } from "./constants";

export class RMSProp implements Optimizer {
    lr: number;
    decay: number;
    objective: objectiveFunction;
    name = RMSPROP_NAME
    startingPoint: Point;
    id: string;
    velocity: Point
    eps = 1e-8
    lastIterate: Point
    optimumTreshhold: number
    reachedOptimum: boolean = false

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string, momentum: number, optimumTreshhold: number = 0.0001) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.decay = momentum
        this.velocity = {x: 0, y:0}
        this.lastIterate = startingPoint
        this.optimumTreshhold = optimumTreshhold
    }

    step(): Point {
        if(this.reachedOptimum) return this.lastIterate

        const gradient = this.objective.gradient(this.lastIterate)
        this.velocity = vectorAddition(scalarMultiplication(this.velocity, this.decay), scalarMultiplication(hadamardProduct(gradient, gradient), (1-this.decay)))
        this.lastIterate = vectorAddition(this.lastIterate, hadamardProduct(scalarMultiplication(adaGradSumManipulation(this.velocity, this.eps),-this.lr), gradient))
        
        if(norm(this.lastIterate) < this.optimumTreshhold) this.reachedOptimum = true
        
        return this.lastIterate
    }
    
    reset() {
        this.velocity = {x: 0, y: 0}
        this.lastIterate = this.startingPoint
        this.reachedOptimum = false
    }

}