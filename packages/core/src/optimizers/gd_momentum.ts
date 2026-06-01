import { objectiveFunction, Optimizer, Point } from "../types";
import {norm, scalarMultiplication, vectorAddition} from "../math_helper"
import {GD_MOMENTUM_NAME} from "./constants"

export class GradientDescentMomentum implements Optimizer {
    lr: number;
    momentum: number;
    objective: objectiveFunction;
    name = GD_MOMENTUM_NAME
    startingPoint: Point;
    id: string;
    velocity: Point
    lastIterate: Point
    optimumTreshhold: number
    reachedOptimum: boolean = false

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string, momentum: number, optimumTreshhold: number = 0.0001) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.momentum = momentum
        this.velocity = {x: 0, y:0}
        this.lastIterate = startingPoint
        this.optimumTreshhold = optimumTreshhold
    }

    step(): Point {
        if(this.reachedOptimum) return this.lastIterate

        this.velocity = vectorAddition(scalarMultiplication(this.velocity, this.momentum), this.objective.gradient(this.lastIterate))
        
        this.lastIterate = vectorAddition(this.lastIterate, scalarMultiplication(this.velocity, -this.lr))

        if(norm(this.lastIterate) < this.optimumTreshhold) this.reachedOptimum = true

        return this.lastIterate
    }
    
    reset() {
        this.velocity = {x: 0, y: 0}
        this.lastIterate = this.startingPoint
        this.reachedOptimum = false
    }
}