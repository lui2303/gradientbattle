'use client';

import {optimizationAlgorithmsList, optimizationAlgorithms} from "@gradientbattle/core/src/optimizers/optimizer_registry"
import { AlgorithmSelectCardProps, Optimizer } from "../types";

export default function AlgorithmSelectCard({id, optimizers, setOptimizers}: AlgorithmSelectCardProps) {
    console.log(optimizers)
    console.log(optimizers[id].startingPoint)
    return (
        <div>
            <select value={optimizers[id]["name"]} onChange={(option) => {
                                        const optimizer: Optimizer = {name: option.target.value, params: {...optimizationAlgorithms[option.target.value]["params"]}, startingPoint: optimizers[id].startingPoint};
                                        setOptimizers(prev => ({...prev, [id]: optimizer}))
                                        }}>
                {optimizationAlgorithmsList.map((algo) => <option key={algo} value={algo}>{algo}</option>)}
            </select>
            <div className="parameters">
                {Object.keys(optimizers[id]["params"]).map((param: string) => <label key={param}>{param}<input min = {0} value={optimizers[id]["params"][param]} type="number" step="0.01" onChange={(option) => {
                                                                                                                                                                        const newValue = parseFloat(option.target.value)
                                                                                                                                                                        if (isNaN(newValue)) return
                                                                                                                                                                        
                                                                                                                                                                        setOptimizers(prev => ({...prev, [id]: {
                                                                                                                                                                                ...prev[id],
                                                                                                                                                                                params: { ...prev[id]["params"], [param]: newValue}
                                                                                                                                                                            }
                                                                                                                                                                        }))

                                                                                                                                                        }}/></label>)}
                <br />
                <label key={id}>Starting coordinates:</label>
                <br />
                <label key={id + "1"}>
                    x:
                    <input value={optimizers[id].startingPoint.x} type="number" onChange={(event) => {
                        const newValue = parseFloat(event.target.value)
                        if (isNaN(newValue)) return

                        setOptimizers(prev => ({...prev, [id]: {
                            ...prev[id],
                            startingPoint: { ...prev[id]["startingPoint"], "x": newValue}
                        }}))
                    }}></input>                                                                                                                            
                </label>
                <label key={id + "2"}>
                    y:
                    <input value={optimizers[id]["startingPoint"]["y"]} type="number" onChange={(event) => {
                        const newValue = parseFloat(event.target.value)
                        if (isNaN(newValue)) return

                        setOptimizers(prev => ({...prev, [id]: {
                            ...prev[id],
                            startingPoint: { ...prev[id]["startingPoint"], "y": newValue}
                        }}))
                    }}></input>
                </label>
                <button className="bg-blue-700" onClick={() => setOptimizers(prev => {
                    const copy = { ...prev } as Record<string, Optimizer>;
                    delete copy[id];
                    return copy})}>Remove</button>
            </div>
        </div>

    )
}

