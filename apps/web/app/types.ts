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
    "battleID": string | null
}
