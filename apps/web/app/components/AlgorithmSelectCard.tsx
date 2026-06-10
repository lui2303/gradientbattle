'use client';

import {optimizationAlgorithmsList, optimizationAlgorithms} from "@gradientbattle/core/src/optimizers/optimizer_registry"
import { AlgorithmSelectCardProps, FrontendOptimizer } from "../types";

export default function AlgorithmSelectCard({id, optimizers, setOptimizers}: AlgorithmSelectCardProps) {
    return (
        <div className="border-2 p-4" style={{ borderColor: optimizers[id].color }}>
            <select value={optimizers[id]["name"]} onChange={(option) => {
                                        
                                        const optimizer: FrontendOptimizer = {
                                            name: option.target.value, 
                                            params: Object.fromEntries(Object.entries(optimizationAlgorithms[option.target.value]["params"]).map(([key, value]) => {return [key, { enabled: true, value: value }]})),
                                            startingPoint: optimizers[id].startingPoint,
                                            color: optimizers[id].color};
                                        setOptimizers(prev => ({...prev, [id]: optimizer}))
                                        }}>
                {optimizationAlgorithmsList.map((algo) => <option key={algo} value={algo}>{algo}</option>)}
            </select>
            <div className="parameters">
                {Object.keys(optimizers[id]["params"]).map((param: string) => <label key={param}>{param}
                    <input min = {0} value={optimizers[id]["params"][param].value} type="number" step="0.01" onChange={(option) => {
                            const newValue = parseFloat(option.target.value)
                            if (isNaN(newValue)) return
                                                                                                                                                                        
                            setOptimizers(prev => ({...prev, [id]: {
                                ...prev[id],
                                params: { ...prev[id]["params"], [param]: {enabled: prev[id]["params"][param].enabled, value: newValue}}
                            }}))}}/></label>)}
                <br />
                <label key={id}>Starting coordinates:</label>
                <br />
                <label key={id + "1"}>
                    x:
                    <input value={optimizers[id].startingPoint.value.x} type="number" onChange={(event) => {
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
                    <input value={optimizers[id].startingPoint.value.y} type="number" onChange={(event) => {
                        const newValue = parseFloat(event.target.value)
                        if (isNaN(newValue)) return

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
                    const copy = { ...prev } as Record<string, FrontendOptimizer>;
                    delete copy[id];
                    return copy
                })}>Remove</button>
            </div>
        </div>

    )
}

