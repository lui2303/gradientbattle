
import { adaGradSumManipulation, hadamardProduct, scalarMultiplication, vectorAddition } from "../math_helper";
import { objectiveFunction, Optimizer, Point } from "../types";
import { ADAM_NAME } from "./constants";

export class Adam implements Optimizer{
    lr: number;
    beta1: number;
    beta2: number;
    objective: objectiveFunction;
    name = ADAM_NAME
    startingPoint: Point;
    id: string;
    meanEstimation: Point
    varianceEstimation: Point
    eps = 1e-8
    stepsCount = 0
    lastIterate: Point

    constructor(lr: number, objective: objectiveFunction, startingPoint: Point, id: string, beta1: number, beta2: number) {
        this.lr = lr
        this.objective = objective
        this.startingPoint = startingPoint
        this.id = id
        this.beta1 = beta1
        this.beta2 = beta2
        this.meanEstimation = {x: 0, y:0}
        this.varianceEstimation = {x: 0, y: 0}
        this.lastIterate = startingPoint
    }

    private firstMomentBiasCorrection(): Point {
        return scalarMultiplication(this.meanEstimation, 1 / (1-Math.pow(this.beta1, this.stepsCount)))
    }

    private secondMomentBiasCorrection(): Point {
        return scalarMultiplication(this.varianceEstimation, 1/ (1-Math.pow(this.beta2, this.stepsCount)))
    }

    step(): Point {
        this.stepsCount += 1
        const gradient = this.objective.gradient(this.lastIterate)

        this.meanEstimation = vectorAddition(scalarMultiplication(this.meanEstimation, this.beta1), scalarMultiplication(gradient, (1-this.beta1)))
        this.varianceEstimation = vectorAddition(scalarMultiplication(this.varianceEstimation, this.beta2), scalarMultiplication(hadamardProduct(gradient, gradient), (1-this.beta2)))
        
        this.lastIterate = vectorAddition(this.lastIterate, hadamardProduct(scalarMultiplication(adaGradSumManipulation(this.secondMomentBiasCorrection(), this.eps),-this.lr), this.firstMomentBiasCorrection()))

        return this.lastIterate
    }
    
    reset() {
        this.meanEstimation = {x: 0, y: 0}
        this.varianceEstimation = {x: 0, y:0}
        this.stepsCount = 0
        this.lastIterate = this.startingPoint
    }  
}