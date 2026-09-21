import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentMember } from '@/features/team/use-current-member'
import {
  useAddPortalComment,
  useDeletePortalComment,
  usePortalComments,
} from '@/features/portal/use-portal-comments'

export function PortalCommentsThread({ accountId, canModerate }: { accountId: string; canModerate: boolean }) {
  const { data: comments, isLoading } = usePortalComments(accountId)
  const { data: currentMember } = useCurrentMember()
  const addComment = useAddPortalComment(accountId)
  const removeComment = useDeletePortalComment(accountId)
  const [body, setBody] = React.useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {isLoading && <Skeleton className="h-[80px] w-full" />}
        {!isLoading && (comments ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No comments yet.</p>
        )}
        {!isLoading &&
          (comments ?? []).map((c) => (
            <div key={c.id} className="flex flex-col gap-[2px] p-[10px_12px] rounded-[8px] bg-surface-sunken">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium">{c.authorName ?? 'Someone'}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] text-ink-muted">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {canModerate && (
                    <button
                      onClick={() => removeComment.mutate(c.id)}
                      className="border-none bg-transparent font-mono text-[10px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="m-0 text-[13px] whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}

        <div className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full resize-none"
          />
          <div>
            <Button
              size="sm"
              disabled={!body.trim() || addComment.isPending}
              onClick={() =>
                addComment.mutate(
                  { body, authorId: currentMember?.id ?? null },
                  { onSuccess: () => setBody('') },
                )
              }
            >
              {addComment.isPending ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
