import { useEffect, useMemo, useState } from 'react'
import type { UserListItem } from '../lib/types'
import { formatApiError } from '../lib/utils'
import { navigate } from '../lib/router'
import { getRoleKey, useT } from '../lib/i18n'
import { useApi } from '../lib/useApi'

interface RouteProps {
    routeParams?: Record<string, string>
}

const Users = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const api = useApi()
    const [users, setUsers] = useState<UserListItem[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    const loadUsers = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            setUsers(await api.users())
        } catch (error) {
            setErrorMessage(formatApiError(error, t).message)
        } finally {
            setLoading(false)
        }
    }

    const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery])
    const sortedUsers = useMemo(() => [...users].sort((a, b) => a.id - b.id), [users])
    const filteredUsers = useMemo(
        () =>
            normalizedQuery
                ? sortedUsers.filter(
                      (user) =>
                          user.username.toLowerCase().includes(normalizedQuery) ||
                          user.id.toString().includes(normalizedQuery) ||
                          user.team_name.toLowerCase().includes(normalizedQuery),
                  )
                : sortedUsers,
        [normalizedQuery, sortedUsers],
    )

    useEffect(() => {
        loadUsers()
    }, [])

    return (
        <section className='fade-in'>
            <div className='flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h2 className='text-3xl text-text'>{t('users.title')}</h2>
                </div>
            </div>

            <div className='mt-6'>
                <input
                    type='text'
                    placeholder={t('users.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className='w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder-text-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                />
            </div>

            {loading ? (
                <p className='mt-6 text-sm text-text-muted'>{t('common.loading')}</p>
            ) : errorMessage ? (
                <p className='mt-6 text-sm text-danger'>{errorMessage}</p>
            ) : (
                <div className='mt-6'>
                    <div className='overflow-hidden rounded-2xl border border-border bg-surface'>
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead className='border-b border-border bg-surface-muted'>
                                    <tr>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.id')}
                                        </th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.username')}
                                        </th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.team')}
                                        </th>
                                        <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.role')}
                                        </th>
                                        <th className='px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted'>
                                            {t('common.action')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-border'>
                                    {filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className='transition hover:bg-surface-muted cursor-pointer'
                                            onClick={() => navigate(`/users/${user.id}`)}
                                        >
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>{user.id}</td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>
                                                {user.username}
                                            </td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm text-text'>
                                                {user.team_name}
                                            </td>
                                            <td className='whitespace-nowrap px-6 py-4 text-sm'>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${
                                                        user.role === 'admin'
                                                            ? 'bg-secondary/20 text-secondary'
                                                            : user.role === 'blocked'
                                                              ? 'bg-danger/20 text-danger'
                                                              : 'bg-accent/20 text-accent-strong'
                                                    }`}
                                                >
                                                    {t(getRoleKey(user.role))}
                                                </span>
                                            </td>
                                            <td className='whitespace-nowrap px-6 py-4 text-right text-sm'>
                                                <button
                                                    className='text-accent hover:text-accent-strong cursor-pointer'
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        navigate(`/users/${user.id}`)
                                                    }}
                                                    type='button'
                                                >
                                                    {t('common.view')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className='px-6 py-8 text-center text-sm text-text-muted'>
                                                {searchQuery ? t('users.noResults') : t('users.noUsers')}
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {filteredUsers.length > 0 ? (
                        <p className='mt-4 text-sm text-text-muted'>
                            {filteredUsers.length === 1
                                ? t('users.countSingular', { count: filteredUsers.length })
                                : t('users.countPlural', { count: filteredUsers.length })}
                            {searchQuery ? ` ${t('common.outOf', { total: users.length })}` : ''}
                        </p>
                    ) : null}
                </div>
            )}
        </section>
    )
}

export default Users
