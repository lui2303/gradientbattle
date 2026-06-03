'use client'

import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry";
import { AlgoSimulation } from "./components/AlgoSimulation";
import { LoadNotebookSidebar } from "./components/Sidebar";
import { Optimizer } from "./types";
import { useState } from "react";
import {defaultFunc, defaultOptimizer} from '@/app/constants'
import { objectiveFunction } from "@gradientbattle/core";

export default function Page() {

    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({ [crypto.randomUUID()]: defaultOptimizer })
    const [func, setFunc] = useState<objectiveFunction>(defaultFunc)

    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-none flex gap-4 p-4">
          <div className="flex-1 min-w-0">
            <AlgoSimulation optimizers={optimizers} setOptimizers={setOptimizers} func={func} setFunc={setFunc}>
            </AlgoSimulation>
          </div>
          <LoadNotebookSidebar setOptimizers={setOptimizers} setFunc={setFunc}></LoadNotebookSidebar>
        </div>
      </main>
    );
}