'use client';

import {optimizationAlgorithmsList, optimizationAlgorithms} from "@gradientbattle/core/src/optimizers/optimizer_registry"
import { useState } from "react";

type AlgorithmSelectCardProps = {
  id: number;
  onAlgorithmChange: (id: number, algoName: string) => void;
  onValueChange: (id: number, field: string, value: number) => void;
};

export default function AlgorithmSelectCard({id, onAlgorithmChange, onValueChange}: AlgorithmSelectCardProps) {
    const [algo, setAlgo] = useState(optimizationAlgorithmsList[0]);

    return (
        <div>
            <select value={algo} onChange={(option) => {
                                        onAlgorithmChange(id, option.target.value);
                                        setAlgo(option.target.value)
                                        }}>
                {optimizationAlgorithmsList.map((algo) => <option key={algo} value={algo}>{algo}</option>)}
            </select>
            <div className="parameters">
                {optimizationAlgorithms[algo]["params"].map((param: string) => <label key={param}>{param}<input min = {0} type="number" step="0.01" onChange={(option) => {onValueChange(id, param, parseFloat(option.target.value))}}/></label>)}
            </div>
        </div>
    )
}

