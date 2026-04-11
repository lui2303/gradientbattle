'use client';

import AlgorithmSelectCard from "./AlgorithmSelectCard";

export default function AlgorithmSelectContainer() {
    return <AlgorithmSelectCard id={1} onAlgorithmChange={(id:number, newAlgo: string) => console.log(newAlgo)} onValueChange={(id:number, field: string, value:number) => console.log(value)}></AlgorithmSelectCard>
}
