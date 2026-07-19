import { useEffect, useMemo, useState } from 'react'
import DivisionTabs from '../components/DivisionTabs'
import LoginRequired from '../components/LoginRequired'
import type { TeamSummary } from '../lib/types'
import { formatApiError } from '../lib/utils'
import { navigate } from '../lib/router'
import { useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'
import { useDivision } from '../lib/division'
import { useAuth } from '../lib/auth'
import Skeleton from '../components/Skeleton'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Teams = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const api = useApi()
    const { state: auth } = useAuth()
    const { divisions, selectedDivisionId } = useDivision()
    const [teams, setTeams] = useState<TeamSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [divisionFilter, setDivisionFilter] = useState<number | null>(selectedDivisionId ?? null)

    const loadTeams = async () => {
        if (!auth.user) return
        setLoading(true)
        setErrorMessage('')

        try {
            setTeams(await api.teams(divisionFilter ?? undefined))
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setLoading(false)
        }
    }

    const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery])
    const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.id - b.id), [teams])
    const filteredTeams = useMemo(() => (normalizedQuery ? sortedTeams.filter((team) => team.name.toLowerCase().includes(normalizedQuery) || team.id.toString().includes(normalizedQuery)) : sortedTeams), [normalizedQuery, sortedTeams])

    useEffect(() => {
        if (selectedDivisionId) {
            setDivisionFilter(selectedDivisionId)
        }
    }, [selectedDivisionId])

    useEffect(() => {
        if (!auth.user) return
        loadTeams()
    }, [auth.user, divisionFilter])

    if (!auth.user) {
        return <LoginRequired title={t('teams.title')} />
    }

    const tableSkeleton = (
        <div>
            <div className='overflow-hidden border-2 border-border bg-surface shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                <div className='overflow-x-auto'>
                    <div className='min-w-205'>
                        <div className='grid grid-cols-[90px_1.3fr_1fr_120px_120px_120px] gap-0 border-b border-border bg-surface-muted px-6 py-3'>
                            {Array.from({ length: 6 }, (_, idx) => (
                                <Skeleton key={`teams-head-skeleton-${idx}`} className='h-3 w-16' />
                            ))}
                        </div>
                        <div className='divide-y divide-border'>
                            {Array.from({ length: 10 }, (_, idx) => (
                                <div key={`teams-row-skeleton-${idx}`} className='grid grid-cols-[90px_1.3fr_1fr_120px_120px_120px] items-center gap-4 px-6 py-4'>
                                    <Skeleton className='h-4 w-10' />
                                    <Skeleton className='h-4 w-36' />
                                    <Skeleton className='h-4 w-24' />
                                    <Skeleton className='h-4 w-10' />
                                    <Skeleton className='h-4 w-14' />
                                    <Skeleton className='ml-auto h-4 w-12' />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <section className='animate space-y-6'>
            <div className='border-2 border-border bg-linear-to-br from-surface via-surface to-surface-muted px-5 py-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:px-7'>
                <div className='flex flex-wrap items-end justify-between gap-4'>
                    <div>
                        <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>{t('common.teams')}</p>
                        <h2 className='mt-2 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text'>{t('teams.title')}</h2>
                    </div>
                    <div className='border-2 border-border bg-surface px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted shadow-[4px_4px_0_rgba(120,98,68,0.1)]'>
                        {filteredTeams.length === 1 ? t('teams.countSingular', { count: filteredTeams.length }) : t('teams.countPlural', { count: filteredTeams.length })}
                    </div>
                </div>
            </div>

            <div className='space-y-4'>
                <DivisionTabs divisions={divisions} selectedId={divisionFilter} onSelect={setDivisionFilter} includeAll />
                <input
                    type='text'
                    placeholder={t('teams.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className='w-full border-2 border-border bg-surface px-4 py-2.5 font-mono text-sm text-text placeholder-text-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                />
            </div>

            {loading ? (
                tableSkeleton
            ) : errorMessage ? (
                <p className='text-sm text-danger'>{errorMessage}</p>
            ) : (
                <div>
                    <div className='overflow-hidden border-2 border-border bg-surface shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead className='border-b border-border bg-surface-muted'>
                                    <tr>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>{t('common.id')}</th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>{t('common.team')}</th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>{t('common.division')}</th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>{t('common.members')}</th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>{t('common.totalScore')}</th>
                                        <th className='px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted'>{t('common.action')}</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-border'>
                                    {filteredTeams.map((team) => (
                                        <tr key={team.id} className='transition hover:bg-surface-muted cursor-pointer' onClick={() => navigate(`/teams/${team.id}`)}>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>{team.id}</td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>{team.name}</td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text-muted'>{team.division_name}</td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>{team.member_count}</td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-accent'>{t('common.pointsShort', { points: team.total_score })}</td>
                                            <td className='whitespace-nowrap px-6 py-4 text-right text-sm'>
                                                <button
                                                    className='text-accent hover:text-accent-strong cursor-pointer'
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        navigate(`/teams/${team.id}`)
                                                    }}
                                                    type='button'
                                                >
                                                    {t('common.view')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTeams.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className='px-6 py-8 text-center text-sm text-text-muted'>
                                                {searchQuery ? t('teams.noResults') : t('teams.noTeams')}
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {filteredTeams.length > 0 ? (
                        <p className='mt-4 text-sm text-text-muted'>
                            {filteredTeams.length === 1 ? t('teams.countSingular', { count: filteredTeams.length }) : t('teams.countPlural', { count: filteredTeams.length })}
                            {searchQuery ? ` ${t('common.outOf', { total: teams.length })}` : ''}
                        </p>
                    ) : null}
                </div>
            )}
        </section>
    )
}

export default Teams
