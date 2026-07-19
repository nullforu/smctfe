import { useEffect, useState } from 'react'
import { navigate } from '../lib/router'
import Markdown from '../components/Markdown'
import { getLocaleTag, useLocale, useT } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import { formatDateTime } from '../lib/utils'

interface RouteProps {
    routeParams?: Record<string, string>
}

interface HomeRuleLink {
    href: string
    label: string
    prefix: string
}

interface HomeRule {
    id: string
    code: string
    title: string
    summary: string
    paragraphs: string[]
    bullets?: string[]
    link?: HomeRuleLink
}

const CTF_FIXED_START_AT = '2026-07-19T09:00:00+09:00'

const HOME_RULES: HomeRule[] = [
    {
        id: 'team',
        code: '01',
        title: 'Team',
        summary: '팀전, 1인 또는 2인 구성, 부문 판정 기준',
        paragraphs: [
            'SCA CTF 2026은 팀전으로 진행됩니다.',
            '팀은 1명 또는 2명으로 구성할 수 있습니다.',
            '청소년부 참가자는 재학 여부를 확인할 수 있는 서류를 제출해야 합니다.',
            '팀원 중 한 명이라도 일반부에 해당할 경우 해당 팀은 일반부로 참가합니다.',
        ],
    },
    {
        id: 'cheating',
        code: '02',
        title: 'Cheating',
        summary: '팀 간 협력 금지, 외부 도움 요청 제한',
        paragraphs: ['대회 중 다른 팀과의 협력은 금지됩니다.', '인터넷 검색, 공식 문서, 개인 정리 자료 참고는 허용됩니다.', '단, 문제 내용이나 플래그를 외부에 공유하며 도움을 요청하는 행위는 금지됩니다.'],
        bullets: ['플래그 공유', '풀이 과정, 문제 내용, 힌트 공유', '문제 내용을 온라인에 게시하는 행위', '외부인에게 직접적인 풀이 도움을 요청하거나 받는 행위', '계정 공유 또는 대리 풀이', '기타 대회의 공정성을 해치는 행위'],
    },
    {
        id: 'infra',
        code: '03',
        title: 'Infra',
        summary: '플랫폼 공격, 비정상 호출, 스캐닝, 타 참가자 방해 금지',
        paragraphs: [
            'CTF 플랫폼 및 문제 서버를 공격하는 행위는 금지됩니다.',
            '위 항목에 직접 포함되지 않더라도, CTF 서버 또는 다른 참가자의 정상적인 이용을 방해하는 모든 행위는 금지됩니다.',
            '운영진은 필요에 따라 참가자에게 개별적으로 연락하여 상황 설명을 요청할 수 있습니다.',
            '이에 협조하지 않을 경우 불이익이 발생할 수 있습니다.',
        ],
        bullets: [
            'Brute Force 방식의 로그인 시도 또는 플래그 제출 시도',
            'DoS, DDoS 등 서버에 과도한 부하를 유발하는 행위',
            '과도한 새로고침, 과도한 인스턴스 생성, 반복적인 비정상 API 호출',
            'CTF 서버에 대한 URL/Path 스캐닝, 포트 스캐닝, Fuzzing',
            '비공개 엔드포인트나 서버 취약점을 탐색하는 행위',
            '다른 유저의 VM 환경에 무단 접근하거나 공격하는 행위',
            '다른 참가자의 정상적인 풀이를 방해하는 행위',
            '발견한 취약점을 운영진에게 알리지 않고 악용하는 행위',
        ],
    },
    {
        id: 'writeup',
        code: '04',
        title: 'Write-up',
        summary: '수상 후보 팀은 종료 후 1시간 이내 제출',
        paragraphs: [
            '수상 후보 팀은 대회 종료 후 1시간 이내에 write-up을 제출해야 합니다.',
            'write-up을 통해 풀이 과정을 확인하기 어렵거나 부정행위가 의심될 경우, 운영진이 추가 확인을 요청할 수 있습니다.',
            '이에 응하지 않거나 부정행위가 확인될 경우 수상이 취소될 수 있습니다.',
        ],
        link: { href: 'mailto:smc.secu.sca@gmail.com', label: 'smc.secu.sca@gmail.com', prefix: '제출 메일:' },
    },
    {
        id: 'flag-scoring',
        code: '05',
        title: 'Flag & Scoring',
        summary: '플래그 형식과 Dynamic Scoring 안내',
        paragraphs: ['플래그 형식은 SCA{...} 입니다.', '문제 점수는 Dynamic Scoring 방식으로 계산됩니다.', 'Dynamic Scoring은 문제를 해결한 팀이 많아질수록 해당 문제의 점수가 낮아지는 방식입니다.'],
        link: { href: 'https://docs.ctfd.io/docs/custom-challenges/dynamic-value/', label: 'Dynamic Value | CTFd Docs', prefix: '참고:' },
    },
    {
        id: 'contact',
        code: '06',
        title: 'Contact',
        summary: '문의 채널과 운영진 판단 기준',
        paragraphs: ['대회 중 문제 관련 문의는 디스코드 Ticket 채널을 통해 접수해 주세요.', '개인 DM을 통한 문제 관련 문의는 받지 않습니다.', '규칙에 명시되지 않은 상황은 운영진의 판단에 따라 처리됩니다.'],
    },
]

const getCountdownParts = (target: number, now: number) => {
    const diff = Math.max(0, target - now)
    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return { totalSeconds, days, hours, minutes, seconds }
}

const Home = ({ routeParams = {} }: RouteProps) => {
    void routeParams
    const t = useT()
    const { state: auth } = useAuth()
    const { config: appConfig } = useConfig()
    const locale = useLocale()
    const localeTag = getLocaleTag(locale)
    const [now, setNow] = useState(() => Date.now())
    const [openRuleId, setOpenRuleId] = useState<string>('team')
    const fixedStartAt = new Date(CTF_FIXED_START_AT).getTime()

    const formatTimestamp = (value: string) => {
        return formatDateTime(value, localeTag)
    }

    const countdown = getCountdownParts(fixedStartAt, now)
    const showCountdown = countdown.totalSeconds > 0

    const ctfTimes = [
        { label: t('home.ctfStartAt'), value: appConfig.ctf_start_at },
        { label: t('home.ctfEndAt'), value: appConfig.ctf_end_at },
    ].filter((item) => typeof item.value === 'string' && item.value.trim().length > 0)

    useEffect(() => {
        if (!showCountdown) return

        const timer = window.setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => window.clearInterval(timer)
    }, [showCountdown])

    return (
        <section className='animate space-y-8'>
            <div className='relative -mt-5 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] w-screen overflow-hidden border-y-2 border-border bg-linear-to-br from-warning/10 via-surface-muted to-secondary/10 py-10 md:-mt-6 md:py-14 mb-8'>
                <div className='relative mx-auto w-full max-w-7xl px-6 md:px-8'>
                    <div className='max-w-3xl'>
                        <p className='font-mono text-xs font-semibold uppercase tracking-[0.22em] text-accent'>{appConfig.header_title || t('app.title')}</p>
                        <h1 className='mt-2 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-text md:text-4xl'>{appConfig.title}</h1>
                        <div className='mt-2 max-w-2xl text-sm text-text-muted'>
                            <Markdown content={appConfig.description} />
                        </div>
                        <div className='mt-6 flex flex-wrap gap-3'>
                            <a
                                href='/challenges'
                                className='border-2 border-accent bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-contrast-foreground transition hover:bg-accent-strong'
                                onClick={(e) => navigate('/challenges', e)}
                            >
                                {t('home.ctaChallenges')}
                            </a>
                            {!auth.user ? (
                                <a href='/register' className='border-2 border-border bg-surface px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-text transition hover:border-accent' onClick={(e) => navigate('/register', e)}>
                                    {t('home.ctaSignUp')}
                                </a>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {showCountdown ? (
                <div className='border-2 border-accent/70 bg-[linear-gradient(135deg,rgba(var(--color-accent)/0.16)_0,rgba(var(--color-surface)/1)_52%,rgba(var(--color-secondary)/0.12)_100%)] p-5 shadow-[6px_6px_0_rgba(173,92,126,0.16)] sm:p-6'>
                    <div className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
                        <div>
                            <p className='font-mono text-xs font-semibold uppercase tracking-[0.24em] text-accent'>{t('home.countdownEyebrow')}</p>
                            <h2 className='mt-2 font-display text-2xl font-semibold uppercase tracking-[0.08em] text-text sm:text-3xl'>{t('home.countdownTitle')}</h2>
                            <p className='mt-2 text-sm text-text-muted'>
                                {t('home.countdownTargetLabel')} <span className='font-mono text-text'>{formatTimestamp(CTF_FIXED_START_AT)}</span>
                            </p>
                        </div>
                        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                            {[
                                { label: t('home.countdownDays'), value: countdown.days },
                                { label: t('home.countdownHours'), value: countdown.hours },
                                { label: t('home.countdownMinutes'), value: countdown.minutes },
                                { label: t('home.countdownSeconds'), value: countdown.seconds },
                            ].map((item) => (
                                <div key={item.label} className='min-w-0 border-2 border-border bg-surface px-4 py-4 text-center shadow-[4px_4px_0_rgba(120,98,68,0.1)]'>
                                    <p className='font-display text-3xl font-semibold uppercase tracking-[0.06em] text-text sm:text-4xl'>{String(item.value).padStart(2, '0')}</p>
                                    <p className='mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted'>{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            <div className='grid gap-4 xl:grid-cols-[1.15fr_0.85fr]'>
                <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-6'>
                    <div className='flex flex-wrap items-end justify-between gap-4 border-b-2 border-border/70 pb-4'>
                        <div>
                            <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>Prize Pool</p>
                            <h2 className='mt-2 font-display text-2xl font-semibold uppercase tracking-[0.08em] text-text'>대회 상금</h2>
                        </div>
                        <div className='border-2 border-accent/40 bg-accent/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent'>Awards</div>
                    </div>

                    <div className='mt-5 grid gap-4 md:grid-cols-2'>
                        <div className='border-2 border-border/70 bg-surface-muted/70 p-4'>
                            <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-text-subtle'>일반부</p>
                            <div className='mt-4 space-y-3'>
                                <div className='flex items-center justify-between gap-3 border-b border-border/60 pb-2'>
                                    <span className='font-display text-lg uppercase tracking-[0.08em] text-text'>1위</span>
                                    <span className='font-mono text-sm uppercase tracking-[0.14em] text-accent'>35만원</span>
                                </div>
                                <div className='flex items-center justify-between gap-3 border-b border-border/60 pb-2'>
                                    <span className='font-display text-lg uppercase tracking-[0.08em] text-text'>2위</span>
                                    <span className='font-mono text-sm uppercase tracking-[0.14em] text-text'>20만원</span>
                                </div>
                                <div className='flex items-center justify-between gap-3'>
                                    <span className='font-display text-lg uppercase tracking-[0.08em] text-text'>3위</span>
                                    <span className='font-mono text-sm uppercase tracking-[0.14em] text-text'>10만원</span>
                                </div>
                            </div>
                        </div>

                        <div className='border-2 border-border/70 bg-surface-muted/70 p-4'>
                            <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-text-subtle'>학생부</p>
                            <div className='mt-4 space-y-3'>
                                <div className='flex items-center justify-between gap-3 border-b border-border/60 pb-2'>
                                    <span className='font-display text-lg uppercase tracking-[0.08em] text-text'>1위</span>
                                    <span className='font-mono text-sm uppercase tracking-[0.14em] text-accent'>20만원</span>
                                </div>
                                <div className='flex items-center justify-between gap-3 border-b border-border/60 pb-2'>
                                    <span className='font-display text-lg uppercase tracking-[0.08em] text-text'>2위</span>
                                    <span className='font-mono text-sm uppercase tracking-[0.14em] text-text'>10만원</span>
                                </div>
                                <div className='flex items-center justify-between gap-3'>
                                    <span className='font-display text-lg uppercase tracking-[0.08em] text-text'>3위</span>
                                    <span className='font-mono text-sm uppercase tracking-[0.14em] text-text'>5만원</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='mt-4 border-2 border-secondary/35 bg-secondary/10 px-4 py-4'>
                        <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-secondary'>Bonus Award</p>
                        <p className='mt-2 text-sm text-text'>
                            <span className='font-semibold text-text'>Dreamhack Pro 플랜(3개월권) 3개</span>
                        </p>
                    </div>
                </div>

                <div className='border-2 border-border bg-[linear-gradient(180deg,rgba(var(--color-surface-muted)/0.8)_0,rgba(var(--color-surface)/1)_100%)] p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-6'>
                    <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>Hosted By</p>
                    <h2 className='mt-2 font-display text-2xl font-semibold uppercase tracking-[0.08em] text-text'>주최 / 후원</h2>

                    <div className='mt-5 space-y-4'>
                        <div className='border-2 border-border/70 bg-surface px-4 py-4'>
                            <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle'>주최</p>
                            <p className='mt-2 text-sm font-medium text-text'>세명컴퓨터고등학교 사이버보안동아리 SCA</p>
                        </div>

                        <div className='border-2 border-border/70 bg-surface px-4 py-4'>
                            <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle'>후원</p>
                            <div className='mt-3 flex flex-wrap gap-2'>
                                <span className='border-2 border-secondary/35 bg-secondary/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-secondary'>HSPACE</span>
                                <span className='border-2 border-accent/35 bg-accent/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent'>Dreamhack</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='grid gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
                {ctfTimes.length > 0 ? (
                    <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-6'>
                        <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle'>{t('home.ctfStartAt')}</p>
                        <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                            {ctfTimes.map((item) => (
                                <div key={item.label} className='border-2 border-border/70 bg-surface-muted/80 p-4'>
                                    <span className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted'>{item.label}</span>
                                    <p className='mt-2 text-sm font-medium text-text'>{formatTimestamp(item.value as string)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-6'>
                    <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle'>{t('common.profile')}</p>
                    {auth.user ? (
                        <div className='mt-4 space-y-4'>
                            <div>
                                <p className='text-2xl font-semibold text-text'>{auth.user.username}</p>
                                <p className='mt-1 text-sm text-text-muted'>{auth.user.team_name}</p>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <div className='border-2 border-border/70 bg-surface-muted/80 p-4'>
                                    <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle'>VM</p>
                                    <p className='mt-2 text-lg font-semibold text-text'>
                                        {auth.user.vm_count}/{auth.user.vm_limit}
                                    </p>
                                </div>
                                <div className='border-2 border-border/70 bg-surface-muted/80 p-4'>
                                    <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle'>{t('common.division')}</p>
                                    <p className='mt-2 text-sm font-semibold text-text'>{auth.user.division_name}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className='mt-4 space-y-3 text-sm text-text-muted'>
                            <p>{t('auth.noAccount')}</p>
                            <a
                                href='/login'
                                className='inline-flex border-2 border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] font-medium text-text transition hover:border-accent hover:text-accent'
                                onClick={(e) => navigate('/login', e)}
                            >
                                {t('auth.login')}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <div className='border-2 border-border bg-surface p-5 shadow-[5px_5px_0_rgba(120,98,68,0.12)] sm:p-6'>
                <div className='flex flex-wrap items-end justify-between gap-4 border-b-2 border-border/70 pb-4'>
                    <div>
                        <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent'>Rules</p>
                        <h2 className='mt-2 font-display text-2xl font-semibold uppercase tracking-[0.08em] text-text'>SCA CTF 2026 Rules</h2>
                    </div>
                </div>

                <div className='mt-5 space-y-3'>
                    <div className='border-2 border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-strong'>
                        SCA CTF 2026에 참가하는 모든 팀은 아래 규칙을 지켜야 합니다. 규칙 위반 시 운영진 판단에 따라 참가 자격 박탈 또는 수상 제외 처리될 수 있습니다.
                    </div>

                    {HOME_RULES.map((rule) => {
                        const isOpen = openRuleId === rule.id

                        return (
                            <div key={rule.id} className={`border-2 bg-surface shadow-[4px_4px_0_rgba(120,98,68,0.1)] transition ${isOpen ? 'border-accent/60' : 'border-border'}`}>
                                <button
                                    type='button'
                                    className={`flex w-full flex-col gap-3 px-4 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${isOpen ? 'bg-accent/8' : 'hover:bg-surface-muted/70'}`}
                                    onClick={() => setOpenRuleId((current) => (current === rule.id ? '' : rule.id))}
                                    aria-expanded={isOpen}
                                >
                                    <div className='min-w-0'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <span className='border border-border bg-surface-muted px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-subtle'>{rule.code}</span>
                                            <span className='font-display text-lg font-semibold uppercase tracking-[0.08em] text-text'>{rule.title}</span>
                                        </div>
                                        <p className='mt-2 text-sm text-text-muted'>{rule.summary}</p>
                                    </div>
                                    <div className='flex items-center gap-3 self-start sm:self-center'>
                                        <span className='font-mono text-[10px] uppercase tracking-[0.18em] text-text-subtle'>{isOpen ? 'Hide' : 'Open'}</span>
                                        <span className={`inline-flex h-8 w-8 items-center justify-center border-2 border-border bg-surface text-text transition ${isOpen ? 'rotate-180 border-accent text-accent' : ''}`}>
                                            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                                                <path d='m6 9 6 6 6-6' />
                                            </svg>
                                        </span>
                                    </div>
                                </button>

                                {isOpen ? (
                                    <div className='border-t-2 border-border/60 bg-surface px-4 py-4'>
                                        <div className='space-y-4 text-sm text-text'>
                                            {rule.paragraphs.map((paragraph) => (
                                                <p key={paragraph} className='leading-7 text-text-muted'>
                                                    {paragraph}
                                                </p>
                                            ))}

                                            {rule.bullets ? (
                                                <div className='grid gap-2'>
                                                    {rule.bullets.map((bullet) => (
                                                        <div key={bullet} className='flex gap-3 border border-border/60 bg-surface-muted/65 px-3 py-3'>
                                                            <span className='mt-1 h-2 w-2 shrink-0 bg-accent' />
                                                            <p className='min-w-0 text-text'>{bullet}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

                                            {rule.link ? (
                                                <p className='border border-border/60 bg-surface-muted/65 px-3 py-3 text-text'>
                                                    <span className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle'>{rule.link.prefix}</span>{' '}
                                                    <a
                                                        className='text-accent underline'
                                                        href={rule.link.href}
                                                        target={rule.link.href.startsWith('http') ? '_blank' : undefined}
                                                        rel={rule.link.href.startsWith('http') ? 'noreferrer' : undefined}
                                                    >
                                                        {rule.link.label}
                                                    </a>
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export default Home
