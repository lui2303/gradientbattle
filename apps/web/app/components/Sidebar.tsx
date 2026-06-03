'use client'

import { getRuns } from "@/lib/runs"
import { useEffect, useState } from "react"
import { Optimizer } from "../types"
import { objectiveFunction } from "@gradientbattle/core"
import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory"
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory"

export function LoadNotebookSidebar({setOptimizers, setFunc}: {setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>, setFunc: React.Dispatch<React.SetStateAction<objectiveFunction>>}) {

    const [collapsed, setcollapsed] = useState<boolean>(true)

    useEffect(() => {
        console.log(getRuns())
    }, [])
    

    return (
        <aside className="fixed top-0 right-0 z-50">
            {collapsed ?
            <div>
                <button onClick={(e) => setcollapsed(false)}>Expand</button>
            </div>
            :
            <div className="h-screen bg-gray-800 text-white shadow-lg overflow-y-auto">
                <button onClick={(e) => setcollapsed(true)}>Collapse</button>
                <br></br>
                <br></br>
                <p>Saved</p>
                
                <br></br>
                <br></br>
                
                
                <p>History</p>
                { getRuns().map((run) => {
                    return  (<div key={run.timestamp}>
                                <p key={run.runID}>{run.timestamp} - {run.funcName}</p>
                                <button onClick={(e) => {setOptimizers(run.optimizers);setFunc(functionFactory(run.funcName))}}>Load</button>
                            </div>)
                })}

                
            </div>
            }
        </aside>
    )
}