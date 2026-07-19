import type { Division } from '../lib/types'
import { useT } from '../lib/i18n'

interface DivisionTabsProps {
    divisions: Division[]
    selectedId: number | null
    onSelect: (id: number | null) => void
    includeAll?: boolean
    className?: string
}

const DivisionTabs = ({ divisions, selectedId, onSelect, includeAll = false, className = '' }: DivisionTabsProps) => {
    const t = useT()
    const items = includeAll ? [{ id: null, name: t('division.all') }, ...divisions] : divisions

    if (items.length === 0) {
        return null
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {items.map((division) => {
                const active = division.id === selectedId || (division.id === null && selectedId === null)
                return (
                    <button
                        key={division.id === null ? 'all' : `div-${division.id}`}
                        className={` border px-4 py-2 text-sm font-semibold transition ${active ? 'border-accent/30 bg-accent/12 text-accent' : 'border-border bg-surface text-text-muted hover:bg-surface-muted hover:text-text'}`}
                        type='button'
                        onClick={() => onSelect(division.id)}
                    >
                        {division.name}
                    </button>
                )
            })}
        </div>
    )
}

export default DivisionTabs
