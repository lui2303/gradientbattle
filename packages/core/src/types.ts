export type objectiveFunction = {name?: string, objective: (x: number, y: number) => number, gradient?: (x: number, y: number) => (x: number, y: number)}

export type Point = {
    x: number,
    y: number
}

export type Optimizer = {
    name: string,
    lr?: number,
    momentum?: number,
    step(point: Point): Point
    objective: objectiveFunction}
