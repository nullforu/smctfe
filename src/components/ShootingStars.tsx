import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react'

interface ShootingStarsProps {
    visible: boolean
}

interface StarPlacement {
    id: number
    top: string
    left: string
    delay: string
    duration: string
    travelX: string
    travelY: string
}

interface BurstState {
    index: number
    x: number
    y: number
}

const STAR_ZONES = [
    { top: [8, 18], left: [6, 18], delay: [0, 1.4], duration: [7.4, 9.1], travelX: [118, 152], travelY: [44, 66] },
    { top: [14, 26], left: [30, 46], delay: [1.8, 3.6], duration: [8.1, 10.2], travelX: [124, 164], travelY: [50, 72] },
    { top: [7, 17], left: [52, 66], delay: [3.8, 5.8], duration: [7.8, 9.6], travelX: [112, 148], travelY: [42, 64] },
] as const

const EASTER_EGG_KEY = 23
const EASTER_EGG_PAYLOAD = [
    781448 ^ 781516,
    330853 ^ 330801,
    482094 ^ 482168,
    293374 ^ 293266,
    511731 ^ 511655,
    654767 ^ 654807,
    552221 ^ 552319,
    118181 ^ 118236,
    335725 ^ 335630,
    116193 ^ 116127,
    279361 ^ 279352,
    400839 ^ 400823,
    171896 ^ 171824,
    665244 ^ 665336,
    497455 ^ 497484,
    531326 ^ 531208,
    408053 ^ 407952,
    342030 ^ 342122,
    418935 ^ 418879,
    201259 ^ 201342,
    685154 ^ 685076,
    491581 ^ 491591,
    621316 ^ 621435,
    880314 ^ 880332,
    331402 ^ 331507,
    170588 ^ 170542,
    647720 ^ 647754,
    604426 ^ 604527,
    149858 ^ 149776,
    294863 ^ 294791,
    952058 ^ 951997,
    840712 ^ 840826,
    494267 ^ 494275,
    135882 ^ 135857,
    751703 ^ 751677,
] as const
let shootingStarIdSeed = 0

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min)
const formatPercent = (value: number) => `${value.toFixed(2)}%`
const formatSeconds = (value: number) => `${value.toFixed(2)}s`
const decodeEasterEgg = () => String.fromCharCode(...EASTER_EGG_PAYLOAD.map((value) => value ^ EASTER_EGG_KEY))

const createPlacement = (index: number): StarPlacement => {
    const zone = STAR_ZONES[index]

    return {
        id: shootingStarIdSeed++,
        top: formatPercent(randomInRange(zone.top[0], zone.top[1])),
        left: formatPercent(randomInRange(zone.left[0], zone.left[1])),
        delay: formatSeconds(randomInRange(zone.delay[0], zone.delay[1])),
        duration: formatSeconds(randomInRange(zone.duration[0], zone.duration[1])),
        travelX: `${Math.round(randomInRange(zone.travelX[0], zone.travelX[1]))}px`,
        travelY: `${Math.round(randomInRange(zone.travelY[0], zone.travelY[1]))}px`,
    }
}

const createPlacements = () => STAR_ZONES.map((_, index) => createPlacement(index))

const ShootingStars = ({ visible }: ShootingStarsProps) => {
    const [placements, setPlacements] = useState<StarPlacement[]>(() => createPlacements())
    const [burst, setBurst] = useState<BurstState | null>(null)
    const [burstCount, setBurstCount] = useState(0)
    const [showSecret, setShowSecret] = useState(false)
    const secretMessage = useMemo(() => decodeEasterEgg(), [])

    useEffect(() => {
        if (visible) {
            setPlacements(createPlacements())
        }
    }, [visible])

    useEffect(() => {
        if (burstCount < 10) return

        setShowSecret(true)
        const timer = window.setTimeout(() => setShowSecret(false), 5200)
        return () => window.clearTimeout(timer)
    }, [burstCount])

    const rerollPlacement = (index: number) => {
        setPlacements((current) => current.map((placement, placementIndex) => (placementIndex === index ? createPlacement(index) : placement)))
    }

    const explodeStarAtPosition = (index: number, event: MouseEvent<HTMLButtonElement>) => {
        if (burst !== null) return

        setBurst({
            index,
            x: event.clientX,
            y: event.clientY,
        })
        setBurstCount((count) => count + 1)

        window.setTimeout(() => {
            rerollPlacement(index)
            setBurst((current) => (current?.index === index ? null : current))
        }, 640)
    }

    return (
        <div className={`pointer-events-none fixed inset-0 z-20 overflow-hidden transition-opacity duration-1800 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`} aria-hidden='true'>
            {placements.map((star, index) => {
                const exploding = burst?.index === index

                return (
                    <button
                        key={`shooting-star-${star.id}`}
                        type='button'
                        className={`shooting-star ${exploding ? 'shooting-star-exploding' : ''}`}
                        style={
                            {
                                top: star.top,
                                left: star.left,
                                animationDelay: star.delay,
                                animationDuration: star.duration,
                                '--shoot-x': star.travelX,
                                '--shoot-y': star.travelY,
                            } as CSSProperties
                        }
                        onAnimationEnd={() => {
                            if (!exploding) rerollPlacement(index)
                        }}
                        onClick={(event) => explodeStarAtPosition(index, event)}
                        aria-label='burst shooting star'
                    >
                        <span className='shooting-star-core' />
                    </button>
                )
            })}

            {burst ? (
                <span
                    className='shooting-star-burst shooting-star-burst-fixed'
                    style={
                        {
                            left: `${burst.x}px`,
                            top: `${burst.y}px`,
                        } as CSSProperties
                    }
                />
            ) : null}

            {showSecret ? (
                <div className='pointer-events-none absolute bottom-4 left-1/2 z-2 w-[min(92vw,32rem)] -translate-x-1/2 border-2 border-accent/50 bg-surface/96 px-4 py-3 text-center shadow-[6px_6px_0_rgba(120,98,68,0.16)] backdrop-blur-sm'>
                    <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-accent'>Easter Egg</p>
                    <p className='mt-2 break-all font-mono text-sm text-text'>{secretMessage}</p>
                </div>
            ) : null}
        </div>
    )
}

export default ShootingStars
