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

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string, momentum: number) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.momentum = momentum
        this.velocity = {x: 0, y:0}
    }

    step(point: Point): Point {
        this.velocity = vectorAddition(scalarMultiplication(this.velocity, this.momentum), this.objective.gradient(point))

        return vectorAddition(point, scalarMultiplication(this.velocity, -this.lr))
    }
    
    reset() {
        this.velocity = {x: 0, y: 0}
    }
}