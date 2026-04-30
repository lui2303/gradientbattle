import type { Mat2, objectiveFunction, Point } from "../types";
import { matMult, vectorAddition, dotProduct, scalarMultiplication } from "../math_helper";

export class quadraticFunction implements objectiveFunction {
    readonly name = "Quadratic Function"
    A: Mat2 // must be symmetric
    b: Point
    d: number
    latex: string

    constructor(A: Mat2, b: Point, d: number) {
        this.A = A
        this.b = b
        this.d = d
        this.latex = `f(x) = x^T \\! \\begin{bmatrix} ${A[0][0]} & ${A[0][1]} \\\\ ${A[1][0]} & ${A[1][1]} \\end{bmatrix} x + x^T \\! \\begin{bmatrix} ${b.x} \\\\ ${b.y} \\end{bmatrix} + ${d}`
    }

    objective(point: Point): number {
        return dotProduct(point, matMult(this.A, point)) + dotProduct(this.b, point) + this.d
    }

    gradient(point: Point): Point {
        return vectorAddition(matMult(this.A, scalarMultiplication(point, 2)), this.b)
    }
}