import type { UserDetail } from '../../lib/types'
import { getRoleKey, useT } from '../../lib/i18n'

interface AccountCardProps {
    user: UserDetail
    authEmail?: string
    savingUsername: boolean
    onSave: () => void
    editingUsername: boolean
    usernameInput: string
    onEditingUsernameChange: (value: boolean) => void
    onUsernameInputChange: (value: string) => void
}

const AccountCard = ({ user, authEmail, savingUsername, onSave, editingUsername, usernameInput, onEditingUsernameChange, onUsernameInputChange }: AccountCardProps) => {
    const t = useT()

    const cancelEdit = () => {
        onEditingUsernameChange(false)
        onUsernameInputChange(user.username)
    }

    return (
        <div className='mt-6 border-2 border-border bg-surface p-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
            <h3 className='font-display text-lg uppercase tracking-[0.08em] text-text'>{t('profile.account')}</h3>

            <div className='mt-4 space-y-2 text-sm text-text'>
                <div className='flex items-center justify-between gap-4'>
                    <span className='text-text-muted'>{t('common.username')}</span>

                    {editingUsername ? (
                        <div className='flex items-center gap-2'>
                            <input className='border-2 border-border bg-surface px-2 py-1 font-mono text-sm' value={usernameInput} onChange={(event) => onUsernameInputChange(event.target.value)} disabled={savingUsername} />
                            <button
                                className='border-2 border-accent bg-accent px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-accent-foreground disabled:opacity-50 cursor-pointer'
                                disabled={savingUsername}
                                onClick={onSave}
                            >
                                {t('profile.save')}
                            </button>
                            <button className='border-2 border-border bg-surface-muted px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle cursor-pointer' onClick={cancelEdit}>
                                {t('profile.cancel')}
                            </button>
                        </div>
                    ) : (
                        <div className='flex items-center gap-3'>
                            <span>{user.username}</span>
                            <button className='border-b-2 border-accent font-mono text-[11px] uppercase tracking-[0.12em] text-accent cursor-pointer' onClick={() => onEditingUsernameChange(true)}>
                                {t('profile.edit')}
                            </button>
                        </div>
                    )}
                </div>

                <div className='flex justify-between'>
                    <span className='text-text-muted'>{t('common.email')}</span>
                    <span>{authEmail}</span>
                </div>

                <div className='flex justify-between'>
                    <span className='text-text-muted'>{t('common.role')}</span>
                    <span className='font-mono uppercase tracking-[0.12em] text-accent'>{t(getRoleKey(user.role))}</span>
                </div>
            </div>
        </div>
    )
}

export default AccountCard
