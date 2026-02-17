import { useEffect, useMemo, useState } from 'react'
import { formatApiError } from '../lib/utils'
import type { Challenge, CtfState } from '../lib/types'
import ChallengeCard from '../components/ChallengeCard'
import ChallengeModal from '../components/ChallengeModal'
import { getLocaleTag, getCategoryKey, useLocale, useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'
import { useConfig } from '../lib/config'
import { CHALLENGE_CATEGORIES } from '../lib/constants'

interface RouteProps {
    routeParams?: Record<string, string>
}

const CATEGORY_SET = new Set<string>(CHALLENGE_CATEGORIES)
const GROUP_BY_CATEGORY_STORAGE_KEY = 'smctf.challenges.groupByCategory'

const loadGroupByCategory = () => {
    if (typeof localStorage === 'undefined') return true

    const saved = localStorage.getItem(GROUP_BY_CATEGORY_STORAGE_KEY)
    if (saved === null) return true

    return saved === 'true'
}

const persistGroupByCategory = (value: boolean) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GROUP_BY_CATEGORY_STORAGE_KEY, String(value))
    }
}

const Challenges = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const api = useApi()
    const { config } = useConfig()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set())
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
    const [ctfState, setCtfState] = useState<CtfState>('active')
    const [groupByCategory, setGroupByCategory] = useState<boolean>(() => loadGroupByCategory())

    const activeChallenges = useMemo(() => challenges.filter((challenge) => challenge.is_active), [challenges])
    const inactiveChallenges = useMemo(() => challenges.filter((challenge) => !challenge.is_active), [challenges])
    const solvedCount = useMemo(() => solvedIds.size, [solvedIds])

    const challengesByCategory = useMemo(() => {
        const grouped = new Map<string, Challenge[]>()
        for (const challenge of challenges) {
            const category = challenge.category || t('common.na')
            const existing = grouped.get(category) ?? []
            existing.push(challenge)
            grouped.set(category, existing)
        }

        return grouped
    }, [challenges, t])

    const orderedCategories = useMemo(() => {
        const present = new Set(challengesByCategory.keys())
        const ordered = CHALLENGE_CATEGORIES.filter((category) => present.has(category))
        const extras = [...present].filter((category) => !CATEGORY_SET.has(category))

        return [...ordered, ...extras]
    }, [challengesByCategory])

    const formatTimestamp = (value?: string | null) => {
        if (!value) return t('common.na')
        const date = new Date(value)

        if (Number.isNaN(date.getTime())) return value
        return date.toLocaleString(localeTag)
    }

    const loadChallenges = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            const data = await api.challenges()
            setChallenges(data.challenges)
            setCtfState(data.ctf_state)
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setLoading(false)
        }
    }

    const loadSolved = async () => {
        try {
            const me = await api.me()
            if (!me?.id) {
                setSolvedIds(new Set())
                return
            }

            const teamSolved = await api.teamSolved(me.team_id)
            setSolvedIds(new Set(teamSolved.map((item) => item.challenge_id)))
        } catch {
            setSolvedIds(new Set())
        }
    }

    useEffect(() => {
        void Promise.all([loadChallenges(), loadSolved()])
    }, [])

    useEffect(() => {
        persistGroupByCategory(groupByCategory)
    }, [groupByCategory])

    const showSolvedSummary = ctfState !== 'not_started'
    const showNotStarted = ctfState === 'not_started'
    const showEnded = ctfState === 'ended'
    const solvedSummary = t('challenges.solvedSummary', { solved: solvedCount, total: activeChallenges.length })
    const inactiveSummary =
        inactiveChallenges.length > 0 ? t('challenges.inactiveCount', { count: inactiveChallenges.length }) : ''

    const renderChallengeGrid = (items: Challenge[]) => (
        <div className='mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {items.map((challenge) => (
                <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isSolved={solvedIds.has(challenge.id)}
                    onClick={() => setSelectedChallenge(challenge)}
                />
            ))}
        </div>
    )

    const renderGroupedChallenges = () => (
        <div className='mt-6 space-y-8'>
            {orderedCategories.map((category) => {
                const items = challengesByCategory.get(category) ?? []
                if (items.length === 0) return null

                return (
                    <div key={category}>
                        <h3 className='text-lg font-semibold text-text'>{t(getCategoryKey(category))}</h3>
                        <div className='mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                            {items.map((challenge) => (
                                <ChallengeCard
                                    key={challenge.id}
                                    challenge={challenge}
                                    isSolved={solvedIds.has(challenge.id)}
                                    onClick={() => setSelectedChallenge(challenge)}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )

    const renderChallenges = () => (groupByCategory ? renderGroupedChallenges() : renderChallengeGrid(challenges))

    const renderBody = () => {
        if (loading) {
            return (
                <div className='mt-6 rounded-2xl border border-border bg-surface p-8 text-center text-text-muted'>
                    {t('challenges.loading')}
                </div>
            )
        }

        if (errorMessage) {
            return (
                <div className='mt-6 rounded-2xl border border-danger/40 bg-danger/10 p-6 text-sm text-danger'>
                    {errorMessage}
                </div>
            )
        }

        if (showNotStarted) {
            return (
                <div className='mt-6 space-y-3 rounded-2xl border border-warning/40 bg-warning/10 p-6 text-sm text-warning-strong'>
                    <p>{t('challenges.notStarted')}</p>
                    <div className='text-xs text-text-muted'>
                        <p>
                            {t('challenges.startAt')}: {formatTimestamp(config.ctf_start_at)}
                        </p>
                        <p>
                            {t('challenges.endAt')}: {formatTimestamp(config.ctf_end_at)}
                        </p>
                    </div>
                </div>
            )
        }

        return (
            <>
                {showEnded ? (
                    <div className='mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-6 text-sm text-warning-strong'>
                        {t('challenges.ended')}
                    </div>
                ) : null}
                {renderChallenges()}
            </>
        )
    }

    return (
        <section className='fade-in'>
            <div className='flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h2 className='text-3xl text-text'>{t('challenges.title')}</h2>
                </div>
                {showSolvedSummary ? (
                    <div className='rounded-full border border-border bg-surface px-4 py-2 text-xs text-text'>
                        {solvedSummary} {inactiveSummary}
                    </div>
                ) : null}
            </div>
            <div className='mt-4 flex items-center justify-end'>
                <label className='flex items-center gap-2 text-xs text-text-muted'>
                    <input
                        className='h-4 w-4 accent-accent'
                        type='checkbox'
                        checked={groupByCategory}
                        onChange={(event) => setGroupByCategory(event.target.checked)}
                    />
                    <span>{t('challenges.groupByCategory')}</span>
                </label>
            </div>

            {renderBody()}

            {selectedChallenge ? (
                <ChallengeModal
                    challenge={selectedChallenge}
                    isSolved={solvedIds.has(selectedChallenge.id)}
                    ctfState={ctfState}
                    onClose={() => setSelectedChallenge(null)}
                    onSolved={loadSolved}
                />
            ) : null}
        </section>
    )
}

export default Challenges
