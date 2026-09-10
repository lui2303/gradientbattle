import { notifyError } from "./notify"

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again."
const UNEXPECTED_RESPONSE = "The server sent an unexpected response. Try again."

function describeWait(seconds: number) {
    if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minute${minutes === 1 ? "" : "s"}`
}

function errorMessage(res: Response, data: unknown) {
    const serverError = (data as { error?: unknown } | null)?.error
    const message = typeof serverError === "string" && serverError
        ? serverError
        : `Request failed with status ${res.status}${res.statusText ? ` (${res.statusText})` : ""}.`

    const retryAfter = Number(res.headers.get("Retry-After"))
    if (res.status === 429 && retryAfter > 0) return `${message} Try again in ${describeWait(retryAfter)}.`
    return message
}

export async function postJson<T>(url: string, body: unknown): Promise<{ ok: true, data: T } | { ok: false, data: unknown }> {
    let res: Response
    try {
        res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
    } catch {
        notifyError(NETWORK_ERROR)
        return { ok: false, data: null }
    }

    const data: unknown = await res.json().catch(() => null)

    if (!res.ok) {
        notifyError(errorMessage(res, data))
        return { ok: false, data }
    }
    if (data === null) {
        notifyError(UNEXPECTED_RESPONSE)
        return { ok: false, data }
    }

    return { ok: true, data: data as T }
}
