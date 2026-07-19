import { useEffect, useRef, useState } from 'react'
import { navigate } from '../lib/router'
import type { AuthUser } from '../lib/types'
import { useT, type Locale, useLocale, useSetLocale } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/useApi'
import { useConfig } from '../lib/config'

interface HeaderProps {
    user: AuthUser | null
}

interface NavItem {
    path: string
    label: string
    external?: boolean
}

const Header = ({ user }: HeaderProps) => {
    const t = useT()
    const { theme, toggleTheme } = useTheme()
    const locale = useLocale()
    const setLocale = useSetLocale()
    const { clearAuth } = useAuth()
    const { config } = useConfig()
    const api = useApi()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false)
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const localeMenuRef = useRef<HTMLDivElement | null>(null)
    const profileMenuRef = useRef<HTMLDivElement | null>(null)
    const pathname = window.location.pathname || '/'

    const navItems: NavItem[] = [
        { path: '/challenges', label: t('nav.challenges') },
        { path: '/scoreboard', label: t('nav.scoreboard') },
        { path: '/teams', label: t('nav.teams') },
        { path: '/users', label: t('nav.users') },
        { path: '/profile', label: t('nav.profile') },
    ]

    const logout = async (after?: () => void) => {
        try {
            await api.logout()
        } catch {
            clearAuth()
        }
        navigate('/login')
        after?.()
    }

    const navClass = (path: string) =>
        `inline-flex h-10 items-center border-b-2 px-3 font-mono text-xs uppercase tracking-[0.18em] transition ${
            pathname.startsWith(path) ? 'border-accent text-accent' : 'border-transparent text-text-subtle hover:border-border hover:text-text'
        }`

    const handleLocaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLocale(event.target.value as Locale)
    }

    const themeButtonLabel = theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')
    const localeLabel = locale === 'ko' ? t('header.languageKorean') : locale === 'ja' ? t('header.languageJapanese') : t('header.languageEnglish')

    useEffect(() => {
        if (!isLocaleMenuOpen) return

        const onPointerDown = (event: MouseEvent) => {
            if (localeMenuRef.current && !localeMenuRef.current.contains(event.target as Node)) {
                setIsLocaleMenuOpen(false)
            }
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsLocaleMenuOpen(false)
        }

        window.addEventListener('mousedown', onPointerDown)
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('mousedown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [isLocaleMenuOpen])

    useEffect(() => {
        if (!isProfileMenuOpen) return

        const onPointerDown = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false)
            }
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsProfileMenuOpen(false)
        }

        window.addEventListener('mousedown', onPointerDown)
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('mousedown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [isProfileMenuOpen])

    return (
        <>
            {user?.role === 'blocked' ? (
                <div className='border-b border-danger/30 bg-danger/10'>
                    <div className='mx-auto max-w-7xl px-4 py-3 text-sm text-danger md:px-6'>
                        <p className='font-medium'>{t('blocked.bannerTitle')}</p>
                        <p className='text-xs text-danger/80'>{t('blocked.bannerBody')}</p>
                        {user?.blocked_reason ? (
                            <p className='mt-1 text-xs text-danger/80'>
                                {t('blocked.reasonLabel')}: {user.blocked_reason}
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <header className='bg-surface border-b border-border'>
                <div className='mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6'>
                    <div className='flex items-center gap-4 lg:gap-8'>
                        <button className='border-2 border-border bg-surface-muted px-2 py-1 text-xs text-text-subtle lg:hidden dark:text-text-muted' onClick={() => setMobileMenuOpen((prev) => !prev)}>
                            {mobileMenuOpen ? (
                                <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                                    <line x1='18' y1='6' x2='6' y2='18'></line>
                                    <line x1='6' y1='6' x2='18' y2='18'></line>
                                </svg>
                            ) : (
                                <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                                    <line x1='3' y1='12' x2='21' y2='12'></line>
                                    <line x1='3' y1='6' x2='21' y2='6'></line>
                                    <line x1='3' y1='18' x2='21' y2='18'></line>
                                </svg>
                            )}
                        </button>

                        <a href='/' className='flex items-center gap-2' onClick={(event) => navigate('/', event)}>
                            <img src={`/logo.png`} alt={t('header.logoAlt')} className='h-8 w-auto' />
                        </a>

                        <nav className='hidden items-center gap-2 lg:flex'>
                            {navItems.map((item) =>
                                item.external ? (
                                    <a
                                        key={item.path}
                                        href={item.path}
                                        className='inline-flex h-10 items-center border-b-2 border-transparent px-3 font-mono text-xs uppercase tracking-[0.18em] text-text-subtle transition hover:border-border hover:text-text'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {item.label}
                                    </a>
                                ) : (
                                    <a key={item.path} href={item.path} className={navClass(item.path)} onClick={(event) => navigate(item.path, event)}>
                                        {item.label}
                                    </a>
                                ),
                            )}
                            {user?.role === 'admin' ? (
                                <a href='/admin' className={navClass('/admin')} onClick={(event) => navigate('/admin', event)}>
                                    {t('nav.admin')}
                                </a>
                            ) : null}
                        </nav>
                    </div>

                    <div className='hidden items-center gap-2 lg:flex'>
                        <button className='px-2 py-1 text-xs text-text-muted transition hover:bg-surface-subtle dark:text-text-muted dark:hover:bg-surface-muted' onClick={toggleTheme} title={themeButtonLabel} aria-label={themeButtonLabel}>
                            {theme === 'dark' ? (
                                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                                    <circle cx='12' cy='12' r='4'></circle>
                                    <path d='M12 2v2'></path>
                                    <path d='M12 20v2'></path>
                                    <path d='m4.93 4.93 1.41 1.41'></path>
                                    <path d='m17.66 17.66 1.41 1.41'></path>
                                    <path d='M2 12h2'></path>
                                    <path d='M20 12h2'></path>
                                    <path d='m6.34 17.66-1.41 1.41'></path>
                                    <path d='m19.07 4.93-1.41 1.41'></path>
                                </svg>
                            ) : (
                                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                                    <path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'></path>
                                </svg>
                            )}
                        </button>
                        <div className='relative' ref={localeMenuRef}>
                            <button
                                type='button'
                                className='inline-flex items-center justify-between gap-2 bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text transition hover:bg-surface-muted'
                                onClick={() => {
                                    setIsLocaleMenuOpen((prev) => !prev)
                                    setIsProfileMenuOpen(false)
                                }}
                                aria-haspopup='menu'
                                aria-expanded={isLocaleMenuOpen}
                                aria-label={t('header.language')}
                            >
                                <span>{localeLabel}</span>
                                <svg className={`h-3 w-3 transition-transform ${isLocaleMenuOpen ? 'rotate-180' : ''}`} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                                    <path d='m6 9 6 6 6-6' />
                                </svg>
                            </button>

                            {isLocaleMenuOpen ? (
                                <div className='absolute right-0 top-full z-20 mt-1 min-w-44 border-2 border-border bg-surface p-1 shadow-[4px_4px_0_rgba(84,65,45,0.18)]'>
                                    {(
                                        [
                                            { value: 'en', label: t('header.languageEnglish') },
                                            { value: 'ko', label: t('header.languageKorean') },
                                            { value: 'ja', label: t('header.languageJapanese') },
                                        ] as const
                                    ).map((option) => (
                                        <button
                                            key={option.value}
                                            type='button'
                                            className={`block w-full px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] ${locale === option.value ? 'bg-accent/12 text-accent' : 'text-text-muted hover:bg-surface-muted hover:text-text'}`}
                                            onClick={() => {
                                                setLocale(option.value as Locale)
                                                setIsLocaleMenuOpen(false)
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {user ? (
                            <>
                                <div className='flex items-center gap-2 px-2'>
                                    <div className='flex h-7 w-7 items-center justify-center border-2 border-accent/30 bg-accent/10 text-accent'>
                                        <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                                            <rect x='3' y='3' width='7' height='7' rx='1'></rect>
                                            <rect x='14' y='3' width='7' height='7' rx='1'></rect>
                                            <rect x='14' y='14' width='7' height='7' rx='1'></rect>
                                            <rect x='3' y='14' width='7' height='7' rx='1'></rect>
                                        </svg>
                                    </div>
                                    <div className='flex flex-col leading-tight'>
                                        <span className='font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-text-subtle'>{t('header.vmUsage')}</span>
                                        <span className='text-xs font-semibold text-text'>
                                            {user.vm_count}
                                            <span className='mx-1 text-text-subtle'>/</span>
                                            {user.vm_limit}
                                        </span>
                                    </div>
                                </div>
                                <div className='relative' ref={profileMenuRef}>
                                    <button
                                        type='button'
                                        className='inline-flex min-w-30 items-center justify-between gap-2.75 border-2 border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text transition hover:bg-surface-muted'
                                        onClick={() => {
                                            setIsProfileMenuOpen((prev) => !prev)
                                            setIsLocaleMenuOpen(false)
                                        }}
                                        aria-haspopup='menu'
                                        aria-expanded={isProfileMenuOpen}
                                    >
                                        <span className='inline-flex items-center gap-2.75'>{user.username}</span>
                                        <svg className={`h-3 w-3 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                                            <path d='m6 9 6 6 6-6' />
                                        </svg>
                                    </button>

                                    {isProfileMenuOpen ? (
                                        <div className='absolute right-0 top-full z-20 mt-1 min-w-36 border-2 border-border bg-surface p-1 shadow-[4px_4px_0_rgba(84,65,45,0.18)]'>
                                            <button
                                                type='button'
                                                className='block w-full px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted hover:bg-surface-muted hover:text-text'
                                                onClick={() => {
                                                    navigate('/profile')
                                                    setIsProfileMenuOpen(false)
                                                }}
                                            >
                                                {t('header.myProfile')}
                                            </button>
                                            <button
                                                type='button'
                                                className='block w-full bg-danger/10 px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-danger hover:bg-danger/15 hover:text-danger-strong'
                                                onClick={() => {
                                                    void logout(() => setIsProfileMenuOpen(false))
                                                }}
                                            >
                                                {t('auth.logout')}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <>
                                <a
                                    href='/login'
                                    className='border-2 border-border bg-surface-muted px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted transition hover:bg-surface-subtle dark:text-text dark:hover:bg-surface-muted'
                                    onClick={(event) => navigate('/login', event)}
                                >
                                    {t('auth.login')}
                                </a>
                                <a
                                    href='/register'
                                    className='border-2 border-accent bg-accent px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white transition hover:bg-accent-strong'
                                    onClick={(event) => navigate('/register', event)}
                                >
                                    {t('auth.register')}
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {mobileMenuOpen ? <button className='fixed inset-0 z-40 bg-black/25 lg:hidden' onClick={() => setMobileMenuOpen(false)} aria-label={t('header.closeMenu')}></button> : null}

            <aside
                className={`fixed left-0 top-0 z-50 h-full w-[82vw] max-w-xs transform border-r-2 border-border bg-surface shadow-xl transition-transform duration-200 lg:hidden dark:bg-surface ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className='border-b-2 border-border px-4 py-3 font-mono text-base font-semibold uppercase tracking-[0.16em] text-text dark:text-text'>{config.header_title}</div>
                <nav className='p-2'>
                    {navItems.map((item) =>
                        item.external ? (
                            <a key={item.path} href={item.path} className='block px-3 py-2 text-sm text-text-muted transition hover:bg-surface-muted dark:text-text' target='_blank' rel='noreferrer'>
                                {item.label}
                            </a>
                        ) : (
                            <a
                                key={item.path}
                                href={item.path}
                                className={`block border-l-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition ${pathname.startsWith(item.path) ? 'border-accent bg-accent/10 text-accent' : 'border-transparent text-text-muted hover:bg-surface-muted dark:text-text'}`}
                                onClick={(event) => {
                                    navigate(item.path, event)
                                    setMobileMenuOpen(false)
                                }}
                            >
                                {item.label}
                            </a>
                        ),
                    )}
                    {user?.role === 'admin' ? (
                        <a
                            href='/admin'
                            className={`block border-l-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition ${pathname.startsWith('/admin') ? 'border-accent bg-accent/10 text-accent' : 'border-transparent text-text-muted hover:bg-surface-muted dark:text-text'}`}
                            onClick={(event) => {
                                navigate('/admin', event)
                                setMobileMenuOpen(false)
                            }}
                        >
                            {t('nav.admin')}
                        </a>
                    ) : null}
                </nav>

                <div className='mt-3 p-3'>
                    <div className='flex items-center gap-2'>
                        <select
                            className='flex-1 border-2 border-border bg-surface-muted px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted'
                            value={locale}
                            onChange={handleLocaleChange}
                            aria-label={t('header.language')}
                        >
                            <option value='en'>{t('header.languageEnglish')}</option>
                            <option value='ko'>{t('header.languageKorean')}</option>
                            <option value='ja'>{t('header.languageJapanese')}</option>
                        </select>
                        <button className='border-2 border-border bg-surface-muted px-2 py-1 text-xs text-text-muted' onClick={toggleTheme} title={themeButtonLabel} aria-label={themeButtonLabel}>
                            {theme === 'dark' ? (
                                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                                    <circle cx='12' cy='12' r='4'></circle>
                                    <path d='M12 2v2'></path>
                                    <path d='M12 20v2'></path>
                                    <path d='m4.93 4.93 1.41 1.41'></path>
                                    <path d='m17.66 17.66 1.41 1.41'></path>
                                    <path d='M2 12h2'></path>
                                    <path d='M20 12h2'></path>
                                    <path d='m6.34 17.66-1.41 1.41'></path>
                                    <path d='m19.07 4.93-1.41 1.41'></path>
                                </svg>
                            ) : (
                                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                                    <path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'></path>
                                </svg>
                            )}
                        </button>
                    </div>
                    <div className='mt-2 space-y-2'>
                        {user ? (
                            <>
                                <div className='flex items-center gap-2 my-4'>
                                    <div className='flex h-8 w-8 items-center justify-center border-2 border-accent/30 bg-accent/10 text-accent'>
                                        <svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                                            <rect x='3' y='3' width='7' height='7' rx='1'></rect>
                                            <rect x='14' y='3' width='7' height='7' rx='1'></rect>
                                            <rect x='14' y='14' width='7' height='7' rx='1'></rect>
                                            <rect x='3' y='14' width='7' height='7' rx='1'></rect>
                                        </svg>
                                    </div>

                                    <div className='flex flex-col leading-tight'>
                                        <span className='font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-text-subtle'>{t('header.vmUsage')}</span>

                                        <span className='text-sm font-semibold text-text'>
                                            {user.vm_count}
                                            <span className='mx-1 text-text-subtle'>/</span>
                                            {user.vm_limit}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className='w-full border-2 border-danger/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] bg-danger/10 text-danger hover:bg-danger/15 hover:text-danger-strong'
                                    onClick={() => {
                                        void logout(() => setMobileMenuOpen(false))
                                    }}
                                >
                                    {t('auth.logout')}
                                </button>
                            </>
                        ) : (
                            <a
                                href='/login'
                                className='block w-full border-2 border-border bg-surface-muted px-3 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted'
                                onClick={(event) => {
                                    navigate('/login', event)
                                    setMobileMenuOpen(false)
                                }}
                            >
                                {t('auth.login')}
                            </a>
                        )}
                    </div>
                </div>
            </aside>
        </>
    )
}

export default Header
