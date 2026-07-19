import type { CtfState, VM } from '../../lib/types'
import { useT } from '../../lib/i18n'

interface ActiveVMsCardProps {
    activeVMs: VM[]
    vmsError: string
    vmsLoading: boolean
    vmDeletingId: number | null
    ctfState: CtfState
    isAdmin: boolean
    onRefresh: () => void
    onDelete: (challengeId: number) => void
    formatOptionalDateTime: (value?: string | null) => string
}

const ActiveVMsCard = ({ activeVMs, vmsError, vmsLoading, vmDeletingId, ctfState, isAdmin, onRefresh, onDelete, formatOptionalDateTime }: ActiveVMsCardProps) => {
    const t = useT()
    const formatPorts = (vm: VM) => {
        if (!vm.ports.length) return t('common.pending')
        return vm.ports.map((port) => `${port.protocol.toUpperCase()} ${port.host_port} -> ${port.container_port}`).join(', ')
    }

    const formatChallengeTitle = (vm: VM) => {
        if (vm.challenge_title) {
            return t('profile.challengeTitle', { title: vm.challenge_title, id: vm.challenge_id })
        }
        return t('profile.challengeLabel', { id: vm.challenge_id })
    }

    return (
        <div className='mt-6 border-2 border-border bg-surface p-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)]'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <h3 className='font-display text-lg uppercase tracking-[0.08em] text-text'>{t('profile.activeVMs')}</h3>
                <button className='border-b-2 border-border font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle hover:text-text disabled:opacity-60 cursor-pointer' onClick={onRefresh} disabled={vmsLoading}>
                    {vmsLoading ? t('common.loading') : t('common.refresh')}
                </button>
            </div>

            {vmsError ? (
                <p className='mt-4 border-2 border-danger/40 bg-danger/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-danger'>{vmsError}</p>
            ) : ctfState === 'not_started' && !isAdmin ? (
                <div className='mt-4 border-2 border-warning/40 bg-warning/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] text-warning-strong'>{t('profile.vmsNotStarted')}</div>
            ) : activeVMs.length === 0 ? (
                <div className='mt-4 border-2 border-border bg-surface-muted p-5 text-center'>
                    <p className='text-sm text-text-muted'>{t('profile.noActiveVMs')}</p>
                </div>
            ) : (
                <div className='mt-4 divide-y divide-border/50 md:divide-y-0 md:space-y-3'>
                    {activeVMs.map((vm) => (
                        <div key={vm.challenge_id} className='border-2 border-border bg-surface-muted p-5'>
                            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                <div>
                                    <p className='font-display text-sm font-medium uppercase tracking-[0.06em] text-text'>{formatChallengeTitle(vm)}</p>
                                    <p className='mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle'>{t('profile.statusLabel', { status: vm.status })}</p>
                                    <p className='mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle'>{t('profile.createdBy', { username: vm.created_by_username })}</p>
                                    {vm.last_error ? <p className='mt-1 text-xs text-danger'>{vm.last_error}</p> : null}
                                </div>
                                <div className='flex w-full flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3'>
                                    <span className='break-all'>{formatPorts(vm)}</span>
                                    <button
                                        className='w-full border-2 border-danger/30 bg-danger/10 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-danger transition hover:border-danger/50 hover:text-danger-strong disabled:opacity-60 sm:w-auto cursor-pointer'
                                        type='button'
                                        onClick={() => onDelete(vm.challenge_id)}
                                        disabled={vmDeletingId === vm.challenge_id || vmsLoading}
                                    >
                                        {vmDeletingId === vm.challenge_id ? t('profile.deleting') : t('profile.delete')}
                                    </button>
                                </div>
                            </div>
                            <div className='mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle'>{t('profile.ttlLabel', { time: formatOptionalDateTime(vm.ttl_expires_at) })}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ActiveVMsCard
