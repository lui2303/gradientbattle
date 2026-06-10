'use client'

import { AlgoSimulation } from "./components/AlgoSimulation";
import { LoadNotebookSidebar } from "./components/Sidebar";
import { Optimizer } from "./types";
import { useState } from "react";
import {defaultFunc, defaultOptimizer} from '@/app/constants'
import { objectiveFunction } from "@gradientbattle/core";
import { SessionProvider } from "next-auth/react";
import { Simulation } from "./components/Simulation";
import { FreeForAllSimulationMode } from "@/lib/simulationMode";

export default function Page() {

    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({ [crypto.randomUUID()]: defaultOptimizer })
    const [func, setFunc] = useState<objectiveFunction>(defaultFunc)

    return (
      <SessionProvider>
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-none flex gap-4 p-4">
          <div className="flex-1 min-w-0">
            <Simulation mode={FreeForAllSimulationMode}></Simulation>
            
          </div>
          <LoadNotebookSidebar setOptimizers={setOptimizers} setFunc={setFunc}></LoadNotebookSidebar>
        </div>
      </main>
      </SessionProvider>
    );

    //<AlgoSimulation optimizers={optimizers} setOptimizers={setOptimizers} func={func} setFunc={setFunc}>
    //</AlgoSimulation>
}