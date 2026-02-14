import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AppConfig } from './types'
import { useApi } from './useApi'
import { useT } from './i18n'

export interface AppConfigState {
    title: string
    description: string
    header_title: string
    header_description: string
    ctf_start_at?: string | null
    ctf_end_at?: string | null
    updated_at?: string
}

interface ConfigContextValue {
    config: AppConfigState
    setConfig: (config: AppConfig) => void
    loadConfig: () => Promise<void>
    resetConfig: () => void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

const buildDefaultConfig = (translate: (key: string) => string): AppConfigState => {
    return {
        title: translate('config.defaultTitle'),
        description: translate('config.defaultDescription'),
        header_title: translate('config.defaultHeaderTitle'),
        header_description: translate('config.defaultHeaderDescription'),
    }
}

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const api = useApi()
    const t = useT()
    const defaultConfig = useMemo(() => buildDefaultConfig(t), [t])
    const [config, setConfigState] = useState<AppConfigState>(() => defaultConfig)
    const loadedRef = useRef(false)
    const inFlightRef = useRef<Promise<void> | null>(null)
    const hasLoadedRemoteRef = useRef(false)

    useEffect(() => {
        if (!hasLoadedRemoteRef.current) {
            setConfigState(defaultConfig)
        }
    }, [defaultConfig])

    const setConfig = useCallback(
        (value: AppConfig) => {
            hasLoadedRemoteRef.current = true
            setConfigState({
                title: value.title ?? defaultConfig.title,
                description: value.description ?? defaultConfig.description,
                header_title: value.header_title ?? defaultConfig.header_title,
                header_description: value.header_description ?? defaultConfig.header_description,
                ctf_start_at: value.ctf_start_at ?? null,
                ctf_end_at: value.ctf_end_at ?? null,
                updated_at: value.updated_at,
            })
        },
        [defaultConfig],
    )

    const loadConfig = useCallback(async () => {
        if (loadedRef.current) return
        if (inFlightRef.current) return inFlightRef.current

        inFlightRef.current = (async () => {
            try {
                const response = await api.config()
                setConfig(response)
            } catch {
                hasLoadedRemoteRef.current = false
                setConfigState(defaultConfig)
            } finally {
                loadedRef.current = true
                inFlightRef.current = null
            }
        })()

        return inFlightRef.current
    }, [api, defaultConfig, setConfig])

    const resetConfig = useCallback(() => {
        loadedRef.current = false
        inFlightRef.current = null
        hasLoadedRemoteRef.current = false
        setConfigState(defaultConfig)
    }, [defaultConfig])

    const value = useMemo(
        () => ({
            config,
            setConfig,
            loadConfig,
            resetConfig,
        }),
        [config, loadConfig, resetConfig, setConfig],
    )

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export const useConfig = () => {
    const context = useContext(ConfigContext)
    if (!context) {
        throw new Error('useConfig must be used within ConfigProvider')
    }
    return context
}
