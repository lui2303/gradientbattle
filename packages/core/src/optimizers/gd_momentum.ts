import { objectiveFunction, Optimizer, Point } from "../types";
import {scalarMultiplication, vectorAddition} from "../math_helper"
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

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string, momentum: number) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.momentum = momentum
        this.velocity = {x: 0, y:0}
        this.lastIterate = startingPoint
    }

    step(): Point {
        this.velocity = vectorAddition(scalarMultiplication(this.velocity, this.momentum), this.objective.gradient(this.lastIterate))
        
        this.lastIterate = vectorAddition(this.lastIterate, scalarMultiplication(this.velocity, -this.lr))
        
        return this.lastIterate
    }
    
    reset() {
        this.velocity = {x: 0, y: 0}
        this.lastIterate = this.startingPoint
    }
}