import { useOutletContext } from 'react-router-dom'

import type { AccountTabContext } from '@/features/accounts/account-tabs-layout'

// Every tab under /clients/:accountId reads the account once, in
// AccountTabsLayout, and gets it back here via route context — switching
// tabs doesn't re-fetch it.
export function useAccountContext() {
  return useOutletContext<AccountTabContext>()
}
