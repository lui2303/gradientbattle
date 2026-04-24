import {optimizationAlgorithmsList, Param} from '@gradientbattle/core/src/optimizers/optimizer_registry'
import {DummyOptimizer} from '@gradientbattle/core/src/optimizers/dummy_optimizer'
import { VanillaGD } from './vanilla_gd'
import { Optimizer } from '../types'

export function optimizerFactory(optimizerName: string, params: any): Optimizer {
    console.log(params.startingPoint)
    console.log("HERE")
    switch (optimizerName) {
        case optimizationAlgorithmsList[1]:
            return new DummyOptimizer(params.lr, params.objective, params.alpha, params.startingPoint)
    }

    return new VanillaGD(params.lr, params.objective, params.startingPoint)
}