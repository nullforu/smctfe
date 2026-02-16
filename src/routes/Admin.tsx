import { useMemo, useState } from 'react'
import CreateChallenge from './admin/CreateChallenge'
import ChallengeManagement from './admin/ChallengeManagement'
import RegistrationKeys from './admin/RegistrationKeys'
import Teams from './admin/Teams'
import SiteConfig from './admin/SiteConfig'
import Users from './admin/Users'
import { useT } from '../lib/i18n'
import { useAuth } from '../lib/auth'

interface RouteProps {
    routeParams?: Record<string, string>
}

type AdminTabId = 'challenges' | 'challenge_management' | 'users' | 'teams' | 'registration_keys' | 'site_config'

const Admin = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const { state: auth } = useAuth()
    const adminTabs = useMemo(
        () => [
            { id: 'challenges', label: t('admin.tab.createChallenge') },
            { id: 'challenge_management', label: t('admin.tab.challengeManagement') },
            { id: 'users', label: t('admin.tab.users') },
            { id: 'teams', label: t('admin.tab.teams') },
            { id: 'registration_keys', label: t('admin.tab.registrationKeys') },
            { id: 'site_config', label: t('admin.tab.siteConfig') },
        ],
        [t],
    )

    const [activeTab, setActiveTab] = useState<AdminTabId>('challenges')
    const [showSidebar, setShowSidebar] = useState(false)

    return (
        <section className='fade-in'>
            <div className='mb-4 md:mb-6'>
                <h2 className='text-2xl font-semibold text-text md:text-3xl'>{t('admin.title')}</h2>
            </div>

            {!auth.user ? (
                <div className='rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-strong md:p-6'>
                    {t('admin.loginRequired')}
                </div>
            ) : auth.user.role !== 'admin' ? (
                <div className='rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger md:p-6'>
                    {t('admin.accessDenied')}
                </div>
            ) : (
                <>
                    <div className='mb-4 flex items-center gap-3'>
                        <select
                            className='flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none md:hidden'
                            value={activeTab}
                            onChange={(event) => setActiveTab(event.target.value as AdminTabId)}
                        >
                            {adminTabs.map((tab) => (
                                <option key={tab.id} value={tab.id}>
                                    {tab.label}
                                </option>
                            ))}
                        </select>

                        {!showSidebar ? (
                            <select
                                className='hidden flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none md:block'
                                value={activeTab}
                                onChange={(event) => setActiveTab(event.target.value as AdminTabId)}
                            >
                                {adminTabs.map((tab) => (
                                    <option key={tab.id} value={tab.id}>
                                        {tab.label}
                                    </option>
                                ))}
                            </select>
                        ) : null}

                        <button
                            className='hidden text-sm text-text hover:text-text md:block cursor-pointer'
                            onClick={() => setShowSidebar((prev) => !prev)}
                            title={showSidebar ? t('admin.hideSidebarTitle') : t('admin.showSidebarTitle')}
                        >
                            {showSidebar ? (
                                <span className='flex items-center gap-2'>
                                    <span>◀</span>
                                    <span>{t('admin.hideMenu')}</span>
                                </span>
                            ) : (
                                <span className='flex items-center gap-2'>
                                    <span>▶</span>
                                    <span>{t('admin.showMenu')}</span>
                                </span>
                            )}
                        </button>
                    </div>

                    <div className='flex flex-col gap-6 md:flex-row md:gap-8'>
                        {showSidebar ? (
                            <nav className='hidden md:block md:w-64 md:shrink-0'>
                                <div className='rounded-2xl border border-border bg-surface p-2'>
                                    {adminTabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            className={`flex w-full items-center rounded-lg px-4 py-2.5 text-left text-sm transition cursor-pointer ${
                                                activeTab === tab.id
                                                    ? 'bg-surface-subtle font-medium text-text'
                                                    : 'text-text hover:bg-surface-muted'
                                            }`}
                                            onClick={() => setActiveTab(tab.id as AdminTabId)}
                                            type='button'
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </nav>
                        ) : null}

                        <div className='flex-1 md:min-w-0'>
                            {activeTab === 'challenges' ? (
                                <CreateChallenge />
                            ) : activeTab === 'challenge_management' ? (
                                <ChallengeManagement />
                            ) : activeTab === 'registration_keys' ? (
                                <RegistrationKeys />
                            ) : activeTab === 'users' ? (
                                <Users />
                            ) : activeTab === 'teams' ? (
                                <Teams />
                            ) : activeTab === 'site_config' ? (
                                <SiteConfig />
                            ) : null}
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}

export default Admin
