import type {
    AuthResponse,
    AuthUser,
    AppConfig,
    AdminConfigUpdatePayload,
    CtfState,
    CtfStateResponse,
    Challenge,
    ChallengesResponse,
    ChallengeCreatePayload,
    ChallengeCreateResponse,
    ChallengeUpdatePayload,
    ChallengeFileUploadResponse,
    AdminChallengeDetail,
    AdminStackDeleteResponse,
    AdminStackListItem,
    AdminStacksResponse,
    FlagSubmissionResult,
    LeaderboardResponse,
    TeamLeaderboardResponse,
    PresignedURL,
    Stack,
    StacksResponse,
    Team,
    TeamCreatePayload,
    TeamSummary,
    TeamDetail,
    TeamMember,
    TeamSolvedChallenge,
    TeamTimelineResponse,
    LoginPayload,
    RegistrationKey,
    RegistrationKeyCreatePayload,
    RegisterPayload,
    RegisterResponse,
    SolvedChallenge,
    TimelineResponse,
    UserListItem,
    UserDetail,
} from './types'
import type { AuthState } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

export interface ApiErrorDetail {
    field: string
    reason: string
}
export interface RateLimitInfo {
    limit: number
    remaining: number
    reset_seconds: number
}

export class ApiError extends Error {
    status: number
    details?: ApiErrorDetail[]
    rateLimit?: RateLimitInfo

    constructor(message: string, status: number, details?: ApiErrorDetail[], rateLimit?: RateLimitInfo) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.details = details
        this.rateLimit = rateLimit
    }
}

interface ApiDeps {
    getAuth: () => AuthState
    setAuthTokens: (accessToken: string, refreshToken: string) => void
    setAuthUser: (user: AuthUser | null) => void
    clearAuth: () => void
    translate: (key: string, vars?: Record<string, string | number>) => string
}

const parseJson = async (response: Response) => {
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return null

    return response.json()
}

const extractRateLimit = (response: Response, data: any): RateLimitInfo | undefined => {
    if (data?.rate_limit) return data.rate_limit as RateLimitInfo

    const limit = Number(response.headers.get('x-ratelimit-limit'))
    const remaining = Number(response.headers.get('x-ratelimit-remaining'))
    const resetSeconds = Number(response.headers.get('x-ratelimit-reset'))

    if (Number.isFinite(limit) && Number.isFinite(remaining) && Number.isFinite(resetSeconds)) {
        return { limit, remaining, reset_seconds: resetSeconds }
    }

    return undefined
}

const resolveCtfState = (data: any): CtfState => {
    switch (data?.ctf_state) {
        case 'not_started':
        case 'ended':
        case 'active':
            return data.ctf_state
        default:
            return 'active'
    }
}

export const createApi = ({ getAuth, setAuthTokens, setAuthUser, clearAuth, translate }: ApiDeps) => {
    const buildHeaders = (withAuth: boolean, tokenOverride?: string) => {
        const headers: Record<string, string> = { Accept: 'application/json' }

        if (withAuth) {
            const token = tokenOverride ?? getAuth().accessToken
            if (token) headers.Authorization = `Bearer ${token}`
        }

        return headers
    }

    const refreshToken = async () => {
        const refreshTokenValue = getAuth().refreshToken
        if (!refreshTokenValue) throw new ApiError(translate('errors.missingRefreshToken'), 401)

        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshTokenValue }),
        })

        if (!response.ok) {
            const data = await parseJson(response)
            clearAuth()

            throw new ApiError(
                data?.error ?? translate('errors.invalidCredentials'),
                response.status,
                data?.details,
                extractRateLimit(response, data),
            )
        }

        const data = await response.json()
        setAuthTokens(data.access_token, data.refresh_token)

        return data.access_token as string
    }

    let refreshInFlight: Promise<string> | null = null

    const getFreshToken = async () => {
        if (refreshInFlight) return refreshInFlight
        refreshInFlight = (async () => {
            try {
                return await refreshToken()
            } finally {
                refreshInFlight = null
            }
        })()
        return refreshInFlight
    }

    const request = async <T>(
        path: string,
        {
            method = 'GET',
            body,
            auth = false,
            retryOnAuth = true,
            noCache = false,
        }: {
            method?: string
            body?: unknown
            auth?: boolean
            retryOnAuth?: boolean
            noCache?: boolean
        } = {},
    ): Promise<T> => {
        const headers = buildHeaders(auth)
        if (body !== undefined) headers['Content-Type'] = 'application/json'
        if (noCache) {
            headers['Cache-Control'] = 'no-cache'
            headers.Pragma = 'no-cache'
        }

        const response = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            cache: noCache ? 'no-store' : 'default',
        })

        if (response.ok) {
            if (response.status === 204) return null as T
            const data = await parseJson(response)
            return data as T
        }

        if (response.status === 401 && auth && retryOnAuth) {
            try {
                const newToken = await getFreshToken()
                const retryHeaders = buildHeaders(true, newToken)
                if (body !== undefined) retryHeaders['Content-Type'] = 'application/json'
                if (noCache) {
                    retryHeaders['Cache-Control'] = 'no-cache'
                    retryHeaders.Pragma = 'no-cache'
                }

                const retryResponse = await fetch(`${API_BASE}${path}`, {
                    method,
                    headers: retryHeaders,
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    cache: noCache ? 'no-store' : 'default',
                })

                if (retryResponse.ok) {
                    if (retryResponse.status === 204) return null as T
                    return (await parseJson(retryResponse)) as T
                }

                const retryData = await parseJson(retryResponse)
                throw new ApiError(
                    retryData?.error ?? translate('errors.requestFailed'),
                    retryResponse.status,
                    retryData?.details,
                    extractRateLimit(retryResponse, retryData),
                )
            } catch (error) {
                if (error instanceof ApiError) throw error
                clearAuth()
                throw new ApiError(translate('errors.invalidCredentials'), 401)
            }
        }

        const data = await parseJson(response)

        throw new ApiError(
            data?.error ?? translate('errors.requestFailed'),
            response.status,
            data?.details,
            extractRateLimit(response, data),
        )
    }

    return {
        config: (opts?: { noCache?: boolean }) => request<AppConfig>(`/api/config`, { noCache: opts?.noCache }),
        updateAdminConfig: (payload: AdminConfigUpdatePayload) =>
            request<AppConfig>(`/api/admin/config`, { method: 'PUT', body: payload, auth: true }),
        register: (payload: RegisterPayload) =>
            request<RegisterResponse>(`/api/auth/register`, { method: 'POST', body: payload }),
        login: async (payload: LoginPayload) => {
            const data = await request<AuthResponse>(`/api/auth/login`, { method: 'POST', body: payload })
            setAuthTokens(data.access_token, data.refresh_token)
            setAuthUser(data.user)
            return data
        },
        logout: async () => {
            const refreshTokenValue = getAuth().refreshToken
            if (!refreshTokenValue) {
                clearAuth()
                return
            }
            await request(`/api/auth/logout`, { method: 'POST', body: { refresh_token: refreshTokenValue } })
            clearAuth()
        },
        me: () => request<AuthUser>(`/api/me`, { auth: true }),
        updateMe: (username: string) => request<AuthUser>(`/api/me`, { method: 'PUT', body: { username }, auth: true }),
        challenges: async () => {
            const data = await request<{ ctf_state?: CtfState; challenges?: Challenge[] }>(`/api/challenges`)
            return {
                ctf_state: resolveCtfState(data),
                challenges: Array.isArray(data?.challenges) ? data.challenges : [],
            } as ChallengesResponse
        },
        submitFlag: (id: number, flag: string) =>
            request<FlagSubmissionResult>(`/api/challenges/${id}/submit`, {
                method: 'POST',
                body: { flag },
                auth: true,
            }),
        leaderboard: () => request<LeaderboardResponse>(`/api/leaderboard`),
        leaderboardTeams: () => request<TeamLeaderboardResponse>(`/api/leaderboard/teams`),
        timeline: (windowMinutes?: number) => {
            const windowParam = typeof windowMinutes === 'number' ? `?window=${windowMinutes}` : ''
            return request<TimelineResponse>(`/api/timeline${windowParam}`)
        },
        timelineTeams: (windowMinutes?: number) => {
            const windowParam = typeof windowMinutes === 'number' ? `?window=${windowMinutes}` : ''
            return request<TeamTimelineResponse>(`/api/timeline/teams${windowParam}`)
        },
        createChallenge: (payload: ChallengeCreatePayload) =>
            request<ChallengeCreateResponse>(`/api/admin/challenges`, { method: 'POST', body: payload, auth: true }),
        adminChallenge: (id: number) => request<AdminChallengeDetail>(`/api/admin/challenges/${id}`, { auth: true }),
        updateChallenge: (id: number, payload: ChallengeUpdatePayload) =>
            request<Challenge>(`/api/admin/challenges/${id}`, { method: 'PUT', body: payload, auth: true }),
        deleteChallenge: (id: number) => request<void>(`/api/admin/challenges/${id}`, { method: 'DELETE', auth: true }),
        requestChallengeFileUpload: (id: number, filename: string) =>
            request<ChallengeFileUploadResponse>(`/api/admin/challenges/${id}/file/upload`, {
                method: 'POST',
                body: { filename },
                auth: true,
            }),
        deleteChallengeFile: (id: number) =>
            request<Challenge>(`/api/admin/challenges/${id}/file`, { method: 'DELETE', auth: true }),
        requestChallengeFileDownload: (id: number) =>
            request<PresignedURL | CtfStateResponse>(`/api/challenges/${id}/file/download`, {
                method: 'POST',
                auth: true,
            }),
        createStack: (challengeID: number) =>
            request<Stack | CtfStateResponse>(`/api/challenges/${challengeID}/stack`, { method: 'POST', auth: true }),
        getStack: (challengeID: number) =>
            request<Stack | CtfStateResponse>(`/api/challenges/${challengeID}/stack`, { auth: true }),
        deleteStack: (challengeID: number) =>
            request<{ status?: string; ctf_state?: CtfState }>(`/api/challenges/${challengeID}/stack`, {
                method: 'DELETE',
                auth: true,
            }),
        stacks: async () => {
            const data = await request<{ ctf_state?: CtfState; stacks?: Stack[] }>(`/api/stacks`, { auth: true })
            return {
                ctf_state: resolveCtfState(data),
                stacks: Array.isArray(data?.stacks) ? data.stacks : [],
            } as StacksResponse
        },
        adminStacks: async () => {
            const data = await request<{ stacks?: AdminStackListItem[] }>(`/api/admin/stacks`, { auth: true })
            return {
                stacks: Array.isArray(data?.stacks) ? data.stacks : [],
            } as AdminStacksResponse
        },
        adminStack: (stackId: string) => request<Stack>(`/api/admin/stacks/${stackId}`, { auth: true }),
        deleteAdminStack: (stackId: string) =>
            request<AdminStackDeleteResponse>(`/api/admin/stacks/${stackId}`, { method: 'DELETE', auth: true }),
        registrationKeys: () => request<RegistrationKey[]>(`/api/admin/registration-keys`, { auth: true }),
        createRegistrationKeys: (payload: RegistrationKeyCreatePayload) =>
            request<RegistrationKey[]>(`/api/admin/registration-keys`, { method: 'POST', body: payload, auth: true }),
        createTeam: (payload: TeamCreatePayload) =>
            request<Team>(`/api/admin/teams`, { method: 'POST', body: payload, auth: true }),
        moveUserTeam: (id: number, team_id: number) =>
            request<AuthUser>(`/api/admin/users/${id}/team`, { method: 'POST', body: { team_id }, auth: true }),
        blockUser: (id: number, reason: string) =>
            request<AuthUser>(`/api/admin/users/${id}/block`, { method: 'POST', body: { reason }, auth: true }),
        unblockUser: (id: number) =>
            request<AuthUser>(`/api/admin/users/${id}/unblock`, { method: 'POST', auth: true }),
        teams: () => request<TeamSummary[]>(`/api/teams`),
        teamDetail: (id: number) => request<TeamDetail>(`/api/teams/${id}`),
        teamMembers: (id: number) => request<TeamMember[]>(`/api/teams/${id}/members`),
        teamSolved: (id: number) => request<TeamSolvedChallenge[]>(`/api/teams/${id}/solved`),
        users: () => request<UserListItem[]>(`/api/users`),
        user: (id: number) => request<UserDetail>(`/api/users/${id}`),
        userSolved: (id: number) => request<SolvedChallenge[]>(`/api/users/${id}/solved`),
    }
}

export const uploadPresignedPost = async (upload: { url: string; fields: Record<string, string> }, file: File) => {
    const formData = new FormData()
    Object.entries(upload.fields).forEach(([key, value]) => {
        formData.append(key, value)
    })
    formData.append('file', file)

    try {
        const response = await fetch(upload.url, { method: 'POST', body: formData })
        if (!response.ok) {
            throw new Error('File upload failed')
        }
    } catch (error) {
        throw error
    }
}
