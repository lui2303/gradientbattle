import type { Point, Mat2 } from "./types";

export function matMult(mat: Mat2, point: Point): Point {
        // Matrix multiplies the Point x with the matrix A
        return {
            x: mat[0][0]*point.x + mat[0][1]*point.y,
            y: mat[1][0]*point.x + mat[1][1]*point.y,
        }
    }

export function vectorAddition(point1: Point, point2: Point): Point {
    return {
        x: point1.x + point2.x,
        y: point1.y + point2.y 
    }
}

export function dotProduct(point1: Point, point2: Point): number {
    return point1.x*point2.x + point1.y*point2.y
}

export function scalarMultiplication(point: Point, scalar: number): Point {
    return {
        x: point.x*scalar,
        y: point.y*scalar
    }
}

export function norm(point: Point) {
    return Math.sqrt(point.x*point.x + point.y*point.y)
}

export function hadamardProduct(point1: Point, point2: Point) {
    return {
        x: point1.x*point2.x,
        y: point1.y*point2.y
    }
}

export function adaGradSumManipulation(point: Point, eps: number) {
    return {
        x: 1/ (Math.sqrt(eps + point.x)),
        y: 1/ (Math.sqrt(eps + point.y))
    }
}