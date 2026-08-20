import { objectiveFunction } from "@gradientbattle/core";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";
import { Dispatch, SetStateAction, useEffect, useState } from "react"

  type Entry = { username: string; iterations: number }

  export function GlobalLeaderboard({setfunc, setchallengeID, setChallengeMode}: {setfunc: Dispatch<SetStateAction<objectiveFunction>>, setchallengeID: Dispatch<SetStateAction<number | null>>, setChallengeMode: Dispatch<SetStateAction<boolean>>}) {
      const [challenge, setChallenge] = useState("")
      const [entries, setEntries] = useState<Entry[]>([])
      const [refresh, setRefresh] = useState<number>(0)

      useEffect(() => {
          let cancelled = false
          fetch("/api/dailyChallenge")
              .then((res) => res.json())
              .then(({ challengeID, challenge, leaderboard }: { challengeID: number, challenge: string, leaderboard: Entry[] }) => {
                  if (cancelled) return
                  setChallenge(challenge)
                  setEntries(leaderboard)
                  setchallengeID(challengeID)
              })
          return () => { cancelled = true }
      }, [refresh, setchallengeID])

      return (
        <div className="flex flex-col gap-4 p-4">
            <p>Daily Challenge: {challenge}</p>
            <div>{entries.map((x,i) => <p key={i}>{x.username}: {x.iterations}</p>)}</div>
            <button onClick={(e) => {setRefresh(prev => prev + 1)}}>Refresh</button>
            <button onClick={(e) => {setfunc(functionFactory(challenge)); setChallengeMode(true)}}>Try it yourself!</button>
        </div>
      )
  }
