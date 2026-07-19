import { useEffect, useMemo, useState } from 'react'
import Particles, { ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { Engine } from '@tsparticles/engine'
import { useTheme } from '../lib/theme'
import ShootingStars from './ShootingStars'

interface ParticlesBackgroundProps {
    revealKey: string
}

const registerParticles = async (engine: Engine) => {
    await loadSlim(engine)
}

const PARTICLES_REVEAL_DELAY_MS = 1400

const ParticlesBackground = ({ revealKey }: ParticlesBackgroundProps) => {
    const { theme } = useTheme()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        setVisible(false)

        const timer = window.setTimeout(() => {
            setVisible(true)
        }, PARTICLES_REVEAL_DELAY_MS)

        return () => window.clearTimeout(timer)
    }, [revealKey])

    const options = useMemo(
        () => ({
            fullScreen: { enable: false },
            fpsLimit: 48,
            detectRetina: false,
            background: { color: 'transparent' },
            interactivity: {
                detectsOn: 'window' as const,
                events: {
                    onHover: {
                        enable: true,
                        mode: 'grab' as const,
                    },
                    resize: {
                        enable: true,
                    },
                },
                modes: {
                    grab: {
                        distance: 50,
                        links: {
                            opacity: theme === 'dark' ? 0.14 : 0.18,
                        },
                    },
                },
            },
            particles: {
                number: {
                    value: 120,
                    density: {
                        enable: true,
                        width: 1440,
                        height: 900,
                    },
                },
                color: {
                    value: theme === 'dark' ? ['#f2e5ea', '#e4c6d1', '#d4d8ea'] : ['#7f4c63', '#94607a', '#6f6487'],
                },
                opacity: {
                    value: theme === 'dark' ? { min: 0.16, max: 0.34 } : { min: 0.28, max: 0.5 },
                    animation: {
                        enable: true,
                        speed: 0.2,
                        sync: false,
                    },
                },
                size: {
                    value: { min: 1, max: 3 },
                },
                move: {
                    enable: true,
                    direction: 'none' as const,
                    speed: theme === 'dark' ? 0.45 : 0.35,
                    random: true,
                    outModes: {
                        default: 'out' as const,
                    },
                },
                links: {
                    enable: false,
                },
            },
            pauseOnBlur: true,
            pauseOnOutsideViewport: true,
        }),
        [theme],
    )

    return (
        <ParticlesProvider init={registerParticles}>
            <div className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-1800 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
                <Particles className='absolute inset-0' id='smctf-particles' options={options} />
            </div>
            <ShootingStars visible={visible} />
        </ParticlesProvider>
    )
}

export default ParticlesBackground
