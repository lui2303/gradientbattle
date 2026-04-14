'use client'

import { useState } from "react";
import AlgorithmSelectContainer from "./components/AlgorithmSelectContainer";
import ContourPlotter from "./components/ContourPlot";
import { Optimizer } from "./types";
import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry";

export default function Page() {
  const defaultOptimizer = {
            "name": optimizationAlgorithmsList[0],
            "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"]
        }
        
  const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({[crypto.randomUUID()]: defaultOptimizer})
  
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto h-[500px] max-w-4xl">
        <ContourPlotter>
        </ContourPlotter>
        <AlgorithmSelectContainer optimizers={optimizers} setOptimizers={setOptimizers} defaultOptimizer={defaultOptimizer}>
        </AlgorithmSelectContainer>
        
      </div>
    </main>
  );
}