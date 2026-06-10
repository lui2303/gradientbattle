import { GradientDescent } from './gd'
import { objectiveFunction, Optimizer, Parameter, Point } from '../types'
import { GradientDescentMomentum } from './gd_momentum'
import { RMSProp } from './rmsprop'
import { AdaGrad } from './adagrad'
import { ADAGRAD_NAME, ADAM_NAME, GD_MOMENTUM_NAME, RMSPROP_NAME } from './constants'
import { Adam } from './adam'

export function optimizerFactory(optimizerName: string, params: Record<string, {enabled: boolean, value: number}>, startingPoint: Point, id: string, objective: objectiveFunction): Optimizer {
    switch (optimizerName) {
        case GD_MOMENTUM_NAME:
            return new GradientDescentMomentum(params.lr.value as number, objective, startingPoint, id, params.momentum.value)
        case ADAGRAD_NAME:
            return new AdaGrad(params.lr.value as number, objective, startingPoint, id)
        case RMSPROP_NAME:
            return new RMSProp(params.lr.value, objective, startingPoint, id, params.momentum.value)
        case ADAM_NAME:
            return new Adam(params.lr.value, objective, startingPoint, id, params.beta1.value, params.beta2.value)
        }

    return new GradientDescent(params.lr.value, objective, startingPoint, id)
}