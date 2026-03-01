import { AuthProvider } from './auth'
import { DivisionProvider } from './division'
import { ThemeProvider } from './theme'
import { LocaleProvider } from './i18n'
import { ConfigProvider } from './config'

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <LocaleProvider>
            <AuthProvider>
                <DivisionProvider>
                    <ThemeProvider>
                        <ConfigProvider>{children}</ConfigProvider>
                    </ThemeProvider>
                </DivisionProvider>
            </AuthProvider>
        </LocaleProvider>
    )
}
