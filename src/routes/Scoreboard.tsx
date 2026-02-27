import { useEffect, useRef, useState } from 'react'
import ScoreboardTimeline from '../components/ScoreboardTimeline'
import ScoreboardLeaderboard from '../components/ScoreboardLeaderboard'
import { useT } from '../lib/i18n'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Scoreboard = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const [viewMode, setViewMode] = useState<'users' | 'teams'>('users')
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true)
    const reconnectTimeoutRef = useRef<number | null>(null)
    const eventSourceRef = useRef<EventSource | null>(null)

    useEffect(() => {
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

        const handleScoreboard = () => {
            setRefreshTrigger((value) => value + 1)
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
    }, [liveUpdatesEnabled])

    return (
        <section className='fade-in'>
            <div className='flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h2 className='text-3xl text-text'>{t('scoreboard.title')}</h2>
                </div>
                <div className='flex flex-wrap gap-3 text-xs text-text'>
                    <div className='flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2'>
                        <button
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                viewMode === 'users'
                                    ? 'bg-accent/20 text-accent-strong'
                                    : 'text-text-muted hover:text-accent'
                            }`}
                            onClick={() => setViewMode('users')}
                        >
                            {t('scoreboard.users')}
                        </button>
                        <button
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                viewMode === 'teams'
                                    ? 'bg-accent/20 text-accent-strong'
                                    : 'text-text-muted hover:text-accent'
                            }`}
                            onClick={() => setViewMode('teams')}
                        >
                            {t('scoreboard.teams')}
                        </button>
                    </div>
                    <button
                        className={`rounded-full border border-border px-3 py-2 text-xs font-semibold transition ${
                            liveUpdatesEnabled ? 'bg-accent/20 text-accent-strong' : 'text-text-muted hover:text-text'
                        }`}
                        onClick={() => setLiveUpdatesEnabled((value) => !value)}
                        type='button'
                    >
                        {t('scoreboard.liveUpdates')} ·{' '}
                        {liveUpdatesEnabled ? t('scoreboard.liveOn') : t('scoreboard.liveOff')}
                    </button>
                </div>
            </div>

            <div className='mt-6 grid min-w-0 grid-cols-1 gap-6'>
                <ScoreboardTimeline mode={viewMode} refreshTrigger={refreshTrigger} />
                <ScoreboardLeaderboard mode={viewMode} refreshTrigger={refreshTrigger} />
            </div>
        </section>
    )
}

export default Scoreboard
