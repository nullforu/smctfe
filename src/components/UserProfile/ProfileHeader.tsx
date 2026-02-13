import type { UserDetail } from '../../lib/types'
import { getRoleKey, useT } from '../../lib/i18n'

interface ProfileHeaderProps {
    user: UserDetail
}

const ProfileHeader = ({ user }: ProfileHeaderProps) => {
    const t = useT()
    const roleClasses = (role: string) =>
        role === 'admin' ? 'bg-secondary/20 text-secondary' : 'bg-accent/20 text-accent-strong'

    return (
        <div className='flex flex-wrap items-end justify-between gap-4'>
            <div>
                <h2 className='text-3xl text-text'>{user.username}</h2>
                <p className='mt-1 text-sm text-text-muted'>{t('profile.userId', { id: user.id })}</p>
                <p className='mt-1 text-sm text-text-muted'>{t('profile.team', { team: user.team_name })}</p>
            </div>
            <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium uppercase ${roleClasses(user.role)}`}
            >
                {t(getRoleKey(user.role))}
            </span>
        </div>
    )
}

export default ProfileHeader
