import { PlotData } from "plotly.js";
import { Optimizer } from "../types";

import { norm } from "@gradientbattle/core/src/math_helper"
import { objectiveFunction } from "@gradientbattle/core";

export function Leaderboard({optimizers, optimizerTraces, objectiveFunction}: {optimizers: Record<string, Optimizer>, optimizerTraces: Partial<PlotData>[], objectiveFunction: objectiveFunction}) {
    
    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Optimizer</th>
                        <th>$\|(x,y)\|_2$</th>
                        <th>$f(x,y)$</th>
                    </tr>
                </thead>
                <tbody>{optimizerTraces.length !== 0 ? 
                    optimizerTraces.toSorted((a, b) => norm({x: a.x![a.x!.length - 1] as number, y: a.y![a.y!.length - 1] as number}) - norm({x: b.x![b.x!.length - 1] as number, y: b.y![b.y!.length - 1] as number})).map((optimizerTrace,i) => {
                        const traceLength = optimizerTrace.x!.length // could be moved up because it is same for all traces
                        return (
                            <tr style={{ backgroundColor: optimizers[optimizerTrace.name as string].color }} key={optimizerTrace.name}>
                                <td className="px-4 py-2">{i + 1}</td>
                                <td className="px-4 py-2">{optimizers[optimizerTrace.name as string].name}</td>
                                <td className="px-4 py-2">{norm({x: optimizerTrace.x![traceLength - 1] as number, y: optimizerTrace.y![traceLength - 1] as number})}</td>
                                <td className="px-4 py-2">{objectiveFunction.objective({x: optimizerTrace.x![traceLength - 1] as number, y: optimizerTrace.y![traceLength - 1] as number})}</td>
                            </tr>
                        )
                    }) : Object.keys(optimizers).toSorted((a,b ) => norm(optimizers[a].startingPoint) -norm(optimizers[b].startingPoint)).map((optiKey, i) => {
                        return (
                            <tr style={{ backgroundColor: optimizers[optiKey].color}} key={optiKey}>
                                <td className="px-4 py-2">{i + 1}</td>
                                <td className="px-4 py-2">{optimizers[optiKey].name}</td>
                                <td className="px-4 py-2">{norm(optimizers[optiKey].startingPoint)}</td>
                                <td className="px-4 py-2">{objectiveFunction.objective(optimizers[optiKey].startingPoint)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

//TODO: fix latex displaying wrong, switch leaderboard positions based on norm