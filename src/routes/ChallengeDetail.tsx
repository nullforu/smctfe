import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { formatApiError, formatDateTime, parseRouteId } from '../lib/utils'
import type { Challenge, CtfState, VM } from '../lib/types'
import { getCategoryKey, getLocaleTag, useLocale, useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/useApi'
import Markdown from '../components/Markdown'
import LoginRequired from '../components/LoginRequired'
import Skeleton from '../components/Skeleton'

interface RouteProps {
    routeParams?: Record<string, string>
}

interface SubmissionState {
    status: 'idle' | 'loading' | 'success' | 'error'
    message?: string
}

const VM_POLL_FAST_MS = 2000
const VM_POLL_SLOW_MS = 60000
const vmPollInterval = (status?: string | null) => (status?.toLowerCase() === 'running' ? VM_POLL_SLOW_MS : VM_POLL_FAST_MS)
const vmShouldPoll = (status?: string | null) => {
    const normalized = (status || '').trim().toLowerCase()
    return normalized !== '' && normalized !== 'failed' && normalized !== 'error'
}

const ChallengeDetail = ({ routeParams = {} }: RouteProps) => {
    const t = useT()
    const api = useApi()
    const { state: auth } = useAuth()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const challengeId = useMemo(() => parseRouteId(routeParams.id), [routeParams.id])
    const [challenge, setChallenge] = useState<Challenge | null>(null)
    const [ctfState, setCtfState] = useState<CtfState>('active')
    const [isSolved, setIsSolved] = useState(false)
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [flagInput, setFlagInput] = useState('')
    const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' })
    const [downloadLoading, setDownloadLoading] = useState(false)
    const [downloadMessage, setDownloadMessage] = useState('')
    const [vmInfo, setVMInfo] = useState<VM | null>(null)
    const [vmActionLoading, setVMActionLoading] = useState(false)
    const [vmRefreshing, setVMRefreshing] = useState(false)
    const [vmMessage, setVMMessage] = useState('')
    const [copiedValue, setCopiedValue] = useState('')
    const vmRequestInFlightRef = useRef(false)

    const isLocked = challenge?.is_locked === true
    const detail = challenge && !isLocked && 'description' in challenge ? challenge : null
    const isActive = challenge && 'is_active' in challenge ? challenge.is_active !== false : true
    const isCtfEnded = ctfState === 'ended'
    const hasFile = !!detail?.has_file
    const vmEnabled = !!detail?.vm_enabled
    const solveCount = challenge && 'solve_count' in challenge ? challenge.solve_count : null
    const isVMPending = vmInfo?.status?.toLowerCase() === 'pending'
    const previousChallengeId = challenge?.previous_challenge_id ?? null
    const previousChallengeTitle = isLocked ? (challenge.previous_challenge_title ?? null) : null
    const previousChallengeCategory = isLocked ? (challenge.previous_challenge_category ?? null) : null

    const formatTimestamp = (value?: string | null) => {
        if (!value) return t('common.na')
        return formatDateTime(value, localeTag)
    }

    const loadChallenge = async () => {
        if (!challengeId || !auth.user?.division_id) {
            setLoading(false)
            return
        }

        setLoading(true)
        setErrorMessage('')

        try {
            const [challengeList, solvedRows] = await Promise.all([api.challenges(auth.user.division_id), api.teamSolved(auth.user.team_id)])
            const challengeData = challengeList.challenges.find((item) => item.id === challengeId) ?? null
            if (!challengeData) {
                setErrorMessage(t('errors.notFound'))
                setChallenge(null)
                return
            }
            setChallenge(challengeData)
            setCtfState(challengeList.ctf_state)
            setIsSolved(solvedRows.some((item) => item.challenge_id === challengeId))
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
            setChallenge(null)
        } finally {
            setLoading(false)
        }
    }

    const reloadSolved = async () => {
        if (!auth.user || !challengeId) return
        try {
            const solvedRows = await api.teamSolved(auth.user.team_id)
            setIsSolved(solvedRows.some((item) => item.challenge_id === challengeId))
        } catch {
            setIsSolved(false)
        }
    }

    const submitFlag = async () => {
        if (!challenge || isLocked) return
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
                setIsSolved(true)
                await reloadSolved()
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
                setIsSolved(true)
                await reloadSolved()
                return
            }

            const formatted = formatApiError(error, t)
            setSubmission({ status: 'error', message: formatted.message })
        }
    }

    const downloadFile = async () => {
        if (!challenge || !hasFile || downloadLoading) return

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

    const loadVM = useEffectEvent(async ({ background = false }: { background?: boolean } = {}) => {
        if (!auth.user || !challenge || !vmEnabled || vmRequestInFlightRef.current) return null

        vmRequestInFlightRef.current = true
        if (background) setVMRefreshing(true)
        else setVMActionLoading(true)
        setVMMessage('')

        try {
            const result = await api.getVM(challenge.id)
            if ('vm_id' in result) {
                setVMInfo(result)
                return result
            }

            setVMInfo(null)
            setVMMessage(t('challenge.vmNotStarted'))
            return null
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                setVMInfo(null)
                setVMMessage('')
                return null
            }

            const formatted = formatApiError(error, t)
            setVMMessage(formatted.message)
            return vmInfo
        } finally {
            vmRequestInFlightRef.current = false
            if (background) setVMRefreshing(false)
            else setVMActionLoading(false)
        }
    })

    const createVM = async () => {
        if (!challenge || isSolved || vmActionLoading || vmRefreshing || !auth.user) return

        setVMActionLoading(true)
        setVMMessage('')

        try {
            const created = await api.createVM(challenge.id)
            setVMInfo(created)
        } catch (error) {
            const formatted = formatApiError(error, t)
            setVMMessage(formatted.message)
        } finally {
            setVMActionLoading(false)
        }
    }

    const deleteVM = async () => {
        if (!challenge || vmActionLoading || vmRefreshing || !auth.user) return

        setVMActionLoading(true)
        setVMMessage('')

        try {
            await api.deleteVM(challenge.id)
            setVMInfo(null)
        } catch (error) {
            const formatted = formatApiError(error, t)
            setVMMessage(formatted.message)
        } finally {
            setVMActionLoading(false)
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
        void loadChallenge()
    }, [auth.user?.division_id, auth.user?.team_id, challengeId])

    useEffect(() => {
        if (!auth.user || !vmEnabled || !challenge) {
            setVMInfo(null)
            setVMActionLoading(false)
            setVMRefreshing(false)
            setVMMessage('')
            return
        }

        void loadVM()
    }, [auth.user, vmEnabled, challenge?.id])

    useEffect(() => {
        if (!auth.user || !vmEnabled || !vmInfo || !vmShouldPoll(vmInfo.status)) return

        let cancelled = false
        let timeoutId: ReturnType<typeof setTimeout> | undefined

        const scheduleNext = (delay: number) => {
            timeoutId = window.setTimeout(async () => {
                const latest = await loadVM({ background: true })
                if (cancelled || !latest || !vmShouldPoll(latest.status)) return
                scheduleNext(vmPollInterval(latest.status))
            }, delay)
        }

        scheduleNext(vmPollInterval(vmInfo.status))

        return () => {
            cancelled = true
            if (timeoutId !== undefined) window.clearTimeout(timeoutId)
        }
    }, [auth.user, vmEnabled, vmInfo?.vm_id, vmInfo?.status])

    if (!auth.user) {
        return <LoginRequired title={t('challenges.title')} />
    }

    if (loading) {
        return (
            <section className='animate space-y-6'>
                <Skeleton className='h-4 w-28' />
                <div className='grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]'>
                    <article className='overflow-hidden border-2 border-border bg-surface shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                        <div className='border-b-2 border-border bg-surface-muted/60 px-5 py-5 sm:px-7'>
                            <div className='space-y-4'>
                                <Skeleton className='h-3 w-28' />
                                <Skeleton className='h-10 w-2/3' />
                                <div className='flex flex-wrap gap-2'>
                                    <Skeleton className='h-8 w-24' />
                                    <Skeleton className='h-8 w-28' />
                                </div>
                            </div>
                        </div>
                        <div className='space-y-4 px-5 py-6 sm:px-7 sm:py-7'>
                            <Skeleton className='h-4 w-full' />
                            <Skeleton className='h-4 w-[96%]' />
                            <Skeleton className='h-4 w-[90%]' />
                            <Skeleton className='h-4 w-[88%]' />
                            <Skeleton className='h-4 w-[93%]' />
                            <Skeleton className='h-28 w-full' />
                        </div>
                    </article>
                    <aside className='space-y-4 xl:sticky xl:top-6 xl:self-start'>
                        <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                            <Skeleton className='h-5 w-28' />
                            <div className='mt-4 space-y-3'>
                                <Skeleton className='h-12 w-full' />
                                <Skeleton className='h-11 w-full' />
                                <Skeleton className='h-14 w-full' />
                            </div>
                        </div>
                        <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                            <Skeleton className='h-5 w-32' />
                            <div className='mt-4 space-y-3'>
                                <Skeleton className='h-12 w-full' />
                                <Skeleton className='h-12 w-full' />
                                <Skeleton className='h-12 w-4/5' />
                            </div>
                        </div>
                    </aside>
                </div>
                <p className='sr-only'>{t('common.loading')}</p>
            </section>
        )
    }

    if (errorMessage || !challenge) {
        return (
            <section className='animate'>
                <div className='border-2 border-danger/30 bg-danger/10 p-8 text-center font-mono text-sm uppercase tracking-[0.14em] text-danger'>{errorMessage || t('errors.requestFailed')}</div>
            </section>
        )
    }

    return (
        <section className='animate space-y-6'>
            <button className='inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.16em] text-text-muted transition hover:text-accent' type='button' onClick={() => navigate('/challenges')}>
                <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='m15 18-6-6 6-6' />
                </svg>
                {t('challenges.title')}
            </button>

            <div className='grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]'>
                <article className='overflow-hidden border-2 border-border bg-surface shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                    <div className='border-b-2 border-border bg-surface-muted/60 px-5 py-5 sm:px-7'>
                        <div className='flex flex-wrap items-start justify-between gap-4'>
                            <div className='space-y-3'>
                                <div className='flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-text-subtle'>
                                    <span>{challenge.id.toString().padStart(3, '0')}</span>
                                    <span className='h-1 w-1 bg-border' />
                                    <span>{t(getCategoryKey(challenge.category))}</span>
                                </div>
                                <h1 className='font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text sm:text-4xl'>{challenge.title}</h1>
                                <div className='flex flex-wrap items-center gap-2 text-sm text-text-muted'>
                                    <span className='border-2 border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]'>{t('common.pointsShort', { points: challenge.points })}</span>
                                    {solveCount !== null ? <span className='border-2 border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]'>{t('challenge.solvedCount', { count: solveCount })}</span> : null}
                                </div>
                            </div>
                            {isLocked ? (
                                <span className='border-2 border-warning/40 bg-warning/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-warning-strong'>{t('challenge.lockedLabel')}</span>
                            ) : isSolved ? (
                                <span className='border-2 border-success/40 bg-success/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-success'>{t('challenge.solvedLabel')}</span>
                            ) : !isActive ? (
                                <span className='border-2 border-border bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted'>{t('challenge.inactiveLabel')}</span>
                            ) : null}
                        </div>
                    </div>

                    <div className='space-y-6 px-5 py-6 sm:px-7 sm:py-7'>
                        {isLocked ? (
                            <div className='border-2 border-warning/40 bg-warning/10 p-5 text-sm text-warning-strong'>
                                <p>{t('challenge.lockedNotice')}</p>
                                {previousChallengeId ? (
                                    <p className='mt-2 text-xs'>
                                        {t('challenge.lockedRequirement', {
                                            id: previousChallengeId,
                                            title: previousChallengeTitle ?? t('common.na'),
                                            category: previousChallengeCategory ?? t('common.na'),
                                        })}
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <div className='prose prose-sm max-w-none text-text dark:prose-invert sm:prose-base'>
                                <Markdown className='break-keep' content={detail?.description ?? ''} />
                            </div>
                        )}

                        {hasFile ? (
                            <div className='border-2 border-border bg-surface-muted/70 p-5'>
                                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                                    <div>
                                        <p className='font-display text-sm font-semibold uppercase tracking-[0.08em] text-text'>{t('challenge.fileTitle')}</p>
                                        <p className='mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle'>{detail?.file_name ?? 'challenge.zip'}</p>
                                    </div>
                                    <button
                                        className='inline-flex items-center justify-center border-2 border-contrast bg-contrast px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-contrast-foreground transition hover:bg-contrast/85 disabled:opacity-60'
                                        type='button'
                                        onClick={downloadFile}
                                        disabled={downloadLoading}
                                    >
                                        {downloadLoading ? t('challenge.downloadPreparing') : t('challenge.download')}
                                    </button>
                                </div>
                                {downloadMessage ? <p className='mt-3 text-xs text-danger'>{downloadMessage}</p> : null}
                            </div>
                        ) : null}
                    </div>
                </article>

                <aside className='space-y-4 xl:sticky xl:top-6 xl:self-start'>
                    <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                        <h2 className='font-display text-base font-semibold uppercase tracking-[0.12em] text-text'>{t('challenge.submit')}</h2>

                        <div className='mt-4 space-y-3 text-sm'>
                            {isLocked ? null : isCtfEnded ? (
                                <div className='border-2 border-warning/40 bg-warning/10 p-4 text-warning-strong'>{t('challenge.ctfEndedNotice')}</div>
                            ) : isSolved ? (
                                <div className='border-2 border-success/40 bg-success/10 p-4 text-success'>{t('challenge.correct')}</div>
                            ) : !isActive ? (
                                <div className='border-2 border-border bg-surface-muted p-4 text-text-muted'>{t('challenge.inactiveMessage')}</div>
                            ) : (
                                <form
                                    className='space-y-3'
                                    onSubmit={(event) => {
                                        event.preventDefault()
                                        void submitFlag()
                                    }}
                                >
                                    <input
                                        className='w-full border-2 border-border bg-surface-muted px-4 py-3 font-mono text-sm tracking-[0.04em] text-text focus:border-accent focus:outline-none'
                                        type='text'
                                        value={flagInput}
                                        onChange={(event) => setFlagInput(event.target.value)}
                                        placeholder={t('challenge.flagPlaceholder')}
                                        autoComplete='off'
                                    />
                                    <button
                                        className='w-full border-2 border-accent bg-accent px-4 py-3 font-mono text-xs font-medium uppercase tracking-[0.16em] text-accent-foreground transition hover:bg-accent-strong disabled:opacity-60'
                                        type='submit'
                                        disabled={submission.status === 'loading'}
                                    >
                                        {submission.status === 'loading' ? t('challenge.submitting') : t('challenge.submit')}
                                    </button>
                                </form>
                            )}

                            {submission.message ? (
                                <div
                                    className={`border-2 px-4 py-3 font-mono text-sm uppercase tracking-[0.12em] ${submission.status === 'success' ? 'border-success/40 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger'}`}
                                >
                                    {submission.message}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {vmEnabled && !isLocked ? (
                        <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
                            <div className='flex items-center justify-between gap-3'>
                                <h2 className='font-display text-base font-semibold uppercase tracking-[0.12em] text-text'>{t('challenge.vmInstance')}</h2>
                                {auth.user && vmInfo ? (
                                    <button
                                        className='border-2 border-border bg-surface-muted px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-text transition hover:bg-surface'
                                        type='button'
                                        onClick={() => void loadVM()}
                                        disabled={vmActionLoading || vmRefreshing}
                                    >
                                        {t('common.refresh')}
                                    </button>
                                ) : null}
                            </div>

                            <div className='mt-4 space-y-3 text-sm'>
                                {isSolved ? <p className='border-2 border-success/30 bg-success/10 p-4 text-success'>{t('challenge.vmSolvedNoNew')}</p> : null}
                                {!isSolved && isCtfEnded && !vmInfo ? <p className='border-2 border-border bg-surface-muted p-4 text-text-muted'>{t('challenge.vmEndedNotice')}</p> : null}
                                {!isSolved && !isCtfEnded && !vmInfo ? <p className='border-2 border-border bg-surface-muted p-4 text-text-muted'>{t('challenge.vmNoActive')}</p> : null}

                                {vmInfo ? (
                                    <div className='space-y-3'>
                                        <div className='border-2 border-border bg-surface-muted/70 p-4'>
                                            <p className='font-mono text-[11px] uppercase tracking-[0.14em] text-text-subtle'>{t('challenge.vmStatus')}</p>
                                            <p className='mt-1 font-medium text-text'>{vmInfo.status}</p>
                                            <p className='mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-text-subtle'>{t('challenge.vmTtl')}</p>
                                            <p className='mt-1 text-text'>{vmInfo.ttl_expires_at ? formatTimestamp(vmInfo.ttl_expires_at) : t('common.pending')}</p>
                                        </div>

                                        {vmInfo.external_ip && vmInfo.ports?.length > 0 ? (
                                            <div className='space-y-3'>
                                                {vmInfo.ports.map((port, index) => {
                                                    const protocol = (port.protocol || '').toUpperCase()
                                                    const isUDP = protocol === 'UDP'
                                                    const isTCP = protocol === 'TCP'
                                                    const httpURL = `http://${vmInfo.external_ip}:${port.host_port}`
                                                    const nc = `nc${isUDP ? ' -u' : ''} ${vmInfo.external_ip} ${port.host_port}`

                                                    return (
                                                        <div key={`${port.container_port}-${port.protocol}-${index}`} className='border-2 border-border bg-surface-muted/70 p-4'>
                                                            <div className='flex flex-wrap items-center gap-2'>
                                                                <span
                                                                    className={`border border-current px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${isUDP ? 'bg-warning/15 text-warning-strong' : 'bg-success/15 text-success'}`}
                                                                >
                                                                    {protocol || 'TCP'}
                                                                </span>
                                                                <code className='text-xs text-text'>{port.host_port}</code>
                                                                <span className='text-text-subtle'>→</span>
                                                                <code className='text-xs text-text-subtle'>{port.container_port}</code>
                                                            </div>
                                                            <div className='mt-3 space-y-2'>
                                                                {isTCP ? (
                                                                    <a
                                                                        href={httpURL}
                                                                        target='_blank'
                                                                        rel='noreferrer'
                                                                        className='block break-all border-2 border-border bg-surface px-3 py-2 font-mono text-xs text-accent transition hover:bg-surface-muted'
                                                                    >
                                                                        {httpURL}
                                                                    </a>
                                                                ) : (
                                                                    <div className='border-2 border-border bg-surface px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-text-subtle'>{t('challenge.vmNoHTTPForProtocol')}</div>
                                                                )}
                                                                <div className='flex flex-col gap-2 sm:flex-row'>
                                                                    <code className='flex-1 break-all border-2 border-border bg-surface px-3 py-2 font-mono text-xs text-text'>{nc}</code>
                                                                    <button
                                                                        className='border-2 border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-text transition hover:bg-surface-muted'
                                                                        type='button'
                                                                        onClick={() => void handleCopy(nc)}
                                                                    >
                                                                        {copiedValue === nc ? t('common.copied') : t('common.copy')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {!isSolved && auth.user ? (
                                    <div className='flex flex-wrap gap-2'>
                                        {vmInfo ? (
                                            <button
                                                className='flex-1 border-2 border-danger/30 bg-danger/10 px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-danger transition hover:bg-danger/15 disabled:opacity-50'
                                                type='button'
                                                onClick={deleteVM}
                                                disabled={vmActionLoading || vmRefreshing || isVMPending}
                                            >
                                                {vmActionLoading ? t('challenge.vmWorking') : t('challenge.deleteVM')}
                                            </button>
                                        ) : !isCtfEnded ? (
                                            <button
                                                className='flex-1 border-2 border-accent bg-accent px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent-foreground transition hover:bg-accent-strong disabled:opacity-60'
                                                type='button'
                                                onClick={createVM}
                                                disabled={vmActionLoading || vmRefreshing}
                                            >
                                                {vmActionLoading ? t('challenge.vmWorking') : t('challenge.createVM')}
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}

                                {vmMessage ? <p className='text-sm text-danger'>{vmMessage}</p> : null}
                                {vmInfo?.last_error ? <p className='text-sm text-danger'>{vmInfo.last_error}</p> : null}
                                <p className='text-xs text-text-subtle'>{t('challenge.vmCreateNotice')}</p>
                            </div>
                        </div>
                    ) : null}
                </aside>
            </div>
        </section>
    )
}

export default ChallengeDetail
