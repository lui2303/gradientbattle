// currently using FIDE Elo system, switch to Glicko-2 if player base increases to get better estimates for new users

import { Player } from "@/app/types";


function calculateK(player: Player) {
    if(player.gamesPlayed < 30) return 40
    if(player.peakElo >= 1300) return 10 // increase as player base increases
    return 20
}

function expectedScore(eloDiff: number) {
    return 1/(1+ Math.pow(10, eloDiff/400))
}

export function calculateEloUpdate(playerA: Player, playerB: Player, scoreA: number) {
    // returns [eloDiffA, eloDiffB] where both values describe the gain/loose for the respective player
    const K_b = calculateK(playerB)
    const K_a = calculateK(playerA)

    const expectedScoreA = expectedScore(playerB.elo - playerA.elo)
    const expectedScoreB = 1-expectedScoreA

    return [Math.round(K_a*(scoreA - expectedScoreA)), Math.round(K_b*(1-scoreA - expectedScoreB))]
}