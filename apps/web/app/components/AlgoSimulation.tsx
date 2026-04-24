'use client'

import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import AlgorithmSelectContainer from "./AlgorithmSelectContainer"
import { useMemo, useRef, useState } from "react"
import { Optimizer } from "../types"
import ContourPlot from "./ContourPlot"
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine"
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic"
import { DummyOptimizer } from "@gradientbattle/core/src/optimizers/dummy_optimizer"
import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory"

export function AlgoSimulation() {

    const defaultOptimizer = {
            "name": optimizationAlgorithmsList[0],
            "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"]
        }

    const [func, setFunc] = useState(new quadraticFunction([[1, 0],[0,1]], {x: 0, y:0}, 0))
            
    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({[crypto.randomUUID()]: defaultOptimizer})
    const [startingPoint, setStartingPoint] = useState({x: 1, y:1})

    const engine = useMemo(
        () => {
            const engine = new SimulationEngine(func, 100, startingPoint);
            Object.keys(optimizers).forEach((optiKey) => {
                engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, {...optimizers[optiKey].params, objective: func}))
            })
            return engine
        },
        [startingPoint, optimizers, func]
    );
    console.log(func)

    return (
        <div>
            <ContourPlot simulationEngine={engine} objFunction={func}>
            </ContourPlot>
            
            <div className="grid grid-cols-[140px_auto] gap-y-2">
                <label>Enter Starting point coordinates</label>
                <label>x coordinate
                    <input
                    type="number"
                    step="any"              
                    value={startingPoint.x}
                    onChange={(e) => setStartingPoint(prev => ({...prev, x: parseFloat(e.target.value)}))}
                    />
                </label>
                <br />
                <label>y coordinate 
                    <input
                    type="number"
                    step="any"              
                    value={startingPoint.y}
                    onChange={(e) => setStartingPoint(prev => ({...prev, y: parseFloat(e.target.value)}))}
                    />
                </label>
            </div>
                
            
            <AlgorithmSelectContainer optimizers={optimizers} setOptimizers={setOptimizers} defaultOptimizer={defaultOptimizer}>
            </AlgorithmSelectContainer>
        </div>

    )
}