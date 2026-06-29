import { useT } from '../../lib/i18n'

interface StatisticsCardProps {
    totalPoints: number
    solvedCount: number
}

const StatisticsCard = ({ totalPoints, solvedCount }: StatisticsCardProps) => {
    const t = useT()

    return (
        <div className='mt-8 border-2 border-border bg-surface p-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
            <h3 className='font-display text-lg uppercase tracking-[0.08em] text-text'>{t('profile.statistics')}</h3>
            <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                <div className='border-2 border-border bg-surface-muted p-4'>
                    <p className='font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted'>{t('profile.totalPoints')}</p>
                    <p className='mt-1 text-2xl font-semibold text-text'>{totalPoints}</p>
                </div>
                <div className='border-2 border-border bg-surface-muted p-4'>
                    <p className='font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted'>{t('profile.problemsSolved')}</p>
                    <p className='mt-1 text-2xl font-semibold text-text'>{solvedCount}</p>
                </div>
            </div>
        </div>
    )
}

export default StatisticsCard
