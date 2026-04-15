import { Point } from "@gradientbattle/core/src/types";

export type Optimizer = {name: string, params: Record<string, number>}

export type AlgorithmSelectCardProps = {
  id: string;
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>
};

export type AlgorithmSelectContainerProps = {
  optimizers: Record<string, Optimizer>;
  setOptimizers: React.Dispatch<React.SetStateAction<Record<string, Optimizer>>>
  defaultOptimizer: Optimizer
}

export type PlotHandlerProps = {
  startingPoint: Point
}