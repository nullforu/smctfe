import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CtfState, VM, UserDetail, SolvedChallenge } from '../lib/types'
import { formatApiError, formatDateTime, parseRouteId } from '../lib/utils'
import { navigate } from '../lib/router'
import ProfileHeader from '../components/UserProfile/ProfileHeader'
import AccountCard from '../components/UserProfile/AccountCard'
import ActiveVMsCard from '../components/UserProfile/ActiveVMsCard'
import SolvedChallengesCard from '../components/UserProfile/SolvedChallengesCard'
import StatisticsCard from '../components/UserProfile/StatisticsCard'
import { getLocaleTag, useLocale, useT } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/useApi'
import LoginRequired from '../components/LoginRequired'

interface RouteProps {
    routeParams?: Record<string, string>
}

const UserProfile = ({ routeParams = {} }: RouteProps) => {
    const t = useT()
    const api = useApi()
    const { state: auth } = useAuth()
    const locale = useLocale()
    const localeTag = useMemo(() => getLocaleTag(locale), [locale])
    const [user, setUser] = useState<UserDetail | null>(null)
    const [solved, setSolved] = useState<SolvedChallenge[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [vms, setVMs] = useState<VM[]>([])
    const [vmsLoading, setVMsLoading] = useState(false)
    const [vmsError, setVMsError] = useState('')
    const [vmDeletingId, setVMDeletingId] = useState<number | null>(null)
    const [vmsCtfState, setVMsCtfState] = useState<CtfState>('active')
    const [editingUsername, setEditingUsername] = useState(false)
    const [usernameInput, setUsernameInput] = useState('')
    const [savingUsername, setSavingUsername] = useState(false)
    const lastLoadedUserIdRef = useRef<number | null>(null)
    const lastVMsLoadedForUserIdRef = useRef<number | null>(null)

    const routeUserId = useMemo(() => parseRouteId(routeParams.id), [routeParams.id])
    const isOwnProfile = useMemo(() => (auth.user ? !routeUserId || routeUserId === auth.user.id : false), [auth.user, routeUserId])
    const showBackButton = !!routeParams.id
    const activeVMs = useMemo(() => vms.filter((vm) => !['stopped', 'failed', 'node_deleted'].includes(vm.status)), [vms])
    const targetUserId = routeUserId ?? auth.user?.id ?? null
    const totalSolvedPoints = useMemo(() => solved.reduce((sum, item) => sum + item.points, 0), [solved])

    const formatOptionalDateTime = useCallback((value?: string | null) => (value ? formatDateTime(value, localeTag) : t('common.na')), [localeTag, t])

    const formatSolvedDateTime = useCallback((value: string) => formatDateTime(value, localeTag), [localeTag])

    const loadUserProfile = useCallback(
        async (userId: number) => {
            setLoading(true)
            setErrorMessage('')
            setUser(null)
            setSolved([])

            try {
                const [userDetail, solvedData] = await Promise.all([api.user(userId), api.userSolved(userId)])
                setUser(userDetail)
                setSolved(solvedData)
            } catch (error) {
                setErrorMessage(formatApiError(error, t).message)
            } finally {
                setLoading(false)
            }
        },
        [api, t],
    )

    const loadVMs = useCallback(async () => {
        if (!isOwnProfile) return

        setVMsLoading(true)
        setVMsError('')

        try {
            const response = await api.vms()
            setVMs(response.vms)
            setVMsCtfState(response.ctf_state)
        } catch (error) {
            setVMsError(formatApiError(error, t).message)
        } finally {
            setVMsLoading(false)
        }
    }, [api, isOwnProfile, t])

    const deleteVM = useCallback(
        async (challengeId: number) => {
            if (vmDeletingId !== null) return

            setVMDeletingId(challengeId)
            setVMsError('')

            try {
                await api.deleteVM(challengeId)
                await loadVMs()
            } catch (error) {
                setVMsError(formatApiError(error, t).message)
            } finally {
                setVMDeletingId(null)
            }
        },
        [api, loadVMs, vmDeletingId, t],
    )

    const saveUsername = useCallback(async () => {
        if (!user) return

        setSavingUsername(true)
        setErrorMessage('')

        try {
            const updated = await api.updateMe(usernameInput.trim())
            setUser(updated)
            setEditingUsername(false)
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setSavingUsername(false)
        }
    }, [api, t, user, usernameInput])

    useEffect(() => {
        if (user && isOwnProfile) {
            setUsernameInput(user.username)
        }
    }, [user, isOwnProfile])

    useEffect(() => {
        if (targetUserId === null) return
        if (lastLoadedUserIdRef.current === targetUserId) return

        lastLoadedUserIdRef.current = targetUserId
        loadUserProfile(targetUserId)
    }, [loadUserProfile, targetUserId])

    useEffect(() => {
        if (!isOwnProfile) {
            lastVMsLoadedForUserIdRef.current = null
            return
        }

        if (!auth.user) return
        if (lastVMsLoadedForUserIdRef.current === auth.user.id) return

        lastVMsLoadedForUserIdRef.current = auth.user.id
        loadVMs()
    }, [auth.user, isOwnProfile, loadVMs])

    return (
        <section className='animate'>
            {showBackButton ? (
                <div className='mb-6'>
                    <button className='inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent cursor-pointer' onClick={() => navigate('/users')}>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <path d='m15 18-6-6 6-6' />
                        </svg>
                        {t('profile.backToUsers')}
                    </button>
                </div>
            ) : null}

            {!auth.user ? (
                <LoginRequired title={t('profile.title')} />
            ) : loading ? (
                <div className='rounded-2xl border border-border bg-surface p-8'>
                    <p className='text-center text-sm text-text-muted'>{t('common.loading')}</p>
                </div>
            ) : errorMessage ? (
                <div className='rounded-2xl border border-danger/30 bg-danger/10 p-8'>
                    <p className='text-center text-sm text-danger'>{errorMessage}</p>
                </div>
            ) : user ? (
                <div>
                    <ProfileHeader user={user} />

                    {isOwnProfile ? (
                        <>
                            <AccountCard
                                user={user}
                                authEmail={auth.user?.email}
                                savingUsername={savingUsername}
                                onSave={saveUsername}
                                editingUsername={editingUsername}
                                usernameInput={usernameInput}
                                onEditingUsernameChange={setEditingUsername}
                                onUsernameInputChange={setUsernameInput}
                            />

                            <ActiveVMsCard
                                activeVMs={activeVMs}
                                vmsError={vmsError}
                                vmsLoading={vmsLoading}
                                vmDeletingId={vmDeletingId}
                                ctfState={vmsCtfState}
                                onRefresh={loadVMs}
                                onDelete={deleteVM}
                                formatOptionalDateTime={formatOptionalDateTime}
                            />
                        </>
                    ) : null}

                    <SolvedChallengesCard solved={solved} formatDateTime={formatSolvedDateTime} />

                    {solved.length > 0 ? <StatisticsCard totalPoints={totalSolvedPoints} solvedCount={solved.length} /> : null}
                </div>
            ) : null}
        </section>
    )
}

export default UserProfile
