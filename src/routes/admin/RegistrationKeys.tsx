import { Fragment, useEffect, useState } from 'react'
import { formatApiError, formatDateTime, type FieldErrors } from '../../lib/utils'
import type { RegistrationKey, TeamSummary } from '../../lib/types'
import FormMessage from '../../components/FormMessage'
import { getLocaleTag, useLocale, useT } from '../../lib/i18n'
import { useApi } from '../../lib/useApi'

const RegistrationKeys = () => {
    const t = useT()
    const api = useApi()
    const locale = useLocale()
    const localeTag = getLocaleTag(locale)
    const [registrationKeys, setRegistrationKeys] = useState<RegistrationKey[]>([])
    const [teams, setTeams] = useState<TeamSummary[]>([])
    const [keysLoading, setKeysLoading] = useState(false)
    const [keysErrorMessage, setKeysErrorMessage] = useState('')
    const [teamsLoading, setTeamsLoading] = useState(false)
    const [teamsErrorMessage, setTeamsErrorMessage] = useState('')
    const [createKeysLoading, setCreateKeysLoading] = useState(false)
    const [createKeysErrorMessage, setCreateKeysErrorMessage] = useState('')
    const [createKeysFieldErrors, setCreateKeysFieldErrors] = useState<FieldErrors>({})
    const [createKeysSuccessMessage, setCreateKeysSuccessMessage] = useState('')
    const [keyCount, setKeyCount] = useState(1)
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [maxUses, setMaxUses] = useState(1)

    useEffect(() => {
        loadKeys()
        loadTeams()
    }, [])

    const loadKeys = async () => {
        setKeysLoading(true)
        setKeysErrorMessage('')

        try {
            setRegistrationKeys(await api.registrationKeys())
        } catch (error) {
            const formatted = formatApiError(error, t)
            setKeysErrorMessage(formatted.message)
        } finally {
            setKeysLoading(false)
        }
    }

    const loadTeams = async () => {
        setTeamsLoading(true)
        setTeamsErrorMessage('')

        try {
            const teamData = await api.teams()
            setTeams(teamData)
            if (!selectedTeamId && teamData.length > 0) {
                setSelectedTeamId(String(teamData[0].id))
            }
        } catch (error) {
            const formatted = formatApiError(error, t)
            setTeamsErrorMessage(formatted.message)
        } finally {
            setTeamsLoading(false)
        }
    }

    const submitKeys = async () => {
        setCreateKeysLoading(true)
        setCreateKeysErrorMessage('')
        setCreateKeysSuccessMessage('')
        setCreateKeysFieldErrors({})

        try {
            if (!selectedTeamId) {
                setCreateKeysFieldErrors({ team_id: t('errors.required') })
                setCreateKeysLoading(false)
                return
            }
            const payload = {
                count: Number(keyCount),
                team_id: Number(selectedTeamId),
                max_uses: Number(maxUses),
            }
            const created = await api.createRegistrationKeys(payload)
            setCreateKeysSuccessMessage(t('admin.keys.createdCount', { count: created.length }))
            setKeyCount(1)
            setMaxUses(1)
            await loadKeys()
        } catch (error) {
            const formatted = formatApiError(error, t)
            setCreateKeysErrorMessage(formatted.message)
            setCreateKeysFieldErrors(formatted.fieldErrors)
        } finally {
            setCreateKeysLoading(false)
        }
    }

    return (
        <div className='rounded-3xl border border-border bg-surface p-4 md:p-8'>
            <form
                className='space-y-4'
                onSubmit={(event) => {
                    event.preventDefault()
                    submitKeys()
                }}
            >
                <div className='grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]'>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-key-count'>
                            {t('common.count')}
                        </label>
                        <input
                            id='admin-key-count'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            type='number'
                            min={1}
                            value={keyCount}
                            onChange={(event) => setKeyCount(Number(event.target.value))}
                        />
                        {createKeysFieldErrors.count ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('common.count')}: {createKeysFieldErrors.count}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-key-max-uses'>
                            {t('admin.keys.maxUses')}
                        </label>
                        <input
                            id='admin-key-max-uses'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            type='number'
                            min={1}
                            value={maxUses}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value)
                                setMaxUses(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1)
                            }}
                        />
                        {createKeysFieldErrors.max_uses ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('admin.keys.maxUses')}: {createKeysFieldErrors.max_uses}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-key-team'>
                            {t('common.team')}
                        </label>
                        <select
                            id='admin-key-team'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            value={selectedTeamId}
                            onChange={(event) => setSelectedTeamId(event.target.value)}
                            disabled={teamsLoading}
                        >
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                        {createKeysFieldErrors.team_id ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('common.team')}: {createKeysFieldErrors.team_id}
                            </p>
                        ) : null}
                        {teamsErrorMessage ? (
                            <FormMessage variant='error' message={teamsErrorMessage} className='mt-2' />
                        ) : null}
                    </div>
                    <div className='flex items-end'>
                        <button
                            className='w-full rounded-xl bg-accent px-6 py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                            type='submit'
                            disabled={createKeysLoading}
                        >
                            {createKeysLoading ? t('admin.keys.creating') : t('admin.keys.createKeys')}
                        </button>
                    </div>
                </div>

                {createKeysErrorMessage ? <FormMessage variant='error' message={createKeysErrorMessage} /> : null}
                {createKeysSuccessMessage ? <FormMessage variant='success' message={createKeysSuccessMessage} /> : null}
            </form>

            <div className='mt-8'>
                <div className='flex items-center justify-between'>
                    <h3 className='text-lg text-text'>{t('admin.keys.title')}</h3>
                    <button
                        className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer'
                        onClick={loadKeys}
                        disabled={keysLoading}
                    >
                        {keysLoading ? t('common.loading') : t('common.refresh')}
                    </button>
                </div>

                {keysErrorMessage ? <FormMessage variant='error' message={keysErrorMessage} className='mt-4' /> : null}

                {keysLoading ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.keys.loadingKeys')}</p>
                ) : registrationKeys.length === 0 ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.keys.noKeys')}</p>
                ) : (
                    <div className='mt-4 overflow-x-auto'>
                        <table className='w-full text-left text-sm text-text'>
                            <thead className='text-xs uppercase tracking-wide text-text-subtle'>
                                <tr>
                                    <th className='py-2 pr-4'>{t('common.code')}</th>
                                    <th className='py-2 pr-4'>{t('common.team')}</th>
                                    <th className='py-2 pr-4'>{t('admin.keys.usage')}</th>
                                    <th className='py-2 pr-4'>{t('common.createdBy')}</th>
                                    <th className='py-2 pr-4'>{t('common.createdAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrationKeys.map((key) => (
                                    <Fragment key={key.id}>
                                        <tr className='border-t border-border/70'>
                                            <td className='py-3 pr-4 font-mono text-text'>{key.code}</td>
                                            <td className='py-3 pr-4'>{key.team_name}</td>
                                            <td className='py-3 pr-4'>
                                                <div className='font-medium text-text'>
                                                    {t('admin.keys.usageCount', {
                                                        used: key.used_count,
                                                        max: key.max_uses,
                                                    })}
                                                </div>
                                                <div className='text-xs text-text-subtle'>
                                                    {t('admin.keys.lastUsedAt')}:{' '}
                                                    {key.last_used_at
                                                        ? formatDateTime(key.last_used_at, localeTag)
                                                        : t('common.na')}
                                                </div>
                                            </td>
                                            <td className='py-3 pr-4'>{key.created_by_username}</td>
                                            <td className='py-3 pr-4'>{formatDateTime(key.created_at, localeTag)}</td>
                                        </tr>
                                        {key.uses && key.uses.length > 0 ? (
                                            <tr className='border-t border-border/40 bg-surface/40'>
                                                <td className='py-3 pr-4' colSpan={5}>
                                                    <div className='text-xs uppercase tracking-wide text-text-muted'>
                                                        {t('admin.keys.usesLabel')}
                                                    </div>
                                                    <ul className='mt-2 space-y-2 text-xs text-text'>
                                                        {key.uses.map((use) => (
                                                            <li
                                                                key={`${use.used_by}-${use.used_at}`}
                                                                className='flex flex-wrap gap-3'
                                                            >
                                                                <span className='font-medium text-text'>
                                                                    {use.used_by_username}
                                                                </span>
                                                                <span className='font-mono text-text-subtle'>
                                                                    {use.used_by_ip ?? t('common.na')}
                                                                </span>
                                                                <span className='text-text-subtle'>
                                                                    {formatDateTime(use.used_at, localeTag)}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default RegistrationKeys
