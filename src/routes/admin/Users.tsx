import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthUser, TeamSummary, UserListItem } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { formatApiError, formatDateTime } from '../../lib/utils'
import { getLocaleTag, getRoleKey, useLocale, useT } from '../../lib/i18n'
import FormMessage from '../../components/FormMessage'

const AdminUsers = () => {
    const t = useT()
    const api = useApi()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [users, setUsers] = useState<UserListItem[]>([])
    const [teams, setTeams] = useState<TeamSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [teamSelections, setTeamSelections] = useState<Record<number, string>>({})
    const [blockReasons, setBlockReasons] = useState<Record<number, string>>({})
    const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
    const [movingUserId, setMovingUserId] = useState<number | null>(null)
    const [blockingUserId, setBlockingUserId] = useState<number | null>(null)
    const [unblockingUserId, setUnblockingUserId] = useState<number | null>(null)

    const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery])
    const filteredUsers = useMemo(() => {
        const sorted = [...users].sort((a, b) => a.id - b.id)
        if (!normalizedQuery) return sorted
        return sorted.filter(
            (user) =>
                user.username.toLowerCase().includes(normalizedQuery) ||
                user.id.toString().includes(normalizedQuery) ||
                user.team_name.toLowerCase().includes(normalizedQuery),
        )
    }, [normalizedQuery, users])

    const formatOptionalDate = useCallback(
        (value?: string | null) => (value ? formatDateTime(value, localeTag) : t('common.na')),
        [localeTag, t],
    )

    const syncSelections = useCallback((userRows: UserListItem[], teamRows: TeamSummary[]) => {
        setTeamSelections((prev) => {
            const next: Record<number, string> = {}
            userRows.forEach((user) => {
                const fallback = user.team_id ?? teamRows[0]?.id
                next[user.id] = prev[user.id] ?? (fallback ? String(fallback) : '')
            })
            return next
        })
    }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        setErrorMessage('')
        setSuccessMessage('')
        setRowErrors({})

        try {
            const [userRows, teamRows] = await Promise.all([api.users(), api.teams()])
            setUsers(userRows)
            setTeams(teamRows)
            syncSelections(userRows, teamRows)
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setLoading(false)
        }
    }, [api, syncSelections, t])

    const updateUserRow = useCallback((updated: AuthUser) => {
        setUsers((prev) => prev.map((user) => (user.id === updated.id ? { ...user, ...updated } : user)))
        setTeamSelections((prev) => ({ ...prev, [updated.id]: String(updated.team_id) }))
    }, [])

    const handleMoveTeam = useCallback(
        async (user: UserListItem) => {
            if (movingUserId !== null) return
            const rawTeamId = teamSelections[user.id]
            const nextTeamId = Number(rawTeamId)

            if (!rawTeamId || !Number.isFinite(nextTeamId)) {
                setRowErrors((prev) => ({ ...prev, [user.id]: t('errors.required') }))
                return
            }

            if (nextTeamId === user.team_id) {
                setRowErrors((prev) => ({ ...prev, [user.id]: t('admin.users.sameTeamError') }))
                return
            }

            setMovingUserId(user.id)
            setRowErrors((prev) => ({ ...prev, [user.id]: '' }))
            setErrorMessage('')
            setSuccessMessage('')

            try {
                const updated = await api.moveUserTeam(user.id, nextTeamId)
                updateUserRow(updated)
                setSuccessMessage(
                    t('admin.users.movedSuccess', { username: updated.username, team: updated.team_name }),
                )
            } catch (error) {
                setRowErrors((prev) => ({ ...prev, [user.id]: formatApiError(error, t).message }))
            } finally {
                setMovingUserId(null)
            }
        },
        [api, movingUserId, t, teamSelections, updateUserRow],
    )

    const handleBlockUser = useCallback(
        async (user: UserListItem) => {
            if (blockingUserId !== null) return
            if (user.role === 'admin') return

            const reason = blockReasons[user.id]?.trim()
            if (!reason) {
                setRowErrors((prev) => ({ ...prev, [user.id]: t('errors.required') }))
                return
            }

            setBlockingUserId(user.id)
            setRowErrors((prev) => ({ ...prev, [user.id]: '' }))
            setErrorMessage('')
            setSuccessMessage('')

            try {
                const updated = await api.blockUser(user.id, reason)
                updateUserRow(updated)
                setBlockReasons((prev) => ({ ...prev, [user.id]: '' }))
                setSuccessMessage(t('admin.users.blockedSuccess', { username: updated.username }))
            } catch (error) {
                setRowErrors((prev) => ({ ...prev, [user.id]: formatApiError(error, t).message }))
            } finally {
                setBlockingUserId(null)
            }
        },
        [api, blockingUserId, blockReasons, t, updateUserRow],
    )

    const handleUnblockUser = useCallback(
        async (user: UserListItem) => {
            if (unblockingUserId !== null) return
            if (user.role === 'admin') return

            setUnblockingUserId(user.id)
            setRowErrors((prev) => ({ ...prev, [user.id]: '' }))
            setErrorMessage('')
            setSuccessMessage('')

            try {
                const updated = await api.unblockUser(user.id)
                updateUserRow(updated)
                setSuccessMessage(t('admin.users.unblockedSuccess', { username: updated.username }))
            } catch (error) {
                setRowErrors((prev) => ({ ...prev, [user.id]: formatApiError(error, t).message }))
            } finally {
                setUnblockingUserId(null)
            }
        },
        [api, t, unblockingUserId, updateUserRow],
    )

    useEffect(() => {
        loadData()
    }, [loadData])

    return (
        <section className='space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                    <h3 className='text-lg text-text'>{t('admin.users.title')}</h3>
                    <p className='mt-1 text-xs text-text-subtle'>{t('admin.users.subtitle')}</p>
                </div>
                <button
                    className='rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60'
                    onClick={loadData}
                    disabled={loading}
                    type='button'
                >
                    {loading ? t('common.loading') : t('common.refresh')}
                </button>
            </div>

            <div>
                <input
                    type='text'
                    placeholder={t('admin.users.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className='w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder-text-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                />
            </div>

            {errorMessage ? <FormMessage variant='error' message={errorMessage} /> : null}
            {successMessage ? <FormMessage variant='success' message={successMessage} /> : null}

            {loading ? (
                <p className='text-sm text-text-muted'>{t('admin.users.loading')}</p>
            ) : (
                <div className='overflow-hidden rounded-2xl border border-border bg-surface'>
                    <div className='overflow-x-auto'>
                        <table className='w-full'>
                            <thead className='border-b border-border bg-surface-muted'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.id')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.user')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.team')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.role')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('admin.users.blockedLabel')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.action')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border'>
                                {filteredUsers.map((user) => {
                                    const isBlocked = user.role === 'blocked'
                                    const rowError = rowErrors[user.id]
                                    const pendingMove = movingUserId === user.id
                                    const pendingBlock = blockingUserId === user.id
                                    const pendingUnblock = unblockingUserId === user.id

                                    return (
                                        <tr key={user.id} className='align-top'>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>{user.id}</td>
                                            <td className='px-6 py-4 text-sm text-text'>
                                                <div className='font-medium'>{user.username}</div>
                                                <div className='text-xs text-text-subtle'>{user.team_name}</div>
                                            </td>
                                            <td className='px-6 py-4 text-sm text-text'>
                                                <div className='text-xs text-text-subtle'>
                                                    {t('admin.users.currentTeam')}
                                                </div>
                                                <div className='mt-1 text-sm'>{user.team_name}</div>
                                                <div className='mt-3 flex flex-wrap items-center gap-2'>
                                                    <select
                                                        className='min-w-40 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text focus:border-accent focus:outline-none'
                                                        value={teamSelections[user.id] ?? ''}
                                                        onChange={(event) =>
                                                            setTeamSelections((prev) => ({
                                                                ...prev,
                                                                [user.id]: event.target.value,
                                                            }))
                                                        }
                                                        disabled={teams.length === 0}
                                                    >
                                                        {teams.length === 0 ? (
                                                            <option value=''>{t('admin.users.noTeams')}</option>
                                                        ) : (
                                                            teams.map((team) => (
                                                                <option key={team.id} value={team.id}>
                                                                    {team.name}
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>
                                                    <button
                                                        className='rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60'
                                                        onClick={() => handleMoveTeam(user)}
                                                        disabled={pendingMove || teams.length === 0}
                                                        type='button'
                                                    >
                                                        {pendingMove
                                                            ? t('admin.users.moving')
                                                            : t('admin.users.moveTeam')}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className='px-6 py-4 text-sm'>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${
                                                        user.role === 'admin'
                                                            ? 'bg-secondary/20 text-secondary'
                                                            : user.role === 'blocked'
                                                              ? 'bg-danger/20 text-danger'
                                                              : 'bg-accent/20 text-accent-strong'
                                                    }`}
                                                >
                                                    {t(getRoleKey(user.role))}
                                                </span>
                                            </td>
                                            <td className='px-6 py-4 text-sm text-text'>
                                                {isBlocked ? (
                                                    <div className='space-y-1'>
                                                        <p className='text-sm font-medium text-danger'>
                                                            {t('admin.users.blockedStatus')}
                                                        </p>
                                                        <p className='text-xs text-text-subtle'>
                                                            {t('admin.users.blockedReasonLabel')}:{' '}
                                                            {user.blocked_reason ?? t('common.na')}
                                                        </p>
                                                        <p className='text-xs text-text-subtle'>
                                                            {t('admin.users.blockedAtLabel')}:{' '}
                                                            {formatOptionalDate(user.blocked_at)}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className='text-xs text-text-subtle'>
                                                        {t('admin.users.activeStatus')}
                                                    </p>
                                                )}
                                            </td>
                                            <td className='px-6 py-4 text-sm text-text'>
                                                {user.role === 'admin' ? (
                                                    <p className='text-xs text-text-subtle'>
                                                        {t('admin.users.adminLocked')}
                                                    </p>
                                                ) : isBlocked ? (
                                                    <button
                                                        className='rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60'
                                                        onClick={() => handleUnblockUser(user)}
                                                        disabled={pendingUnblock}
                                                        type='button'
                                                    >
                                                        {pendingUnblock
                                                            ? t('admin.users.unblocking')
                                                            : t('admin.users.unblockUser')}
                                                    </button>
                                                ) : (
                                                    <div className='space-y-2'>
                                                        <input
                                                            type='text'
                                                            placeholder={t('admin.users.reasonPlaceholder')}
                                                            value={blockReasons[user.id] ?? ''}
                                                            onChange={(event) =>
                                                                setBlockReasons((prev) => ({
                                                                    ...prev,
                                                                    [user.id]: event.target.value,
                                                                }))
                                                            }
                                                            className='w-full min-w-50 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder-text-subtle focus:border-accent focus:outline-none'
                                                        />
                                                        <button
                                                            className='rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60'
                                                            onClick={() => handleBlockUser(user)}
                                                            disabled={pendingBlock}
                                                            type='button'
                                                        >
                                                            {pendingBlock
                                                                ? t('admin.users.blocking')
                                                                : t('admin.users.blockUser')}
                                                        </button>
                                                    </div>
                                                )}
                                                {rowError ? (
                                                    <p className='mt-2 text-xs text-danger'>{rowError}</p>
                                                ) : null}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className='px-6 py-8 text-center text-sm text-text-muted'>
                                            {t('admin.users.noUsers')}
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    )
}

export default AdminUsers
