import { objectiveFunction, Optimizer, Point } from "./types";

class SimulationEngine implements Iterable<Point[]>{
    objectiveFunc: objectiveFunction
    optimizers: Optimizer[]
    steps: number
    iterates: Point[][]
    startingPoint: Point

    constructor(objFunc: objectiveFunction, steps: number, startingPoint: Point) {
        this.objectiveFunc = objFunc
        this.optimizers = [];
        this.steps = steps
        this.iterates = []
        this.startingPoint = startingPoint
    } 

    addOptimizer(optimizer: Optimizer) {
        this.optimizers.push(optimizer)
    }

    removeOptimizer(optimizer: Optimizer) {
        this.optimizers.filter(opti => opti.name !== optimizer.name)
    }

    *[Symbol.iterator](): Iterator<Point[]> {
        let last_iterate: Point[] = Array.from({ length: this.optimizers.length }, () => ({ x: this.startingPoint.x, y: this.startingPoint.y }));;
        
        for (let i = 0; i < this.steps; i++) {
            for (const [index, optimizer] of this.optimizers.entries()) {
                last_iterate[index] = optimizer.step(last_iterate[index])
            }
            yield last_iterate;
        }
    }


}