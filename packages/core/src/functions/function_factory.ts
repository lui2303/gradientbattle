import { functionList } from "./function_registry";
import { quadraticFunction } from "./quadratic"


export function functionFactory(functionName: string, props: any) {
    switch(functionName) {
        case functionList[0]:
            return new quadraticFunction(props.A, props.b, props.d)
    }
}