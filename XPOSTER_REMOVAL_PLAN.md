# XPoster Component Removal Plan

## Overview
This document outlines the step-by-step plan for safely removing the xposter component from the pol-ai codebase. The goal is to maintain system stability and deployability throughout the removal process.

## Current Integration Points

1. Recent Tweets API Route:
```typescript
// src/app/api/recent-tweets/route.ts
import { readPostedArticles } from '@/app/lib/xposter/utils';
import { PATHS } from '@/app/lib/xposter/config';
```

2. Scheduler Service:
```typescript
// src/app/lib/scheduler.ts
import { xPoster } from './xposter/poster';
```

3. Post-to-X Script:
```typescript
// src/scripts/post-to-x.ts
import { xPoster } from '../app/lib/xposter/poster';
```

4. Path Configurations:
```typescript
// src/app/utils/paths.ts
xposterDir: path.resolve(DATA_DIR, 'xposter'),
```

## Removal Steps

### Step 1: Disable Recent-Tweets API Route
- [ ] Create simple replacement returning empty data
- [ ] Deploy and verify functionality
- [ ] Remove route entirely
- [ ] Deploy and verify again
- [ ] Document any issues or dependencies discovered

### Step 2: Remove Scheduler Integration
- [ ] Comment out xPoster task in scheduler
- [ ] Deploy and verify scheduler functionality
- [ ] Remove xPoster import
- [ ] Clean up any related scheduler code
- [ ] Deploy and verify again
- [ ] Document any issues or dependencies discovered

### Step 3: Remove Post-to-X Script
- [ ] Delete post-to-x.ts script
- [ ] Remove any related npm scripts from package.json
- [ ] Deploy and verify
- [ ] Document any issues or dependencies discovered

### Step 4: Clean Up Path Configuration
- [ ] Remove xposterDir from paths.ts
- [ ] Clean up related environment variables
- [ ] Deploy and verify
- [ ] Document any issues or dependencies discovered

### Step 5: Remove XPoster Directory
- [ ] Remove entire lib/xposter directory
- [ ] Final deployment and verification
- [ ] Document completion and any remaining concerns

## Safety Protocols

### For Each Step:
1. Create new git branch
2. Make changes
3. Test locally
4. Deploy to Railway
5. Verify functionality
6. Monitor logs
7. If successful, merge to main
8. If issues occur, rollback and reassess

### Required Verifications
- System starts up correctly
- All API routes work
- Scheduler runs properly
- No error logs
- Railway deployment successful

## Rollback Procedure
If issues occur at any step:
1. Note the exact issue and when it occurred
2. Revert the most recent change
3. Return to last known good state
4. Reassess approach
5. Document lessons learned

## Success Criteria
- All xposter code removed
- No remaining references to xposter
- System fully functional
- Clean Railway deployment
- No error logs
- All tests passing

## Notes
- Take screenshots of working state before each change
- Document any unexpected dependencies found
- Keep track of all environment variables affected
- Monitor Railway deployment logs carefully
- Maintain list of all files modified

## Timeline
- Each step should be completed and verified before moving to next
- Allow for rollback time if needed
- Don't rush - stability is priority
- Document time taken for each step for future reference

## Post-Removal Cleanup
- Remove any backup files created
- Clean up documentation
- Update README if needed
- Remove any unused environment variables
- Clean up any temporary branches

---
Last Updated: [Current Date]
Status: Planning Phase 