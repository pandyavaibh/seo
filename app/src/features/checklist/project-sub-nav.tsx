import { useNavigate } from 'react-router-dom'

export function ProjectSubNav({ projectId, active }: { projectId: string; active: 'checklist' | 'offpage' | 'keywords' }) {
  const navigate = useNavigate()

  const tabClass = (tab: typeof active) =>
    [
      'text-[13px] font-medium px-[14px] py-[8px] rounded-full border-none cursor-pointer',
      tab === active ? 'bg-brand text-white' : 'bg-surface-sunken text-ink-secondary hover:text-ink',
    ].join(' ')

  return (
    <div className="flex items-center gap-2">
      <button className={tabClass('checklist')} onClick={() => navigate(`/projects/${projectId}/checklist`)}>
        Sitewide Checklist
      </button>
      <button className={tabClass('offpage')} onClick={() => navigate(`/projects/${projectId}/offpage`)}>
        Off-Page &amp; Backlinks
      </button>
      <button className={tabClass('keywords')} onClick={() => navigate(`/projects/${projectId}`)}>
        Keywords
      </button>
    </div>
  )
}
