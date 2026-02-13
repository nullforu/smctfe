import { useState } from 'react'
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
                </div>
            </div>

            <div className='mt-6 grid min-w-0 grid-cols-1 gap-6'>
                <ScoreboardTimeline mode={viewMode} />
                <ScoreboardLeaderboard mode={viewMode} />
            </div>
        </section>
    )
}

export default Scoreboard
