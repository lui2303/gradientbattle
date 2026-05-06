import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine";
import { objectiveFunction, Point } from "@gradientbattle/core/src/types";
import { PlotData } from "plotly.js";

export type Optimizer = {name: string, params: Record<string, number>, startingPoint: Point, color: string}

export type AlgorithmSelectCardProps = {
  id: string;
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>,
  setOptimizerTraces: React.Dispatch<React.SetStateAction<Partial<PlotData>[]>>
};

export type AlgorithmSelectContainerProps = {
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>
  defaultOptimizer: Optimizer,
  setOptimizerTraces: React.Dispatch<React.SetStateAction<Partial<PlotData>[]>>
}

export type PlotHandlerProps = {
  startingPoint: Point
}

export type ContourPlotProps = {simulationEngine: SimulationEngine,
  objFunction: objectiveFunction,
  optimizers: Record<string, Optimizer>,
  running: boolean, setRunning: React.Dispatch<React.SetStateAction<boolean>>,
  runningRef: React.RefObject<boolean>,
  optimizerTraces: Partial<PlotData>[],
  setOptimizerTraces: React.Dispatch<React.SetStateAction<Partial<PlotData>[]>>
}