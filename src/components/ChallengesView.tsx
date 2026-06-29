import { getCategoryKey, useT } from '../lib/i18n'
import type { Challenge } from '../lib/types'
import Skeleton from './Skeleton'

interface ChallengeCardProps {
    challenge: Challenge
    isSolved: boolean
    onClick: () => void
}

const ChallengeCard = ({ challenge, isSolved, onClick }: ChallengeCardProps) => {
    const t = useT()
    const isLocked = challenge.is_locked === true
    const isActive = 'is_active' in challenge ? challenge.is_active !== false : true
    const stateBadgeClass = isLocked
        ? 'border-warning/50 bg-warning/18 text-warning-strong'
        : isSolved
          ? 'border-success/50 bg-success/18 text-success'
          : !isActive
            ? 'border-border bg-surface-muted text-text-muted'
            : 'border-accent/45 bg-accent text-accent-foreground'
    const cardStateClass = isLocked
        ? 'border-warning/55 bg-[linear-gradient(180deg,rgba(var(--color-warning)/0.2)_0,rgba(var(--color-warning)/0.08)_22%,rgba(var(--color-surface)/1)_22%,rgba(var(--color-surface)/1)_100%)] shadow-[4px_4px_0_rgba(190,132,92,0.18)]'
        : isSolved
          ? 'border-success/55 bg-[linear-gradient(180deg,rgba(var(--color-success)/0.22)_0,rgba(var(--color-success)/0.1)_22%,rgba(var(--color-surface)/1)_22%,rgba(var(--color-surface)/1)_100%)] shadow-[4px_4px_0_rgba(110,137,113,0.2)]'
          : !isActive
            ? 'border-border bg-[linear-gradient(180deg,rgba(var(--color-surface-muted)/1)_0,rgba(var(--color-surface-muted)/1)_22%,rgba(var(--color-surface)/1)_22%,rgba(var(--color-surface)/1)_100%)] shadow-[4px_4px_0_rgba(120,98,68,0.08)]'
            : 'border-accent/65 bg-[linear-gradient(180deg,rgba(var(--color-accent)/0.18)_0,rgba(var(--color-accent)/0.07)_22%,rgba(var(--color-surface)/1)_22%,rgba(var(--color-surface)/1)_100%)] shadow-[4px_4px_0_rgba(173,92,126,0.18)]'
    const stateLabel = isLocked ? t('challenge.lockedLabel') : isSolved ? t('challenge.solvedLabel') : !isActive ? t('challenge.inactiveLabel') : t(getCategoryKey(challenge.category))
    const stateSymbol = isLocked ? 'LOCK' : isSolved ? 'DONE' : !isActive ? 'OFF' : 'OPEN'
    const footerMessage = isLocked ? t('challenge.lockedNotice') : isSolved ? t('challenge.correct') : !isActive ? t('challenge.inactiveLabel') : t('challenge.submit')
    const titleClass = isLocked ? 'text-warning-strong' : isSolved ? 'text-success' : 'text-text'

    return (
        <button
            type='button'
            className={`w-full border-2 p-5 text-left transition hover:-translate-y-0.5 hover:bg-surface-muted/70 ${cardStateClass} ${!isActive && !isLocked ? 'opacity-60' : ''}`}
            onClick={onClick}
            disabled={!isActive && !isLocked}
        >
            <div className='mb-4 flex flex-col items-start gap-2 border-b-2 border-current/10 pb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-text-subtle sm:flex-row sm:items-center sm:justify-between'>
                <span>{stateSymbol}</span>
                <span className={`inline-flex border px-2 py-1 ${stateBadgeClass}`}>{stateLabel}</span>
            </div>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
                <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-text-subtle'>
                        <span>{challenge.id.toString().padStart(3, '0')}</span>
                        <span>{t(getCategoryKey(challenge.category))}</span>
                    </div>
                    <h3 className={`mt-3 break-keep font-display text-base font-semibold uppercase tracking-[0.08em] ${titleClass}`}>{challenge.title}</h3>
                </div>
                <div className='shrink-0 text-left sm:text-right'>
                    <p className='text-sm font-semibold text-text'>{t('common.pointsShort', { points: challenge.points })}</p>
                </div>
            </div>

            <div className='mt-4 flex flex-col gap-2 border-t-2 border-border/70 pt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
                <span>{'solve_count' in challenge ? t('challenge.solvedCount', { count: challenge.solve_count }) : ''}</span>
                <span className='max-w-full text-left wrap-break-word sm:max-w-[58%] sm:text-right'>{footerMessage}</span>
            </div>
        </button>
    )
}

interface ChallengesViewProps {
    title: string
    summaryText?: string
    stackSummaryText?: string
    showSummary: boolean
    groupByCategory: boolean
    toggleLabel: string
    onGroupByCategoryChange: (checked: boolean) => void
    loading: boolean
    refreshing: boolean
    loadingText: string
    errorMessage: string
    notStarted: boolean
    notStartedText: string
    startAtLabel: string
    startAtValue: string
    endAtLabel: string
    endAtValue: string
    ended: boolean
    endedText: string
    challenges: Challenge[]
    groupedCategories: Array<{ id: string; label: string; items: Challenge[] }>
    solvedIds: Set<number>
    onSelectChallenge: (challenge: Challenge) => void
}

const ChallengesView = ({
    title,
    summaryText,
    stackSummaryText,
    showSummary,
    groupByCategory,
    toggleLabel,
    onGroupByCategoryChange,
    loading,
    refreshing,
    loadingText,
    errorMessage,
    notStarted,
    notStartedText,
    startAtLabel,
    startAtValue,
    endAtLabel,
    endAtValue,
    ended,
    endedText,
    challenges,
    groupedCategories,
    solvedIds,
    onSelectChallenge,
}: ChallengesViewProps) => {
    const t = useT()

    const renderCardGrid = (items: Challenge[]) => (
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            {items.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} isSolved={solvedIds.has(challenge.id)} onClick={() => onSelectChallenge(challenge)} />
            ))}
        </div>
    )

    const renderChallengeCardSkeleton = (key: string) => (
        <div key={key} className='border-2 border-border bg-surface p-5 shadow-[4px_4px_0_rgba(120,98,68,0.1)]'>
            <div className='space-y-4'>
                <div className='flex items-start justify-between gap-4'>
                    <div className='min-w-0 flex-1 space-y-3'>
                        <Skeleton className='h-3 w-24' />
                        <Skeleton className='h-5 w-4/5' />
                        <Skeleton className='h-4 w-2/5' />
                    </div>
                    <Skeleton className='h-4 w-12' />
                </div>
                <div className='border-t-2 border-border/70 pt-3'>
                    <div className='flex items-center justify-between gap-3'>
                        <Skeleton className='h-3 w-24' />
                        <Skeleton className='h-3 w-16' />
                    </div>
                </div>
            </div>
        </div>
    )

    const renderLoadingSkeleton = () => {
        if (groupByCategory) {
            return (
                <div className='space-y-8'>
                    {Array.from({ length: 4 }, (_, categoryIdx) => (
                        <div key={`challenge-category-skeleton-${categoryIdx}`} className='space-y-3'>
                            <div className='flex items-center justify-between gap-3'>
                                <Skeleton className='h-6 w-36' />
                                <Skeleton className='h-4 w-8' />
                            </div>
                            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>{Array.from({ length: 6 }, (_, itemIdx) => renderChallengeCardSkeleton(`challenge-skeleton-${categoryIdx}-${itemIdx}`))}</div>
                        </div>
                    ))}
                    <p className='sr-only'>{loadingText}</p>
                </div>
            )
        }

        return (
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                {Array.from({ length: 15 }, (_, idx) => renderChallengeCardSkeleton(`challenge-skeleton-${idx}`))}
                <p className='sr-only'>{loadingText}</p>
            </div>
        )
    }

    const renderRefreshingOverlay = () => {
        if (!refreshing) return null

        if (groupByCategory) {
            return (
                <div className='pointer-events-none absolute inset-0 bg-background/38 p-1 backdrop-blur-[1px]'>
                    <div className='space-y-8'>
                        {Array.from({ length: Math.max(groupedCategories.filter((category) => category.items.length > 0).length, 3) }, (_, categoryIdx) => (
                            <div key={`challenge-refresh-category-${categoryIdx}`} className='space-y-3'>
                                <div className='flex items-center justify-between gap-3'>
                                    <Skeleton className='h-5 w-32' />
                                    <Skeleton className='h-4 w-8' />
                                </div>
                                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                                    {Array.from({ length: 6 }, (_, itemIdx) => (
                                        <div key={`challenge-refresh-card-${categoryIdx}-${itemIdx}`} className='border-2 border-border/50 bg-surface/70 p-5'>
                                            <div className='space-y-4'>
                                                <div className='flex items-start justify-between gap-4'>
                                                    <div className='min-w-0 flex-1 space-y-3'>
                                                        <Skeleton className='h-3 w-20' />
                                                        <Skeleton className='h-5 w-3/4' />
                                                    </div>
                                                    <Skeleton className='h-4 w-12' />
                                                </div>
                                                <Skeleton className='h-3 w-full' />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }

        return (
            <div className='pointer-events-none absolute inset-0 bg-background/38 p-1 backdrop-blur-[1px]'>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                    {Array.from({ length: Math.max(challenges.length, 12) }, (_, idx) => (
                        <div key={`challenge-refresh-grid-${idx}`} className='border-2 border-border/50 bg-surface/70 p-5'>
                            <div className='space-y-4'>
                                <div className='flex items-start justify-between gap-4'>
                                    <div className='min-w-0 flex-1 space-y-3'>
                                        <Skeleton className='h-3 w-20' />
                                        <Skeleton className='h-5 w-4/5' />
                                    </div>
                                    <Skeleton className='h-4 w-12' />
                                </div>
                                <div className='border-t-2 border-border/40 pt-3'>
                                    <div className='flex items-center justify-between gap-3'>
                                        <Skeleton className='h-3 w-20' />
                                        <Skeleton className='h-3 w-16' />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const renderBody = () => {
        if (loading) {
            return renderLoadingSkeleton()
        }

        if (errorMessage) {
            return <div className='border-2 border-danger/40 bg-danger/10 p-6 font-mono text-sm uppercase tracking-[0.14em] text-danger'>{errorMessage}</div>
        }

        if (notStarted) {
            return (
                <div className='border-2 border-warning/40 bg-warning/10 p-6 text-sm text-warning-strong'>
                    <p>{notStartedText}</p>
                    <div className='mt-3 grid gap-2 text-xs text-text-muted sm:grid-cols-2'>
                        <p>
                            {startAtLabel}: {startAtValue}
                        </p>
                        <p>
                            {endAtLabel}: {endAtValue}
                        </p>
                    </div>
                </div>
            )
        }

        if (challenges.length === 0) {
            return <div className='border-2 border-border bg-surface p-8 text-center font-mono text-sm uppercase tracking-[0.14em] text-text-muted'>{t('admin.manage.noChallenges')}</div>
        }

        return (
            <div className='relative space-y-6'>
                {ended ? <div className='border-2 border-warning/40 bg-warning/10 p-6 text-sm text-warning-strong'>{endedText}</div> : null}
                {groupByCategory ? (
                    <div className='space-y-8'>
                        {groupedCategories.map((category) => {
                            if (category.items.length === 0) return null
                            return (
                                <div key={category.id} className='space-y-3'>
                                    <div className='flex items-center justify-between gap-3'>
                                        <h3 className='font-display text-2xl font-semibold uppercase tracking-[0.08em] text-text'>{category.label}</h3>
                                        <span className='font-mono text-xs uppercase tracking-[0.14em] text-text-subtle'>{category.items.length}</span>
                                    </div>
                                    {renderCardGrid(category.items)}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    renderCardGrid(challenges)
                )}
                {renderRefreshingOverlay()}
            </div>
        )
    }

    return (
        <section className='fade-in space-y-6'>
            <div className='border-2 border-border bg-linear-to-br from-surface via-surface to-surface-muted px-5 py-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:px-7'>
                <div className='flex flex-wrap items-end justify-between gap-4'>
                    <div>
                        <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>{t('nav.challenges')}</p>
                        <h2 className='mt-2 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text'>{title}</h2>
                    </div>
                    {(showSummary && summaryText) || stackSummaryText ? (
                        <div className='border-2 border-border bg-surface px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text shadow-[4px_4px_0_rgba(120,98,68,0.1)]'>
                            {showSummary && summaryText ? <p>{summaryText}</p> : null}
                            {stackSummaryText ? <p className={`${showSummary && summaryText ? 'mt-1' : ''} text-text-muted`}>{stackSummaryText}</p> : null}
                        </div>
                    ) : null}
                </div>
            </div>
            <div className='space-y-4 md:px-3 md:pb-3'>
                <div className='flex items-center justify-end'>
                    <label className='inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted'>
                        <input className='h-4 w-4 accent-accent' type='checkbox' checked={groupByCategory} onChange={(event) => onGroupByCategoryChange(event.target.checked)} />
                        <span>{toggleLabel}</span>
                    </label>
                </div>
            </div>

            {renderBody()}
        </section>
    )
}

export default ChallengesView
