import { useEffect, useMemo, useState } from 'react'
import DivisionTabs from '../../components/DivisionTabs'
import { charLength, formatApiError, formatDateTime, NAME_MAX_LEN, trimToMaxChars, type FieldErrors } from '../../lib/utils'
import type { TeamSummary } from '../../lib/types'
import FormMessage from '../../components/FormMessage'
import { getLocaleTag, useLocale, useT } from '../../lib/i18n'
import { useApi } from '../../lib/useApi'
import { useDivision } from '../../lib/division'

const Teams = () => {
    const t = useT()
    const api = useApi()
    const { divisions, selectedDivisionId } = useDivision()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [teams, setTeams] = useState<TeamSummary[]>([])
    const [teamsLoading, setTeamsLoading] = useState(false)
    const [teamsErrorMessage, setTeamsErrorMessage] = useState('')
    const [teamName, setTeamName] = useState('')
    const [createTeamLoading, setCreateTeamLoading] = useState(false)
    const [createTeamErrorMessage, setCreateTeamErrorMessage] = useState('')
    const [createTeamSuccessMessage, setCreateTeamSuccessMessage] = useState('')
    const [createTeamFieldErrors, setCreateTeamFieldErrors] = useState<FieldErrors>({})
    const [divisionFilter, setDivisionFilter] = useState<number | null>(selectedDivisionId ?? null)
    const [createDivisionId, setCreateDivisionId] = useState<number | null>(selectedDivisionId ?? null)

    useEffect(() => {
        if (selectedDivisionId) {
            setDivisionFilter(selectedDivisionId)
            setCreateDivisionId(selectedDivisionId)
        }
    }, [selectedDivisionId])

    useEffect(() => {
        loadTeams()
    }, [divisionFilter])

    const loadTeams = async () => {
        setTeamsLoading(true)
        setTeamsErrorMessage('')

        try {
            setTeams(await api.teams(divisionFilter ?? undefined))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setTeamsErrorMessage(formatted.message)
        } finally {
            setTeamsLoading(false)
        }
    }

    const submitTeam = async () => {
        setCreateTeamLoading(true)
        setCreateTeamErrorMessage('')
        setCreateTeamSuccessMessage('')
        setCreateTeamFieldErrors({})

        try {
            if (!createDivisionId) {
                setCreateTeamErrorMessage(t('common.selectDivision'))
                return
            }
            const created = await api.createTeam({ name: teamName, division_id: createDivisionId })
            setCreateTeamSuccessMessage(t('admin.teams.successCreated', { name: created.name }))
            setTeamName('')
            await loadTeams()
        } catch (error) {
            const formatted = formatApiError(error, t)
            setCreateTeamErrorMessage(formatted.message)
            setCreateTeamFieldErrors(formatted.fieldErrors)
        } finally {
            setCreateTeamLoading(false)
        }
    }

    return (
        <section className='space-y-4'>
            <div className='flex items-center justify-between'>
                <button className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer' onClick={loadTeams} disabled={teamsLoading}>
                    {teamsLoading ? t('common.loading') : t('common.refresh')}
                </button>
            </div>
            <div className=' border border-border bg-surface p-4 md:p-8'>
                <form
                    className='space-y-4'
                    onSubmit={(event) => {
                        event.preventDefault()
                        submitTeam()
                    }}
                >
                    <div className='flex flex-col gap-3 md:flex-row md:items-end'>
                        <div className='flex-1'>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-team-name'>
                                {t('common.teamName')}
                            </label>
                            <input
                                id='admin-team-name'
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                type='text'
                                maxLength={NAME_MAX_LEN}
                                value={teamName}
                                onChange={(event) => setTeamName(trimToMaxChars(event.target.value, NAME_MAX_LEN))}
                                placeholder={t('admin.teams.placeholder')}
                            />
                            <p className='mt-1 text-xs text-text-subtle'>{t('limits.charCounter', { current: charLength(teamName), max: NAME_MAX_LEN })}</p>
                            {createTeamFieldErrors.name ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('common.name')}: {createTeamFieldErrors.name}
                                </p>
                            ) : null}
                        </div>

                        <div className='flex-1'>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-team-division'>
                                {t('common.division')}
                            </label>
                            <select
                                id='admin-team-division'
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                value={createDivisionId ?? ''}
                                onChange={(event) => setCreateDivisionId(Number(event.target.value))}
                            >
                                <option value=''>{t('common.select')}</option>
                                {divisions.map((division) => (
                                    <option key={division.id} value={division.id}>
                                        {division.name}
                                    </option>
                                ))}
                            </select>
                            {createTeamFieldErrors.division_id ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('common.division')}: {createTeamFieldErrors.division_id}
                                </p>
                            ) : null}
                        </div>

                        <button className=' bg-accent px-6 py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer md:shrink-0' type='submit' disabled={createTeamLoading}>
                            {createTeamLoading ? t('admin.teams.creating') : t('admin.teams.createTeam')}
                        </button>
                    </div>

                    {createTeamErrorMessage ? <FormMessage variant='error' message={createTeamErrorMessage} /> : null}

                    {createTeamSuccessMessage ? <FormMessage variant='success' message={createTeamSuccessMessage} /> : null}
                </form>
            </div>

            <div className=' border border-border bg-surface p-4 md:p-8'>
                <div className='flex items-center justify-between'>
                    <h3 className='text-lg text-text'>{t('common.teams')}</h3>
                </div>

                <DivisionTabs divisions={divisions} selectedId={divisionFilter} onSelect={setDivisionFilter} includeAll className='mt-4' />

                {teamsErrorMessage ? <FormMessage variant='error' message={teamsErrorMessage} className='mt-4' /> : null}

                {teamsLoading ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.teams.loadingTeams')}</p>
                ) : teams.length === 0 ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.teams.noTeams')}</p>
                ) : (
                    <div className='mt-4 overflow-x-auto'>
                        <table className='w-full text-left text-sm text-text'>
                            <thead className='text-xs uppercase tracking-wide text-text-subtle'>
                                <tr>
                                    <th className='py-2 pr-4'>{t('common.id')}</th>
                                    <th className='py-2 pr-4'>{t('common.name')}</th>
                                    <th className='py-2 pr-4'>{t('common.division')}</th>
                                    <th className='py-2'>{t('common.createdAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((team) => (
                                    <tr key={team.id} className='border-t border-border/70'>
                                        <td className='py-3 pr-4'>{team.id}</td>
                                        <td className='py-3 pr-4'>{team.name}</td>
                                        <td className='py-3 pr-4 text-text-muted'>{team.division_name}</td>
                                        <td className='py-3'>{formatDateTime(team.created_at, localeTag)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    )
}

export default Teams
