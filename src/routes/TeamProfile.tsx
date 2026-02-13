import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TeamDetail, TeamMember, TeamSolvedChallenge } from '../lib/types'
import { formatApiError, formatDateTime, parseRouteId } from '../lib/utils'
import { navigate } from '../lib/router'
import { getRoleKey, getLocaleTag, useLocale, useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'

interface RouteProps {
    routeParams?: Record<string, string>
}

const TeamProfile = ({ routeParams = {} }: RouteProps) => {
    const t = useT()
    const api = useApi()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [team, setTeam] = useState<TeamDetail | null>(null)
    const [members, setMembers] = useState<TeamMember[]>([])
    const [solved, setSolved] = useState<TeamSolvedChallenge[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const lastLoadedTeamIdRef = useRef<number | null>(null)

    const routeTeamId = useMemo(() => parseRouteId(routeParams.id), [routeParams.id])

    const loadTeam = useCallback(
        async (teamId: number) => {
            setLoading(true)
            setErrorMessage('')
            setTeam(null)
            setMembers([])
            setSolved([])

            try {
                const [teamDetail, memberRows, solvedRows] = await Promise.all([
                    api.teamDetail(teamId),
                    api.teamMembers(teamId),
                    api.teamSolved(teamId),
                ])
                setTeam(teamDetail)
                setMembers(memberRows)
                setSolved(solvedRows)
            } catch (error) {
                setErrorMessage(formatApiError(error, t).message)
            } finally {
                setLoading(false)
            }
        },
        [api, t],
    )

    useEffect(() => {
        if (routeTeamId === null) return
        if (lastLoadedTeamIdRef.current === routeTeamId) return

        lastLoadedTeamIdRef.current = routeTeamId
        loadTeam(routeTeamId)
    }, [loadTeam, routeTeamId])

    return (
        <section className='fade-in'>
            <div className='mb-6'>
                <button
                    className='inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent cursor-pointer'
                    onClick={() => navigate('/teams')}
                >
                    <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    >
                        <path d='m15 18-6-6 6-6' />
                    </svg>
                    {t('team.backToTeams')}
                </button>
            </div>

            {loading ? (
                <div className='rounded-2xl border border-border bg-surface p-8'>
                    <p className='text-center text-sm text-text-muted'>{t('common.loading')}</p>
                </div>
            ) : errorMessage ? (
                <div className='rounded-2xl border border-danger/30 bg-danger/10 p-8'>
                    <p className='text-center text-sm text-danger'>{errorMessage}</p>
                </div>
            ) : team ? (
                <div>
                    <div className='flex flex-wrap items-end justify-between gap-4'>
                        <div>
                            <h2 className='text-3xl text-text'>{team.name}</h2>
                            <p className='mt-1 text-sm text-text-muted'>{t('team.teamId', { id: team.id })}</p>
                        </div>
                        <div className='flex flex-wrap gap-2 text-xs'>
                            <span className='rounded-full border border-border bg-surface-muted px-3 py-1 text-text'>
                                {t('team.membersLabel', { count: team.member_count })}
                            </span>
                            <span className='rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent-strong'>
                                {t('team.totalScoreLabel', { points: team.total_score })}
                            </span>
                        </div>
                    </div>

                    <div className='mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]'>
                        <div className='rounded-2xl border border-border bg-surface p-6'>
                            <div className='flex items-center justify-between'>
                                <h3 className='text-lg text-text'>{t('team.members')}</h3>
                                <span className='text-xs text-text-subtle'>
                                    {t('common.totalCount', { count: members.length })}
                                </span>
                            </div>

                            {members.length === 0 ? (
                                <p className='mt-4 text-sm text-text-subtle'>{t('team.noMembers')}</p>
                            ) : (
                                <div className='mt-4 overflow-x-auto'>
                                    <table className='w-full pl-4 text-left text-sm text-text'>
                                        <thead className='text-xs uppercase tracking-wide text-text-subtle'>
                                            <tr>
                                                <th className='py-2 px-4'>{t('common.id')}</th>
                                                <th className='py-2 pr-4'>{t('common.username')}</th>
                                                <th className='py-2'>{t('common.role')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {members.map((member) => (
                                                <tr
                                                    key={member.id}
                                                    className='border-t border-border/70 cursor-pointer hover:bg-surface-muted'
                                                    onClick={() => navigate(`/users/${member.id}`)}
                                                >
                                                    <td className='py-3 px-4'>{member.id}</td>
                                                    <td className='py-3 pr-4'>{member.username}</td>
                                                    <td className='py-3'>{t(getRoleKey(member.role))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className='rounded-2xl border border-border bg-surface p-6'>
                            <div className='flex items-center justify-between'>
                                <h3 className='text-lg text-text'>{t('team.solvedChallenges')}</h3>
                                <span className='text-xs text-text-subtle'>
                                    {t('common.totalCount', { count: solved.length })}
                                </span>
                            </div>

                            {solved.length === 0 ? (
                                <p className='mt-4 text-sm text-text-subtle'>{t('team.noSolved')}</p>
                            ) : (
                                <div className='mt-4 space-y-3'>
                                    {solved.map((entry) => (
                                        <div
                                            key={entry.challenge_id}
                                            className='rounded-xl border border-border bg-surface-muted p-4'
                                        >
                                            <div className='flex items-center justify-between gap-3'>
                                                <div>
                                                    <p className='text-sm text-text'>{entry.title}</p>
                                                    <p className='mt-1 text-xs text-text-subtle'>
                                                        {t('team.lastSolved', {
                                                            time: formatDateTime(entry.last_solved_at, localeTag),
                                                        })}
                                                    </p>
                                                </div>
                                                <div className='text-right'>
                                                    <p className='text-sm text-accent'>
                                                        {t('common.pointsShort', { points: entry.points })}
                                                    </p>
                                                    <p className='mt-1 text-xs text-text-subtle'>
                                                        {t('team.solves', { count: entry.solve_count })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    )
}

export default TeamProfile
