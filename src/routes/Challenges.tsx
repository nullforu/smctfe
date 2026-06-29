import { useEffect, useMemo, useState } from 'react'
import { formatApiError, formatDateTime } from '../lib/utils'
import type { Challenge, CtfState } from '../lib/types'
import ChallengesView from '../components/ChallengesView'
import LoginRequired from '../components/LoginRequired'
import { getLocaleTag, getCategoryKey, useLocale, useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'
import { useConfig } from '../lib/config'
import { CHALLENGE_CATEGORIES } from '../lib/constants'
import { useAuth } from '../lib/auth'
import { navigate } from '../lib/router'

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
    const { state: auth } = useAuth()
    const { config } = useConfig()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set())
    const [ctfState, setCtfState] = useState<CtfState>('active')
    const [groupByCategory, setGroupByCategory] = useState<boolean>(() => loadGroupByCategory())

    const activeChallenges = useMemo(() => challenges.filter((challenge) => ('is_active' in challenge ? challenge.is_active !== false : true)), [challenges])
    const inactiveChallenges = useMemo(() => challenges.filter((challenge) => ('is_active' in challenge ? challenge.is_active === false : false)), [challenges])
    const solvedCount = useMemo(() => solvedIds.size, [solvedIds])

    const challengesByCategory = useMemo(() => {
        const grouped = new Map<string, Challenge[]>()
        for (const challenge of challenges) {
            const category = 'category' in challenge && challenge.category ? challenge.category : t('common.na')
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
        const hasChallengeData = challenges.length > 0
        if (hasChallengeData) {
            setRefreshing(true)
        } else {
            setLoading(true)
        }
        setErrorMessage('')

        try {
            if (!auth.user?.division_id) {
                setChallenges([])
                return
            }
            const data = await api.challenges(auth.user.division_id)
            setChallenges(data.challenges)
            setCtfState(data.ctf_state)
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const loadSolved = async () => {
        try {
            if (!auth.user) {
                setSolvedIds(new Set())
                return
            }

            const teamSolved = await api.teamSolved(auth.user.team_id)
            setSolvedIds(new Set(teamSolved.map((item) => item.challenge_id)))
        } catch {
            setSolvedIds(new Set())
        }
    }

    useEffect(() => {
        if (!auth.user?.division_id) return
        void Promise.all([loadChallenges(), loadSolved()])
    }, [auth.user?.division_id])

    useEffect(() => {
        persistGroupByCategory(groupByCategory)
    }, [groupByCategory])

    const showSolvedSummary = ctfState !== 'not_started'
    const showNotStarted = ctfState === 'not_started'
    const showEnded = ctfState === 'ended'
    const solvedSummary = t('challenges.solvedSummary', { solved: solvedCount, total: activeChallenges.length })
    const inactiveSummary = inactiveChallenges.length > 0 ? t('challenges.inactiveCount', { count: inactiveChallenges.length }) : ''
    const summaryText = [solvedSummary, inactiveSummary].filter(Boolean).join(' ')
    const vmSummaryText = auth.user && auth.user.vm_limit > 0 ? t('challenges.vmsSummary', { count: auth.user.vm_count, limit: auth.user.vm_limit }) : ''

    const groupedCategories = useMemo(
        () =>
            orderedCategories.map((category) => ({
                id: category,
                label: t(getCategoryKey(category)),
                items: challengesByCategory.get(category) ?? [],
            })),
        [orderedCategories, challengesByCategory, t],
    )

    if (!auth.user) {
        return <LoginRequired title={t('challenges.title')} />
    }

    return (
        <section className='animate'>
            <ChallengesView
                title={t('challenges.title')}
                summaryText={summaryText}
                showSummary={showSolvedSummary || Boolean(vmSummaryText)}
                groupByCategory={groupByCategory}
                toggleLabel={t('challenges.groupByCategory')}
                onGroupByCategoryChange={setGroupByCategory}
                loading={loading}
                refreshing={refreshing}
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
                stackSummaryText={vmSummaryText}
                onSelectChallenge={(challenge) => navigate(`/challenges/${challenge.id}`)}
            />
        </section>
    )
}

export default Challenges
