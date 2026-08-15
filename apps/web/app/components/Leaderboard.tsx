import { LeaderboardProps } from "../types";

import { useState } from "react";
import { ArrowDownIcon } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMetric } from "../helpers";
import { cn } from "@/lib/utils";

export function Leaderboard({optimizers, currentIterates}: LeaderboardProps) {
    // currentIterates[optiKey][0]: norm of current optimizer point
    // currentIterates[optiKey][1]: objective value of current optimizer point
    const [sortByObjValue, setsortByObjValue] = useState<boolean>(true)

    const orderingOfOptimizers: {key: string, point: number}[] = []

    Object.entries(currentIterates).forEach(([key, values]) => {
        orderingOfOptimizers.push({"key": key, "point": values[Number(sortByObjValue)]})})

    orderingOfOptimizers.sort((a,b) => a.point - b.point)

    // This table doubles as the plot legend: the swatch pairs each optimizer's name with
    // its trace colour, so series identity is never carried by colour alone.
    const sortHeader = (label: string, active: boolean, onSort: () => void) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={onSort}
            className={cn("-mr-2.5 ml-auto flex", active ? "text-foreground" : "text-muted-foreground")}
        >
            {label}
            <ArrowDownIcon className={cn(active ? "opacity-100" : "opacity-0")} />
        </Button>
    )

    return (
        <Card>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Optimizer</TableHead>
                            {/* U+2016 (‖) isn't in Geist, so it renders as tofu — the plain
                                axis label from the distance plot is used instead. */}
                            <TableHead className="text-right">
                                {sortHeader("Norm(x)", !sortByObjValue, () => setsortByObjValue(false))}
                            </TableHead>
                            <TableHead className="text-right">
                                {sortHeader("f(x)", sortByObjValue, () => setsortByObjValue(true))}
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {orderingOfOptimizers.map((elem, i) => {
                            return (<TableRow key={elem.key}>
                                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-2">
                                            <span
                                                aria-hidden
                                                className="size-2.5 shrink-0 rounded-[3px]"
                                                style={{ backgroundColor: optimizers[elem.key].color }}
                                            />
                                            {optimizers[elem.key].name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono tabular-nums">{formatMetric(currentIterates[elem.key][0])}</TableCell>
                                    <TableCell className="text-right font-mono tabular-nums">{formatMetric(currentIterates[elem.key][1])}</TableCell>
                                </TableRow>)
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
