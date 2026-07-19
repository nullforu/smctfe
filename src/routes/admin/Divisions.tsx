import { useMemo, useRef, useState } from 'react'
import { charLength, downloadJsonFile, formatApiError, formatDateTime, NAME_MAX_LEN, trimToMaxChars, type FieldErrors } from '../../lib/utils'
import { getLocaleTag, useLocale, useT } from '../../lib/i18n'
import FormMessage from '../../components/FormMessage'
import { useDivision } from '../../lib/division'
import { useApi } from '../../lib/useApi'
import type { Division } from '../../lib/types'

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 32)

const Divisions = () => {
    const t = useT()
    const api = useApi()
    const { divisions, loading, errorMessage, refresh } = useDivision()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [divisionName, setDivisionName] = useState('')
    const [roleId, setRoleId] = useState('')
    const [channelId, setChannelId] = useState('')
    const [createLoading, setCreateLoading] = useState(false)
    const [createErrorMessage, setCreateErrorMessage] = useState('')
    const [createSuccessMessage, setCreateSuccessMessage] = useState('')
    const [createFieldErrors, setCreateFieldErrors] = useState<FieldErrors>({})
    const [selectedDivisionIDs, setSelectedDivisionIDs] = useState<number[]>([])
    const [bulkLoading, setBulkLoading] = useState(false)
    const importInputRef = useRef<HTMLInputElement | null>(null)
    const allSelected = divisions.length > 0 && selectedDivisionIDs.length === divisions.length

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editRoleId, setEditRoleId] = useState('')
    const [editChannelId, setEditChannelId] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)
    const [editErrorMessage, setEditErrorMessage] = useState('')

    const submitDivision = async () => {
        setCreateLoading(true)
        setCreateErrorMessage('')
        setCreateSuccessMessage('')
        setCreateFieldErrors({})

        try {
            const trimmed = divisionName.trim()
            if (!trimmed) {
                setCreateFieldErrors({ name: t('errors.required') })
                setCreateLoading(false)
                return
            }
            const created = await api.createDivision({
                name: trimmed,
                discord_role_id: roleId.trim() || undefined,
                discord_announce_channel_id: channelId.trim() || undefined,
            })
            setCreateSuccessMessage(t('admin.divisions.successCreated', { name: created.name }))
            setDivisionName('')
            setRoleId('')
            setChannelId('')
            await refresh()
        } catch (error) {
            const formatted = formatApiError(error, t)
            setCreateErrorMessage(formatted.message)
            setCreateFieldErrors(formatted.fieldErrors)
        } finally {
            setCreateLoading(false)
        }
    }

    const toggleDivisionSelection = (divisionID: number) => {
        setSelectedDivisionIDs((prev) => (prev.includes(divisionID) ? prev.filter((id) => id !== divisionID) : [...prev, divisionID]))
    }

    const toggleAllDivisions = () => {
        setSelectedDivisionIDs((prev) => (prev.length === divisions.length ? [] : divisions.map((division) => division.id)))
    }

    const exportDivisions = async (ids?: number[]) => {
        setBulkLoading(true)
        setCreateErrorMessage('')
        setCreateSuccessMessage('')
        try {
            const bundle = await api.exportDivisions(ids && ids.length > 0 ? ids : undefined)
            const suffix = ids && ids.length > 0 ? `selected-${ids.length}` : 'all'
            const timestamp = new Date().toISOString().replaceAll(':', '-')
            downloadJsonFile(`smctf-divisions-${suffix}-${timestamp}.json`, bundle)
            setCreateSuccessMessage(ids && ids.length > 0 ? t('admin.divisions.exportSelectedSuccess', { count: ids.length }) : t('admin.divisions.exportAllSuccess', { count: bundle.divisions.length }))
        } catch (error) {
            setCreateErrorMessage(formatApiError(error, t).message)
        } finally {
            setBulkLoading(false)
        }
    }

    const importDivisions = async (file: File) => {
        setBulkLoading(true)
        setCreateErrorMessage('')
        setCreateSuccessMessage('')
        try {
            const payload = JSON.parse(await file.text())
            const response = await api.importDivisions(payload)
            await refresh()
            setSelectedDivisionIDs([])
            setCreateSuccessMessage(t('admin.divisions.importSuccess', { count: response.imported.length }))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setCreateErrorMessage(error instanceof SyntaxError ? t('admin.divisions.invalidImportFile') : formatted.message)
        } finally {
            if (importInputRef.current) {
                importInputRef.current.value = ''
            }
            setBulkLoading(false)
        }
    }

    const beginEdit = (division: Division) => {
        setEditingId(division.id)
        setEditName(division.name)
        setEditRoleId(division.discord_role_id ?? '')
        setEditChannelId(division.discord_announce_channel_id ?? '')
        setEditErrorMessage('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditErrorMessage('')
    }

    const saveEdit = async (id: number) => {
        setSavingEdit(true)
        setEditErrorMessage('')
        try {
            await api.updateDivision(id, {
                name: editName.trim(),
                discord_role_id: editRoleId.trim() || undefined,
                discord_announce_channel_id: editChannelId.trim() || undefined,
            })
            setEditingId(null)
            await refresh()
        } catch (error) {
            setEditErrorMessage(formatApiError(error, t).message)
        } finally {
            setSavingEdit(false)
        }
    }

    return (
        <section className='space-y-4'>
            <div className='flex flex-col gap-3 border border-border bg-surface p-4'>
                <div className='flex flex-wrap items-center gap-3'>
                    <button className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer disabled:opacity-60' onClick={refresh} disabled={loading || bulkLoading}>
                        {loading ? t('common.loading') : t('common.refresh')}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => exportDivisions()}
                        disabled={loading || bulkLoading || divisions.length === 0}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.divisions.exportAll')}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => exportDivisions(selectedDivisionIDs)}
                        disabled={loading || bulkLoading || selectedDivisionIDs.length === 0}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.divisions.exportSelected', { count: selectedDivisionIDs.length })}
                    </button>
                    <button
                        className='border border-border px-3 py-2 text-xs text-text transition hover:border-accent disabled:opacity-60 cursor-pointer'
                        type='button'
                        onClick={() => importInputRef.current?.click()}
                        disabled={loading || bulkLoading}
                    >
                        {bulkLoading ? t('common.loading') : t('admin.divisions.import')}
                    </button>
                    <input
                        ref={importInputRef}
                        className='hidden'
                        type='file'
                        accept='application/json,.json'
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (!file) return
                            void importDivisions(file)
                        }}
                    />
                </div>
                <p className='text-xs text-text-subtle'>{selectedDivisionIDs.length > 0 ? t('admin.divisions.selectedCount', { count: selectedDivisionIDs.length }) : t('admin.divisions.importHint')}</p>
            </div>

            <div className=' border border-border bg-surface p-4 md:p-8'>
                <form
                    className='space-y-4'
                    onSubmit={(event) => {
                        event.preventDefault()
                        submitDivision()
                    }}
                >
                    <div className='grid gap-3 md:grid-cols-3'>
                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-division-name'>
                                {t('common.division')}
                            </label>
                            <input
                                id='admin-division-name'
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                type='text'
                                maxLength={NAME_MAX_LEN}
                                value={divisionName}
                                onChange={(event) => setDivisionName(trimToMaxChars(event.target.value, NAME_MAX_LEN))}
                                placeholder={t('admin.divisions.placeholder')}
                            />
                            <p className='mt-1 text-xs text-text-subtle'>{t('limits.charCounter', { current: charLength(divisionName), max: NAME_MAX_LEN })}</p>
                            {createFieldErrors.name ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('common.name')}: {createFieldErrors.name}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-division-role'>
                                {t('admin.divisions.discordRole')}
                            </label>
                            <input
                                id='admin-division-role'
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                type='text'
                                inputMode='numeric'
                                value={roleId}
                                onChange={(event) => setRoleId(onlyDigits(event.target.value))}
                                placeholder='000000000000000000'
                            />
                            {createFieldErrors.discord_role_id ? <p className='mt-2 text-xs text-danger'>{createFieldErrors.discord_role_id}</p> : null}
                        </div>

                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-division-channel'>
                                {t('admin.divisions.discordChannel')}
                            </label>
                            <input
                                id='admin-division-channel'
                                className='mt-2 w-full border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                type='text'
                                inputMode='numeric'
                                value={channelId}
                                onChange={(event) => setChannelId(onlyDigits(event.target.value))}
                                placeholder='000000000000000000'
                            />
                            {createFieldErrors.discord_announce_channel_id ? <p className='mt-2 text-xs text-danger'>{createFieldErrors.discord_announce_channel_id}</p> : null}
                        </div>
                    </div>

                    <p className='text-xs text-text-subtle'>{t('admin.divisions.discordHint')}</p>

                    <button className=' bg-accent px-6 py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer' type='submit' disabled={createLoading}>
                        {createLoading ? t('admin.divisions.creating') : t('admin.divisions.createDivision')}
                    </button>

                    {createErrorMessage ? <FormMessage variant='error' message={createErrorMessage} /> : null}

                    {createSuccessMessage ? <FormMessage variant='success' message={createSuccessMessage} /> : null}
                </form>
            </div>

            <div className=' border border-border bg-surface p-4 md:p-8'>
                <div className='flex items-center justify-between'>
                    <h3 className='text-lg text-text'>{t('admin.divisions.title')}</h3>
                </div>

                {errorMessage ? <FormMessage variant='error' message={errorMessage} className='mt-4' /> : null}
                {editErrorMessage ? <FormMessage variant='error' message={editErrorMessage} className='mt-4' /> : null}

                {loading ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.divisions.loading')}</p>
                ) : divisions.length === 0 ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.divisions.empty')}</p>
                ) : (
                    <div className='mt-4 overflow-x-auto'>
                        <table className='w-full text-left text-sm text-text'>
                            <thead className='text-xs uppercase tracking-wide text-text-subtle'>
                                <tr>
                                    <th className='py-2 pr-4'>
                                        <input type='checkbox' checked={allSelected} onChange={toggleAllDivisions} disabled={loading || bulkLoading || divisions.length === 0} />
                                    </th>
                                    <th className='py-2 pr-4'>{t('common.id')}</th>
                                    <th className='py-2 pr-4'>{t('common.name')}</th>
                                    <th className='py-2 pr-4'>{t('admin.divisions.discordRole')}</th>
                                    <th className='py-2 pr-4'>{t('admin.divisions.discordChannel')}</th>
                                    <th className='py-2 pr-4'>{t('common.createdAt')}</th>
                                    <th className='py-2'>{t('admin.divisions.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {divisions.map((division) =>
                                    editingId === division.id ? (
                                        <tr key={division.id} className='border-t border-border/70'>
                                            <td className='py-3 pr-4'>
                                                <input type='checkbox' checked={selectedDivisionIDs.includes(division.id)} onChange={() => toggleDivisionSelection(division.id)} disabled={bulkLoading || savingEdit} />
                                            </td>
                                            <td className='py-3 pr-4'>{division.id}</td>
                                            <td className='py-3 pr-4'>
                                                <input
                                                    className='w-full border border-border bg-surface px-2 py-1 text-sm'
                                                    maxLength={NAME_MAX_LEN}
                                                    value={editName}
                                                    onChange={(event) => setEditName(trimToMaxChars(event.target.value, NAME_MAX_LEN))}
                                                />
                                            </td>
                                            <td className='py-3 pr-4'>
                                                <input
                                                    className='w-40 border border-border bg-surface px-2 py-1 font-mono text-xs'
                                                    inputMode='numeric'
                                                    value={editRoleId}
                                                    onChange={(event) => setEditRoleId(onlyDigits(event.target.value))}
                                                    placeholder='000000000000000000'
                                                />
                                            </td>
                                            <td className='py-3 pr-4'>
                                                <input
                                                    className='w-40 border border-border bg-surface px-2 py-1 font-mono text-xs'
                                                    inputMode='numeric'
                                                    value={editChannelId}
                                                    onChange={(event) => setEditChannelId(onlyDigits(event.target.value))}
                                                    placeholder='000000000000000000'
                                                />
                                            </td>
                                            <td className='py-3 pr-4'>{formatDateTime(division.created_at, localeTag)}</td>
                                            <td className='py-3'>
                                                <div className='flex gap-2'>
                                                    <button
                                                        className='border-2 border-accent bg-accent px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-contrast-foreground disabled:opacity-50 cursor-pointer'
                                                        disabled={savingEdit}
                                                        onClick={() => saveEdit(division.id)}
                                                    >
                                                        {savingEdit ? t('admin.divisions.saving') : t('common.save')}
                                                    </button>
                                                    <button className='border-2 border-border bg-surface-muted px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-text-subtle cursor-pointer' onClick={cancelEdit}>
                                                        {t('common.cancel')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={division.id} className='border-t border-border/70'>
                                            <td className='py-3 pr-4'>
                                                <input type='checkbox' checked={selectedDivisionIDs.includes(division.id)} onChange={() => toggleDivisionSelection(division.id)} disabled={bulkLoading} />
                                            </td>
                                            <td className='py-3 pr-4'>{division.id}</td>
                                            <td className='py-3 pr-4'>{division.name}</td>
                                            <td className='py-3 pr-4 font-mono text-xs'>{division.discord_role_id ?? t('admin.divisions.none')}</td>
                                            <td className='py-3 pr-4 font-mono text-xs'>{division.discord_announce_channel_id ?? t('admin.divisions.none')}</td>
                                            <td className='py-3 pr-4'>{formatDateTime(division.created_at, localeTag)}</td>
                                            <td className='py-3'>
                                                <button className='border-b-2 border-accent text-[11px] uppercase tracking-[0.12em] text-accent cursor-pointer' onClick={() => beginEdit(division)}>
                                                    {t('admin.divisions.edit')}
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    )
}

export default Divisions
