import { useRef, useState } from 'react'
import { uploadPresignedPost } from '../../lib/api'
import { CHALLENGE_CATEGORIES } from '../../lib/constants'
import { formatApiError, isZipFile, type FieldErrors } from '../../lib/utils'
import FormMessage from '../../components/FormMessage'
import { getCategoryKey, useT } from '../../lib/i18n'
import { useApi } from '../../lib/useApi'

const CreateChallenge = () => {
    const t = useT()
    const api = useApi()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState<string>(CHALLENGE_CATEGORIES[0])
    const [points, setPoints] = useState(100)
    const [minimumPoints, setMinimumPoints] = useState(100)
    const [flag, setFlag] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [stackEnabled, setStackEnabled] = useState(false)
    const [stackTargetPort, setStackTargetPort] = useState(80)
    const [stackPodSpec, setStackPodSpec] = useState('')
    const [challengeFile, setChallengeFile] = useState<File | null>(null)
    const [challengeFileError, setChallengeFileError] = useState('')
    const [challengeFileUploading, setChallengeFileUploading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const submit = async () => {
        setLoading(true)
        setErrorMessage('')
        setSuccessMessage('')
        setFieldErrors({})
        setChallengeFileError('')

        try {
            if (challengeFile && !isZipFile(challengeFile)) {
                setChallengeFileError(t('admin.create.onlyZip'))
                return
            }

            const created = await api.createChallenge({
                title,
                description,
                category,
                points: Number(points),
                minimum_points: Number(minimumPoints),
                flag,
                is_active: isActive,
                stack_enabled: stackEnabled,
                stack_target_port: stackEnabled ? Number(stackTargetPort) : undefined,
                stack_pod_spec: stackEnabled ? stackPodSpec : undefined,
            })

            setSuccessMessage(t('admin.create.success', { title: created.title, id: created.id }))

            if (challengeFile) {
                try {
                    setChallengeFileUploading(true)
                    const uploadResponse = await api.requestChallengeFileUpload(created.id, challengeFile.name)
                    await uploadPresignedPost(uploadResponse.upload, challengeFile)
                    setSuccessMessage(t('admin.create.successWithFile', { title: created.title, id: created.id }))
                } catch (uploadError) {
                    const formattedUpload = formatApiError(uploadError, t)
                    setErrorMessage(t('admin.create.fileUploadFailed', { message: formattedUpload.message }))
                } finally {
                    setChallengeFileUploading(false)
                }
            }

            setTitle('')
            setDescription('')
            setCategory(CHALLENGE_CATEGORIES[0])
            setPoints(100)
            setMinimumPoints(100)
            setFlag('')
            setIsActive(true)
            setChallengeFile(null)
            setStackEnabled(false)
            setStackTargetPort(80)
            setStackPodSpec('')

            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        } catch (error) {
            const formatted = formatApiError(error, t)
            setErrorMessage(formatted.message)
            setFieldErrors(formatted.fieldErrors)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='rounded-3xl border border-border bg-surface p-4 md:p-8'>
            <form
                className='space-y-5'
                onSubmit={(event) => {
                    event.preventDefault()
                    submit()
                }}
            >
                <div>
                    <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-title'>
                        {t('common.title')}
                    </label>
                    <input
                        id='admin-title'
                        className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                        type='text'
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                    {fieldErrors.title ? (
                        <p className='mt-2 text-xs text-danger'>
                            {t('common.title')}: {fieldErrors.title}
                        </p>
                    ) : null}
                </div>
                <div>
                    <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-description'>
                        {t('common.description')}
                    </label>
                    <textarea
                        id='admin-description'
                        className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                        rows={5}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                    ></textarea>
                    {fieldErrors.description ? (
                        <p className='mt-2 text-xs text-danger'>
                            {t('common.description')}: {fieldErrors.description}
                        </p>
                    ) : null}
                </div>
                <div className='grid gap-4 md:grid-cols-3'>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-category'>
                            {t('common.category')}
                        </label>
                        <select
                            id='admin-category'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                        >
                            {CHALLENGE_CATEGORIES.map((option) => (
                                <option key={option} value={option}>
                                    {t(getCategoryKey(option))}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.category ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('common.category')}: {fieldErrors.category}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-points'>
                            {t('common.points')}
                        </label>
                        <input
                            id='admin-points'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            type='number'
                            min={1}
                            value={points}
                            onChange={(event) => setPoints(Number(event.target.value))}
                        />
                        {fieldErrors.points ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('common.points')}: {fieldErrors.points}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label
                            className='text-xs uppercase tracking-wide text-text-muted'
                            htmlFor='admin-minimum-points'
                        >
                            {t('common.minimum')}
                        </label>
                        <input
                            id='admin-minimum-points'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            type='number'
                            min={0}
                            value={minimumPoints}
                            onChange={(event) => setMinimumPoints(Number(event.target.value))}
                        />
                        {fieldErrors.minimum_points ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('common.minimum')}: {fieldErrors.minimum_points}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-flag'>
                            {t('common.flag')}
                        </label>
                        <input
                            id='admin-flag'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            type='text'
                            value={flag}
                            onChange={(event) => setFlag(event.target.value)}
                        />
                        {fieldErrors.flag ? (
                            <p className='mt-2 text-xs text-danger'>
                                {t('common.flag')}: {fieldErrors.flag}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className='text-xs uppercase tracking-wide text-text-muted' htmlFor='admin-file'>
                            {t('admin.create.challengeFile')}
                        </label>
                        <input
                            id='admin-file'
                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                            type='file'
                            accept='.zip'
                            ref={fileInputRef}
                            onChange={(event) => {
                                const target = event.currentTarget
                                setChallengeFile(target.files?.[0] ?? null)
                                setChallengeFileError('')
                            }}
                        />
                        {challengeFileError ? <p className='mt-2 text-xs text-danger'>{challengeFileError}</p> : null}
                    </div>
                </div>
                <label className='flex items-center gap-3 text-sm text-text'>
                    <input
                        type='checkbox'
                        checked={isActive}
                        onChange={(event) => setIsActive(event.target.checked)}
                        className='h-4 w-4 rounded border-border'
                    />
                    {t('admin.create.createActive')}
                </label>
                <div className='rounded-2xl border border-border bg-surface/60 p-4'>
                    <label className='flex items-center gap-3 text-sm text-text'>
                        <input
                            type='checkbox'
                            checked={stackEnabled}
                            onChange={(event) => setStackEnabled(event.target.checked)}
                            className='h-4 w-4 rounded border-border'
                        />
                        {t('admin.create.provideStack')}
                    </label>
                    {stackEnabled ? (
                        <div className='mt-4 grid gap-4'>
                            <div>
                                <label
                                    className='text-xs uppercase tracking-wide text-text-muted'
                                    htmlFor='admin-stack-target-port'
                                >
                                    {t('admin.create.targetPort')}
                                </label>
                                <input
                                    id='admin-stack-target-port'
                                    className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                    type='number'
                                    min={1}
                                    max={65535}
                                    value={stackTargetPort}
                                    onChange={(event) => setStackTargetPort(Number(event.target.value))}
                                />
                                {fieldErrors.stack_target_port ? (
                                    <p className='mt-2 text-xs text-danger'>
                                        {t('admin.create.targetPort')}: {fieldErrors.stack_target_port}
                                    </p>
                                ) : null}
                            </div>
                            <div>
                                <label
                                    className='text-xs uppercase tracking-wide text-text-muted'
                                    htmlFor='admin-stack-pod-spec'
                                >
                                    {t('admin.create.podSpec')}
                                </label>
                                <textarea
                                    id='admin-stack-pod-spec'
                                    className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-xs text-text focus:border-accent focus:outline-none'
                                    rows={7}
                                    value={stackPodSpec}
                                    onChange={(event) => setStackPodSpec(event.target.value)}
                                ></textarea>
                                {fieldErrors.stack_pod_spec ? (
                                    <p className='mt-2 text-xs text-danger'>
                                        {t('admin.create.podSpec')}: {fieldErrors.stack_pod_spec}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>

                {errorMessage ? <FormMessage variant='error' message={errorMessage} /> : null}
                {successMessage ? <FormMessage variant='success' message={successMessage} /> : null}

                <button
                    className='w-full rounded-xl bg-accent py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                    type='submit'
                    disabled={loading || challengeFileUploading}
                >
                    {loading
                        ? t('auth.creating')
                        : challengeFileUploading
                          ? t('admin.create.uploading')
                          : t('admin.create.createChallenge')}
                </button>
            </form>
        </div>
    )
}

export default CreateChallenge
