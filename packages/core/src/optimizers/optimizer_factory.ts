import { GradientDescent } from './gd'
import { objectiveFunction, Optimizer, Parameter, Point } from '../types'
import { GradientDescentMomentum } from './gd_momentum'
import { RMSProp } from './rmsprop'
import { AdaGrad } from './adagrad'
import { ADAGRAD_NAME, ADAM_NAME, GD_MOMENTUM_NAME, RMSPROP_NAME } from './constants'
import { Adam } from './adam'

export function optimizerFactory(optimizerName: string, params: Record<string, Parameter>): Optimizer {
    switch (optimizerName) {
        case GD_MOMENTUM_NAME:
            return new GradientDescentMomentum(params.lr as number, params.objective as objectiveFunction, params.startingPoint as Point, params.id as string, params.momentum as number)
        case ADAGRAD_NAME:
            return new AdaGrad(params.lr as number, params.objective as objectiveFunction, params.startingPoint as Point, params.id as string)
        case RMSPROP_NAME:
            return new RMSProp(params.lr as number, params.objective as objectiveFunction, params.startingPoint as Point, params.id as string, params.momentum as number)
        case ADAM_NAME:
            return new Adam(params.lr as number, params.objective as objectiveFunction, params.startingPoint as Point, params.id as string, params.beta1 as number, params.beta2 as number)
        }

    return new GradientDescent(params.lr as number, params.objective as objectiveFunction, params.startingPoint as Point, params.id as string)
}