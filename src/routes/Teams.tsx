import { useEffect, useMemo, useState } from 'react'
import type { TeamSummary } from '../lib/types'
import { formatApiError } from '../lib/utils'
import { navigate } from '../lib/router'
import { useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Teams = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const api = useApi()
    const [teams, setTeams] = useState<TeamSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    const loadTeams = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            setTeams(await api.teams())
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setLoading(false)
        }
    }

    const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery])
    const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.id - b.id), [teams])
    const filteredTeams = useMemo(
        () =>
            normalizedQuery
                ? sortedTeams.filter(
                      (team) =>
                          team.name.toLowerCase().includes(normalizedQuery) ||
                          team.id.toString().includes(normalizedQuery),
                  )
                : sortedTeams,
        [normalizedQuery, sortedTeams],
    )

    useEffect(() => {
        loadTeams()
    }, [])

    return (
        <section className='fade-in'>
            <div className='flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h2 className='text-3xl text-text'>{t('teams.title')}</h2>
                </div>
            </div>

            <div className='mt-6'>
                <input
                    type='text'
                    placeholder={t('teams.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className='w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder-text-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                />
            </div>

            {loading ? (
                <p className='mt-6 text-sm text-text-muted'>{t('common.loading')}</p>
            ) : errorMessage ? (
                <p className='mt-6 text-sm text-danger'>{errorMessage}</p>
            ) : (
                <div className='mt-6'>
                    <div className='overflow-hidden rounded-2xl border border-border bg-surface'>
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead className='border-b border-border bg-surface-muted'>
                                    <tr>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.id')}
                                        </th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.team')}
                                        </th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.members')}
                                        </th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.totalScore')}
                                        </th>
                                        <th className='px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.action')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-border'>
                                    {filteredTeams.map((team) => (
                                        <tr
                                            key={team.id}
                                            className='transition hover:bg-surface-muted cursor-pointer'
                                            onClick={() => navigate(`/teams/${team.id}`)}
                                        >
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>{team.id}</td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>
                                                {team.name}
                                            </td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>
                                                {team.member_count}
                                            </td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-accent'>
                                                {t('common.pointsShort', { points: team.total_score })}
                                            </td>
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
                                            <td colSpan={5} className='px-6 py-8 text-center text-sm text-text-muted'>
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
                            {filteredTeams.length === 1
                                ? t('teams.countSingular', { count: filteredTeams.length })
                                : t('teams.countPlural', { count: filteredTeams.length })}
                            {searchQuery ? ` ${t('common.outOf', { total: teams.length })}` : ''}
                        </p>
                    ) : null}
                </div>
            )}
        </section>
    )
}

export default Teams
