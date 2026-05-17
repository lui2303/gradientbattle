import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine";
import { objectiveFunction, Point } from "@gradientbattle/core/src/types";
import { PlotData } from "plotly.js";

export type Optimizer = {name: string, params: Record<string, number>, startingPoint: Point, color: string}

export type TraceData = (Partial<PlotData> & { distances: number[], objectiveValues: number[] })[]

export type AlgorithmSelectCardProps = {
  id: string;
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>,
  setOptimizerTraces: React.Dispatch<React.SetStateAction<TraceData>>,
  func: objectiveFunction,
};

export type AlgorithmSelectContainerProps = {
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>
  defaultOptimizer: Optimizer,
  setOptimizerTraces: React.Dispatch<React.SetStateAction<TraceData>>,
  func: objectiveFunction,
}

export type PlotHandlerProps = {
  startingPoint: Point
}

export type ContourPlotProps = {
  objFunction: objectiveFunction,
  optimizerTraces: TraceData,
  setOptimizerTraces: React.Dispatch<React.SetStateAction<TraceData>>,
}

export type DistancePlotProps = {
  optimizerTraces: TraceData,
  setOptimizerTraces: React.Dispatch<React.SetStateAction<TraceData>>,
}

export type ObjectiveValuePlotProps = {
  optimizerTraces: TraceData,
  setOptimizerTraces: React.Dispatch<React.SetStateAction<TraceData>>,
}