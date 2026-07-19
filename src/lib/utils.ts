import type { ApiErrorDetail } from './api'
import { ApiError } from './api'

export type FieldErrors = Record<string, string>

export const formatApiError = (error: unknown, translate: (key: string, vars?: Record<string, string | number>) => string) => {
    if (error instanceof ApiError) {
        const fieldErrors = buildFieldErrors(error.details)

        if (error.status === 429) {
            const resetSeconds = error.rateLimit?.reset_seconds
            const message = typeof resetSeconds === 'number' ? translate('errors.tooManyRequests', { seconds: resetSeconds }) : translate('errors.tooManyRequestsLater')

            return { message, fieldErrors }
        }

        return { message: error.message, fieldErrors }
    }

    console.log('Unknown error format:', error)
    return { message: translate('errors.network'), fieldErrors: {} }
}

const buildFieldErrors = (details?: ApiErrorDetail[]) => {
    if (!details || details.length === 0) return {} as FieldErrors

    return details.reduce<FieldErrors>((acc, detail) => {
        acc[detail.field] = detail.reason
        return acc
    }, {})
}

export const formatDateTime = (value: string, localeTag: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return date.toLocaleString(localeTag, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Seoul',
    })
}

export const isZipFile = (file: File) => file.name.toLowerCase().endsWith('.zip')

export const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length

// NAME_MAX_LEN bounds username and division name. Combined as
// "division_username" (10+10 + one underscore) this fits Discord's
// 32-character nickname limit comfortably.
export const NAME_MAX_LEN = 10

// charLength counts Unicode code points (matching the backend's rune count),
// so multi-byte characters such as Hangul count as one each.
export const charLength = (value: string) => [...value].length

export const trimToMaxChars = (value: string, maxChars: number) => [...value].slice(0, maxChars).join('')

export const trimToMaxUtf8Bytes = (value: string, maxBytes: number) => {
    if (utf8ByteLength(value) <= maxBytes) return value

    let out = ''
    for (const ch of value) {
        const next = out + ch
        if (utf8ByteLength(next) > maxBytes) break
        out = next
    }
    return out
}

export const parseRouteId = (value?: string) => {
    if (!value) return null
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
}

export const downloadJsonFile = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
}
