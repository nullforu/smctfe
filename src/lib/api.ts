import type {
    AuthResponse,
    AuthUser,
    AppConfig,
    AdminConfigUpdatePayload,
    CtfState,
    CtfStateResponse,
    Division,
    DivisionCreatePayload,
    DivisionUpdatePayload,
    Challenge,
    ChallengeDetail,
    ChallengesResponse,
    ChallengeCreatePayload,
    ChallengeCreateResponse,
    ChallengeUpdatePayload,
    ChallengeFileUploadResponse,
    AdminChallengeDetail,
    AdminReportResponse,
    AdminVMDeleteResponse,
    AdminVMListItem,
    AdminVMsResponse,
    FlagSubmissionResult,
    LeaderboardResponse,
    TeamLeaderboardResponse,
    PresignedURL,
    VM,
    VMsResponse,
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
    DiscordStatus,
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
const CSRF_TOKEN_HEADER = 'X-CSRF-Token'

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
    getAuth: () => { user: AuthUser | null }
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

const isAdmin = (user: AuthUser | null): boolean => user?.role.toLowerCase() === 'admin'

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

const normalizeChallenge = <T extends Record<string, any>>(challenge: T): T => ({
    ...challenge,
    vm_enabled: challenge?.vm_enabled ?? challenge?.vm_enabled ?? false,
    vm_spec: challenge?.vm_spec ?? challenge?.vm_spec ?? null,
})

const normalizeChallenges = (challenges: Challenge[] = []): Challenge[] => challenges.map((challenge) => normalizeChallenge(challenge))

const serializeChallengePayload = (payload: ChallengeCreatePayload | ChallengeUpdatePayload) => {
    const body: Record<string, unknown> = { ...payload }

    // Keep VM fields as-is for admin challenge create/update requests.
    // Removing these keys causes vm_spec/vm_enabled updates to be ignored.
    if ('vm_enabled' in body && body.vm_enabled === undefined) {
        delete body.vm_enabled
    }
    if ('vm_spec' in body && body.vm_spec === undefined) {
        delete body.vm_spec
    }

    return body
}

export const createApi = ({ getAuth, setAuthUser, clearAuth, translate }: ApiDeps) => {
    const getCookie = (name: string) => {
        const encoded = `${name}=`
        return document.cookie
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(encoded))
            ?.slice(encoded.length)
    }

    const buildHeaders = (method: string) => {
        const headers: Record<string, string> = { Accept: 'application/json' }

        const upper = method.toUpperCase()
        const needsCSRF = upper === 'POST' || upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE'
        if (needsCSRF) {
            const csrfToken = getCookie('csrf_token')
            if (csrfToken) headers[CSRF_TOKEN_HEADER] = csrfToken
        }

        return headers
    }

    const refreshToken = async () => {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: buildHeaders('POST'),
            credentials: 'include',
        })

        if (!response.ok) {
            const data = await parseJson(response)
            clearAuth()

            throw new ApiError(data?.error ?? translate('errors.invalidCredentials'), response.status, data?.details, extractRateLimit(response, data))
        }

        return 'ok'
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
        const headers = buildHeaders(method)
        if (body !== undefined) headers['Content-Type'] = 'application/json'
        if (noCache) {
            headers['Cache-Control'] = 'no-cache'
            headers.Pragma = 'no-cache'
        }

        const response = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            credentials: 'include',
            cache: noCache ? 'no-store' : 'default',
        })

        if (response.ok) {
            if (response.status === 204) return null as T
            const data = await parseJson(response)
            return data as T
        }

        if (response.status === 401 && auth && retryOnAuth) {
            try {
                await getFreshToken()
                const retryHeaders = buildHeaders(method)
                if (body !== undefined) retryHeaders['Content-Type'] = 'application/json'
                if (noCache) {
                    retryHeaders['Cache-Control'] = 'no-cache'
                    retryHeaders.Pragma = 'no-cache'
                }

                const retryResponse = await fetch(`${API_BASE}${path}`, {
                    method,
                    headers: retryHeaders,
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    credentials: 'include',
                    cache: noCache ? 'no-store' : 'default',
                })

                if (retryResponse.ok) {
                    if (retryResponse.status === 204) return null as T
                    return (await parseJson(retryResponse)) as T
                }

                const retryData = await parseJson(retryResponse)
                throw new ApiError(retryData?.error ?? translate('errors.requestFailed'), retryResponse.status, retryData?.details, extractRateLimit(retryResponse, retryData))
            } catch (error) {
                if (error instanceof ApiError) throw error
                clearAuth()
                throw new ApiError(translate('errors.invalidCredentials'), 401)
            }
        }

        const data = await parseJson(response)

        throw new ApiError(data?.error ?? translate('errors.requestFailed'), response.status, data?.details, extractRateLimit(response, data))
    }

    return {
        config: (opts?: { noCache?: boolean }) => request<AppConfig>(`/api/config`, { noCache: opts?.noCache }),
        updateAdminConfig: (payload: AdminConfigUpdatePayload) => request<AppConfig>(`/api/admin/config`, { method: 'PUT', body: payload, auth: true }),
        register: (payload: RegisterPayload) => request<RegisterResponse>(`/api/auth/register`, { method: 'POST', body: payload }),
        login: async (payload: LoginPayload) => {
            const data = await request<AuthResponse>(`/api/auth/login`, { method: 'POST', body: payload })
            setAuthUser(data.user)
            return data
        },
        logout: async () => {
            await request(`/api/auth/logout`, { method: 'POST' })
            clearAuth()
        },
        me: () => request<AuthUser>(`/api/me`, { auth: true }),
        updateMe: (username: string) => request<AuthUser>(`/api/me`, { method: 'PUT', body: { username }, auth: true }),
        createDivision: (payload: DivisionCreatePayload) => request<Division>(`/api/admin/divisions`, { method: 'POST', body: payload, auth: true }),
        updateDivision: (id: number, payload: DivisionUpdatePayload) => request<Division>(`/api/admin/divisions/${id}`, { method: 'PUT', body: payload, auth: true }),
        divisions: async () => {
            const data = await request<Division[]>(`/api/divisions`)
            if (isAdmin(getAuth().user)) return data
            return data.filter((division) => division.name.toLowerCase() !== 'admin')
        },
        challenges: async (divisionId: number) => {
            const data = await request<{ ctf_state?: CtfState; challenges?: Challenge[] }>(`/api/challenges?division_id=${divisionId}`, { auth: true })
            return {
                ctf_state: resolveCtfState(data),
                challenges: Array.isArray(data?.challenges) ? normalizeChallenges(data.challenges) : [],
            } as ChallengesResponse
        },
        challenge: async (id: number) => {
            const data = await request<Challenge>(`/api/challenges/${id}`, { auth: true })
            return normalizeChallenge(data) as Challenge
        },
        submitFlag: (id: number, flag: string) =>
            request<FlagSubmissionResult>(`/api/challenges/${id}/submit`, {
                method: 'POST',
                body: { flag },
                auth: true,
            }),
        leaderboard: (divisionId: number) => request<LeaderboardResponse>(`/api/leaderboard?division_id=${divisionId}`),
        leaderboardTeams: async (divisionId: number) => {
            const data = await request<TeamLeaderboardResponse>(`/api/leaderboard/teams?division_id=${divisionId}`)
            return {
                challenges: data.challenges,
                entries: data.entries.filter((entry) => entry.team_name.toLowerCase() !== 'admin'),
            } as TeamLeaderboardResponse
        },
        timeline: (divisionId: number) => request<TimelineResponse>(`/api/timeline?division_id=${divisionId}`, { auth: true }),
        timelineTeams: (divisionId: number) => request<TeamTimelineResponse>(`/api/timeline/teams?division_id=${divisionId}`),
        createChallenge: async (payload: ChallengeCreatePayload) => {
            const data = await request<ChallengeCreateResponse>(`/api/admin/challenges`, { method: 'POST', body: serializeChallengePayload(payload), auth: true })
            return normalizeChallenge(data) as ChallengeCreateResponse
        },
        adminChallenge: async (id: number) => {
            const data = await request<AdminChallengeDetail>(`/api/admin/challenges/${id}`, { auth: true })
            return normalizeChallenge(data) as AdminChallengeDetail
        },
        updateChallenge: async (id: number, payload: ChallengeUpdatePayload) => {
            const data = await request<ChallengeDetail>(`/api/admin/challenges/${id}`, { method: 'PUT', body: serializeChallengePayload(payload), auth: true })
            return normalizeChallenge(data) as ChallengeDetail
        },
        deleteChallenge: (id: number) => request<void>(`/api/admin/challenges/${id}`, { method: 'DELETE', auth: true }),
        requestChallengeFileUpload: (id: number, filename: string) =>
            request<ChallengeFileUploadResponse>(`/api/admin/challenges/${id}/file/upload`, {
                method: 'POST',
                body: { filename },
                auth: true,
            }),
        deleteChallengeFile: async (id: number) => {
            const data = await request<ChallengeDetail>(`/api/admin/challenges/${id}/file`, { method: 'DELETE', auth: true })
            return normalizeChallenge(data) as ChallengeDetail
        },
        requestChallengeFileDownload: (id: number) =>
            request<PresignedURL | CtfStateResponse>(`/api/challenges/${id}/file/download`, {
                method: 'POST',
                auth: true,
            }),
        adminVMs: async () => {
            const data = await request<{ vms?: AdminVMListItem[] }>(`/api/admin/vms`, { auth: true })
            return { vms: Array.isArray(data?.vms) ? data.vms : [] } as AdminVMsResponse
        },
        adminVM: (vmId: string) => request<VM>(`/api/admin/vms/${vmId}`, { auth: true }),
        deleteAdminVM: (vmId: string) => request<AdminVMDeleteResponse>(`/api/admin/vms/${vmId}`, { method: 'DELETE', auth: true }),
        createVM: (challengeID: number) => request<VM>(`/api/challenges/${challengeID}/vm`, { method: 'POST', auth: true }),
        getVM: (challengeID: number) => request<VM>(`/api/challenges/${challengeID}/vm`, { auth: true }),
        deleteVM: (challengeID: number) =>
            request<{ status?: string }>(`/api/challenges/${challengeID}/vm`, {
                method: 'DELETE',
                auth: true,
            }),
        discordConnectUrl: () => `${API_BASE}/api/discord/connect`,
        discordStatus: () => request<DiscordStatus>(`/api/discord/status`, { auth: true, noCache: true }),
        discordSyncRole: () => request<DiscordStatus>(`/api/discord/sync-role`, { method: 'POST', auth: true }),
        discordUnlink: () => request<{ status?: string }>(`/api/discord/unlink`, { method: 'DELETE', auth: true }),
        vms: async () => {
            const data = await request<{ ctf_state?: CtfState; vms?: VM[] }>(`/api/vms`, { auth: true })
            return {
                ctf_state: resolveCtfState(data),
                vms: Array.isArray(data?.vms) ? data.vms : [],
            } as VMsResponse
        },
        adminReport: () => request<AdminReportResponse>(`/api/admin/report`, { auth: true, noCache: true }),
        registrationKeys: () => request<RegistrationKey[]>(`/api/admin/registration-keys`, { auth: true }),
        createRegistrationKeys: (payload: RegistrationKeyCreatePayload) => request<RegistrationKey[]>(`/api/admin/registration-keys`, { method: 'POST', body: payload, auth: true }),
        createTeam: (payload: TeamCreatePayload) => request<Team>(`/api/admin/teams`, { method: 'POST', body: payload, auth: true }),
        moveUserTeam: (id: number, team_id: number) => request<AuthUser>(`/api/admin/users/${id}/team`, { method: 'POST', body: { team_id }, auth: true }),
        blockUser: (id: number, reason: string) => request<AuthUser>(`/api/admin/users/${id}/block`, { method: 'POST', body: { reason }, auth: true }),
        unblockUser: (id: number) => request<AuthUser>(`/api/admin/users/${id}/unblock`, { method: 'POST', auth: true }),
        teams: async (divisionId?: number) => {
            const query = divisionId ? `?division_id=${divisionId}` : ''
            const data = await request<TeamSummary[]>(`/api/teams${query}`)
            if (isAdmin(getAuth().user)) return data

            return data.filter((team) => team.name.toLowerCase() !== 'admin')
        },
        teamDetail: (id: number) => request<TeamDetail>(`/api/teams/${id}`),
        teamMembers: async (id: number) => {
            const data = await request<TeamMember[]>(`/api/teams/${id}/members`)
            if (isAdmin(getAuth().user)) return data

            return data.filter((member) => member.role.toLowerCase() !== 'admin')
        },
        teamSolved: (id: number) => request<TeamSolvedChallenge[]>(`/api/teams/${id}/solved`),
        users: async (divisionId?: number) => {
            const query = divisionId ? `?division_id=${divisionId}` : ''
            const data = await request<UserListItem[]>(`/api/users${query}`)
            if (isAdmin(getAuth().user)) return data

            return data.filter((user) => user.role.toLowerCase() !== 'admin')
        },
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
