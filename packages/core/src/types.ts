export type objectiveFunction = {name?: string, objective: (point: Point) => number, gradient?: (point: Point) => Point}

export type Point = {
    x: number,
    y: number
}

export type Optimizer = {
    readonly name: string,
    lr?: number,
    momentum?: number,
    step(point: Point): Point
    objective: objectiveFunction
}

export type Mat2 = [[number, number],
                    [number, number]]

