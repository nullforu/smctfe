import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../lib/api'
import { formatApiError, formatDateTime } from '../lib/utils'
import type { Challenge, CtfState, VM } from '../lib/types'
import { getCategoryKey, getLocaleTag, useLocale, useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/useApi'
import Markdown from './Markdown'

interface SubmissionState {
    status: 'idle' | 'loading' | 'success' | 'error'
    message?: string
}

interface ChallengeModalProps {
    challenge: Challenge
    isSolved: boolean
    ctfState: CtfState
    onClose: () => void
    onSolved: () => void
}

const VM_POLL_FAST_MS = 2000
const VM_POLL_SLOW_MS = 60000
const vmPollInterval = (status?: string | null) => (status?.toLowerCase() === 'running' ? VM_POLL_SLOW_MS : VM_POLL_FAST_MS)

const ChallengeModal = ({ challenge, isSolved, ctfState, onClose, onSolved }: ChallengeModalProps) => {
    const t = useT()
    const api = useApi()
    const { state: auth } = useAuth()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [flagInput, setFlagInput] = useState('')
    const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' })
    const [downloadLoading, setDownloadLoading] = useState(false)
    const [downloadMessage, setDownloadMessage] = useState('')
    const [vmInfo, setVMInfo] = useState<VM | null>(null)
    const [vmLoading, setVMLoading] = useState(false)
    const [vmMessage, setVMMessage] = useState('')
    const [vmNextInterval, setVMNextInterval] = useState(VM_POLL_FAST_MS)
    const [copiedValue, setCopiedValue] = useState('')

    const isSuccessful = useMemo(() => submission.status === 'success', [submission.status])
    const isCtfEnded = ctfState === 'ended'
    const isLocked = challenge.is_locked === true
    const detail = !isLocked && 'description' in challenge ? challenge : null
    const isActive = 'is_active' in challenge ? challenge.is_active !== false : true
    const categoryValue = 'category' in challenge ? challenge.category : ''
    const hasCategory = Boolean(categoryValue)
    const hasDescription = !!detail?.description
    const solveCount = 'solve_count' in challenge ? challenge.solve_count : null
    const hasFile = !!detail?.has_file
    const vmEnabled = !!detail?.vm_enabled
    const isVMPending = vmInfo?.status?.toLowerCase() === 'pending'
    const previousChallengeId = isLocked ? (challenge.previous_challenge_id ?? null) : (detail?.previous_challenge_id ?? null)
    const previousChallengeTitle = isLocked ? (challenge.previous_challenge_title ?? null) : null
    const previousChallengeCategory = isLocked ? (challenge.previous_challenge_category ?? null) : null

    const submitFlag = async () => {
        if (isLocked) {
            return
        }

        if (isSolved) {
            setSubmission({ status: 'success', message: t('challenge.correct') })
            return
        }

        if (submission.status === 'loading') return

        setSubmission({ status: 'loading' })

        try {
            const result = await api.submitFlag(challenge.id, flagInput)

            if (result.correct) {
                setSubmission({ status: 'success', message: t('challenge.correct') })
                setFlagInput('')
                onSolved()
            } else if (result.ctf_state === 'not_started') {
                setSubmission({ status: 'error', message: t('challenge.ctfNotStarted') })
            } else if (result.ctf_state === 'ended') {
                setSubmission({ status: 'error', message: t('challenge.ctfEndedNotice') })
            } else {
                setSubmission({ status: 'error', message: t('challenge.incorrect') })
            }
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                setSubmission({ status: 'success', message: t('challenge.correct') })
                setFlagInput('')
                onSolved()
                return
            }

            const formatted = formatApiError(error, t)
            setSubmission({ status: 'error', message: formatted.message })
        }
    }

    const downloadFile = async () => {
        if (!hasFile || downloadLoading) return

        setDownloadLoading(true)
        setDownloadMessage('')

        try {
            const result = await api.requestChallengeFileDownload(challenge.id)
            if ('url' in result) {
                window.open(result.url, '_blank', 'noopener')
            } else {
                setDownloadMessage(t('challenge.downloadNotStarted'))
            }
        } catch (error) {
            const formatted = formatApiError(error, t)
            setDownloadMessage(formatted.message)
        } finally {
            setDownloadLoading(false)
        }
    }

    const formatTimestamp = (value?: string | null) => {
        if (!value) return t('common.na')
        return formatDateTime(value, localeTag)
    }

    const loadVM = async () => {
        if (!auth.user || !vmEnabled) return
        setVMLoading(true)
        setVMMessage('')

        try {
            const result = await api.getVM(challenge.id)
            if ('vm_id' in result) {
                setVMInfo(result)
                setVMNextInterval(vmPollInterval(result.status))
                setVMMessage('')
            } else {
                setVMInfo(null)
                setVMMessage(t('challenge.vmNotStarted'))
            }
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                setVMInfo(null)
                setVMNextInterval(VM_POLL_FAST_MS)
                setVMMessage('')
                return
            }
            const formatted = formatApiError(error, t)
            setVMMessage(formatted.message)
        } finally {
            setVMLoading(false)
        }
    }

    const createVM = async () => {
        if (isSolved) {
            setVMMessage(t('challenge.solvedCannotCreate'))
            return
        }
        if (vmLoading || !auth.user) return
        setVMLoading(true)
        setVMMessage('')

        try {
            const created = await api.createVM(challenge.id)
            setVMInfo(created)
            setVMNextInterval(vmPollInterval(created.status))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setVMMessage(formatted.message)
        } finally {
            setVMLoading(false)
        }
    }

    const deleteVM = async () => {
        if (vmLoading || !auth.user) return
        setVMLoading(true)
        setVMMessage('')

        try {
            await api.deleteVM(challenge.id)
            setVMInfo(null)
        } catch (error) {
            const formatted = formatApiError(error, t)
            setVMMessage(formatted.message)
        } finally {
            setVMLoading(false)
        }
    }

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value)
            setCopiedValue(value)
            window.setTimeout(() => {
                setCopiedValue((prev) => (prev === value ? '' : prev))
            }, 1200)
        } catch {
            setVMMessage(t('challenge.copyFailed'))
        }
    }

    useEffect(() => {
        if (!auth.user || !vmEnabled) {
            setVMInfo(null)
            setVMMessage('')
            return
        }

        loadVM()
    }, [auth.user, vmEnabled, challenge.id])

    useEffect(() => {
        if (!auth.user || !vmEnabled || !vmInfo) return

        let timeoutId: ReturnType<typeof setTimeout>
        const poll = async () => {
            await loadVM()
            timeoutId = setTimeout(poll, vmNextInterval)
        }

        timeoutId = setTimeout(poll, vmNextInterval)
        return () => clearTimeout(timeoutId)
    }, [auth.user, vmEnabled, vmInfo, vmNextInterval])

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4'
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose()
                }
            }}
        >
            <div className='relative w-full max-w-5xl rounded-xl border border-border bg-surface overflow-hidden'>
                <div className='max-h-[90vh] overflow-y-auto p-4 sm:p-6'>
                    {/* <button className='absolute right-6 top-4 text-text-subtle hover:text-text cursor-pointer' onClick={onClose} aria-label={t('challenge.closeModal')}>
                        <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                        </svg>
                    </button> */}
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <h2 className='text-2xl text-text'>{challenge.title}</h2>
                            <div className='mt-2 flex flex-wrap items-center gap-2 text-sm'>
                                {hasCategory ? <span className='rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-text'>{t(getCategoryKey(categoryValue))}</span> : null}
                                <span className='text-text-muted'>{t('common.pointsShort', { points: challenge.points })}</span>
                                {solveCount !== null ? <span className='text-text-muted'>{t('challenge.solvedCount', { count: solveCount })}</span> : null}
                            </div>
                        </div>
                        {isLocked ? (
                            <span className='rounded-full bg-warning/20 px-4 py-1.5 text-sm text-warning-strong'>{t('challenge.lockedLabel')}</span>
                        ) : isSolved ? (
                            <span className='rounded-full bg-success/20 px-4 py-1.5 text-sm text-success'>{t('challenge.solvedLabel')}</span>
                        ) : !isActive ? (
                            <span className='rounded-full bg-surface/10 px-4 py-1.5 text-sm text-text-muted'>{t('challenge.inactiveLabel')}</span>
                        ) : null}
                    </div>

                    {isLocked ? (
                        <div className='mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-strong'>
                            <p>{t('challenge.lockedNotice')}</p>
                            {previousChallengeId ? (
                                <p className='mt-2 text-xs text-warning-strong'>
                                    {t('challenge.lockedRequirement', {
                                        id: previousChallengeId,
                                        title: previousChallengeTitle ?? t('common.na'),
                                        category: previousChallengeCategory ?? t('common.na'),
                                    })}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <div className='mt-6 text-text'>
                            <Markdown className='break-keep' content={hasDescription ? (detail?.description ?? '') : ''} />
                        </div>
                    )}

                    {hasFile ? (
                        <div className='mt-6'>
                            <div className='rounded-md border border-border bg-surface-muted p-4 text-sm text-text'>
                                <div className='flex flex-wrap items-center justify-between gap-3'>
                                    <div>
                                        <p className='font-medium'>{t('challenge.fileTitle')}</p>
                                        <p className='text-xs text-text-subtle'>{detail?.file_name ?? 'challenge.zip'}</p>
                                    </div>
                                    {auth.user ? (
                                        <button
                                            className='rounded-lg bg-contrast px-4 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-contrast/80 disabled:opacity-60 cursor-pointer'
                                            type='button'
                                            onClick={downloadFile}
                                            disabled={downloadLoading}
                                        >
                                            {downloadLoading ? t('challenge.downloadPreparing') : t('challenge.download')}
                                        </button>
                                    ) : null}
                                </div>
                                {!auth.user ? <p className='mt-2 text-xs text-warning'>{t('challenge.fileLoginRequired')}</p> : null}
                                {downloadMessage ? <p className='mt-2 text-xs text-danger'>{downloadMessage}</p> : null}
                            </div>
                        </div>
                    ) : null}

                    <div className='mt-6 space-y-6'>
                        {vmEnabled && !isLocked && !isSolved ? (
                            <div className='mt-2 rounded-md border border-border/50 bg-surface-muted/40 p-2 sm:p-4'>
                                <div className='flex items-center justify-between gap-2'>
                                    <h2 className='text-base font-semibold text-text'>{t('challenge.vmInstance')}</h2>
                                    {auth.user && vmInfo ? (
                                        <button
                                            className='rounded-md border border-border/70 bg-surface px-3 py-1.5 text-xs text-text hover:bg-surface-subtle disabled:opacity-60 cursor-pointer'
                                            onClick={() => void loadVM()}
                                            disabled={vmLoading}
                                        >
                                            {t('common.refresh')}
                                        </button>
                                    ) : null}
                                </div>

                                {!auth.user ? (
                                    <p className='mt-3 text-sm text-warning'>{t('challenge.vmLoginRequired')}</p>
                                ) : isSolved ? (
                                    <p className='mt-3 text-sm text-text-muted'>{t('challenge.vmSolvedNoNew')}</p>
                                ) : isCtfEnded && !vmInfo ? (
                                    <p className='mt-3 text-sm text-text-muted'>{t('challenge.vmEndedNotice')}</p>
                                ) : vmInfo ? (
                                    <div className='mt-3 space-y-2 text-sm text-text-muted'>
                                        <p>
                                            {t('challenge.vmStatus')} <span className='text-text'>{vmInfo.status}</span>
                                        </p>
                                        <p>
                                            {t('challenge.vmTtl')} <span className='text-text'>{vmInfo.ttl_expires_at ? formatTimestamp(vmInfo.ttl_expires_at) : t('common.pending')}</span>
                                        </p>
                                        {vmInfo.external_ip && vmInfo.ports?.length > 0 ? (
                                            <div className='mt-3 space-y-3'>
                                                {vmInfo.ports.map((port, index) => {
                                                    const protocol = (port.protocol || '').toUpperCase()
                                                    const isUDP = protocol === 'UDP'
                                                    const isTCP = protocol === 'TCP'
                                                    const httpURL = `http://${vmInfo.external_ip}:${port.host_port}`
                                                    const nc = `nc${isUDP ? ' -u' : ''} ${vmInfo.external_ip} ${port.host_port}`

                                                    return (
                                                        <div key={`${port.container_port}-${port.protocol}-${index}`} className='rounded-md border border-border/40 bg-surface px-3 py-3'>
                                                            <div className='flex flex-wrap items-center justify-between gap-2'>
                                                                <div className='flex items-center gap-2'>
                                                                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${isUDP ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                                        {protocol || 'TCP'}
                                                                    </span>
                                                                    <code className='font-mono text-sm text-text'>{port.host_port}</code>
                                                                    <span className='text-text-muted'>→</span>
                                                                    <code className='font-mono text-sm text-text-muted'>{port.container_port}</code>
                                                                </div>
                                                            </div>
                                                            <div className='mt-3 space-y-3'>
                                                                <div>
                                                                    {isTCP ? (
                                                                        <a
                                                                            href={httpURL}
                                                                            target='_blank'
                                                                            rel='noreferrer'
                                                                            className='block break-all rounded-md border border-border/50 bg-surface-muted/20 px-3 py-2 font-mono text-sm text-accent transition-colors hover:bg-surface-subtle hover:underline'
                                                                        >
                                                                            {httpURL}
                                                                        </a>
                                                                    ) : (
                                                                        <div className='block break-all rounded-md border border-border/50 bg-surface-muted/20 px-3 py-2 font-mono text-sm text-text-subtle'>
                                                                            {t('challenge.vmNoHTTPForProtocol')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                                                                        <code className='flex-1 break-all rounded-md border border-border/50 bg-surface-muted/20 px-3 py-2 font-mono text-sm text-text'>{nc}</code>
                                                                        <button
                                                                            type='button'
                                                                            onClick={() => void handleCopy(nc)}
                                                                            className='rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-subtle'
                                                                        >
                                                                            {copiedValue === nc ? t('common.copied') : t('common.copy')}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className='mt-2 inline-flex items-center rounded-md border border-border/50 bg-surface-muted px-3 py-2 text-sm text-text-muted'>{t('common.pending')}</div>
                                        )}
                                        {vmInfo.last_error ? <p className='text-danger'>{vmInfo.last_error}</p> : null}
                                    </div>
                                ) : (
                                    <p className='mt-3 text-sm text-text-muted'>{t('challenge.vmNoActive')}</p>
                                )}

                                {auth.user ? (
                                    <div className='mt-4 flex flex-wrap gap-2'>
                                        {vmInfo ? (
                                            <button
                                                className='rounded-md border border-danger/20 bg-surface px-3 py-2 text-sm text-danger hover:border-danger/40 disabled:cursor-not-allowed disabled:opacity-50'
                                                onClick={deleteVM}
                                                disabled={vmLoading || isVMPending}
                                            >
                                                {vmLoading ? t('challenge.vmWorking') : t('challenge.deleteVM')}
                                            </button>
                                        ) : !isCtfEnded ? (
                                            <button className='rounded-md bg-accent px-3 py-2 text-sm text-white hover:bg-accent-strong disabled:opacity-60' onClick={createVM} disabled={vmLoading || isSolved}>
                                                {vmLoading ? t('challenge.vmWorking') : t('challenge.createVM')}
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}

                                {vmMessage ? <p className='mt-4 text-sm text-danger'>{vmMessage}</p> : null}
                                {auth.user ? <p className='mt-4 text-sm text-warning'>{t('challenge.vmCreateNotice')}</p> : null}
                            </div>
                        ) : null}
                        {isLocked ? null : isCtfEnded ? (
                            <div className='rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-strong'>{t('challenge.ctfEndedNotice')}</div>
                        ) : !auth.user ? (
                            <div className='rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-strong'>
                                {t('challenge.loginToSubmitPrefix')}{' '}
                                <a className='underline cursor-pointer' href='/login' onClick={(e) => navigate('/login', e)}>
                                    {t('auth.loginLink')}
                                </a>{' '}
                                {t('challenge.loginToSubmitSuffix')}
                            </div>
                        ) : isSolved ? (
                            <div className='rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-success'>{t('challenge.correct')}</div>
                        ) : !isActive ? (
                            <div className='rounded-xl border border-border/40 bg-surface/10 p-4 text-sm text-text-muted'>{t('challenge.inactiveMessage')}</div>
                        ) : (
                            <form
                                className='space-y-4'
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    submitFlag()
                                }}
                            >
                                <div className='flex flex-col gap-3 md:flex-row md:items-end'>
                                    <label className='flex-1 text-sm font-medium text-text'>
                                        <span className='block mb-2'>{t('challenge.enterFlag')}</span>
                                        <input
                                            className='w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                            type='text'
                                            value={flagInput}
                                            onChange={(event) => setFlagInput(event.target.value)}
                                            placeholder={t('challenge.flagPlaceholder')}
                                            autoComplete='off'
                                        />
                                    </label>
                                    <button
                                        className='w-full md:w-auto rounded-xl bg-accent px-6 py-3 text-sm font-medium text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                        type='submit'
                                        disabled={submission.status === 'loading'}
                                    >
                                        {submission.status === 'loading' ? t('challenge.submitting') : t('challenge.submit')}
                                    </button>
                                </div>
                                {submission.message ? (
                                    <div className={`rounded-xl border px-4 py-3 text-sm ${isSuccessful ? 'border-success/40 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger'}`}>{submission.message}</div>
                                ) : null}
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ChallengeModal
