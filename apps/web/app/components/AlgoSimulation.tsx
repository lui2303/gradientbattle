'use client'

import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import AlgorithmSelectContainer from "./AlgorithmSelectContainer"
import { useMemo, useRef, useState } from "react"
import { Optimizer } from "../types"
import ContourPlot from "./ContourPlot"
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine"
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic"
import { DummyOptimizer } from "@gradientbattle/core/src/optimizers/dummy_optimizer"
import { start } from "repl"

export function AlgoSimulation() {

    const defaultOptimizer = {
            "name": optimizationAlgorithmsList[0],
            "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"]
        }
            
    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({[crypto.randomUUID()]: defaultOptimizer})
    const [startingPoint, setStartingPoint] = useState({x: 1, y:1})
    const [simulationRunning, setSimulationRunning] = useState(false)
    const engine = useMemo(
        () => {
            const quadratic = new quadraticFunction([[1,2], [2,3]], {x: 1, y:1}, 2)
            const engine = new SimulationEngine(quadratic, 10, startingPoint);
            engine.addOptimizer(new DummyOptimizer(-0.05, quadratic))
            engine.addOptimizer(new DummyOptimizer(0.1, quadratic))
            return engine
        },
        [startingPoint]
    );

    return (
        <div>
            <ContourPlot simulationEngine={engine}>
            </ContourPlot>
            
            <div className="grid grid-cols-[140px_auto] gap-y-2">
                <button className="bg-amber-600" onClick={() => {setSimulationRunning(!simulationRunning)}}>{!simulationRunning ? "Start Simulation"  : "Stop Simulation"}</button>
                
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