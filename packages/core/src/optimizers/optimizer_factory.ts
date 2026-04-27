import {optimizationAlgorithmsList, Param} from '@gradientbattle/core/src/optimizers/optimizer_registry'
import {DummyOptimizer} from '@gradientbattle/core/src/optimizers/dummy_optimizer'
import { VanillaGD } from './vanilla_gd'
import { objectiveFunction, Optimizer, Parameter, Point } from '../types'

export function optimizerFactory(optimizerName: string, params: Record<string, Parameter>): Optimizer {
    switch (optimizerName) {
        case optimizationAlgorithmsList[1]:
            return new DummyOptimizer(params.lr as number, params.objective as objectiveFunction, params.alpha as number, params.startingPoint as Point, params.id as string)
    }

    return new VanillaGD(params.lr as number, params.objective as objectiveFunction, params.startingPoint as Point, params.id as string)
}