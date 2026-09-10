import { toast } from "sonner"

export function notifyError(message: string) {
    toast.error(message)
}
