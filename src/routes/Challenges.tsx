import { useEffect, useMemo, useState } from 'react'
import { formatApiError } from '../lib/utils'
import type { Challenge } from '../lib/types'
import ChallengeCard from '../components/ChallengeCard'
import ChallengeModal from '../components/ChallengeModal'
import { useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Challenges = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const api = useApi()
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set())
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)

    const activeChallenges = useMemo(() => challenges.filter((challenge) => challenge.is_active), [challenges])
    const inactiveChallenges = useMemo(() => challenges.filter((challenge) => !challenge.is_active), [challenges])
    const solvedCount = useMemo(() => solvedIds.size, [solvedIds])

    const loadChallenges = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            const data = await api.challenges()
            setChallenges(data)
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

    return (
        <section className='fade-in'>
            <div className='flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h2 className='text-3xl text-text'>{t('challenges.title')}</h2>
                </div>
                <div className='rounded-full border border-border bg-surface px-4 py-2 text-xs text-text'>
                    {t('challenges.solvedSummary', { solved: solvedCount, total: activeChallenges.length })}{' '}
                    {inactiveChallenges.length > 0
                        ? t('challenges.inactiveCount', { count: inactiveChallenges.length })
                        : ''}
                </div>
            </div>

            {loading ? (
                <div className='mt-6 rounded-2xl border border-border bg-surface p-8 text-center text-text-muted'>
                    {t('challenges.loading')}
                </div>
            ) : errorMessage ? (
                <div className='mt-6 rounded-2xl border border-danger/40 bg-danger/10 p-6 text-sm text-danger'>
                    {errorMessage}
                </div>
            ) : (
                <div className='mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {challenges.map((challenge) => (
                        <ChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            isSolved={solvedIds.has(challenge.id)}
                            onClick={() => setSelectedChallenge(challenge)}
                        />
                    ))}
                </div>
            )}

            {selectedChallenge ? (
                <ChallengeModal
                    challenge={selectedChallenge}
                    isSolved={solvedIds.has(selectedChallenge.id)}
                    onClose={() => setSelectedChallenge(null)}
                    onSolved={loadSolved}
                />
            ) : null}
        </section>
    )
}

export default Challenges
