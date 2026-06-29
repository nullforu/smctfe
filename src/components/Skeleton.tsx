interface SkeletonProps {
    className?: string
}

const Skeleton = ({ className = '' }: SkeletonProps) => <div className={`animate-pulse border border-border/40 bg-surface-muted/80 ${className}`.trim()} aria-hidden='true' />

export default Skeleton
