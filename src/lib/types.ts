export interface AuthUser {
    id: number
    email: string
    username: string
    role: string
    team_id: number
    team_name: string
    division_id: number
    division_name: string
    blocked_reason: string | null
    blocked_at: string | null
}

export interface Division {
    id: number
    name: string
    created_at: string
}

export interface DivisionCreatePayload {
    name: string
}

export interface RegisterPayload {
    email: string
    username: string
    password: string
    registration_key: string
}

export interface RegisterResponse {
    id: number
    email: string
    username: string
}

export interface LoginPayload {
    email: string
    password: string
}

export interface AuthResponse {
    access_token: string
    refresh_token: string
    user: AuthUser
}

export type CtfState = 'active' | 'not_started' | 'ended'

export interface AppConfig {
    title: string
    description: string
    header_title: string
    header_description: string
    ctf_start_at?: string | null
    ctf_end_at?: string | null
    updated_at: string
}

export interface AdminConfigUpdatePayload {
    title?: string
    description?: string
    header_title?: string
    header_description?: string
    ctf_start_at?: string | null
    ctf_end_at?: string | null
}

export interface ChallengeDetail {
    id: number
    title: string
    description: string
    category: string
    points: number
    initial_points: number
    minimum_points: number
    solve_count: number
    is_active: boolean
    has_file: boolean
    file_name?: string | null
    stack_enabled: boolean
    stack_target_ports: TargetPortSpec[]
    previous_challenge_id?: number | null
    is_locked?: false
}

export interface LockedChallenge {
    id: number
    title: string
    category: string
    points: number
    initial_points: number
    minimum_points: number
    solve_count: number
    is_active: boolean
    previous_challenge_id?: number | null
    previous_challenge_title?: string | null
    previous_challenge_category?: string | null
    is_locked: true
}

export type Challenge = ChallengeDetail | LockedChallenge

export interface AdminChallengeDetail extends ChallengeDetail {
    stack_pod_spec?: string | null
}

export type PortProtocol = 'TCP' | 'UDP'

export interface TargetPortSpec {
    container_port: number
    protocol: PortProtocol
}

export interface PortMapping extends TargetPortSpec {
    node_port: number
}

export interface ChallengeCreatePayload {
    title: string
    description: string
    category: string
    points: number
    minimum_points?: number
    flag: string
    is_active: boolean
    previous_challenge_id?: number | null
    stack_enabled?: boolean
    stack_target_ports?: TargetPortSpec[]
    stack_pod_spec?: string
}

export interface ChallengeCreateResponse extends ChallengeDetail {}

export interface ChallengeUpdatePayload {
    title?: string
    description?: string
    category?: string
    points?: number
    minimum_points?: number
    flag?: string
    is_active?: boolean
    previous_challenge_id?: number | null
    stack_enabled?: boolean
    stack_target_ports?: TargetPortSpec[]
    stack_pod_spec?: string
}

export interface Stack {
    stack_id: string
    challenge_id: number
    status: string
    node_public_ip?: string | null
    ports: PortMapping[]
    ttl_expires_at?: string | null
    created_at: string
    updated_at: string
}

export interface AdminStackListItem {
    stack_id: string
    ttl_expires_at?: string | null
    created_at: string
    updated_at: string
    user_id: number
    username: string
    email: string
    team_id: number
    team_name: string
    challenge_id: number
    challenge_title: string
    challenge_category: string
}

export interface PresignedPost {
    url: string
    fields: Record<string, string>
    expires_at: string
}

export interface PresignedURL {
    url: string
    expires_at: string
}

export interface ChallengeFileUploadResponse {
    challenge: ChallengeDetail
    upload: PresignedPost
}

export interface FlagSubmissionPayload {
    flag: string
}

export interface CtfStateResponse {
    ctf_state: CtfState
}

export interface ChallengesResponse extends CtfStateResponse {
    challenges: Challenge[]
}

export interface StacksResponse extends CtfStateResponse {
    stacks: Stack[]
}

export interface AdminStacksResponse {
    stacks: AdminStackListItem[]
}

export interface AdminStackDeleteResponse {
    deleted: boolean
    stack_id: string
}

export interface AdminReportResponse {
    challenges: ChallengeDetail[]
    divisions: Division[]
    teams: TeamSummary[]
    users: UserListItem[]
    stacks: Stack[]
    registration_keys: RegistrationKey[]
    submissions: SubmissionRecord[]
    app_config: AppConfig
    timeline: TimelineResponse
    team_timeline: TeamTimelineResponse
    leaderboard: LeaderboardResponse
    team_leaderboard: TeamLeaderboardResponse
}

export interface FlagSubmissionResult extends CtfStateResponse {
    correct?: boolean
}

export interface SolvedChallenge {
    challenge_id: number
    title: string
    points: number
    solved_at: string
}

export interface LeaderboardChallenge {
    id: number
    title: string
    category: string
    points: number
}

export interface LeaderboardSolve {
    challenge_id: number
    solved_at: string
    is_first_blood: boolean
}

export interface ScoreEntry {
    user_id: number
    username: string
    score: number
    solves: LeaderboardSolve[]
}

export interface TeamScoreEntry {
    team_id: number
    team_name: string
    score: number
    solves: LeaderboardSolve[]
}

export interface LeaderboardResponse {
    challenges: LeaderboardChallenge[]
    entries: ScoreEntry[]
}

export interface TeamLeaderboardResponse {
    challenges: LeaderboardChallenge[]
    entries: TeamScoreEntry[]
}

export interface TimelineSubmission {
    timestamp: string
    user_id: number
    username: string
    points: number
    challenge_count: number
}

export interface TimelineResponse {
    submissions: TimelineSubmission[]
}

export interface TeamTimelineSubmission {
    timestamp: string
    team_id: number
    team_name: string
    points: number
    challenge_count: number
}

export interface TeamTimelineResponse {
    submissions: TeamTimelineSubmission[]
}

export interface SubmissionRecord {
    [key: string]: unknown
}

export interface UserListItem {
    id: number
    username: string
    role: string
    team_id: number
    team_name: string
    division_id: number
    division_name: string
    blocked_reason: string | null
    blocked_at: string | null
}

export interface UserDetail {
    id: number
    username: string
    role: string
    team_id: number
    team_name: string
    division_id: number
    division_name: string
    blocked_reason: string | null
    blocked_at: string | null
}

export interface RegistrationKey {
    id: number
    code: string
    created_by: number
    created_by_username: string
    team_id: number
    team_name: string
    max_uses: number
    used_count: number
    created_at: string
    last_used_at?: string | null
    uses?: RegistrationKeyUse[]
}

export interface RegistrationKeyUse {
    used_by: number
    used_by_username: string
    used_by_ip?: string | null
    used_at: string
}

export interface RegistrationKeyCreatePayload {
    count: number
    team_id: number
    max_uses?: number
}

export interface Team {
    id: number
    name: string
    division_id: number
    division_name: string
    created_at: string
}

export interface TeamCreatePayload {
    name: string
    division_id: number
}

export interface TeamSummary {
    id: number
    name: string
    division_id: number
    division_name: string
    created_at: string
    member_count: number
    total_score: number
}

export interface TeamMember {
    id: number
    username: string
    role: string
    blocked_reason: string | null
    blocked_at: string | null
}

export interface TeamDetail extends TeamSummary {}

export interface TeamSolvedChallenge {
    challenge_id: number
    title: string
    points: number
    solve_count: number
    last_solved_at: string
}
