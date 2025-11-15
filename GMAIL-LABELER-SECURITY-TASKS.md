# Security Tasks: Gmail Auto-Labeler Service

**Created:** 2025-01-27  
**Security Agent:** Security-Agent  
**Priority:** Based on Security Review Findings

## Security Task List

### 🔴 HIGH PRIORITY (Critical - Before Production)

#### SEC-1: Implement Rate Limiting for Gmail API
**Priority:** HIGH  
**Risk:** Service disruption, API blocking  
**Status:** ⚠️ PENDING

**Description:**
Implement rate limiting to prevent exceeding Gmail API quotas (250 requests/minute per user).

**Implementation:**
- Add rate limiter using `limiter` package or similar
- Limit to 250 requests per minute per userId
- Implement exponential backoff on rate limit errors
- Add retry logic with backoff

**Files to Modify:**
- `src/services/gmail.ts` - Add rate limiting wrapper
- `src/services/gmail-labeler.ts` - Handle rate limit errors

**Acceptance Criteria:**
- [ ] Rate limiter implemented
- [ ] Respects 250 requests/minute limit
- [ ] Exponential backoff on rate limit errors
- [ ] Logs rate limit events
- [ ] Tests verify rate limiting works

---

### 🟡 MEDIUM PRIORITY (Important - Before Production)

#### SEC-2: Fix Type Safety Gap
**Priority:** MEDIUM  
**Risk:** Runtime errors, type confusion  
**Status:** ⚠️ PENDING

**Description:**
Replace `email: any` type with proper Gmail API type `gmail_v1.Schema$Message`.

**Implementation:**
```typescript
// Before:
private async processEmail(
  gmail: GmailService,
  email: any,  // ❌
  userId: string
): Promise<void>

// After:
import { gmail_v1 } from 'googleapis';

private async processEmail(
  gmail: GmailService,
  email: gmail_v1.Schema$Message,  // ✅
  userId: string
): Promise<void>
```

**Files to Modify:**
- `src/services/gmail-labeler.ts:122`

**Acceptance Criteria:**
- [ ] Type changed to `gmail_v1.Schema$Message`
- [ ] No TypeScript errors
- [ ] All usages updated

---

#### SEC-3: Add Input Validation for userId
**Priority:** MEDIUM  
**Risk:** Injection, unexpected behavior  
**Status:** ⚠️ PENDING

**Description:**
Validate userId format to prevent injection or unexpected behavior.

**Implementation:**
```typescript
// Validate userId format (alphanumeric, underscore, hyphen only)
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_USER_ID_LENGTH = 100;

function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }
  if (userId.length > MAX_USER_ID_LENGTH) {
    throw new Error(`userId exceeds maximum length of ${MAX_USER_ID_LENGTH}`);
  }
  if (!USER_ID_PATTERN.test(userId)) {
    throw new Error('userId contains invalid characters. Only alphanumeric, underscore, and hyphen allowed');
  }
}
```

**Files to Modify:**
- `src/services/gmail-labeler.ts` - Add validation in `startForAccount()`
- `src/utils/validation.ts` - Add validation function (if exists)

**Acceptance Criteria:**
- [ ] Validation function created
- [ ] userId validated before use
- [ ] Error messages are clear
- [ ] Tests verify validation works

---

#### SEC-4: Add Input Validation for labelName
**Priority:** MEDIUM  
**Risk:** Unexpected behavior, Gmail API errors  
**Status:** ⚠️ PENDING

**Description:**
Validate labelName to ensure it meets Gmail requirements and prevent errors.

**Implementation:**
```typescript
// Gmail label name requirements:
// - Max 225 characters
// - Cannot contain certain special characters
// - Cannot be empty

const MAX_LABEL_NAME_LENGTH = 225;
const INVALID_LABEL_CHARS = /[<>]/; // Gmail doesn't allow < and >

function validateLabelName(labelName: string): void {
  if (!labelName || typeof labelName !== 'string') {
    throw new Error('labelName must be a non-empty string');
  }
  const trimmed = labelName.trim();
  if (trimmed.length === 0) {
    throw new Error('labelName cannot be empty');
  }
  if (trimmed.length > MAX_LABEL_NAME_LENGTH) {
    throw new Error(`labelName exceeds maximum length of ${MAX_LABEL_NAME_LENGTH}`);
  }
  if (INVALID_LABEL_CHARS.test(trimmed)) {
    throw new Error('labelName contains invalid characters (< and > are not allowed)');
  }
}
```

**Files to Modify:**
- `src/utils/label-mapper.ts` - Add validation in `mapLabelNameToId()`
- `src/services/ai.ts` - Validate AI response before using

**Acceptance Criteria:**
- [ ] Validation function created
- [ ] labelName validated before use
- [ ] Handles edge cases (empty, too long, invalid chars)
- [ ] Tests verify validation works

---

#### SEC-5: Add Request Timeouts to Gmail API Calls
**Priority:** MEDIUM  
**Risk:** Hanging requests, service unresponsiveness  
**Status:** ⚠️ PENDING

**Description:**
Add timeouts to all Gmail API calls to prevent hanging requests.

**Implementation:**
```typescript
// Add timeout wrapper
import { AbortController } from 'node-abort-controller';

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const result = await promise;
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Usage:
const labels = await withTimeout(
  gmail.listLabels(),
  30000 // 30 seconds
);
```

**Files to Modify:**
- `src/services/gmail.ts` - Wrap all API calls
- `src/utils/retry.ts` - Add timeout support (if exists)

**Acceptance Criteria:**
- [ ] Timeout utility created
- [ ] All Gmail API calls wrapped with timeout
- [ ] Timeout errors logged properly
- [ ] Tests verify timeout works

---

#### SEC-6: Enhance Authentication Verification
**Priority:** MEDIUM  
**Risk:** Unnecessary API calls, potential errors  
**Status:** ⚠️ PENDING

**Description:**
Verify token validity before processing emails to avoid unnecessary API calls.

**Implementation:**
```typescript
// In startForAccount(), verify token before starting
private async startForAccount(userId: string): Promise<void> {
  // Check if account is authenticated
  const isAuthenticated = await OAuthHelper.isAuthenticated(userId);
  if (!isAuthenticated) {
    logger.warn('Gmail account not authenticated, skipping labeler', { userId });
    return;
  }

  // NEW: Verify token is actually valid
  try {
    await OAuthHelper.getAuthenticatedClient(userId);
    logger.debug('Token verified, starting labeler', { userId });
  } catch (error) {
    logger.warn('Token invalid or expired, skipping labeler', { userId }, error instanceof Error ? error : undefined);
    return;
  }

  // ... rest of method
}
```

**Files to Modify:**
- `src/services/gmail-labeler.ts:39-45`

**Acceptance Criteria:**
- [ ] Token validity verified before processing
- [ ] Invalid tokens logged and skipped
- [ ] No unnecessary API calls with invalid tokens
- [ ] Tests verify token validation

---

### 🟢 LOW PRIORITY (Nice to Have - Post-Launch)

#### SEC-7: Add Audit Logging
**Priority:** LOW  
**Risk:** Compliance, debugging difficulty  
**Status:** ⚠️ PENDING

**Description:**
Add audit logging for all label applications to track who, what, when.

**Implementation:**
```typescript
// Add audit log entry
await db.insert(auditLogs).values({
  action: 'label_applied',
  userId,
  messageId,
  labelName,
  labelId,
  timestamp: new Date(),
  metadata: {
    subject: parsed.subject,
    sender: parsed.sender,
  }
});
```

**Files to Modify:**
- `src/db/schema.ts` - Add auditLogs table (if needed)
- `src/services/gmail-labeler.ts` - Add audit logging

**Acceptance Criteria:**
- [ ] Audit log table created (if needed)
- [ ] All label applications logged
- [ ] Logs include relevant metadata
- [ ] Logs queryable for compliance

---

#### SEC-8: Review Error Messages for Information Leakage
**Priority:** LOW  
**Risk:** Information disclosure  
**Status:** ⚠️ PENDING

**Description:**
Review all error messages to ensure no sensitive data is leaked in production.

**Implementation:**
- Review all error messages
- Ensure no stack traces in production
- Ensure no sensitive data in error messages
- Use generic error messages for users

**Files to Review:**
- All error handling throughout codebase
- `src/utils/errors.ts`
- `src/services/gmail-labeler.ts`
- `src/services/gmail.ts`

**Acceptance Criteria:**
- [ ] All error messages reviewed
- [ ] No sensitive data in error messages
- [ ] Production error messages are generic
- [ ] Stack traces only in development

---

## Task Summary

| Priority | Task ID | Description | Status |
|----------|---------|-------------|--------|
| HIGH | SEC-1 | Rate limiting | ⚠️ PENDING |
| MEDIUM | SEC-2 | Type safety | ⚠️ PENDING |
| MEDIUM | SEC-3 | userId validation | ⚠️ PENDING |
| MEDIUM | SEC-4 | labelName validation | ⚠️ PENDING |
| MEDIUM | SEC-5 | Request timeouts | ⚠️ PENDING |
| MEDIUM | SEC-6 | Auth verification | ⚠️ PENDING |
| LOW | SEC-7 | Audit logging | ⚠️ PENDING |
| LOW | SEC-8 | Error message review | ⚠️ PENDING |

## Implementation Order

### Phase 1: Critical Security (Before Production)
1. SEC-1: Rate limiting
2. SEC-2: Type safety
3. SEC-3: userId validation
4. SEC-4: labelName validation
5. SEC-5: Request timeouts
6. SEC-6: Auth verification

### Phase 2: Security Enhancements (Post-Launch)
7. SEC-7: Audit logging
8. SEC-8: Error message review

## Testing Requirements

Each security task should include:
- [ ] Unit tests for the security feature
- [ ] Integration tests verifying the feature works
- [ ] Security tests (e.g., rate limit enforcement)
- [ ] Documentation of the security improvement

## Review Status

**Security Agent Review:** ✅ COMPLETE  
**Tasks Created:** ✅ 8 tasks  
**Next Action:** Implement Phase 1 tasks before production

---

**Created by:** Security-Agent  
**Last Updated:** 2025-01-27

