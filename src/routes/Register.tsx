import { useState } from 'react'
import { charLength, formatApiError, NAME_MAX_LEN, trimToMaxChars, trimToMaxUtf8Bytes, utf8ByteLength, type FieldErrors } from '../lib/utils'
import { navigate } from '../lib/router'
import FormMessage from '../components/FormMessage'
import { useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Register = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const api = useApi()
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [registrationKey, setRegistrationKey] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [success, setSuccess] = useState(false)
    const passwordBytes = utf8ByteLength(password)

    const submit = async () => {
        setLoading(true)
        setSuccess(false)
        setErrorMessage('')
        setFieldErrors({})

        try {
            if (passwordBytes > 72) {
                setFieldErrors({ password: t('limits.maxBytes72') })
                return
            }
            await api.register({ email, username, password, registration_key: registrationKey })

            setSuccess(true)
            setEmail('')
            setUsername('')
            setPassword('')
            setRegistrationKey('')
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
                <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>{t('auth.register')}</p>
                <h1 className='mt-3 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text'>{t('auth.register')}</h1>
                <p className='mt-2 text-sm text-text-muted'>{t('register.noticeTitle')}</p>
            </div>

            <div className='grid gap-8 md:grid-cols-[1.1fr_1fr]'>
                <div className='border-2 border-border bg-surface p-8 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-10'>
                    <h2 className='font-display text-3xl uppercase tracking-[0.08em] text-text'>{t('auth.register')}</h2>

                    <form
                        className='mt-6 space-y-5'
                        onSubmit={(event) => {
                            event.preventDefault()
                            submit()
                        }}
                    >
                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='register-email'>
                                {t('auth.emailLabel')}
                            </label>
                            <input
                                id='register-email'
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
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='register-username'>
                                {t('auth.usernameLabel')}
                            </label>
                            <input
                                id='register-username'
                                className='mt-2 w-full border-2 border-border bg-surface px-4 py-3 font-mono text-sm text-text focus:border-accent focus:outline-none'
                                type='text'
                                maxLength={NAME_MAX_LEN}
                                value={username}
                                onChange={(event) => setUsername(trimToMaxChars(event.target.value, NAME_MAX_LEN))}
                                placeholder={t('auth.usernamePlaceholder')}
                                autoComplete='username'
                            />
                            <p className='mt-1 text-xs text-text-subtle'>{t('limits.charCounter', { current: charLength(username), max: NAME_MAX_LEN })}</p>
                            {fieldErrors.username ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('auth.usernameLabel')}: {fieldErrors.username}
                                </p>
                            ) : null}
                        </div>
                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='register-password'>
                                {t('auth.passwordLabel')}
                            </label>
                            <input
                                id='register-password'
                                className='mt-2 w-full border-2 border-border bg-surface px-4 py-3 font-mono text-sm text-text focus:border-accent focus:outline-none'
                                type='password'
                                maxLength={72}
                                value={password}
                                onChange={(event) => setPassword(trimToMaxUtf8Bytes(event.target.value, 72))}
                                placeholder={t('auth.passwordPlaceholder')}
                                autoComplete='new-password'
                            />
                            <p className='mt-1 text-xs text-text-subtle'>{t('limits.byteCounter', { current: passwordBytes, max: 72 })}</p>
                            {fieldErrors.password ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('auth.passwordLabel')}: {fieldErrors.password}
                                </p>
                            ) : null}
                        </div>
                        <div>
                            <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='register-key'>
                                {t('auth.registrationKey')}
                            </label>
                            <input
                                id='register-key'
                                className='mt-2 w-full border-2 border-border bg-surface px-4 py-3 font-mono text-sm text-text focus:border-accent focus:outline-none'
                                type='text'
                                inputMode='text'
                                autoCapitalize='characters'
                                maxLength={16}
                                value={registrationKey}
                                onChange={(event) => setRegistrationKey(event.target.value.toUpperCase().replace(/\s/g, ''))}
                                placeholder={t('auth.registrationKeyPlaceholder')}
                                autoComplete='one-time-code'
                                spellCheck={false}
                            />
                            {fieldErrors.registration_key ? (
                                <p className='mt-2 text-xs text-danger'>
                                    {t('auth.registrationKey')}: {fieldErrors.registration_key}
                                </p>
                            ) : null}
                        </div>

                        {errorMessage ? <FormMessage variant='error' message={errorMessage} /> : null}
                        {success ? (
                            <FormMessage variant='success'>
                                {t('auth.accountCreatedPrefix')}{' '}
                                <a className='underline cursor-pointer' href='/login' onClick={(e) => navigate('/login', e)}>
                                    {t('auth.loginLink')}
                                </a>{' '}
                                {t('auth.accountCreatedSuffix')}
                            </FormMessage>
                        ) : null}

                        <button
                            className='w-full border-2 border-accent bg-accent py-3 font-mono text-xs uppercase tracking-[0.16em] text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                            type='submit'
                            disabled={loading}
                        >
                            {loading ? t('auth.creating') : t('auth.createAccount')}
                        </button>
                    </form>
                </div>

                <div className='border-2 border-border bg-surface p-8 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-10'>
                    <h3 className='font-display text-lg uppercase tracking-[0.08em] text-text'>{t('register.noticeTitle')}</h3>
                    <ul className='mt-4 space-y-3 text-sm text-text'>
                        <li>{t('register.noticeRule1')}</li>
                        <li>{t('register.noticeRule2')}</li>
                    </ul>
                </div>
            </div>
        </section>
    )
}

export default Register
