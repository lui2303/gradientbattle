import { objectiveFunction, Optimizer, Point } from "./types";

export class SimulationEngine implements Iterable<Point[]>{
    objectiveFunc: objectiveFunction
    optimizers: Optimizer[]
    steps: number
    iterates: Point[][]
    startingPoints: Point[]

    constructor(objFunc: objectiveFunction, steps: number, startingPoints: Point[]) {
        this.objectiveFunc = objFunc
        this.optimizers = [];
        this.steps = steps
        this.iterates = []
        this.startingPoints = startingPoints
    } 

    addOptimizer(optimizer: Optimizer) {
        this.optimizers.push(optimizer)
    }

    removeOptimizer(optimizer: Optimizer) {
        this.optimizers = this.optimizers.filter(opti => opti.name !== optimizer.name)
    }

    clear() {
        this.optimizers = []
        this.iterates = []
    }

    *[Symbol.iterator](): Iterator<Point[]> {
        let last_iterate: Point[] = this.startingPoints

        for (let i = 0; i < this.steps; i++) {
            for (const [index, optimizer] of this.optimizers.entries()) {
                last_iterate[index] = optimizer.step(last_iterate[index])
            }
            yield [...last_iterate];
        }
    }
}