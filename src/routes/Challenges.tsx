import { useEffect, useMemo, useState } from 'react'
import { formatApiError, formatDateTime } from '../lib/utils'
import type { Challenge, CtfState } from '../lib/types'
import ChallengeModal from '../components/ChallengeModal'
import ChallengesView from '../components/ChallengesView'
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
        return formatDateTime(value, localeTag)
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
    const summaryText = [solvedSummary, inactiveSummary].filter(Boolean).join(' ')

    const groupedCategories = useMemo(
        () =>
            orderedCategories.map((category) => ({
                id: category,
                label: t(getCategoryKey(category)),
                items: challengesByCategory.get(category) ?? [],
            })),
        [orderedCategories, challengesByCategory, t],
    )

    return (
        <>
            <ChallengesView
                title={t('challenges.title')}
                summaryText={summaryText}
                showSummary={showSolvedSummary}
                groupByCategory={groupByCategory}
                toggleLabel={t('challenges.groupByCategory')}
                onGroupByCategoryChange={setGroupByCategory}
                loading={loading}
                loadingText={t('challenges.loading')}
                errorMessage={errorMessage}
                notStarted={showNotStarted}
                notStartedText={t('challenges.notStarted')}
                startAtLabel={t('challenges.startAt')}
                startAtValue={formatTimestamp(config.ctf_start_at)}
                endAtLabel={t('challenges.endAt')}
                endAtValue={formatTimestamp(config.ctf_end_at)}
                ended={showEnded}
                endedText={t('challenges.ended')}
                challenges={challenges}
                groupedCategories={groupedCategories}
                solvedIds={solvedIds}
                onSelectChallenge={setSelectedChallenge}
            />

            {selectedChallenge ? (
                <ChallengeModal
                    challenge={selectedChallenge}
                    isSolved={solvedIds.has(selectedChallenge.id)}
                    ctfState={ctfState}
                    onClose={() => setSelectedChallenge(null)}
                    onSolved={loadSolved}
                />
            ) : null}
        </>
    )
}

export default Challenges
