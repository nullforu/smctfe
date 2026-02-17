import { useCallback, useEffect, useMemo, useState } from 'react'
import { dump } from 'js-yaml'
import { useApi } from '../../lib/useApi'
import { formatApiError } from '../../lib/utils'
import { useT } from '../../lib/i18n'
import type { AdminReportResponse } from '../../lib/types'
import FormMessage from '../../components/FormMessage'
import MonacoEditor from '../../components/MonacoEditor'

type ReportFormat = 'json' | 'yaml'

const AdminReport = () => {
    const t = useT()
    const api = useApi()
    const [format, setFormat] = useState<ReportFormat>('json')
    const [report, setReport] = useState<AdminReportResponse | null>(null)
    const [formatted, setFormatted] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [formatError, setFormatError] = useState('')

    const formatLabel = useMemo(() => (format === 'json' ? 'JSON' : 'YAML'), [format])

    const formatReport = useCallback((value: AdminReportResponse | null, nextFormat: ReportFormat) => {
        if (!value) return ''
        if (nextFormat === 'yaml') {
            return dump(value, { indent: 2, noRefs: true, lineWidth: 120 })
        }
        return JSON.stringify(value, null, 4)
    }, [])

    const loadReport = useCallback(async () => {
        setLoading(true)
        setErrorMessage('')
        setFormatError('')

        try {
            const data = await api.adminReport()
            setReport(data)
            setFormatted(formatReport(data, format))
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setLoading(false)
        }
    }, [api, format, formatReport, t])

    useEffect(() => {
        if (!report) return
        try {
            setFormatted(formatReport(report, format))
            setFormatError('')
        } catch (error) {
            console.error('Failed to format report', error)
            setFormatError(t('admin.report.formatFailed', { format: formatLabel }))
        }
    }, [format, formatLabel, formatReport, report, t])

    return (
        <section className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                    <p className='text-xs text-text-subtle'>{t('admin.report.hint')}</p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <select
                        className='rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text focus:border-accent focus:outline-none'
                        value={format}
                        onChange={(event) => setFormat(event.target.value as ReportFormat)}
                    >
                        <option value='json'>{t('admin.report.formatJson')}</option>
                        <option value='yaml'>{t('admin.report.formatYaml')}</option>
                    </select>
                    <button
                        className='rounded-lg bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                        onClick={loadReport}
                        disabled={loading}
                    >
                        {loading ? t('common.loading') : t('admin.report.load')}
                    </button>
                </div>
            </div>

            {errorMessage ? <FormMessage variant='error' message={errorMessage} /> : null}
            {formatError ? <FormMessage variant='error' message={formatError} /> : null}

            <div className='overflow-hidden rounded-2xl border border-border bg-surface'>
                <div className='border-b border-border bg-surface-muted px-4 py-2 text-xs uppercase tracking-wide text-text-muted'>
                    {t('admin.report.outputLabel', { format: formatLabel })}
                </div>
                <div className='p-4'>
                    <MonacoEditor value={formatted} readonly language={format} height='520px' />
                </div>
            </div>
        </section>
    )
}

export default AdminReport
