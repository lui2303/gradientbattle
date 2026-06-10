import { LeaderboardProps } from "../types";

import { useState } from "react";

export function Leaderboard({optimizers, currentIterates}: LeaderboardProps) {
    // currentIterates[optiKey][0]: norm of current optimizer point
    // currentIterates[optiKey][1]: objective value of current optimizer point
    const [sortByObjValue, setsortByObjValue] = useState<boolean>(true)

    const orderingOfOptimizers: {key: string, point: number}[] = []

    Object.entries(currentIterates).forEach(([key, values]) => {
        orderingOfOptimizers.push({"key": key, "point": values[Number(sortByObjValue)]})})

    orderingOfOptimizers.sort((a,b) => a.point - b.point)

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Optimizer</th>
                        <th><button type="button" onClick={(e) => setsortByObjValue(false)}>$\|(x,y)\|_2$</button></th>
                        <th><button type="button" onClick={(e) => setsortByObjValue(true)}>$f(x,y)$</button></th>
                    </tr>
                </thead>

                <tbody>
                    {orderingOfOptimizers.map((elem, i) => {
                        return (<tr style={{ backgroundColor: optimizers[elem.key].color }} key={elem.key}>
                                <td className="px-4 py-2">{i + 1}</td>
                                <td className="px-4 py-2">{optimizers[elem.key].name}</td>
                                <td className="px-4 py-2">{currentIterates[elem.key][0]}</td>
                                <td className="px-4 py-2">{currentIterates[elem.key][1]}</td>
                            </tr>)
                    })}
                </tbody>
            </table>
        </div>
    )
}