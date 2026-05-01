import { PlotData } from "plotly.js";
import { Optimizer } from "../types";

import { norm } from "@gradientbattle/core/src/math_helper"

export function Leaderboard({optimizers, optimizerTraces}: {optimizers: Record<string, Optimizer>, optimizerTraces: Partial<PlotData>[]}) {
    
    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Optimizer</th>
                        <th>$\|x\|_2$</th>
                    </tr>
                </thead>
                <tbody>{optimizerTraces.length !== 0 ? 
                    optimizerTraces.toSorted((a, b) => norm({x: a.x![a.x!.length - 1] as number, y: a.y![a.y!.length - 1] as number}) - norm({x: b.x![b.x!.length - 1] as number, y: b.y![b.y!.length - 1] as number})).map((optimizerTrace,i) => {
                        const traceLength = optimizerTrace.x!.length // could be moved up because it is same for all traces
                        return (
                            <tr style={{ backgroundColor: optimizers[optimizerTrace.name as string].color }} key={optimizerTrace.name}>
                                <td>{i + 1}</td>
                                <td>{optimizers[optimizerTrace.name as string].name}</td>
                                <td>{norm({x: optimizerTrace.x![traceLength - 1] as number, y: optimizerTrace.y![traceLength - 1] as number})}</td>
                            </tr>
                        )
                    }) : Object.keys(optimizers).toSorted((a,b ) => norm(optimizers[a].startingPoint) -norm(optimizers[b].startingPoint)).map((optiKey, i) => {
                        return (
                            <tr style={{ backgroundColor: optimizers[optiKey].color}} key={optiKey}>
                                <td>{i + 1}</td>
                                <td>{optimizers[optiKey].name}</td>
                                <td>{norm(optimizers[optiKey].startingPoint)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

//TODO: fix latex displaying wrong, switch leaderboard positions based on norm