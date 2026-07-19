import { useEffect, useMemo, useRef, useState } from 'react'
import DivisionTabs from '../../components/DivisionTabs'
import { downloadJsonFile, formatApiError, formatDateTime, type FieldErrors } from '../../lib/utils'
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
    const [autoCreateKeys, setAutoCreateKeys] = useState(true)
    const [autoKeyCount, setAutoKeyCount] = useState(1)
    const [autoKeyMaxUses, setAutoKeyMaxUses] = useState(2)
    const [selectedTeamIDs, setSelectedTeamIDs] = useState<number[]>([])
    const [bulkLoading, setBulkLoading] = useState(false)
    const importInputRef = useRef<HTMLInputElement | null>(null)
    const allSelected = teams.length > 0 && selectedTeamIDs.length === teams.length

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
            const loadedTeams = await api.teams(divisionFilter ?? undefined)
            setTeams(loadedTeams)
            setSelectedTeamIDs((prev) => prev.filter((id) => loadedTeams.some((team) => team.id === id)))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setTeamsErrorMessage(formatted.message)
        } finally {
            setTeamsLoading(false)
        }
    }

    const toggleTeamSelection = (teamID: number) => {
        setSelectedTeamIDs((prev) => (prev.includes(teamID) ? prev.filter((id) => id !== teamID) : [...prev, teamID]))
    }

    const toggleAllTeams = () => {
        setSelectedTeamIDs((prev) => (prev.length === teams.length ? [] : teams.map((team) => team.id)))
    }

    const exportTeams = async (ids?: number[]) => {
        setBulkLoading(true)
        setTeamsErrorMessage('')
        setCreateTeamSuccessMessage('')
        try {
            const bundle = await api.exportTeams(ids && ids.length > 0 ? ids : undefined)
            const suffix = ids && ids.length > 0 ? `selected-${ids.length}` : 'all'
            const timestamp = new Date().toISOString().replaceAll(':', '-')
            downloadJsonFile(`smctf-teams-${suffix}-${timestamp}.json`, bundle)
            setCreateTeamSuccessMessage(ids && ids.length > 0 ? t('admin.teams.exportSelectedSuccess', { count: ids.length }) : t('admin.teams.exportAllSuccess', { count: bundle.teams.length }))
        } catch (error) {
            setTeamsErrorMessage(formatApiError(error, t).message)
        } finally {
            setBulkLoading(false)
        }
    }

    const importTeams = async (file: File) => {
        setBulkLoading(true)
        setTeamsErrorMessage('')
        setCreateTeamSuccessMessage('')
        try {
            const payload = JSON.parse(await file.text())
            const response = await api.importTeams(payload)
            await loadTeams()
            setSelectedTeamIDs([])
            setCreateTeamSuccessMessage(t('admin.teams.importSuccess', { count: response.imported.length }))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setTeamsErrorMessage(error instanceof SyntaxError ? t('admin.teams.invalidImportFile') : formatted.message)
        } finally {
            if (importInputRef.current) {
                importInputRef.current.value = ''
            }
            setBulkLoading(false)
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
            if (autoCreateKeys) {
                try {
                    await api.createRegistrationKeys({
                        count: Number(autoKeyCount),
                        team_id: created.id,
                        max_uses: Number(autoKeyMaxUses),
                    })
                    setCreateTeamSuccessMessage(t('admin.teams.successCreatedWithKeys', { name: created.name, count: autoKeyCount, maxUses: autoKeyMaxUses }))
                } catch (keyError) {
                    const formattedKeys = formatApiError(keyError, t)
                    setCreateTeamErrorMessage(t('admin.teams.keysFailedAfterCreate', { name: created.name, message: formattedKeys.message }))
                }
            } else {
                setCreateTeamSuccessMessage(t('admin.teams.successCreated', { name: created.name }))
            }
            setTeamName('')
            setAutoCreateKeys(true)
            setAutoKeyCount(1)
            setAutoKeyMaxUses(2)
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
            <div className='flex flex-col gap-3 border border-border bg-surface p-4'>
                <div className='flex flex-wrap items-center gap-3'>
                    <button className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer disabled:opacity-60' onClick={loadTeams} disabled={teamsLoading || bulkLoading}>
                        {teamsLoading ? t('common.loading') : t('common.refresh')}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => exportTeams()}
                        disabled={teamsLoading || bulkLoading || teams.length === 0}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.teams.exportAll')}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => exportTeams(selectedTeamIDs)}
                        disabled={teamsLoading || bulkLoading || selectedTeamIDs.length === 0}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.teams.exportSelected', { count: selectedTeamIDs.length })}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => importInputRef.current?.click()}
                        disabled={teamsLoading || bulkLoading}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.teams.import')}
                    </button>
                    <input
                        ref={importInputRef}
                        className='hidden'
                        type='file'
                        accept='application/json,.json'
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (!file) return
                            void importTeams(file)
                        }}
                    />
                </div>
                <p className='text-xs text-text-subtle'>{selectedTeamIDs.length > 0 ? t('admin.teams.selectedCount', { count: selectedTeamIDs.length }) : t('admin.teams.importHint')}</p>
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
                                value={teamName}
                                onChange={(event) => setTeamName(event.target.value)}
                                placeholder={t('admin.teams.placeholder')}
                            />
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

                    <div className='space-y-3 border border-border/70 bg-surface-muted/40 p-4'>
                        <label className='flex items-center gap-3 text-sm text-text'>
                            <input type='checkbox' checked={autoCreateKeys} onChange={(event) => setAutoCreateKeys(event.target.checked)} className='h-4 w-4 border-border' />
                            {t('admin.teams.autoKeys')}
                        </label>
                        {autoCreateKeys ? (
                            <div className='grid gap-4 md:grid-cols-2'>
                                <div>
                                    <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-team-key-count'>
                                        {t('admin.keys.createKeys')}
                                    </label>
                                    <input
                                        id='admin-team-key-count'
                                        className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                        type='number'
                                        min={1}
                                        value={autoKeyCount}
                                        onChange={(event) => setAutoKeyCount(Math.max(1, Number(event.target.value) || 1))}
                                    />
                                </div>
                                <div>
                                    <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-team-key-max-uses'>
                                        {t('admin.teams.autoKeyMaxUses')}
                                    </label>
                                    <input
                                        id='admin-team-key-max-uses'
                                        className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                        type='number'
                                        min={1}
                                        value={autoKeyMaxUses}
                                        onChange={(event) => setAutoKeyMaxUses(Math.max(1, Number(event.target.value) || 1))}
                                    />
                                </div>
                            </div>
                        ) : null}
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
                                    <th className='py-2 pr-4'>
                                        <input type='checkbox' checked={allSelected} onChange={toggleAllTeams} disabled={teamsLoading || bulkLoading || teams.length === 0} />
                                    </th>
                                    <th className='py-2 pr-4'>{t('common.id')}</th>
                                    <th className='py-2 pr-4'>{t('common.name')}</th>
                                    <th className='py-2 pr-4'>{t('common.division')}</th>
                                    <th className='py-2'>{t('common.createdAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((team) => (
                                    <tr key={team.id} className='border-t border-border/70'>
                                        <td className='py-3 pr-4'>
                                            <input type='checkbox' checked={selectedTeamIDs.includes(team.id)} onChange={() => toggleTeamSelection(team.id)} disabled={bulkLoading} />
                                        </td>
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
