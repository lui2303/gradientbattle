import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Player = {id: string, name:string|null, elo:number, gamesPlayed: number}

export function BattleLeaderboard({players, currentUserId}: {players: Player[], currentUserId?: string}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Ranked ladder</CardTitle>
            </CardHeader>
            <CardContent>
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
                            <TableRow
                                key={player.id}
                                className={cn(player.id === currentUserId && "bg-muted/50")}
                            >
                                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                                <TableCell>{player.name ?? "Anonymous"}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums">{player.elo}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{player.gamesPlayed}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
