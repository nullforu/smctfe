import { useEffect, useMemo, useRef, useState } from 'react'
import DivisionTabs from '../components/DivisionTabs'
import ScoreboardTimeline from '../components/ScoreboardTimeline'
import ScoreboardLeaderboard from '../components/ScoreboardLeaderboard'
import LoginRequired from '../components/LoginRequired'
import { useT } from '../lib/i18n'
import { useDivision } from '../lib/division'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Scoreboard = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const { state: auth } = useAuth()
    const { config } = useConfig()
    const { divisions, selectedDivisionId, setSelectedDivisionId } = useDivision()
    const [viewMode, setViewMode] = useState<'users' | 'teams'>('teams')
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true)
    const reconnectTimeoutRef = useRef<number | null>(null)
    const eventSourceRef = useRef<EventSource | null>(null)
    const isBeforeStart = useMemo(() => {
        if (!config.ctf_start_at) return false
        const startAt = new Date(config.ctf_start_at).getTime()
        if (Number.isNaN(startAt)) return false
        return Date.now() < startAt
    }, [config.ctf_start_at])

    useEffect(() => {
        if (!auth.user) {
            return () => {}
        }
        if (!liveUpdatesEnabled) {
            if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
                eventSourceRef.current = null
            }
            return
        }
        if (typeof EventSource === 'undefined') return
        const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
        const url = `${apiBase}/api/scoreboard/stream`
        let active = true

        const cleanupEventSource = () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
                eventSourceRef.current = null
            }
        }

        const scheduleReconnect = () => {
            if (!active) return
            if (reconnectTimeoutRef.current !== null) return
            reconnectTimeoutRef.current = window.setTimeout(() => {
                reconnectTimeoutRef.current = null
                connect()
            }, 1000)
        }

        const handleScoreboard = (event: MessageEvent) => {
            if (!selectedDivisionId) {
                setRefreshTrigger((value) => value + 1)
                return
            }
            try {
                const payload = JSON.parse(event.data || '{}')
                const divisionIds: number[] = Array.isArray(payload.division_ids) ? payload.division_ids : []
                if (payload.scope === 'all' || divisionIds.length === 0 || divisionIds.includes(selectedDivisionId)) {
                    setRefreshTrigger((value) => value + 1)
                }
            } catch {
                setRefreshTrigger((value) => value + 1)
            }
        }

        const connect = () => {
            cleanupEventSource()
            const eventSource = new EventSource(url)
            eventSourceRef.current = eventSource
            eventSource.addEventListener('scoreboard', handleScoreboard)
            eventSource.onerror = () => {
                cleanupEventSource()
                scheduleReconnect()
            }
        }

        setRefreshTrigger((value) => value + 1)
        connect()

        return () => {
            active = false
            if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
            cleanupEventSource()
        }
    }, [auth.user, liveUpdatesEnabled, selectedDivisionId])

    useEffect(() => {
        if (selectedDivisionId) {
            setRefreshTrigger((value) => value + 1)
        }
    }, [selectedDivisionId])

    if (!auth.user) {
        return <LoginRequired title={t('scoreboard.title')} />
    }

    return (
        <section className='animate space-y-6'>
            <div className='border-2 border-border bg-linear-to-br from-surface via-surface to-surface-muted px-5 py-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:px-7'>
                <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>{t('nav.scoreboard')}</p>
                <h2 className='mt-2 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text'>{t('scoreboard.title')}</h2>
            </div>

            <div className='space-y-3'>
                <DivisionTabs divisions={divisions} selectedId={selectedDivisionId} onSelect={(id) => id && setSelectedDivisionId(id)} />

                <div className='flex flex-wrap items-center justify-end gap-3'>
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as 'users' | 'teams')}
                        className='border-2 border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text outline-none focus:border-accent'
                    >
                        <option value='teams'>{t('scoreboard.teams')}</option>
                        <option value='users'>{t('scoreboard.users')}</option>
                    </select>

                    <select
                        value={liveUpdatesEnabled ? 'on' : 'off'}
                        onChange={(e) => setLiveUpdatesEnabled(e.target.value === 'on')}
                        className='border-2 border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text outline-none focus:border-accent'
                    >
                        <option value='on'>{t('scoreboard.liveOn')}</option>
                        <option value='off'>{t('scoreboard.liveOff')}</option>
                    </select>
                </div>

                <div className='grid min-w-0 grid-cols-1 gap-6'>
                    <ScoreboardTimeline mode={viewMode} refreshTrigger={refreshTrigger} divisionId={selectedDivisionId ?? undefined} />
                    <ScoreboardLeaderboard mode={viewMode} refreshTrigger={refreshTrigger} divisionId={selectedDivisionId ?? undefined} isBeforeStart={isBeforeStart} />
                </div>
            </div>
        </section>
    )
}

export default Scoreboard
