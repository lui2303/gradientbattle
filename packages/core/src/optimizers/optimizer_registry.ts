import { Point } from "../types"
import { ADAGRAD_NAME, ADAM_NAME, GD_MOMENTUM_NAME, GD_NAME, RMSPROP_NAME } from "./constants"

export type Param = {name: string, value: number}

const startingPoint = {x: 5, y: 5}

type OptimizationAlgorithm = Record<string,{
    params: Record<string, number>,
    startingPoint: Point,
    /**
     * LaTeX symbol per parameter key, matching the notation the update rule below
     * uses. The UI shows the symbol alone when the key is just an ASCII spelling of
     * it (`beta1` -> β₁) and otherwise pairs the two (`lr` -> "lr (α)"), so a control
     * can always be traced to its place in the formula.
     */
    paramLatex: Record<string, string>,
    /**
     * The optimizer's update rule as LaTeX, kept here beside the parameters it
     * references so the two can't drift apart. These transcribe what the classes in
     * this directory actually compute, which is not always the textbook form — see
     * the notes on each entry.
     */
    latex: string,
}>

// ε is a fixed 1e-8 inside the implementations rather than a tunable parameter.
const EPS = "\\varepsilon"

export const optimizationAlgorithms: OptimizationAlgorithm = {
    [GD_NAME]: {
        "params": {"lr": 0.05},
        "startingPoint": startingPoint,
        paramLatex: {lr: "\\alpha"},
        latex: String.raw`x_{k+1} = x_k - \alpha \nabla f(x_k)`,
    },
    [GD_MOMENTUM_NAME]: {
        "params": {"lr": 0.1, "momentum": 0.8},
        startingPoint: startingPoint,
        paramLatex: {lr: "\\alpha", momentum: "\\beta"},
        // The gradient enters undamped (no 1-β factor) and the step uses the freshly
        // updated velocity, matching gd_momentum.ts.
        latex: String.raw`\begin{aligned}
            v_{k+1} &= \beta\, v_k + \nabla f(x_k) \\
            x_{k+1} &= x_k - \alpha\, v_{k+1}
        \end{aligned}`,
    },
    [ADAGRAD_NAME]: {
        "params": {"lr": 0.1},
        startingPoint: startingPoint,
        paramLatex: {lr: "\\alpha"},
        // ε is added *after* the square root, not inside it.
        latex: String.raw`\begin{aligned}
            s_{k+1} &= s_k + \nabla f(x_k) \odot \nabla f(x_k) \\
            x_{k+1} &= x_k - \frac{\alpha}{\sqrt{s_{k+1}} + ${EPS}} \odot \nabla f(x_k)
        \end{aligned}`,
    },
    [RMSPROP_NAME]: {
        "params": {"lr": 0.1, "momentum": 0.99},
        startingPoint: startingPoint,
        // The registry calls it `momentum`, but it is the decay rate of the squared
        // gradient average (the class field is named `decay`).
        paramLatex: {lr: "\\alpha", momentum: "\\beta"},
        latex: String.raw`\begin{aligned}
            v_{k+1} &= \beta\, v_k + (1-\beta)\, \nabla f(x_k) \odot \nabla f(x_k) \\
            x_{k+1} &= x_k - \frac{\alpha}{\sqrt{v_{k+1}} + ${EPS}} \odot \nabla f(x_k)
        \end{aligned}`,
    },
    [ADAM_NAME]: {
        "params": {"lr": 0.1, "beta1": 0.9, "beta2": 0.999},
        startingPoint: startingPoint,
        paramLatex: {lr: "\\alpha", beta1: "\\beta_1", beta2: "\\beta_2"},
        latex: String.raw`\begin{aligned}
            m_k &= \beta_1 m_{k-1} + (1-\beta_1)\, \nabla f(x_k) \\
            v_k &= \beta_2 v_{k-1} + (1-\beta_2)\, \nabla f(x_k) \odot \nabla f(x_k) \\
            \hat{m}_k &= \frac{m_k}{1-\beta_1^{\,k}}, \qquad \hat{v}_k = \frac{v_k}{1-\beta_2^{\,k}} \\
            x_{k+1} &= x_k - \frac{\alpha}{\sqrt{\hat{v}_k} + ${EPS}} \odot \hat{m}_k
        \end{aligned}`,
    }
}

// "create": (lr: number, objectiveFunc: objectiveFunction) => new VanillaGD(lr, objectiveFunc)
export const optimizationAlgorithmsList: string[] = [GD_NAME, GD_MOMENTUM_NAME, ADAGRAD_NAME, RMSPROP_NAME, ADAM_NAME]

// TODO: add min/max for parameters

// How to register a new Optimizer:
// Add optimizer name in constants.ts and add them to optimizationAlgorithmsList and optimizationAlgorithms with const as key and their metadata,
// including `paramLatex` for every parameter key and a `latex` update rule.
