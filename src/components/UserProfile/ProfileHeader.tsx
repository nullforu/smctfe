import type { UserDetail } from '../../lib/types'
import { getRoleKey, useT } from '../../lib/i18n'

interface ProfileHeaderProps {
    user: UserDetail
}

const ProfileHeader = ({ user }: ProfileHeaderProps) => {
    const t = useT()

    const roleClasses = (role: string) => (role === 'admin' ? 'bg-secondary/20 text-secondary' : role === 'blocked' ? 'bg-danger/20 text-danger' : 'bg-accent/20 text-accent-strong')

    return (
        <div className='flex flex-wrap items-end justify-between gap-4'>
            <div>
                <h2 className='text-3xl text-text'>{user.username}</h2>

                <div className='mt-4 flex flex-wrap items-center gap-2 text-xs'>
                    {user.team_name && (
                        <a href={`/teams/${user.team_id}`} className='rounded-full bg-surface px-2 py-1 text-text border border-border'>
                            {user.team_name}
                        </a>
                    )}

                    {user.division_name && <span className='rounded-full bg-surface px-2 py-1 text-text border border-border'>{user.division_name}</span>}
                </div>
            </div>

            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium uppercase ${roleClasses(user.role)}`}>{t(getRoleKey(user.role))}</span>
        </div>
    )
}

export default ProfileHeader
