
export type Player = {id: string, name:string|null, elo:number}

export function BattleLeaderboard({players}: {players: Player[]}) {
    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>name</th>
                        <th>elo</th>
                    </tr>
                </thead>

                <tbody>
                        {players.map((elem, i) => {
                            return (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{elem.name}</td>
                                    <td>{elem.elo}</td>
                                </tr>
                            )
                        })}
                </tbody>
            </table>
        </div>
    )
}
