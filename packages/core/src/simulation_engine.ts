import { objectiveFunction, Optimizer, Point } from "./types";

export class SimulationEngine implements Iterable<Point[]>{
    objectiveFunc: objectiveFunction
    optimizers: Optimizer[]
    steps: number
    iterates: Point[][]
    bestRun: {optimizerID: string, iterations: number} | null = null 

    constructor(objFunc: objectiveFunction, steps: number) {
        this.objectiveFunc = objFunc
        this.optimizers = [];
        this.steps = steps
        this.iterates = []
    } 

    addOptimizer(optimizer: Optimizer) {
        this.optimizers.push(optimizer)
    }

    removeOptimizer(optimizer: Optimizer) {
        this.optimizers = this.optimizers.filter(opti => opti.id !== optimizer.id)
    }

    clear() {
        this.optimizers = []
        this.iterates = []
        this.bestRun = null
    }

    reset_optimizers() {
        this.optimizers.map((opti) => opti.reset())
    }

    *[Symbol.iterator](): Iterator<Point[]> {
        for (let i = 0; i < this.steps; i++) {
            let step = []
            for (const optimizer of this.optimizers) {
                step.push(optimizer.step())
                if(optimizer.reachedOptimum && !this.bestRun) {
                    this.bestRun = {optimizerID: optimizer.id, iterations: i}
                }
            }
            yield step;
        }
    }
}