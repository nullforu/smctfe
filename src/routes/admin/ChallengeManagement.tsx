import { Fragment, useEffect, useState } from 'react'
import { uploadPresignedPost } from '../../lib/api'
import { CHALLENGE_CATEGORIES } from '../../lib/constants'
import { formatApiError, isZipFile, type FieldErrors } from '../../lib/utils'
import type { Challenge } from '../../lib/types'
import FormMessage from '../../components/FormMessage'
import { getCategoryKey, useT } from '../../lib/i18n'
import { useApi } from '../../lib/useApi'

const ChallengeManagement = () => {
    const t = useT()
    const api = useApi()
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [expandedChallengeId, setExpandedChallengeId] = useState<number | null>(null)
    const [manageLoading, setManageLoading] = useState(false)
    const [manageFieldErrors, setManageFieldErrors] = useState<FieldErrors>({})
    const [editTitle, setEditTitle] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editCategory, setEditCategory] = useState<string>(CHALLENGE_CATEGORIES[0])
    const [editPoints, setEditPoints] = useState(100)
    const [editMinimumPoints, setEditMinimumPoints] = useState(100)
    const [editIsActive, setEditIsActive] = useState(true)
    const [editStackEnabled, setEditStackEnabled] = useState(false)
    const [editStackTargetPort, setEditStackTargetPort] = useState(80)
    const [editStackPodSpec, setEditStackPodSpec] = useState('')
    const [editFile, setEditFile] = useState<File | null>(null)
    const [editFileError, setEditFileError] = useState('')
    const [editFileUploading, setEditFileUploading] = useState(false)
    const [editFileSuccess, setEditFileSuccess] = useState('')

    useEffect(() => {
        loadChallenges()
    }, [])

    const loadChallenges = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            const response = await api.challenges()
            setChallenges(response.challenges)
        } catch (error) {
            const formatted = formatApiError(error, t)
            setErrorMessage(formatted.message)
        } finally {
            setLoading(false)
        }
    }

    const openEditor = async (challenge: Challenge) => {
        setManageFieldErrors({})
        setErrorMessage('')
        setSuccessMessage('')
        setEditFileError('')
        setEditFileSuccess('')
        setEditFile(null)

        if (expandedChallengeId === challenge.id) {
            setExpandedChallengeId(null)
            return
        }

        setExpandedChallengeId(challenge.id)
        setEditTitle(challenge.title)
        setEditDescription(challenge.description)
        setEditCategory(challenge.category)
        setEditPoints(challenge.initial_points)
        setEditMinimumPoints(challenge.minimum_points)
        setEditIsActive(challenge.is_active)
        setEditStackEnabled(challenge.stack_enabled)
        setEditStackTargetPort(challenge.stack_target_port || 80)
        setEditStackPodSpec('')

        if (challenge.stack_enabled) {
            try {
                setManageLoading(true)
                const detail = await api.adminChallenge(challenge.id)
                setEditStackTargetPort(detail.stack_target_port || challenge.stack_target_port || 80)
                setEditStackPodSpec(detail.stack_pod_spec ?? '')
            } catch (error) {
                const formatted = formatApiError(error, t)
                setErrorMessage(formatted.message)
            } finally {
                setManageLoading(false)
            }
        }
    }

    const submitEdit = async (challenge: Challenge) => {
        setManageLoading(true)
        setManageFieldErrors({})
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const updated = await api.updateChallenge(challenge.id, {
                title: editTitle,
                description: editDescription,
                category: editCategory,
                points: Number(editPoints),
                minimum_points: Number(editMinimumPoints),
                is_active: editIsActive,
                stack_enabled: editStackEnabled,
                stack_target_port: editStackEnabled ? Number(editStackTargetPort) : undefined,
                stack_pod_spec: editStackEnabled && editStackPodSpec.trim() ? editStackPodSpec : undefined,
            })

            setChallenges((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
            setSuccessMessage(t('admin.manage.successUpdated', { title: updated.title }))

            setEditTitle(updated.title)
            setEditDescription(updated.description)
            setEditCategory(updated.category)
            setEditPoints(updated.initial_points)
            setEditMinimumPoints(updated.minimum_points)
            setEditIsActive(updated.is_active)
            setEditStackEnabled(updated.stack_enabled)
            setEditStackTargetPort(updated.stack_target_port || 80)
            setEditStackPodSpec('')
        } catch (error) {
            const formatted = formatApiError(error, t)
            setErrorMessage(formatted.message)
            setManageFieldErrors(formatted.fieldErrors)
        } finally {
            setManageLoading(false)
        }
    }

    const uploadEditFile = async (challenge: Challenge) => {
        setEditFileError('')
        setEditFileSuccess('')

        if (!editFile) {
            setEditFileError(t('admin.manage.selectZip'))
            return
        }

        if (!isZipFile(editFile)) {
            setEditFileError(t('admin.create.onlyZip'))
            return
        }

        setEditFileUploading(true)

        try {
            const uploadResponse = await api.requestChallengeFileUpload(challenge.id, editFile.name)
            await uploadPresignedPost(uploadResponse.upload, editFile)
            setChallenges((prev) =>
                prev.map((item) => (item.id === uploadResponse.challenge.id ? uploadResponse.challenge : item)),
            )
            setEditFileSuccess(t('admin.manage.fileUploaded'))
            setEditFile(null)
        } catch (error) {
            const formatted = formatApiError(error, t)
            setEditFileError(formatted.message)
        } finally {
            setEditFileUploading(false)
        }
    }

    const deleteEditFile = async (challenge: Challenge) => {
        const confirmed = window.confirm(
            t('admin.manage.confirmDeleteFile', { title: challenge.title, id: challenge.id }),
        )
        if (!confirmed) return

        setEditFileError('')
        setEditFileSuccess('')
        setEditFileUploading(true)

        try {
            const updated = await api.deleteChallengeFile(challenge.id)
            setChallenges((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
            setEditFileSuccess(t('admin.manage.fileDeleted'))
        } catch (error) {
            const formatted = formatApiError(error, t)
            setEditFileError(formatted.message)
        } finally {
            setEditFileUploading(false)
        }
    }

    const deleteChallenge = async (challenge: Challenge) => {
        const confirmed = window.confirm(
            t('admin.manage.confirmDeleteChallenge', { title: challenge.title, id: challenge.id }),
        )
        if (!confirmed) return

        setManageLoading(true)
        setManageFieldErrors({})
        setErrorMessage('')
        setSuccessMessage('')

        try {
            await api.deleteChallenge(challenge.id)
            setChallenges((prev) => prev.filter((item) => item.id !== challenge.id))
            setSuccessMessage(t('admin.manage.successDeleted', { title: challenge.title }))
            if (expandedChallengeId === challenge.id) {
                setExpandedChallengeId(null)
            }
        } catch (error) {
            const formatted = formatApiError(error, t)
            setErrorMessage(formatted.message)
        } finally {
            setManageLoading(false)
        }
    }

    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between'>
                <button
                    className='text-xs uppercase tracking-wide text-text-subtle hover:text-text cursor-pointer'
                    onClick={loadChallenges}
                    disabled={loading}
                >
                    {loading ? t('common.loading') : t('common.refresh')}
                </button>
            </div>

            {errorMessage ? <FormMessage variant='error' message={errorMessage} /> : null}
            {successMessage ? <FormMessage variant='success' message={successMessage} /> : null}

            {loading ? (
                <p className='text-sm text-text-subtle'>{t('admin.manage.loadingChallenges')}</p>
            ) : (
                <div className='overflow-hidden rounded-2xl border border-border bg-surface'>
                    <div className='overflow-x-auto'>
                        <table className='w-full'>
                            <thead className='border-b border-border bg-surface-muted'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.id')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.title')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.category')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('admin.manage.initial')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.points')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.minimum')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('challenges.solvedLabel')}
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.status')}
                                    </th>
                                    <th className='px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted'>
                                        {t('common.action')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border'>
                                {challenges.map((challenge) => (
                                    <Fragment key={challenge.id}>
                                        <tr className='transition hover:bg-surface-muted'>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>
                                                {challenge.id}
                                            </td>
                                            <td className='px-6 py-4 text-sm text-text'>{challenge.title}</td>
                                            <td className='px-6 py-4 text-sm text-text'>
                                                {t(getCategoryKey(challenge.category))}
                                            </td>
                                            <td className='px-6 py-4 text-sm text-text'>{challenge.points}</td>
                                            <td className='px-6 py-4 text-sm text-text'>{challenge.initial_points}</td>
                                            <td className='px-6 py-4 text-sm text-text'>{challenge.minimum_points}</td>
                                            <td className='px-6 py-4 text-sm text-text'>{challenge.solve_count}</td>
                                            <td className='px-6 py-4 text-sm'>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${
                                                        challenge.is_active
                                                            ? 'bg-accent/20 text-accent-strong'
                                                            : 'bg-surface-subtle text-text'
                                                    }`}
                                                >
                                                    {challenge.is_active
                                                        ? t('admin.manage.statusActive')
                                                        : t('admin.manage.statusInactive')}
                                                </span>
                                            </td>
                                            <td className='whitespace-nowrap px-6 py-4 text-right text-sm'>
                                                <div className='flex items-center justify-end gap-3'>
                                                    <button
                                                        className='text-accent hover:text-accent-strong cursor-pointer'
                                                        onClick={() => openEditor(challenge)}
                                                        disabled={manageLoading}
                                                    >
                                                        {expandedChallengeId === challenge.id
                                                            ? t('admin.manage.closeEdit')
                                                            : t('admin.manage.edit')}
                                                    </button>
                                                    <button
                                                        className='text-danger hover:text-danger-strong cursor-pointer'
                                                        onClick={() => deleteChallenge(challenge)}
                                                        disabled={manageLoading}
                                                    >
                                                        {t('admin.manage.delete')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedChallengeId === challenge.id ? (
                                            <tr className='bg-surface/70'>
                                                <td colSpan={9} className='px-6 py-6'>
                                                    <form
                                                        className='space-y-5'
                                                        onSubmit={(event) => {
                                                            event.preventDefault()
                                                            submitEdit(challenge)
                                                        }}
                                                    >
                                                        <div>
                                                            <label
                                                                className='text-xs uppercase tracking-wide text-text-muted'
                                                                htmlFor={`manage-title-${challenge.id}`}
                                                            >
                                                                {t('common.title')}
                                                            </label>
                                                            <input
                                                                id={`manage-title-${challenge.id}`}
                                                                className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                                                type='text'
                                                                value={editTitle}
                                                                onChange={(event) => setEditTitle(event.target.value)}
                                                            />
                                                            {manageFieldErrors.title ? (
                                                                <p className='mt-2 text-xs text-danger'>
                                                                    {t('common.title')}: {manageFieldErrors.title}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <div>
                                                            <label
                                                                className='text-xs uppercase tracking-wide text-text-muted'
                                                                htmlFor={`manage-description-${challenge.id}`}
                                                            >
                                                                {t('common.description')}
                                                            </label>
                                                            <textarea
                                                                id={`manage-description-${challenge.id}`}
                                                                className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                                                rows={5}
                                                                value={editDescription}
                                                                onChange={(event) =>
                                                                    setEditDescription(event.target.value)
                                                                }
                                                            ></textarea>
                                                            {manageFieldErrors.description ? (
                                                                <p className='mt-2 text-xs text-danger'>
                                                                    {t('common.description')}:{' '}
                                                                    {manageFieldErrors.description}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <div className='grid gap-4 md:grid-cols-3'>
                                                            <div>
                                                                <label
                                                                    className='text-xs uppercase tracking-wide text-text-muted'
                                                                    htmlFor={`manage-category-${challenge.id}`}
                                                                >
                                                                    {t('common.category')}
                                                                </label>
                                                                <select
                                                                    id={`manage-category-${challenge.id}`}
                                                                    className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                                                    value={editCategory}
                                                                    onChange={(event) =>
                                                                        setEditCategory(event.target.value)
                                                                    }
                                                                >
                                                                    {CHALLENGE_CATEGORIES.map((option) => (
                                                                        <option key={option} value={option}>
                                                                            {t(getCategoryKey(option))}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {manageFieldErrors.category ? (
                                                                    <p className='mt-2 text-xs text-danger'>
                                                                        {t('common.category')}:{' '}
                                                                        {manageFieldErrors.category}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            <div>
                                                                <label
                                                                    className='text-xs uppercase tracking-wide text-text-muted'
                                                                    htmlFor={`manage-points-${challenge.id}`}
                                                                >
                                                                    {t('common.points')}
                                                                </label>
                                                                <input
                                                                    id={`manage-points-${challenge.id}`}
                                                                    className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                                                    type='number'
                                                                    min={1}
                                                                    value={editPoints}
                                                                    onChange={(event) =>
                                                                        setEditPoints(Number(event.target.value))
                                                                    }
                                                                />
                                                                {manageFieldErrors.points ? (
                                                                    <p className='mt-2 text-xs text-danger'>
                                                                        {t('common.points')}: {manageFieldErrors.points}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            <div>
                                                                <label
                                                                    className='text-xs uppercase tracking-wide text-text-muted'
                                                                    htmlFor={`manage-minimum-points-${challenge.id}`}
                                                                >
                                                                    {t('common.minimum')}
                                                                </label>
                                                                <input
                                                                    id={`manage-minimum-points-${challenge.id}`}
                                                                    className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                                                    type='number'
                                                                    min={0}
                                                                    value={editMinimumPoints}
                                                                    onChange={(event) =>
                                                                        setEditMinimumPoints(Number(event.target.value))
                                                                    }
                                                                />
                                                                {manageFieldErrors.minimum_points ? (
                                                                    <p className='mt-2 text-xs text-danger'>
                                                                        {t('common.minimum')}:{' '}
                                                                        {manageFieldErrors.minimum_points}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <label className='flex items-center gap-3 text-sm text-text'>
                                                            <input
                                                                type='checkbox'
                                                                checked={editIsActive}
                                                                onChange={(event) =>
                                                                    setEditIsActive(event.target.checked)
                                                                }
                                                                className='h-4 w-4 rounded border-border'
                                                            />
                                                            {t('common.active')}
                                                        </label>
                                                        <div className='rounded-2xl border border-border bg-surface/60 p-4'>
                                                            <label className='flex items-center gap-3 text-sm text-text'>
                                                                <input
                                                                    type='checkbox'
                                                                    checked={editStackEnabled}
                                                                    onChange={(event) =>
                                                                        setEditStackEnabled(event.target.checked)
                                                                    }
                                                                    className='h-4 w-4 rounded border-border'
                                                                />
                                                                {t('admin.create.provideStack')}
                                                            </label>
                                                            {editStackEnabled ? (
                                                                <div className='mt-4 grid gap-4'>
                                                                    <div>
                                                                        <label
                                                                            className='text-xs uppercase tracking-wide text-text-muted'
                                                                            htmlFor={`manage-stack-target-port-${challenge.id}`}
                                                                        >
                                                                            {t('admin.create.targetPort')}
                                                                        </label>
                                                                        <input
                                                                            id={`manage-stack-target-port-${challenge.id}`}
                                                                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-accent focus:outline-none'
                                                                            type='number'
                                                                            min={1}
                                                                            max={65535}
                                                                            value={editStackTargetPort}
                                                                            onChange={(event) =>
                                                                                setEditStackTargetPort(
                                                                                    Number(event.target.value),
                                                                                )
                                                                            }
                                                                        />
                                                                        {manageFieldErrors.stack_target_port ? (
                                                                            <p className='mt-2 text-xs text-danger'>
                                                                                {t('admin.create.targetPort')}:{' '}
                                                                                {manageFieldErrors.stack_target_port}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                    <div>
                                                                        <label
                                                                            className='text-xs uppercase tracking-wide text-text-muted'
                                                                            htmlFor={`manage-stack-pod-spec-${challenge.id}`}
                                                                        >
                                                                            {t('admin.create.podSpec')}
                                                                        </label>
                                                                        <textarea
                                                                            id={`manage-stack-pod-spec-${challenge.id}`}
                                                                            className='mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-xs text-text focus:border-accent focus:outline-none'
                                                                            rows={7}
                                                                            placeholder={t(
                                                                                'admin.manage.podSpecPlaceholder',
                                                                            )}
                                                                            value={editStackPodSpec}
                                                                            onChange={(event) =>
                                                                                setEditStackPodSpec(event.target.value)
                                                                            }
                                                                        ></textarea>
                                                                        {manageFieldErrors.stack_pod_spec ? (
                                                                            <p className='mt-2 text-xs text-danger'>
                                                                                {t('admin.create.podSpec')}:{' '}
                                                                                {manageFieldErrors.stack_pod_spec}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <div className='rounded-xl border border-border bg-surface/60 p-4 text-sm text-text'>
                                                            <p className='text-xs uppercase tracking-wide text-text-subtle'>
                                                                {t('admin.manage.challengeFile')}
                                                            </p>
                                                            <p className='mt-2 text-sm text-text'>
                                                                {challenge.has_file
                                                                    ? (challenge.file_name ?? 'challenge.zip')
                                                                    : t('admin.manage.noFileUploaded')}
                                                            </p>
                                                            <div className='mt-3 flex flex-wrap items-center gap-3'>
                                                                <input
                                                                    className='w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text sm:w-auto'
                                                                    type='file'
                                                                    accept='.zip'
                                                                    onChange={(event) => {
                                                                        const target = event.currentTarget
                                                                        setEditFile(target.files?.[0] ?? null)
                                                                        setEditFileError('')
                                                                        setEditFileSuccess('')
                                                                    }}
                                                                />
                                                                <button
                                                                    className='rounded-lg bg-contrast px-4 py-2 text-xs font-medium text-contrast-foreground transition hover:bg-contrast/80 disabled:opacity-60 cursor-pointer'
                                                                    type='button'
                                                                    onClick={() => uploadEditFile(challenge)}
                                                                    disabled={editFileUploading || manageLoading}
                                                                >
                                                                    {editFileUploading
                                                                        ? t('admin.create.uploading')
                                                                        : t('admin.manage.uploadZip')}
                                                                </button>
                                                                {challenge.has_file ? (
                                                                    <button
                                                                        className='rounded-lg border border-danger/30 px-4 py-2 text-xs font-medium text-danger transition hover:border-danger/50 hover:text-danger-strong disabled:opacity-60 cursor-pointer'
                                                                        type='button'
                                                                        onClick={() => deleteEditFile(challenge)}
                                                                        disabled={editFileUploading || manageLoading}
                                                                    >
                                                                        {t('admin.manage.deleteFile')}
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                            {editFileError ? (
                                                                <FormMessage
                                                                    variant='error'
                                                                    message={editFileError}
                                                                    className='mt-2'
                                                                />
                                                            ) : null}
                                                            {editFileSuccess ? (
                                                                <FormMessage
                                                                    variant='success'
                                                                    message={editFileSuccess}
                                                                    className='mt-2'
                                                                />
                                                            ) : null}
                                                        </div>

                                                        <div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
                                                            <button
                                                                className='rounded-xl border border-border px-5 py-3 text-sm text-text transition hover:border-border hover:text-text disabled:opacity-60 cursor-pointer'
                                                                type='button'
                                                                onClick={() => setExpandedChallengeId(null)}
                                                                disabled={manageLoading}
                                                            >
                                                                {t('common.cancel')}
                                                            </button>
                                                            <button
                                                                className='rounded-xl bg-accent px-5 py-3 text-sm text-contrast-foreground transition hover:bg-accent-strong disabled:opacity-60 cursor-pointer'
                                                                type='submit'
                                                                disabled={manageLoading}
                                                            >
                                                                {manageLoading
                                                                    ? t('admin.site.saving')
                                                                    : t('common.saveChanges')}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                                {challenges.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className='px-6 py-8 text-center text-sm text-text-muted'>
                                            {t('admin.manage.noChallenges')}
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ChallengeManagement
