'use client'

import { getRuns } from "@/lib/runs"
import { useEffect, useState } from "react"

export function LoadNotebookSidebar() {

    const [collapsed, setcollapsed] = useState<boolean>(true)

    useEffect(() => {
        console.log(getRuns())
    }, [])
    

    return (
        <aside>
            {collapsed ?
            <div>
                <button onClick={(e) => setcollapsed(false)}>Expand</button>
            </div>
            :
            <div>
                <button onClick={(e) => setcollapsed(true)}>Collapse</button>
                <br></br>
                <br></br>
                <p>History</p>
                { getRuns().map((run) => {
                    return <p key={run.runID}>{run.timestamp} - {run.funcName}</p>
                })}
            </div>
            }
        </aside>
    )
}