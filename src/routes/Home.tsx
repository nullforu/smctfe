import { navigate } from '../lib/router'
import Markdown from '../components/Markdown'
import { getLocaleTag, useLocale, useT } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Home = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const { state: auth } = useAuth()
    const { config: appConfig } = useConfig()
    const locale = useLocale()
    const localeTag = getLocaleTag(locale)

    const formatTimestamp = (value: string) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        return date.toLocaleString(localeTag)
    }

    const ctfTimes = [
        { label: t('home.ctfStartAt'), value: appConfig.ctf_start_at },
        { label: t('home.ctfEndAt'), value: appConfig.ctf_end_at },
    ].filter((item) => typeof item.value === 'string' && item.value.trim().length > 0)

    return (
        <section className='fade-in'>
            <div className='relative overflow-hidden p-4 sm:p-8 md:p-10'>
                <div className='relative z-10'>
                    <h1 className='mt-2 text-2xl font-semibold text-text sm:mt-4 md:text-3xl lg:text-4xl'>
                        {appConfig.title}
                    </h1>
                    <div className='mt-3 max-w-2xl text-base text-text sm:mt-4 sm:text-base md:text-lg'>
                        <Markdown content={appConfig.description} />
                    </div>
                    <div className='mt-6 flex flex-wrap gap-3 sm:mt-8 sm:gap-4'>
                        <a
                            href='/challenges'
                            className='rounded-full bg-accent px-5 py-2.5 text-sm text-contrast-foreground transition hover:bg-accent-strong sm:px-6 sm:py-3 sm:text-base cursor-pointer'
                            onClick={(e) => navigate('/challenges', e)}
                        >
                            {t('home.ctaChallenges')}
                        </a>
                        {!auth.user ? (
                            <a
                                href='/register'
                                className='rounded-full border border-border px-5 py-2.5 text-sm text-text transition hover:border-accent sm:px-6 sm:py-3 sm:text-base cursor-pointer'
                                onClick={(e) => navigate('/register', e)}
                            >
                                {t('home.ctaSignUp')}
                            </a>
                        ) : null}
                    </div>
                    {ctfTimes.length > 0 ? (
                        <div className='mt-6 max-w-xl rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm text-text sm:mt-8'>
                            <div className='grid gap-2 sm:grid-cols-2'>
                                {ctfTimes.map((item) => (
                                    <div key={item.label} className='flex flex-col gap-1'>
                                        <span className='text-xs uppercase tracking-wide text-text-muted'>
                                            {item.label}
                                        </span>
                                        <span className='text-sm text-text'>
                                            {formatTimestamp(item.value as string)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    )
}

export default Home
