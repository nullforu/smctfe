import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Division } from './types'
import { useApi } from './useApi'
import { useAuth } from './auth'

interface DivisionState {
    divisions: Division[]
    selectedDivisionId: number | null
    loading: boolean
    errorMessage: string
    refresh: () => Promise<void>
    setSelectedDivisionId: (id: number) => void
}

const STORAGE_KEY = 'smctf.division'

const loadStoredDivisionId = (): number | null => {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
}

const persistDivisionId = (id: number | null) => {
    if (typeof localStorage === 'undefined') return
    if (!id) {
        localStorage.removeItem(STORAGE_KEY)
        return
    }
    localStorage.setItem(STORAGE_KEY, String(id))
}

const DivisionContext = createContext<DivisionState | null>(null)

export const DivisionProvider = ({ children }: { children: React.ReactNode }) => {
    const api = useApi()
    const { state } = useAuth()
    const [divisions, setDivisions] = useState<Division[]>([])
    const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const hasInitializedRef = useRef(false)
    const lastUserDivisionIdRef = useRef<number | null>(state.user?.division_id ?? null)

    const resolveDefaultDivision = useCallback((items: Division[], userDivisionId?: number | null) => {
        if (items.length === 0) return null
        if (userDivisionId) {
            const match = items.find((division) => division.id === userDivisionId)
            if (match) return match.id
        }
        const stored = loadStoredDivisionId()
        if (stored) {
            const storedMatch = items.find((division) => division.id === stored)
            if (storedMatch) return storedMatch.id
        }
        return items[0].id
    }, [])

    const refresh = useCallback(async () => {
        setLoading(true)
        setErrorMessage('')
        try {
            const data = await api.divisions()
            setDivisions(data)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load divisions')
        } finally {
            setLoading(false)
        }
    }, [api])

    useEffect(() => {
        void refresh()
    }, [refresh])

    useEffect(() => {
        if (divisions.length === 0) return
        const userDivisionId = state.user?.division_id ?? null
        const next = resolveDefaultDivision(divisions, userDivisionId)

        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true
            lastUserDivisionIdRef.current = userDivisionId
            setSelectedDivisionId(next)
            persistDivisionId(next)
            return
        }

        if (userDivisionId && userDivisionId !== lastUserDivisionIdRef.current) {
            lastUserDivisionIdRef.current = userDivisionId
            setSelectedDivisionId(next)
            persistDivisionId(next)
        }
    }, [divisions, resolveDefaultDivision, state.user?.division_id])

    const updateSelected = useCallback((id: number) => {
        setSelectedDivisionId(id)
        persistDivisionId(id)
    }, [])

    const value = useMemo<DivisionState>(
        () => ({
            divisions,
            selectedDivisionId,
            loading,
            errorMessage,
            refresh,
            setSelectedDivisionId: updateSelected,
        }),
        [divisions, selectedDivisionId, loading, errorMessage, refresh, updateSelected],
    )

    return <DivisionContext.Provider value={value}>{children}</DivisionContext.Provider>
}

export const useDivision = () => {
    const context = useContext(DivisionContext)
    if (!context) {
        throw new Error('useDivision must be used within DivisionProvider')
    }
    return context
}
