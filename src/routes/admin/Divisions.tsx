import { useMemo, useState } from 'react'
import { formatApiError, formatDateTime, type FieldErrors } from '../../lib/utils'
import { getLocaleTag, useLocale, useT } from '../../lib/i18n'
import FormMessage from '../../components/FormMessage'
import { useDivision } from '../../lib/division'
import { useApi } from '../../lib/useApi'

const Divisions = () => {
    const t = useT()
    const api = useApi()
    const { divisions, loading, errorMessage, refresh } = useDivision()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [divisionName, setDivisionName] = useState('')
    const [createLoading, setCreateLoading] = useState(false)
    const [createErrorMessage, setCreateErrorMessage] = useState('')
    const [createSuccessMessage, setCreateSuccessMessage] = useState('')
    const [createFieldErrors, setCreateFieldErrors] = useState<FieldErrors>({})

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
            const created = await api.createDivision({ name: trimmed })
            setCreateSuccessMessage(t('admin.divisions.successCreated', { name: created.name }))
            setDivisionName('')
            await refresh()
        } catch (error) {
            const formatted = formatApiError(error, t)
            setCreateErrorMessage(formatted.message)
            setCreateFieldErrors(formatted.fieldErrors)
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <section className='space-y-4'>
            <div className='flex items-center justify-between'>
                <button className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer' onClick={refresh} disabled={loading}>
                    {loading ? t('common.loading') : t('common.refresh')}
                </button>
            </div>

            <div className='rounded-3xl border border-border bg-surface p-4 md:p-8'>
                <form
                    className='space-y-4'
                    onSubmit={(event) => {
                        event.preventDefault()
                        submitDivision()
                    }}
                >
                    <div className='flex flex-col gap-3 md:flex-row md:items-end'>
                        <div className='flex-1'>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-division-name'>
                                {t('common.division')}
                            </label>
                            <input
                                id='admin-division-name'
                                className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                type='text'
                                value={divisionName}
                                onChange={(event) => setDivisionName(event.target.value)}
                                placeholder={t('admin.divisions.placeholder')}
                            />
                            {createFieldErrors.name ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('common.name')}: {createFieldErrors.name}
                                </p>
                            ) : null}
                        </div>

                        <button className='rounded-xl bg-accent px-6 py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer md:shrink-0' type='submit' disabled={createLoading}>
                            {createLoading ? t('admin.divisions.creating') : t('admin.divisions.createDivision')}
                        </button>
                    </div>

                    {createErrorMessage ? <FormMessage variant='error' message={createErrorMessage} /> : null}

                    {createSuccessMessage ? <FormMessage variant='success' message={createSuccessMessage} /> : null}
                </form>
            </div>

            <div className='rounded-3xl border border-border bg-surface p-4 md:p-8'>
                <div className='flex items-center justify-between'>
                    <h3 className='text-lg text-text'>{t('admin.divisions.title')}</h3>
                </div>

                {errorMessage ? <FormMessage variant='error' message={errorMessage} className='mt-4' /> : null}

                {loading ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.divisions.loading')}</p>
                ) : divisions.length === 0 ? (
                    <p className='mt-4 text-sm text-text-subtle'>{t('admin.divisions.empty')}</p>
                ) : (
                    <div className='mt-4 overflow-x-auto'>
                        <table className='w-full text-left text-sm text-text'>
                            <thead className='text-xs uppercase tracking-wide text-text-subtle'>
                                <tr>
                                    <th className='py-2 pr-4'>{t('common.id')}</th>
                                    <th className='py-2 pr-4'>{t('common.name')}</th>
                                    <th className='py-2'>{t('common.createdAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {divisions.map((division) => (
                                    <tr key={division.id} className='border-t border-border/70'>
                                        <td className='py-3 pr-4'>{division.id}</td>
                                        <td className='py-3 pr-4'>{division.name}</td>
                                        <td className='py-3'>{formatDateTime(division.created_at, localeTag)}</td>
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

export default Divisions
