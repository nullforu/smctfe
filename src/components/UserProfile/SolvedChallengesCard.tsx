import type { SolvedChallenge } from '../../lib/types'
import { useT } from '../../lib/i18n'

interface SolvedChallengesCardProps {
    solved: SolvedChallenge[]
    formatDateTime: (value: string) => string
}

const SolvedChallengesCard = ({ solved, formatDateTime }: SolvedChallengesCardProps) => {
    const t = useT()

    return (
        <div className='mt-8 border-2 border-border bg-surface p-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
            <div className='flex items-center justify-between'>
                <h3 className='font-display text-lg uppercase tracking-[0.08em] text-text'>{t('profile.solvedChallenges')}</h3>
                <span className='font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted'>{solved.length === 1 ? t('profile.problemSingular', { count: solved.length }) : t('profile.problemPlural', { count: solved.length })}</span>
            </div>

            <div className='mt-6 space-y-3'>
                {solved.map((item) => (
                    <div key={item.challenge_id} className='border-2 border-border bg-surface-muted p-5'>
                        <h4 className='font-display text-base font-medium uppercase tracking-[0.06em] text-text'>
                            {item.title}
                            <span className='ml-2 font-mono text-[11px] uppercase tracking-[0.12em] text-accent'>{t('common.pointsShort', { points: item.points })}</span>
                        </h4>
                        <p className='mt-2 text-sm text-text-muted'>{t('profile.solvedAt', { time: formatDateTime(item.solved_at) })}</p>
                    </div>
                ))}

                {solved.length === 0 ? (
                    <div className='border-2 border-border bg-surface-muted p-8 text-center'>
                        <p className='font-mono text-sm uppercase tracking-[0.12em] text-text-muted'>{t('profile.noSolved')}</p>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default SolvedChallengesCard
