import { objectiveFunction, Point } from "@gradientbattle/core/src/types";
import { PlotData } from "plotly.js";

export type Optimizer = {name: string, params: Record<string, number>, startingPoint: Point, color: string}

export type RankedOptimizationAlgorithm = {name: string, params: Record<string, {enabled: boolean, value: number}>, startingPoint: {fixed: boolean, value: Point}}
export type FrontendOptimizer = RankedOptimizationAlgorithm & {color: string}

// One optimizer's current iterate, as [norm of the point, objective value].
export type Iterate = [number, number]

export type TraceData = (Partial<PlotData> & { distances: number[], objectiveValues: number[] })[]

export type AlgorithmSelectCardProps = {
  id: string;
  optimizers: Record<string, FrontendOptimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, FrontendOptimizer>>>,
  allowedOptimizers: FrontendOptimizer[]
};

export type AlgorithmSelectContainerProps = {
  optimizers: Record<string, FrontendOptimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, FrontendOptimizer>>>
  defaultOptimizer: FrontendOptimizer,
  allowedOptimizers: FrontendOptimizer[]
}

export type PlotHandlerProps = {
  startingPoint: Point
}

export type PlotMountProps = {
  divRef: React.RefObject<HTMLDivElement | null>
}
export type LeaderboardProps = {optimizers: Record<string, FrontendOptimizer>, currentIterates: Record<string, Iterate>}

export type rankedGame = {
    "objective": string,
    "startingPointsInequalities" : ((point: Point) => boolean)[], // inequalities that every non fixed starting point needs to satisfy
    "optimizers": RankedOptimizationAlgorithm[],
    "max_number_of_optimizers": number,
    "battleID": string | null,
    "maxSubmissions": number
}


export enum ServerMessageTypes {
  CONNECTED,
  ABORT,
  ENQUEUED,
  FOUND_OPPONENT,
  PREP_PHASE,
  BATTLE_RESULT
}
export type ServerResponse = {type: ServerMessageTypes.CONNECTED} 
                  | {type: ServerMessageTypes.ABORT, issue: string} 
                  | {type: ServerMessageTypes.ENQUEUED} 
                  | {type: ServerMessageTypes.FOUND_OPPONENT, payload: {id: string, name: string, elo: number}}
                  | {type: ServerMessageTypes.PREP_PHASE, payload: rankedGame}
                  | {type: ServerMessageTypes.BATTLE_RESULT, payload: { winnerId: string | null, winningRunId: string | null, status: string }}

export enum ClientMessageTypes {
  FIND_OPPONENT,
  ABORT,
  READY
}

export type ClientResponse = | {type: ClientMessageTypes.ABORT}
                  | {type: ClientMessageTypes.FIND_OPPONENT}
                  | {type: ClientMessageTypes.READY}
