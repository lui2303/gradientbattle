'use client';

import { useState } from "react";
import AlgorithmSelectCard from "./AlgorithmSelectCard";
import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry";
import { Optimizer } from "../types";

export default function AlgorithmSelectContainer() {
    const defaultOptimizer = {
            "name": optimizationAlgorithmsList[0],
            "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"]
        }
    
    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({[crypto.randomUUID()]: defaultOptimizer})
    return (
        <div>
            <div>
                {Object.keys(optimizers).map((id) => <AlgorithmSelectCard key={id} id={id} optimizers={optimizers} setOptimizers={setOptimizers}></AlgorithmSelectCard>)}
            </div>
            
            <button className="bg-blue-500" onClick={() => setOptimizers(prev => ({ ...prev, [crypto.randomUUID()]: {...defaultOptimizer} }))}>Add new Optimizer</button>
        </div>
    )}
