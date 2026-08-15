import { objectiveFunction } from "@gradientbattle/core";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function FunctionSelector({allowedFunctions, func, setFuncCallback}: {allowedFunctions: string[],func: objectiveFunction, setFuncCallback: (func: objectiveFunction) => void}) {
    return (
        <div className="flex items-center gap-3">
            <Label htmlFor="objective-function" className="text-muted-foreground">Function</Label>
            <Select value={func.name} onValueChange={(value) => setFuncCallback(functionFactory(value))}>
                <SelectTrigger id="objective-function" className="w-44">
                    <SelectValue placeholder="Select a function" />
                </SelectTrigger>
                <SelectContent>
                    {allowedFunctions.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}


// TODO: fix latex on different function select
