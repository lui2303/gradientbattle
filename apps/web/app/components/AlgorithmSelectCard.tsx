'use client';

import {optimizationAlgorithmsList, optimizationAlgorithms} from "@gradientbattle/core/src/optimizers/optimizer_registry"
import { AlgorithmSelectCardProps, Optimizer } from "../types";
import { norm } from "@gradientbattle/core/src/math_helper";

export default function AlgorithmSelectCard({id, optimizers, setOptimizers, setOptimizerTraces}: AlgorithmSelectCardProps) {
    return (
        <div className="border-2 p-4" style={{ borderColor: optimizers[id].color }}>
            <select value={optimizers[id]["name"]} onChange={(option) => {
                                        const optimizer: Optimizer = {name: option.target.value, params: {...optimizationAlgorithms[option.target.value]["params"]}, startingPoint: optimizers[id].startingPoint, color: optimizers[id].color};
                                        setOptimizers(prev => ({...prev, [id]: optimizer}))
                                        }}>
                {optimizationAlgorithmsList.map((algo) => <option key={algo} value={algo}>{algo}</option>)}
            </select>
            <div className="parameters">
                {Object.keys(optimizers[id]["params"]).map((param: string) => <label key={param}>{param}
                    <input min = {0} value={optimizers[id]["params"][param]} type="number" step="0.01" onChange={(option) => {
                            const newValue = parseFloat(option.target.value)
                            if (isNaN(newValue)) return
                                                                                                                                                                        
                            setOptimizers(prev => ({...prev, [id]: {
                                ...prev[id],
                                params: { ...prev[id]["params"], [param]: newValue}
                            }}))}}/></label>)}
                <br />
                <label key={id}>Starting coordinates:</label>
                <br />
                <label key={id + "1"}>
                    x:
                    <input value={optimizers[id].startingPoint.x} type="number" onChange={(event) => {
                        const newValue = parseFloat(event.target.value)
                        if (isNaN(newValue)) return
                        
                        setOptimizerTraces(prev => prev.map((item) => item.name === id ? {...item, y: [(item.x as number[])![0]], x: [newValue], distances: [norm({y: (item.x as number[])[0], x: newValue})]}: item))

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

                        setOptimizerTraces(prev => prev.map((item) => item.name === id ? {...item, x: [(item.x as number[])![0]], y: [newValue], distances: [norm({x: (item.x as number[])[0], y: newValue})]}: item))

                        setOptimizers(prev => ({...prev, [id]: {
                            ...prev[id],
                            startingPoint: { ...prev[id]["startingPoint"], "y": newValue}
                        }}))
                    }}></input>
                </label>
                <br />
                <input
                    type="color"
                    value= {optimizers[id].color}
                    onChange={(e) => {
                        setOptimizerTraces(prev => prev.map((item) => item.name === id ? {...item, line: {...item.line, color: e.target.value}}: item))
                        setOptimizers(prev => ({
                            ...prev, [id] : {
                                ...prev[id],
                                "color": e.target.value
                        }
                    }))}
                }
                />
                <br />
                <button className="bg-blue-700" onClick={() => setOptimizers(prev => {
                    const copy = { ...prev } as Record<string, Optimizer>;
                    delete copy[id];
                    return copy
                })}>Remove</button>
            </div>
        </div>

    )
}

