'use client';

import AlgorithmSelectCard from "./AlgorithmSelectCard";
import { AlgorithmSelectContainerProps } from "../types";



export default function AlgorithmSelectContainer({optimizers, setOptimizers, defaultOptimizer, setOptimizerTraces}: AlgorithmSelectContainerProps) {
    return (
        <div>
            <div>
                {Object.keys(optimizers).map((id) => <AlgorithmSelectCard key={id} id={id} optimizers={optimizers} setOptimizers={setOptimizers} setOptimizerTraces={setOptimizerTraces}></AlgorithmSelectCard>)}
            </div>
            {Object.keys(optimizers).length < 5 && <button className="bg-blue-500" onClick={() => {
                const id = crypto.randomUUID()
                setOptimizers(prev => ({ ...prev, [id]: {...defaultOptimizer} }))

                setOptimizerTraces(prev => ([...prev, {
                        x: [defaultOptimizer.startingPoint.x],
                        y: [defaultOptimizer.startingPoint.y],
                        type: "scatter" as const,
                        mode: "lines+markers" as const,
                        name: id,
                        line: { color: defaultOptimizer.color },
                }]))
                }}>Add new Optimizer</button>}
            
        </div>
    )
}
