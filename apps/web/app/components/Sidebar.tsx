'use client'

import { getRuns, SavedNotebook, StoredRun } from "@/lib/run_storage"
import { useEffect, useState } from "react"
import { Optimizer } from "../types"
import { objectiveFunction } from "@gradientbattle/core"
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory"

export function LoadNotebookSidebar({setOptimizers, setFunc}: {setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>, setFunc: React.Dispatch<React.SetStateAction<objectiveFunction>>}) {

    const [collapsed, setcollapsed] = useState<boolean>(true)

    useEffect(() => {
        console.log(getRuns("saved:"))
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
                { getRuns("saved:").map((notebook) => {
                    return  (<div key={notebook.timestamp}>
                                <p key={(notebook as SavedNotebook).index}>{notebook.description} - {notebook.timestamp}</p>
                                <button onClick={(e) => {setOptimizers(notebook.optimizers);setFunc(functionFactory(notebook.funcName))}}>Load</button>
                            </div>)
                })}
                <br></br>
                <br></br>
                
                
                <p>History</p>
                { getRuns("history:").map((run) => {
                    return  (<div key={run.timestamp}>
                                <p key={(run as StoredRun).runID}>{run.timestamp} - {run.funcName}</p>
                                <button onClick={(e) => {setOptimizers(run.optimizers);setFunc(functionFactory(run.funcName))}}>Load</button>
                            </div>)
                })}

                
            </div>
            }
        </aside>
    )
}