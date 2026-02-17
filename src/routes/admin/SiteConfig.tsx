import { useEffect, useState } from 'react'
import type { AdminConfigUpdatePayload, AppConfig } from '../../lib/types'
import { formatApiError, type FieldErrors } from '../../lib/utils'
import FormMessage from '../../components/FormMessage'
import { useT } from '../../lib/i18n'
import { useApi } from '../../lib/useApi'
import { useConfig } from '../../lib/config'

type ConfigField = 'header_title' | 'header_description' | 'title' | 'description' | 'ctf_start_at' | 'ctf_end_at'

const KST_OFFSET_MINUTES = 9 * 60

const pad2 = (value: number) => value.toString().padStart(2, '0')

const toKstInputValue = (value?: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const kst = new Date(date.getTime() + KST_OFFSET_MINUTES * 60 * 1000)
    return `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())}T${pad2(
        kst.getUTCHours(),
    )}:${pad2(kst.getUTCMinutes())}`
}

const toKstRfc3339 = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed
    return `${withSeconds}+09:00`
}

const SiteConfig = () => {
    const t = useT()
    const api = useApi()
    const { setConfig } = useConfig()
    const [savedConfig, setSavedConfig] = useState<AppConfig | null>(null)
    const [configTitle, setConfigTitle] = useState('')
    const [configDescription, setConfigDescription] = useState('')
    const [headerTitle, setHeaderTitle] = useState('')
    const [headerDescription, setHeaderDescription] = useState('')
    const [ctfStartAt, setCtfStartAt] = useState('')
    const [ctfEndAt, setCtfEndAt] = useState('')
    const [configLoading, setConfigLoading] = useState(false)
    const [configErrorMessage, setConfigErrorMessage] = useState('')
    const [configSuccessMessage, setConfigSuccessMessage] = useState('')
    const [configFieldErrors, setConfigFieldErrors] = useState<FieldErrors>({})
    const [editingField, setEditingField] = useState<ConfigField | null>(null)

    useEffect(() => {
        loadSiteConfig()
    }, [])

    const loadSiteConfig = async () => {
        setConfigLoading(true)
        setConfigErrorMessage('')
        setConfigSuccessMessage('')
        setConfigFieldErrors({})

        try {
            const response = await api.config({ noCache: true })
            setSavedConfig(response)
            setConfigTitle(response.title)
            setConfigDescription(response.description)
            setHeaderTitle(response.header_title)
            setHeaderDescription(response.header_description)
            setCtfStartAt(toKstInputValue(response.ctf_start_at))
            setCtfEndAt(toKstInputValue(response.ctf_end_at))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setConfigErrorMessage(formatted.message)
        } finally {
            setConfigLoading(false)
        }
    }

    const beginEdit = (field: ConfigField) => {
        setEditingField(field)
        setConfigErrorMessage('')
        setConfigSuccessMessage('')
        setConfigFieldErrors({})
    }

    const cancelEdit = (field: ConfigField) => {
        if (!savedConfig) return
        setEditingField(null)
        setConfigFieldErrors({})
        switch (field) {
            case 'header_title':
                setHeaderTitle(savedConfig.header_title)
                break
            case 'header_description':
                setHeaderDescription(savedConfig.header_description)
                break
            case 'title':
                setConfigTitle(savedConfig.title)
                break
            case 'description':
                setConfigDescription(savedConfig.description)
                break
            case 'ctf_start_at':
                setCtfStartAt(toKstInputValue(savedConfig.ctf_start_at))
                break
            case 'ctf_end_at':
                setCtfEndAt(toKstInputValue(savedConfig.ctf_end_at))
                break
        }
    }

    const saveField = async (field: ConfigField, overrideValue?: string) => {
        if (!savedConfig) return
        setConfigLoading(true)
        setConfigErrorMessage('')
        setConfigSuccessMessage('')
        setConfigFieldErrors({})

        try {
            const payload: AdminConfigUpdatePayload = {}
            switch (field) {
                case 'header_title':
                    if (headerTitle === savedConfig.header_title) {
                        setEditingField(null)
                        return
                    }
                    payload.header_title = headerTitle
                    break
                case 'header_description':
                    if (headerDescription === savedConfig.header_description) {
                        setEditingField(null)
                        return
                    }
                    payload.header_description = headerDescription
                    break
                case 'title':
                    if (configTitle === savedConfig.title) {
                        setEditingField(null)
                        return
                    }
                    payload.title = configTitle
                    break
                case 'description':
                    if (configDescription === savedConfig.description) {
                        setEditingField(null)
                        return
                    }
                    payload.description = configDescription
                    break
                case 'ctf_start_at': {
                    const nextValue = (overrideValue ?? ctfStartAt).trim()
                    const currentValue = toKstInputValue(savedConfig.ctf_start_at)
                    if (nextValue === currentValue) {
                        setEditingField(null)
                        return
                    }
                    payload.ctf_start_at = nextValue ? toKstRfc3339(nextValue) : null
                    break
                }
                case 'ctf_end_at': {
                    const nextValue = (overrideValue ?? ctfEndAt).trim()
                    const currentValue = toKstInputValue(savedConfig.ctf_end_at)
                    if (nextValue === currentValue) {
                        setEditingField(null)
                        return
                    }
                    payload.ctf_end_at = nextValue ? toKstRfc3339(nextValue) : null
                    break
                }
            }

            const response = await api.updateAdminConfig(payload)
            setSavedConfig(response)
            setConfigTitle(response.title)
            setConfigDescription(response.description)
            setHeaderTitle(response.header_title)
            setHeaderDescription(response.header_description)
            setCtfStartAt(toKstInputValue(response.ctf_start_at))
            setCtfEndAt(toKstInputValue(response.ctf_end_at))
            setConfig(response)
            setConfigSuccessMessage(t('admin.site.saved'))
            setEditingField(null)
        } catch (error) {
            const formatted = formatApiError(error, t)
            setConfigErrorMessage(formatted.message)
            setConfigFieldErrors(formatted.fieldErrors)
        } finally {
            setConfigLoading(false)
        }
    }

    return (
        <section className='space-y-4'>
            <button
                className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer'
                onClick={loadSiteConfig}
                disabled={configLoading}
            >
                {configLoading ? t('common.loading') : t('common.refresh')}
            </button>
            <div className='rounded-3xl border border-border bg-surface p-4 md:p-8'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h3 className='text-lg text-text'>{t('admin.site.title')}</h3>
                        <p className='text-xs text-text-subtle'>{t('admin.site.subtitle')}</p>
                    </div>
                </div>

                <div className='mt-6 space-y-4'>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-header-title'>
                            {t('admin.site.headerTitle')}
                        </label>
                        {editingField === 'header_title' ? (
                            <div className='mt-2 space-y-2'>
                                <input
                                    id='admin-header-title'
                                    className='w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                    type='text'
                                    value={headerTitle}
                                    onChange={(event) => setHeaderTitle(event.target.value)}
                                    placeholder={t('admin.site.headerTitlePlaceholder')}
                                    disabled={configLoading}
                                />
                                <div className='flex flex-wrap items-center gap-3'>
                                    <button
                                        className='rounded-lg bg-accent px-3 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('header_title')}
                                        disabled={configLoading}
                                    >
                                        {configLoading ? t('admin.site.saving') : t('common.save')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => cancelEdit('header_title')}
                                        disabled={configLoading}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text'>
                                <span>{headerTitle ? headerTitle : t('admin.site.unset')}</span>
                                <button
                                    className='text-xs text-accent hover:underline cursor-pointer disabled:opacity-60'
                                    type='button'
                                    onClick={() => beginEdit('header_title')}
                                    disabled={configLoading || editingField !== null}
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                        {configFieldErrors.header_title ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('admin.site.headerTitle')}: {configFieldErrors.header_title}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label
                            className='text-xs uppercase tracking-wide text-text-muted'
                            htmlFor='admin-header-description'
                        >
                            {t('admin.site.headerDescription')}
                        </label>
                        {editingField === 'header_description' ? (
                            <div className='mt-2 space-y-2'>
                                <textarea
                                    id='admin-header-description'
                                    className='h-28 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                    value={headerDescription}
                                    onChange={(event) => setHeaderDescription(event.target.value)}
                                    placeholder={t('admin.site.headerDescriptionPlaceholder')}
                                    disabled={configLoading}
                                ></textarea>
                                <div className='flex flex-wrap items-center gap-3'>
                                    <button
                                        className='rounded-lg bg-accent px-3 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('header_description')}
                                        disabled={configLoading}
                                    >
                                        {configLoading ? t('admin.site.saving') : t('common.save')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => cancelEdit('header_description')}
                                        disabled={configLoading}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 flex items-start justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text'>
                                <p className='whitespace-pre-wrap'>
                                    {headerDescription ? headerDescription : t('admin.site.unset')}
                                </p>
                                <button
                                    className='text-xs text-accent hover:underline cursor-pointer disabled:opacity-60'
                                    type='button'
                                    onClick={() => beginEdit('header_description')}
                                    disabled={configLoading || editingField !== null}
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                        {configFieldErrors.header_description ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('admin.site.headerDescription')}: {configFieldErrors.header_description}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-site-title'>
                            {t('admin.site.siteTitle')}
                        </label>
                        {editingField === 'title' ? (
                            <div className='mt-2 space-y-2'>
                                <input
                                    id='admin-site-title'
                                    className='w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                    type='text'
                                    value={configTitle}
                                    onChange={(event) => setConfigTitle(event.target.value)}
                                    placeholder={t('admin.site.siteTitlePlaceholder')}
                                    disabled={configLoading}
                                />
                                <div className='flex flex-wrap items-center gap-3'>
                                    <button
                                        className='rounded-lg bg-accent px-3 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('title')}
                                        disabled={configLoading}
                                    >
                                        {configLoading ? t('admin.site.saving') : t('common.save')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => cancelEdit('title')}
                                        disabled={configLoading}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text'>
                                <span>{configTitle ? configTitle : t('admin.site.unset')}</span>
                                <button
                                    className='text-xs text-accent hover:underline cursor-pointer disabled:opacity-60'
                                    type='button'
                                    onClick={() => beginEdit('title')}
                                    disabled={configLoading || editingField !== null}
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                        {configFieldErrors.title ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('admin.site.siteTitle')}: {configFieldErrors.title}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-ctf-start-at'>
                            {t('admin.site.ctfStartAt')}
                        </label>
                        {editingField === 'ctf_start_at' ? (
                            <div className='mt-2 space-y-2'>
                                <input
                                    id='admin-ctf-start-at'
                                    className='w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                    type='datetime-local'
                                    value={ctfStartAt}
                                    onChange={(event) => setCtfStartAt(event.target.value)}
                                    placeholder={t('admin.site.ctfStartAtPlaceholder')}
                                    disabled={configLoading}
                                />
                                <div className='flex flex-wrap items-center gap-3'>
                                    <button
                                        className='rounded-lg bg-accent px-3 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('ctf_start_at')}
                                        disabled={configLoading}
                                    >
                                        {configLoading ? t('admin.site.saving') : t('common.save')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => cancelEdit('ctf_start_at')}
                                        disabled={configLoading}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('ctf_start_at', '')}
                                        disabled={configLoading}
                                    >
                                        {t('admin.site.clearTime')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text'>
                                <span>{ctfStartAt ? ctfStartAt : t('admin.site.unset')}</span>
                                <button
                                    className='text-xs text-accent hover:underline cursor-pointer disabled:opacity-60'
                                    type='button'
                                    onClick={() => beginEdit('ctf_start_at')}
                                    disabled={configLoading || editingField !== null}
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                        {configFieldErrors.ctf_start_at ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('admin.site.ctfStartAt')}: {configFieldErrors.ctf_start_at}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-ctf-end-at'>
                            {t('admin.site.ctfEndAt')}
                        </label>
                        {editingField === 'ctf_end_at' ? (
                            <div className='mt-2 space-y-2'>
                                <input
                                    id='admin-ctf-end-at'
                                    className='w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                    type='datetime-local'
                                    value={ctfEndAt}
                                    onChange={(event) => setCtfEndAt(event.target.value)}
                                    placeholder={t('admin.site.ctfEndAtPlaceholder')}
                                    disabled={configLoading}
                                />
                                <div className='flex flex-wrap items-center gap-3'>
                                    <button
                                        className='rounded-lg bg-accent px-3 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('ctf_end_at')}
                                        disabled={configLoading}
                                    >
                                        {configLoading ? t('admin.site.saving') : t('common.save')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => cancelEdit('ctf_end_at')}
                                        disabled={configLoading}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('ctf_end_at', '')}
                                        disabled={configLoading}
                                    >
                                        {t('admin.site.clearTime')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text'>
                                <span>{ctfEndAt ? ctfEndAt : t('admin.site.unset')}</span>
                                <button
                                    className='text-xs text-accent hover:underline cursor-pointer disabled:opacity-60'
                                    type='button'
                                    onClick={() => beginEdit('ctf_end_at')}
                                    disabled={configLoading || editingField !== null}
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                        {configFieldErrors.ctf_end_at ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('admin.site.ctfEndAt')}: {configFieldErrors.ctf_end_at}
                            </p>
                        ) : null}
                        <p className='mt-2 text-xs text-text-subtle'>{t('admin.site.ctfTimeHint')}</p>
                    </div>
                    <div>
                        <label
                            className='text-xs uppercase tracking-wide text-text-muted'
                            htmlFor='admin-site-description'
                        >
                            {t('admin.site.description')}
                        </label>
                        {editingField === 'description' ? (
                            <div className='mt-2 space-y-2'>
                                <textarea
                                    id='admin-site-description'
                                    className='h-32 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                    value={configDescription}
                                    onChange={(event) => setConfigDescription(event.target.value)}
                                    placeholder={t('admin.site.siteDescriptionPlaceholder')}
                                    disabled={configLoading}
                                ></textarea>
                                <div className='flex flex-wrap items-center gap-3'>
                                    <button
                                        className='rounded-lg bg-accent px-3 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => saveField('description')}
                                        disabled={configLoading}
                                    >
                                        {configLoading ? t('admin.site.saving') : t('common.save')}
                                    </button>
                                    <button
                                        className='rounded-lg border border-border px-3 py-2 text-xs text-text transition hover:border-border disabled:opacity-60 cursor-pointer'
                                        type='button'
                                        onClick={() => cancelEdit('description')}
                                        disabled={configLoading}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 flex items-start justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text'>
                                <p className='whitespace-pre-wrap'>
                                    {configDescription ? configDescription : t('admin.site.unset')}
                                </p>
                                <button
                                    className='text-xs text-accent hover:underline cursor-pointer disabled:opacity-60'
                                    type='button'
                                    onClick={() => beginEdit('description')}
                                    disabled={configLoading || editingField !== null}
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                        {configFieldErrors.description ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('admin.site.description')}: {configFieldErrors.description}
                            </p>
                        ) : null}
                    </div>

                    {configErrorMessage ? <FormMessage variant='error' message={configErrorMessage} /> : null}
                    {configSuccessMessage ? <FormMessage variant='success' message={configSuccessMessage} /> : null}
                </div>
            </div>
        </section>
    )
}

export default SiteConfig
