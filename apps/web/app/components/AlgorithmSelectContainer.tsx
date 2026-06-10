'use client';

import AlgorithmSelectCard from "./AlgorithmSelectCard";
import { AlgorithmSelectContainerProps } from "../types";
import { defaultOptimizer } from "../constants";


export default function AlgorithmSelectContainer({optimizers, setOptimizers, defaultOptimizer}: AlgorithmSelectContainerProps) {
    return (
        <div>
            <div>
                {Object.keys(optimizers).map((id) => <AlgorithmSelectCard key={id} id={id} optimizers={optimizers} setOptimizers={setOptimizers}></AlgorithmSelectCard>)}
            </div>
            {Object.keys(optimizers).length < 5 && <button className="bg-blue-500" onClick={() => {
                const id = crypto.randomUUID()
                setOptimizers(prev => ({ ...prev, [id]: {...defaultOptimizer} }))
                }}>Add new Optimizer</button>}
            
        </div>
    )
}
