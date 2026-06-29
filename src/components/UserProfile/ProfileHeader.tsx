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
                <h2 className='font-display text-3xl uppercase tracking-[0.08em] text-text'>{user.username}</h2>

                <div className='mt-4 flex flex-wrap items-center gap-2 text-xs'>
                    {user.team_name && (
                        <a href={`/teams/${user.team_id}`} className='border-2 border-border bg-surface px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text'>
                            {user.team_name}
                        </a>
                    )}

                    {user.division_name && <span className='border-2 border-border bg-surface px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text'>{user.division_name}</span>}
                </div>
            </div>

            <span
                className={`inline-flex items-center border-2 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${roleClasses(user.role)} ${user.role === 'admin' ? 'border-secondary/40' : user.role === 'blocked' ? 'border-danger/40' : 'border-accent/40'}`}
            >
                {t(getRoleKey(user.role))}
            </span>
        </div>
    )
}

export default ProfileHeader
