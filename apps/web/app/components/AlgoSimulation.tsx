'use client'

import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import AlgorithmSelectContainer from "./AlgorithmSelectContainer"
import { useMemo, useRef, useState } from "react"
import { Optimizer } from "../types"
import ContourPlot from "./ContourPlot"
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine"
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic"
import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory"



export function AlgoSimulation() {
    
    const defaultOptimizer = {
            "name": optimizationAlgorithmsList[0],
            "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"],
            "startingPoint": {x: 5, y: 5},
            "color": "#0bf565"
        }

    const [func, setFunc] = useState(new quadraticFunction([[1, 0],[0,1]], {x: 0, y:0}, 0))
            
    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({[crypto.randomUUID()]: defaultOptimizer})

    const engine = useMemo(
        () => {
            const engine = new SimulationEngine(func, 100, Object.values(optimizers).map(x => x.startingPoint));
            Object.keys(optimizers).forEach((optiKey) => {
                engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, {...optimizers[optiKey].params, objective: func, startingPoint: optimizers[optiKey].startingPoint, id: optiKey}))
            })
            return engine
            
        },
        [optimizers, func]
    );


    return (
        <div>
            <ContourPlot simulationEngine={engine} objFunction={func} optimizers={optimizers}>
            </ContourPlot>
                
            <AlgorithmSelectContainer optimizers={optimizers} setOptimizers={setOptimizers} defaultOptimizer={defaultOptimizer}>
            </AlgorithmSelectContainer>
        </div>

    )
}