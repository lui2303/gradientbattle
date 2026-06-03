import { objectiveFunction, Point } from "@gradientbattle/core/src/types";
import { PlotData } from "plotly.js";

export type Optimizer = {name: string, params: Record<string, number>, startingPoint: Point, color: string}

// One optimizer's current iterate, as [norm of the point, objective value].
export type Iterate = [number, number]

export type TraceData = (Partial<PlotData> & { distances: number[], objectiveValues: number[] })[]

export type AlgorithmSelectCardProps = {
  id: string;
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>,
  func: objectiveFunction,
};

export type AlgorithmSelectContainerProps = {
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>
  func: objectiveFunction,
}

export type PlotHandlerProps = {
  startingPoint: Point
}

export type PlotMountProps = {
  divRef: React.RefObject<HTMLDivElement | null>
}