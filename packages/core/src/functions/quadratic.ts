import type { Mat2, objectiveFunction, Point } from "../types";
import { matMult, vectorAddition, dotProduct } from "../math_helper";

class quadraticFunction implements objectiveFunction {
    readonly name = "Quadratic Function"
    A: Mat2 // must be symmetric
    b: Point
    d: number

    constructor(A: Mat2, b: Point, d: number) {
        this.A = A
        this.b = b
        this.d = d
    }

    objective(point: Point): number {
        return dotProduct(point, matMult(this.A, point)) + dotProduct(this.b, point) + this.d
    }

    gradient(point: Point): Point {
        return vectorAddition(matMult(this.A, point), this.b)
    }
}