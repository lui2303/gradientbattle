import { objectiveFunction } from "@gradientbattle/core";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";
import { Dispatch, SetStateAction, useEffect, useState } from "react"

  type Entry = { name: string; iterations: number }

  export function GlobalLeaderboard({setfunc, setchallengeMode}: {setfunc: Dispatch<SetStateAction<objectiveFunction>>, setchallengeMode: Dispatch<SetStateAction<boolean>>}) {
      const [challenge, setChallenge] = useState("")
      const [entries, setEntries] = useState<Entry[]>([])
      const [refresh, setRefresh] = useState<number>(0)

      useEffect(() => {
          let cancelled = false
          fetch("/api/leaderboard")
              .then((res) => res.json())
              .then(({ challenge, leaderboard }: { challenge: string, leaderboard: Entry[] }) => {
                  if (cancelled) return
                  setChallenge(challenge)
                  setEntries(leaderboard)
              })
          return () => { cancelled = true }
      }, [refresh])

      return (
          <div>
              <p>Daily Challenge: {challenge}</p>
              <div>{entries.map((x,i) => <p key={i}>{x.name}: {x.iterations}</p>)}</div>
              <button onClick={(e) => {setRefresh(prev => prev + 1)}}>Refresh</button>
              <button onClick={(e) => {setfunc(functionFactory(challenge)); setchallengeMode(true)}}>Try it yourself!</button>
          </div>
      )
  }
