import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface MarkdownProps {
    content: string
    className?: string
}

const Markdown = ({ content, className = '' }: MarkdownProps) => {
    const html = useMemo(() => {
        if (!content) return ''
        const rawHtml = marked.parse(content, { async: false }) as string
        return DOMPurify.sanitize(rawHtml)
    }, [content])

    return <div className={`markdown ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export default Markdown
