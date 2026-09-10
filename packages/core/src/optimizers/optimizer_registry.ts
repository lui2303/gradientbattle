import { Point } from "../types"
import { ADAGRAD_NAME, ADAM_NAME, GD_MOMENTUM_NAME, GD_NAME, RMSPROP_NAME } from "./constants"

export type Param = {name: string, value: number}

const startingPoint = {x: 5, y: 5}

type OptimizationAlgorithms = Record<string,{
    params: Record<string, {value: number, min: number, max: number}>,
    startingPoint: Point,
    paramLatex: Record<string, string>,
    latex: string,
}>

const EPS = "\\varepsilon"

export const optimizationAlgorithms: OptimizationAlgorithms = {
    [GD_NAME]: {
        "params": {"lr": {value: 0.05, min: 0, max: 10}},
        "startingPoint": startingPoint,
        paramLatex: {lr: "\\alpha"},
        latex: String.raw`x_{k+1} = x_k - \alpha \nabla f(x_k)`,
    },
    [GD_MOMENTUM_NAME]: {
        "params": {"lr": {value: 0.1, min: 0, max: 10}, "momentum": {value: 0.8, min: 0, max: 0.99}},
        startingPoint: startingPoint,
        paramLatex: {lr: "\\alpha", momentum: "\\beta"},
        latex: String.raw`\begin{aligned}
            v_{k+1} &= \beta\, v_k + \nabla f(x_k) \\
            x_{k+1} &= x_k - \alpha\, v_{k+1}
        \end{aligned}`,
    },
    [ADAGRAD_NAME]: {
        "params": {"lr": {value: 0.1, min: 0, max: 10}},
        startingPoint: startingPoint,
        paramLatex: {lr: "\\alpha"},
        // ε is added *after* the square root, not inside it.
        latex: String.raw`\begin{aligned}
            s_{k+1} &= s_k + \nabla f(x_k) \odot \nabla f(x_k) \\
            x_{k+1} &= x_k - \frac{\alpha}{\sqrt{s_{k+1}} + ${EPS}} \odot \nabla f(x_k)
        \end{aligned}`,
    },
    [RMSPROP_NAME]: {
        "params": {"lr": {value: 0.1, min: 0, max: 10}, "momentum": {value: 0.99, min: 0, max: 0.999}},
        startingPoint: startingPoint,
        paramLatex: {lr: "\\alpha", momentum: "\\beta"},
        latex: String.raw`\begin{aligned}
            v_{k+1} &= \beta\, v_k + (1-\beta)\, \nabla f(x_k) \odot \nabla f(x_k) \\
            x_{k+1} &= x_k - \frac{\alpha}{\sqrt{v_{k+1}} + ${EPS}} \odot \nabla f(x_k)
        \end{aligned}`,
    },
    [ADAM_NAME]: {
        "params": {"lr": {value: 0.1, min: 0, max: 10}, "beta1": {value: 0.9, min: 0, max: 0.999}, "beta2": {value: 0.999, min: 0, max: 0.9999}},
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

export function paramRangeError(optimizerName: string, params: Record<string, {value: unknown}> | undefined): string | null {
    if (!Object.hasOwn(optimizationAlgorithms, optimizerName)) return `Unknown optimizer ${optimizerName}`

    for (const [key, { min, max }] of Object.entries(optimizationAlgorithms[optimizerName].params)) {
        const value = params?.[key]?.value
        if (typeof value !== "number" || !(value >= min && value <= max)) {
            return `${key} of ${optimizerName} must be a number between ${min} and ${max}`
        }
    }

    return null
}

// "create": (lr: number, objectiveFunc: objectiveFunction) => new VanillaGD(lr, objectiveFunc)
export const optimizationAlgorithmsList: string[] = [GD_NAME, GD_MOMENTUM_NAME, ADAGRAD_NAME, RMSPROP_NAME, ADAM_NAME]

// How to register a new Optimizer:
// Add optimizer name in constants.ts and add them to optimizationAlgorithmsList and optimizationAlgorithms with const as key and their metadata,
// including `paramLatex` for every parameter key and a `latex` update rule.
