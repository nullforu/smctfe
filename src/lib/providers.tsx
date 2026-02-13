import { AuthProvider } from './auth'
import { ThemeProvider } from './theme'
import { LocaleProvider } from './i18n'
import { ConfigProvider } from './config'

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <LocaleProvider>
            <AuthProvider>
                <ThemeProvider>
                    <ConfigProvider>{children}</ConfigProvider>
                </ThemeProvider>
            </AuthProvider>
        </LocaleProvider>
    )
}
