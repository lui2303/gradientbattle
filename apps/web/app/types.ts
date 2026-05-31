import { objectiveFunction, Point } from "@gradientbattle/core/src/types";
import { PlotData } from "plotly.js";

export type Optimizer = {name: string, params: Record<string, number>, startingPoint: Point, color: string}

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
  defaultOptimizer: Optimizer,
  func: objectiveFunction,
}

export type PlotHandlerProps = {
  startingPoint: Point
}

export type ContourPlotProps = {
  divRef: React.RefObject<HTMLDivElement | null>
}

export type DistancePlotProps = {
  divRef: React.RefObject<HTMLDivElement | null>
}

export type ObjectiveValuePlotProps = {
  divRef: React.RefObject<HTMLDivElement | null>
}