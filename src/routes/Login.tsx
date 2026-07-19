import { useState } from 'react'
import { formatApiError, type FieldErrors } from '../lib/utils'
import { navigate } from '../lib/router'
import FormMessage from '../components/FormMessage'
import { useT } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/useApi'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Login = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const { state: auth } = useAuth()
    const api = useApi()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

    const submit = async () => {
        setLoading(true)
        setErrorMessage('')
        setFieldErrors({})

        try {
            await api.login({ email, password })
            navigate('/challenges')
        } catch (error) {
            const formatted = formatApiError(error, t)
            setErrorMessage(formatted.message)
            setFieldErrors(formatted.fieldErrors)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className='animate space-y-6'>
            <div className='border-2 border-border bg-linear-to-br from-surface via-surface to-surface-muted px-6 py-8 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:px-8'>
                <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>{t('auth.login')}</p>
                <h1 className='mt-3 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text'>{t('auth.login')}</h1>
                <p className='mt-2 text-sm text-text-muted'>{t('auth.needHelp')}</p>
            </div>

            <div className='grid gap-8 md:grid-cols-[1.1fr_1fr]'>
                <div className='border-2 border-border bg-surface p-8 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-10'>
                    <h2 className='font-display text-3xl uppercase tracking-[0.08em] text-text'>{t('auth.login')}</h2>

                    {auth.user ? (
                        <div className='mt-6 border-2 border-accent/40 bg-accent/10 p-4 text-sm text-accent-strong'>
                            {t('auth.alreadyLoggedIn', { username: auth.user.username })}{' '}
                            <a className='ml-2 underline cursor-pointer' href='/challenges' onClick={(e) => navigate('/challenges', e)}>
                                {t('auth.goToChallenges')}
                            </a>
                        </div>
                    ) : null}

                    <form
                        className='mt-6 space-y-5'
                        onSubmit={(event) => {
                            event.preventDefault()
                            submit()
                        }}
                    >
                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='login-email'>
                                {t('auth.emailLabel')}
                            </label>
                            <input
                                id='login-email'
                                className='mt-2 w-full border-2 border-border bg-surface px-4 py-3 font-mono text-sm text-text focus:border-accent focus:outline-none'
                                type='email'
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder={t('auth.emailPlaceholder')}
                                autoComplete='email'
                            />
                            {fieldErrors.email ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('auth.emailLabel')}: {fieldErrors.email}
                                </p>
                            ) : null}
                        </div>
                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='login-password'>
                                {t('auth.passwordLabel')}
                            </label>
                            <input
                                id='login-password'
                                className='mt-2 w-full border-2 border-border bg-surface px-4 py-3 font-mono text-sm text-text focus:border-accent focus:outline-none'
                                type='password'
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder={t('auth.passwordPlaceholder')}
                                autoComplete='current-password'
                            />
                            {fieldErrors.password ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('auth.passwordLabel')}: {fieldErrors.password}
                                </p>
                            ) : null}
                        </div>

                        {errorMessage ? <FormMessage variant='error' message={errorMessage} /> : null}

                        <button
                            className='w-full border-2 border-accent bg-accent py-3 font-mono text-xs uppercase tracking-[0.16em] text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                            type='submit'
                            disabled={loading}
                        >
                            {loading ? t('auth.loggingIn') : t('auth.login')}
                        </button>
                    </form>
                </div>

                <div className='border-2 border-border bg-surface p-8 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-10'>
                    <h3 className='font-display text-lg uppercase tracking-[0.08em] text-text'>{t('auth.needHelp')}</h3>
                    <ul className='mt-4 space-y-3 text-sm text-text'>
                        <li>
                            {t('auth.noAccount')}{' '}
                            <a className='text-accent underline cursor-pointer' href='/register' onClick={(e) => navigate('/register', e)}>
                                {t('auth.signUpLink')}
                            </a>
                            .
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    )
}

export default Login
