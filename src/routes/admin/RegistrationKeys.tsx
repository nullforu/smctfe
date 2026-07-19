import { Fragment, useEffect, useRef, useState } from 'react'
import { downloadJsonFile, formatApiError, formatDateTime, type FieldErrors } from '../../lib/utils'
import type { RegistrationKey, RegistrationKeyExportBundle, TeamSummary } from '../../lib/types'
import FormMessage from '../../components/FormMessage'
import { getLocaleTag, useLocale, useT } from '../../lib/i18n'
import { useApi } from '../../lib/useApi'

const RegistrationKeys = () => {
    const t = useT()
    const api = useApi()
    const locale = useLocale()
    const localeTag = getLocaleTag(locale)
    const importInputRef = useRef<HTMLInputElement | null>(null)
    const [registrationKeys, setRegistrationKeys] = useState<RegistrationKey[]>([])
    const [teams, setTeams] = useState<TeamSummary[]>([])
    const [selectedKeyIDs, setSelectedKeyIDs] = useState<number[]>([])
    const [keysLoading, setKeysLoading] = useState(false)
    const [bulkLoading, setBulkLoading] = useState(false)
    const [keysErrorMessage, setKeysErrorMessage] = useState('')
    const [keysSuccessMessage, setKeysSuccessMessage] = useState('')
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
        void loadKeys()
        void loadTeams()
    }, [])

    const loadKeys = async () => {
        setKeysLoading(true)
        setKeysErrorMessage('')

        try {
            const loadedKeys = await api.registrationKeys()
            setRegistrationKeys(loadedKeys)
            setSelectedKeyIDs((current) => current.filter((id) => loadedKeys.some((key) => key.id === id)))
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

    const exportKeys = async (ids?: number[]) => {
        setBulkLoading(true)
        setKeysErrorMessage('')
        setKeysSuccessMessage('')

        try {
            const bundle = await api.exportRegistrationKeys(ids)
            downloadJsonFile(`registration-keys-${bundle.exported_at}.json`, bundle)
            setKeysSuccessMessage(ids && ids.length > 0 ? t('admin.keys.exportSelectedSuccess', { count: bundle.registration_keys.length }) : t('admin.keys.exportAllSuccess', { count: bundle.registration_keys.length }))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setKeysErrorMessage(formatted.message)
        } finally {
            setBulkLoading(false)
        }
    }

    const importKeys = async (file: File) => {
        setBulkLoading(true)
        setKeysErrorMessage('')
        setKeysSuccessMessage('')

        try {
            const text = await file.text()
            const bundle = JSON.parse(text) as RegistrationKeyExportBundle
            if (!bundle || !Array.isArray(bundle.registration_keys)) {
                throw new Error('invalid-bundle')
            }

            const response = await api.importRegistrationKeys(bundle)
            setKeysSuccessMessage(t('admin.keys.importSuccess', { count: response.imported.length }))
            await loadKeys()
        } catch (error) {
            if (error instanceof Error && error.message === 'invalid-bundle') {
                setKeysErrorMessage(t('admin.keys.invalidImportFile'))
            } else {
                const formatted = formatApiError(error, t)
                setKeysErrorMessage(formatted.message)
            }
        } finally {
            if (importInputRef.current) {
                importInputRef.current.value = ''
            }
            setBulkLoading(false)
        }
    }

    const toggleKeySelection = (keyID: number) => {
        setSelectedKeyIDs((current) => (current.includes(keyID) ? current.filter((id) => id !== keyID) : [...current, keyID]))
    }

    const toggleAllSelection = () => {
        if (registrationKeys.length === 0) return

        setSelectedKeyIDs((current) => (current.length === registrationKeys.length ? [] : registrationKeys.map((key) => key.id)))
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
        <section className='space-y-4'>
            <div className='flex flex-col gap-3 border border-border bg-surface p-4'>
                <div className='flex flex-wrap items-center gap-3'>
                    <button className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer disabled:opacity-60' onClick={() => void loadKeys()} disabled={keysLoading || bulkLoading}>
                        {keysLoading ? t('common.loading') : t('common.refresh')}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => void exportKeys()}
                        disabled={keysLoading || bulkLoading || registrationKeys.length === 0}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.keys.exportAll')}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => void exportKeys(selectedKeyIDs)}
                        disabled={keysLoading || bulkLoading || selectedKeyIDs.length === 0}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.keys.exportSelected', { count: selectedKeyIDs.length })}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => importInputRef.current?.click()}
                        disabled={keysLoading || bulkLoading}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.keys.import')}
                    </button>
                    <input
                        ref={importInputRef}
                        className='hidden'
                        type='file'
                        accept='application/json,.json'
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (!file) return
                            void importKeys(file)
                        }}
                    />
                </div>
                <p className='text-xs text-text-subtle'>{selectedKeyIDs.length > 0 ? t('admin.keys.selectedCount', { count: selectedKeyIDs.length }) : t('admin.keys.importHint')}</p>
                {keysErrorMessage ? <FormMessage variant='error' message={keysErrorMessage} /> : null}
                {keysSuccessMessage ? <FormMessage variant='success' message={keysSuccessMessage} /> : null}
            </div>

            <div className=' border border-border bg-surface p-4 md:p-8'>
                <form
                    className='space-y-4'
                    onSubmit={(event) => {
                        event.preventDefault()
                        void submitKeys()
                    }}
                >
                    <div className='grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]'>
                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-key-count'>
                                {t('common.count')}
                            </label>
                            <input
                                id='admin-key-count'
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
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
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
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
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
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
                            {teamsErrorMessage ? <FormMessage variant='error' message={teamsErrorMessage} className='mt-2' /> : null}
                        </div>
                        <div className='flex items-end'>
                            <button className='w-full bg-accent px-6 py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer' type='submit' disabled={createKeysLoading}>
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
                    </div>

                    {keysLoading ? (
                        <p className='mt-4 text-sm text-text-subtle'>{t('admin.keys.loadingKeys')}</p>
                    ) : registrationKeys.length === 0 ? (
                        <p className='mt-4 text-sm text-text-subtle'>{t('admin.keys.noKeys')}</p>
                    ) : (
                        <div className='mt-4 overflow-x-auto'>
                            <table className='w-full text-left text-sm text-text'>
                                <thead className='text-xs uppercase tracking-wide text-text-subtle'>
                                    <tr>
                                        <th className='py-2 pr-4'>
                                            <input type='checkbox' className='h-4 w-4 border-border' checked={registrationKeys.length > 0 && selectedKeyIDs.length === registrationKeys.length} onChange={toggleAllSelection} />
                                        </th>
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
                                                <td className='py-3 pr-4'>
                                                    <input type='checkbox' className='h-4 w-4 border-border' checked={selectedKeyIDs.includes(key.id)} onChange={() => toggleKeySelection(key.id)} />
                                                </td>
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
                                                        {t('admin.keys.lastUsedAt')}: {key.last_used_at ? formatDateTime(key.last_used_at, localeTag) : t('common.na')}
                                                    </div>
                                                </td>
                                                <td className='py-3 pr-4'>{key.created_by_username}</td>
                                                <td className='py-3 pr-4'>{formatDateTime(key.created_at, localeTag)}</td>
                                            </tr>
                                            {key.uses && key.uses.length > 0 ? (
                                                <tr className='border-t border-border/40 bg-surface/40'>
                                                    <td className='py-3 pr-4' colSpan={6}>
                                                        <div className='text-xs uppercase tracking-wide text-text-muted'>{t('admin.keys.usesLabel')}</div>
                                                        <ul className='mt-2 space-y-2 text-xs text-text'>
                                                            {key.uses.map((use) => (
                                                                <li key={`${use.used_by}-${use.used_at}`} className='flex flex-wrap gap-3'>
                                                                    <span className='font-medium text-text'>{use.used_by_username}</span>
                                                                    <span className='font-mono text-text-subtle'>{use.used_by_ip ?? t('common.na')}</span>
                                                                    <span className='text-text-subtle'>{formatDateTime(use.used_at, localeTag)}</span>
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
        </section>
    )
}

export default RegistrationKeys
