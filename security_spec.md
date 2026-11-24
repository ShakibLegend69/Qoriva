# QORVIA Security Rules Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: Any collection or subcollection not explicitly matched is denied for all reads and writes.
2. **Email Verification Gate**: Every authenticated write or staff read requires `request.auth.token.email_verified == true`.
3. **Bootstrapped Super Admin**: Only `sbgangster016@gmail.com` (verified) is bootstrapped as `superAdmin`. Additional staff (`editor`, `reviewer`, `adsManager`, `superAdmin`) are authorized via `/users/{uid}` documents where `isActive == true`.
4. **No Self-Assigned Privileges**: Creating a `/users/{uid}` document as a non-superAdmin strictly enforces `role == 'reader'` and `isActive == true`, and users cannot update their own `role` or `isActive` fields.
5. **PII Isolation**: `/users/{uid}` contains `email` and is readable ONLY by the document owner (`request.auth.uid == uid`) or `isSuperAdmin()`. Public author bios reside in `/authors/{authorId}` without PII.
6. **Published Article Visibility**: Public readers (`get` and `list`) can only access `/articles/{articleId}` when `resource.data.status == 'published'`. Unpublished drafts (`draft`, `pending_review`, `scheduled`, `archived`) are readable only by verified staff (`isStaff()`).
7. **Editorial Publishing Gate**: Only `isReviewerOrAdmin()` (`superAdmin` or `reviewer`) can transition an article to `status == 'published'`. `editor` users can create and update drafts (`draft`, `pending_review`) created by themselves or staff, but cannot bypass review approval.
8. **Ad Management Isolation**: Only `isAdsManagerOrAdmin()` (`superAdmin` or `adsManager`) can create, update, or delete `/adSlots/{slotId}` and `/adCampaigns/{campaignId}`. Public readers can only read enabled ads (`resource.data.enabled == true`).
9. **Immutable Audit Trail**: `/auditLogs/{logId}` is append-only (`allow update, delete: if false;`), requires `actorUid == request.auth.uid` and `timestamp == request.time`, and is readable only by `isSuperAdmin()`.
10. **Strict Timestamp & Size Integrity**: `createdAt == request.time` on creation, `updatedAt == request.time` on updates, `createdAt` and `createdByUid` are immutable, and every string/list/ID enforces bounded `.size()` and regex checks.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Be Denied)
1. **Self-Role Escalation on Registration**: User creates `/users/attackerUid` with `{ role: 'superAdmin', isActive: true }`.
2. **Role Mutation on Own Profile**: Existing `reader` updates `/users/readerUid` setting `{ role: 'editor' }`.
3. **Email Spoofing Without Verification**: Auth token has `email: 'sbgangster016@gmail.com'` with `email_verified: false`.
4. **PII Harvesting**: Authenticated `reader` tries to `get` or `list` another user's `/users/{otherUid}` document.
5. **Draft Article Scraping**: Unauthenticated or `reader` client runs a `list` query on `/articles` without filtering `status == 'published'`.
6. **Shadow Field Injection on Article**: Editor creates an article with an undeclared ghost key `{ isVerified: true }` or `{ adminOverride: true }`.
7. **ID Poisoning**: Client attempts to create `/articles/` with a 500-character ID or invalid characters (`../hack`).
8. **Backdated Timestamp Spoofing**: Staff user creates an article or audit log with a forged `createdAt` or `timestamp` different from `request.time`.
9. **Immutable Owner Tampering**: User updates an existing document while altering `createdByUid` or `createdAt`.
10. **Unauthorized Ad Injection**: An `editor` or `reader` attempts to create a Monetag zone in `/adCampaigns/{id}` without `adsManager` or `superAdmin` role.
11. **Audit Log Tampering**: Even a `superAdmin` attempts to `update` or `delete` an existing `/auditLogs/{logId}` entry.
12. **Unbounded Array / Payload DoS**: Client attempts to write an article with `tags.size() > 15` or `title.size() > 240`.
