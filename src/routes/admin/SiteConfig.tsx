import { useEffect, useState } from 'react'
import { formatApiError, type FieldErrors } from '../../lib/utils'
import FormMessage from '../../components/FormMessage'
import { useT } from '../../lib/i18n'
import { useApi } from '../../lib/useApi'
import { useConfig } from '../../lib/config'

const SiteConfig = () => {
    const t = useT()
    const api = useApi()
    const { setConfig } = useConfig()
    const [configTitle, setConfigTitle] = useState('')
    const [configDescription, setConfigDescription] = useState('')
    const [headerTitle, setHeaderTitle] = useState('')
    const [headerDescription, setHeaderDescription] = useState('')
    const [configLoading, setConfigLoading] = useState(false)
    const [configErrorMessage, setConfigErrorMessage] = useState('')
    const [configSuccessMessage, setConfigSuccessMessage] = useState('')
    const [configFieldErrors, setConfigFieldErrors] = useState<FieldErrors>({})

    useEffect(() => {
        loadSiteConfig()
    }, [])

    const loadSiteConfig = async () => {
        setConfigLoading(true)
        setConfigErrorMessage('')
        setConfigSuccessMessage('')
        setConfigFieldErrors({})

        try {
            const response = await api.config()
            setConfigTitle(response.title)
            setConfigDescription(response.description)
            setHeaderTitle(response.header_title)
            setHeaderDescription(response.header_description)
        } catch (error) {
            const formatted = formatApiError(error, t)
            setConfigErrorMessage(formatted.message)
        } finally {
            setConfigLoading(false)
        }
    }

    const saveSiteConfig = async () => {
        setConfigLoading(true)
        setConfigErrorMessage('')
        setConfigSuccessMessage('')
        setConfigFieldErrors({})

        try {
            const response = await api.updateAdminConfig({
                title: configTitle,
                description: configDescription,
                header_title: headerTitle,
                header_description: headerDescription,
            })
            setConfigTitle(response.title)
            setConfigDescription(response.description)
            setHeaderTitle(response.header_title)
            setHeaderDescription(response.header_description)
            setConfig(response)
            setConfigSuccessMessage(t('admin.site.saved'))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setConfigErrorMessage(formatted.message)
            setConfigFieldErrors(formatted.fieldErrors)
        } finally {
            setConfigLoading(false)
        }
    }

    return (
        <div className='rounded-3xl border border-border bg-surface p-4 md:p-8'>
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-lg text-text'>{t('admin.site.title')}</h3>
                    <p className='text-xs text-text-subtle'>{t('admin.site.subtitle')}</p>
                </div>
                <button
                    className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer'
                    onClick={loadSiteConfig}
                    disabled={configLoading}
                >
                    {configLoading ? t('common.loading') : t('common.reload')}
                </button>
            </div>

            <form
                className='mt-6 space-y-4'
                onSubmit={(event) => {
                    event.preventDefault()
                    saveSiteConfig()
                }}
            >
                <div>
                    <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-header-title'>
                        {t('admin.site.headerTitle')}
                    </label>
                    <input
                        id='admin-header-title'
                        className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                        type='text'
                        value={headerTitle}
                        onChange={(event) => setHeaderTitle(event.target.value)}
                        placeholder={t('admin.site.headerTitlePlaceholder')}
                    />
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
                    <textarea
                        id='admin-header-description'
                        className='mt-2 h-28 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                        value={headerDescription}
                        onChange={(event) => setHeaderDescription(event.target.value)}
                        placeholder={t('admin.site.headerDescriptionPlaceholder')}
                    ></textarea>
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
                    <input
                        id='admin-site-title'
                        className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                        type='text'
                        value={configTitle}
                        onChange={(event) => setConfigTitle(event.target.value)}
                        placeholder={t('admin.site.siteTitlePlaceholder')}
                    />
                    {configFieldErrors.title ? (
                        <p className='mt-2 text-xs text-danger'>
                            {t('admin.site.siteTitle')}: {configFieldErrors.title}
                        </p>
                    ) : null}
                </div>
                <div>
                    <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-site-description'>
                        {t('admin.site.description')}
                    </label>
                    <textarea
                        id='admin-site-description'
                        className='mt-2 h-32 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                        value={configDescription}
                        onChange={(event) => setConfigDescription(event.target.value)}
                        placeholder={t('admin.site.siteDescriptionPlaceholder')}
                    ></textarea>
                    {configFieldErrors.description ? (
                        <p className='mt-2 text-xs text-danger'>
                            {t('admin.site.description')}: {configFieldErrors.description}
                        </p>
                    ) : null}
                </div>

                {configErrorMessage ? <FormMessage variant='error' message={configErrorMessage} /> : null}
                {configSuccessMessage ? <FormMessage variant='success' message={configSuccessMessage} /> : null}

                <button
                    className='w-full rounded-xl bg-accent py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                    type='submit'
                    disabled={configLoading}
                >
                    {configLoading ? t('admin.site.saving') : t('admin.site.saveButton')}
                </button>
            </form>
        </div>
    )
}

export default SiteConfig
