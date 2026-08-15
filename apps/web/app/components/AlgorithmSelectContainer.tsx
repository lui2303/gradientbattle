'use client';

import AlgorithmSelectCard from "./AlgorithmSelectCard";
import { AlgorithmSelectContainerProps } from "../types";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { nextFreeSeriesColor } from "@/lib/plotTheme";

const MAX_OPTIMIZERS = 5

export default function AlgorithmSelectContainer({allowedOptimizers, optimizers, setOptimizers, defaultOptimizer, locked = false}: AlgorithmSelectContainerProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {Object.keys(optimizers).map((id) => <AlgorithmSelectCard allowedOptimizers={allowedOptimizers} key={id} id={id} optimizers={optimizers} setOptimizers={setOptimizers} locked={locked}></AlgorithmSelectCard>)}
            </div>
            {Object.keys(optimizers).length < MAX_OPTIMIZERS && <Button
                variant="outline"
                className="self-start"
                disabled={locked}
                onClick={() => {
                    const id = crypto.randomUUID()
                    setOptimizers(prev => ({
                        ...prev,
                        [id]: {
                            ...defaultOptimizer,
                            // Claim the first free palette slot rather than deriving colour from
                            // position, so removing an optimizer never repaints the others.
                            color: nextFreeSeriesColor(Object.values(prev).map((opt) => opt.color)),
                        },
                    }))
                }}
            >
                <PlusIcon />
                Add optimizer
            </Button>}
        </div>
    )
}
