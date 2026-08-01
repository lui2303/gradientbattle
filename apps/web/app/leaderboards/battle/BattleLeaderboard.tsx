import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export type Player = {id: string, name:string|null, elo:number, gamesPlayed: number}

export function BattleLeaderboard({players}: {players: Player[]}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Elo</TableHead>
                    <TableHead className="text-right">Games Played</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {players.map((player, i) => (
                    <TableRow key={player.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{player.name ?? "Anonymous"}</TableCell>
                        <TableCell className="text-right font-mono">{player.elo}</TableCell>
                        <TableCell className="text-right font-mono">{player.gamesPlayed}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
