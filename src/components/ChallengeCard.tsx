import type { Challenge } from '../lib/types'
import { getCategoryKey, useT } from '../lib/i18n'

interface ChallengeCardProps {
    challenge: Challenge
    isSolved: boolean
    onClick: () => void
}

const ChallengeCard = ({ challenge, isSolved, onClick }: ChallengeCardProps) => {
    const t = useT()

    return (
        <div
            className={`rounded-2xl border p-6 transition cursor-pointer hover:shadow-lg ${
                challenge.is_active
                    ? 'border-border bg-surface hover:border-accent'
                    : 'border-border/40 bg-surface-muted opacity-60'
            }`}
            onClick={onClick}
            role='button'
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onClick()
                }
            }}
        >
            <div className='flex items-start justify-between'>
                <div className='flex-1'>
                    <h3 className='text-lg font-medium text-text'>{challenge.title}</h3>
                    <div className='mt-2 flex flex-wrap items-center gap-2 text-sm'>
                        <span className='rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs font-medium text-text'>
                            {t(getCategoryKey(challenge.category))}
                        </span>
                        <span className='text-text-muted'>{t('common.pointsShort', { points: challenge.points })}</span>
                    </div>
                </div>
                {isSolved ? (
                    <span className='rounded-full bg-success/20 px-3 py-1 text-xs text-success'>
                        {t('challenge.solvedLabel')}
                    </span>
                ) : !challenge.is_active ? (
                    <span className='rounded-full bg-surface/10 px-3 py-1 text-xs text-text-muted'>
                        {t('challenge.inactiveLabel')}
                    </span>
                ) : null}
            </div>
        </div>
    )
}

export default ChallengeCard
