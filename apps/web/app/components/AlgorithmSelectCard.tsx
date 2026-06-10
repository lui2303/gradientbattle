'use client';

import {optimizationAlgorithmsList, optimizationAlgorithms} from "@gradientbattle/core/src/optimizers/optimizer_registry"
import { AlgorithmSelectCardProps, FrontendOptimizer } from "../types";

export default function AlgorithmSelectCard({allowedOptimizers, id, optimizers, setOptimizers}: AlgorithmSelectCardProps) {
    // The game mode's allowedOptimizer config is the source of truth for which params are editable.
    const allowedOptimizer = allowedOptimizers.find((opt) => opt.name === optimizers[id]["name"])
    return (
        <div className="border-2 p-4" style={{ borderColor: optimizers[id].color }}>
            <select value={optimizers[id]["name"]} onChange={(option) => {
                                        const selected = allowedOptimizers.find((opt) => opt.name === option.target.value)
                                        setOptimizers(prev => ({...prev, [id]: {
                                            name: option.target.value,
                                            params: Object.fromEntries(Object.entries(optimizationAlgorithms[option.target.value]["params"]).map(([key, value]) => {return [key, { enabled: selected?.params[key]?.enabled ?? true, value: value }]})),
                                            startingPoint: selected ? {fixed: selected.startingPoint.fixed, value: {...selected.startingPoint.value}} : optimizers[id].startingPoint,
                                            color: optimizers[id].color}}))
                                        }}>
                {allowedOptimizers.map((algo) => <option key={algo.name} value={algo.name}>{algo.name}</option>)}
            </select>
            <div className="parameters">
                {Object.keys(optimizers[id]["params"]).map((param: string) => {
                    const enabled = allowedOptimizer?.params[param]?.enabled ?? true
                    return <label key={param}>{param}
                    <input disabled={!enabled} className={enabled ? "bg-green-600" : "bg-red-600"} min = {0} value={optimizers[id]["params"][param].value} type="number" step="0.01" onChange={(option) => {
                            const newValue = parseFloat(option.target.value)
                            if (isNaN(newValue)) return
                            setOptimizers(prev => ({...prev, [id]: {
                                ...prev[id],
                                params: { ...prev[id]["params"], [param]: {enabled: enabled, value: newValue}}
                            }}))}}/></label>})}
                <br />
                <label key={id}>Starting coordinates:</label>
                <br />
                <label key={id + "1"}>
                    x:
                    <input disabled={allowedOptimizer?.startingPoint.fixed} className={!allowedOptimizer?.startingPoint.fixed ? "bg-green-600" : "bg-red-600"} value={optimizers[id].startingPoint.value.x} type="number" onChange={(event) => {
                        const newValue = parseFloat(event.target.value)
                        if (isNaN(newValue)) return

                        setOptimizers(prev => ({...prev, [id]: {
                            ...prev[id],
                            startingPoint: { ...prev[id]["startingPoint"], value: { ...prev[id]["startingPoint"].value, x: newValue } }
                        }}))
                    }}></input>                                                                                                                            
                </label>
                <label key={id + "2"}>
                    y:
                    <input disabled={allowedOptimizer?.startingPoint.fixed} className={!allowedOptimizer?.startingPoint.fixed ? "bg-green-600" : "bg-red-600"} value={optimizers[id].startingPoint.value.y} type="number" onChange={(event) => {
                        const newValue = parseFloat(event.target.value)
                        if (isNaN(newValue)) return

                        setOptimizers(prev => ({...prev, [id]: {
                            ...prev[id],
                            startingPoint: { ...prev[id]["startingPoint"], value: { ...prev[id]["startingPoint"].value, y: newValue } }
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

