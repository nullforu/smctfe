import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Header from './components/Header'
import ParticlesBackground from './components/ParticlesBackground'
import Home from './routes/Home'
import Login from './routes/Login'
import Register from './routes/Register'
import Challenges from './routes/Challenges'
import ChallengeDetail from './routes/ChallengeDetail'
import Scoreboard from './routes/Scoreboard'
import Teams from './routes/Teams'
import TeamProfile from './routes/TeamProfile'
import Users from './routes/Users'
import UserProfile from './routes/UserProfile'
import Admin from './routes/Admin'
import NotFound from './routes/NotFound'
import { useAuth } from './lib/auth'
import { useApi } from './lib/useApi'
import { useConfig } from './lib/config'
import { useLocale, useT } from './lib/i18n'
import { useTheme } from './lib/theme'
import Skeleton from './components/Skeleton'
import './index.css'

interface RouteProps {
    routeParams?: Record<string, string>
}

type RouteComponent = (props: RouteProps) => ReactElement

const routes: Record<string, RouteComponent> = {
    '/': Home,
    '/login': Login,
    '/register': Register,
    '/challenges': Challenges,
    '/scoreboard': Scoreboard,
    '/teams': Teams,
    '/profile': UserProfile,
    '/users': Users,
    '/admin': Admin,
}

const dynamicRoutes: Array<{
    pattern: RegExp
    component: RouteComponent
    extractParams: (path: string) => Record<string, string>
}> = [
    {
        pattern: /^\/challenges\/(\d+)$/,
        component: ChallengeDetail,
        extractParams: (path) => {
            const match = path.match(/^\/challenges\/(\d+)$/)
            return match ? { id: match[1] } : { id: '' }
        },
    },
    {
        pattern: /^\/users\/(\d+)$/,
        component: UserProfile,
        extractParams: (path) => {
            const match = path.match(/^\/users\/(\d+)$/)
            return match ? { id: match[1] } : { id: '' }
        },
    },
    {
        pattern: /^\/teams\/(\d+)$/,
        component: TeamProfile,
        extractParams: (path) => {
            const match = path.match(/^\/teams\/(\d+)$/)
            return match ? { id: match[1] } : { id: '' }
        },
    },
]

const normalizePath = (path: string) => {
    return path.length > 1 && path.endsWith('/') ? path.replace(/\/+$/, '') : path
}

const App = () => {
    const showEndedNotice = false
    const t = useT()
    const { state: auth, setAuthUser, clearAuth } = useAuth()
    const { theme } = useTheme()
    const locale = useLocale()
    const { config: appConfig, loadConfig } = useConfig()
    const api = useApi()

    const [RouteComponent, setRouteComponent] = useState<RouteComponent>(() => Home)
    const [routeParams, setRouteParams] = useState<Record<string, string>>({})
    const [routeKey, setRouteKey] = useState('/')
    const [booting, setBooting] = useState(true)

    const updateRoute = () => {
        const nextPath = normalizePath(window.location.pathname || '/')
        const nextRouteKey = `${nextPath}${window.location.search}${window.location.hash}`
        setRouteKey(nextRouteKey)

        if (routes[nextPath]) {
            setRouteComponent(() => routes[nextPath])
            setRouteParams({})
            return
        }

        for (const route of dynamicRoutes) {
            if (route.pattern.test(nextPath)) {
                setRouteComponent(() => route.component)
                setRouteParams(route.extractParams(nextPath))
                return
            }
        }

        setRouteComponent(() => NotFound)
        setRouteParams({})
    }

    const loadSession = async () => {
        try {
            const user = await api.me()
            setAuthUser(user)
        } catch {
            clearAuth()
        } finally {
            setBooting(false)
        }
    }

    useEffect(() => {
        updateRoute()
        window.addEventListener('popstate', updateRoute)
        void loadConfig()
        loadSession()
        return () => window.removeEventListener('popstate', updateRoute)
    }, [])

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale
        }
    }, [locale])

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.title = appConfig.title || t('app.title')
        }
    }, [appConfig.title, t])

    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        }
    }, [theme])

    const content = useMemo(() => {
        if (booting) {
            return (
                <section className='space-y-6'>
                    <div className='border-2 border-border bg-linear-to-br from-surface via-surface to-surface-muted px-5 py-6 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:px-7'>
                        <Skeleton className='h-3 w-24' />
                        <Skeleton className='mt-3 h-10 w-64' />
                    </div>
                    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                        {Array.from({ length: 6 }, (_, idx) => (
                            <div key={`app-boot-skeleton-${idx}`} className='border-2 border-border bg-surface p-5 shadow-[4px_4px_0_rgba(120,98,68,0.1)]'>
                                <Skeleton className='h-3 w-20' />
                                <Skeleton className='mt-3 h-5 w-4/5' />
                                <Skeleton className='mt-4 h-3 w-1/2' />
                            </div>
                        ))}
                    </div>
                    <p className='sr-only'>{t('app.checkingSession')}</p>
                </section>
            )
        }
        return <RouteComponent routeParams={routeParams} />
    }, [RouteComponent, booting, routeParams, t])

    const isAdminPage = RouteComponent === Admin

    return (
        <div className='app-shell relative flex min-h-dvh flex-col overflow-hidden bg-background font-body'>
            <ParticlesBackground revealKey={routeKey} />
            {showEndedNotice ? null : <Header user={auth.user} />}
            <main className={`relative z-10 mx-auto flex w-full flex-1 flex-col ${isAdminPage ? 'max-w-400' : 'max-w-7xl'} px-4 py-5 md:px-6 md:py-6`}>
                {showEndedNotice ? (
                    <section className='flex flex-1 items-center justify-center py-8 md:py-12'>
                        <div className='w-full max-w-3xl border-2 border-border bg-linear-to-br from-surface via-surface to-surface-muted px-6 py-12 text-center shadow-[6px_6px_0_rgba(120,98,68,0.14)] sm:px-10 sm:py-16'>
                            <p className='font-mono text-xs font-semibold uppercase tracking-[0.22em] text-accent'>2026 SCA CTF</p>
                            <h1 className='mt-4 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text sm:text-4xl break-keep'>대회가 종료되었습니다.</h1>
                            <p className='mt-4 text-sm text-text-muted sm:text-base break-keep'>문의는 디스코드로 부탁드리며, 많은 참여 감사드립니다. SCA CTF 운영진 올림.</p>
                        </div>
                    </section>
                ) : (
                    content
                )}
            </main>
            <footer className='relative z-10 border-t-2 border-border bg-surface-muted py-5 text-center text-[11px] uppercase tracking-[0.18em] text-text-subtle'>
                <p className='mx-auto max-w-7xl px-4 md:px-6'>{t('footer.copyright')}</p>
            </footer>
        </div>
    )
}

export default App
