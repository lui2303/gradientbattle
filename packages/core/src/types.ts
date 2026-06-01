export type objectiveFunction = {readonly name?: string, objective: (point: Point) => number, gradient: (point: Point) => Point, latex: string}

export type Point = {
    x: number,
    y: number
}

export type Optimizer = {
    step(): Point
    objective: objectiveFunction
    name: string
    startingPoint: Point
    id: string
    reset(): void
    reachedOptimum: boolean
}

export type Parameter = objectiveFunction | number | Point | string

export type Mat2 = [[number, number],
                    [number, number]]

    

