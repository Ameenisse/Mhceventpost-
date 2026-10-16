# Security Specification — Event Photo Branding Studio

## 1. Data Invariants
1. **Strict Multi-Tenant Isolation (`uid` Master Gate)**: Every resource resides under `/users/{uid}/...` and has `ownerUid == request.auth.uid == uid`. User B (`uid_B`) can NEVER read, list, create, update, or delete any document under `/users/uid_A/...`.
2. **Verified Google Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Relational Hierarchy (`events` -> `organizations` -> `users`)**:
   - An organization under `/users/{uid}/organizations/{organizationId}` can only be created or updated if `exists(/databases/$(database)/documents/users/$(uid))` is true and `incoming().ownerUid == uid`.
   - An event under `/users/{uid}/organizations/{organizationId}/events/{eventId}` can only be created, read, or updated if the parent organization `/users/{uid}/organizations/{organizationId}` exists and belongs to `request.auth.uid`, and `incoming().organizationId == organizationId`.
4. **Zero Photo Storage Invariant**: No collection exists for event photographs or generated outputs. Only configuration records, organizations, events, reusable branding logos, custom fonts, and templates are permitted.
5. **Immutable Ownership & Creation Timestamps**: `ownerUid`, `id`, and `createdAt` can never be mutated on update (`incoming().ownerUid == existing().ownerUid && incoming().createdAt == existing().createdAt`).
6. **Server Timestamp Enforcement**: `createdAt == request.time` on `create`, and `updatedAt == request.time` on `create` and `update`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Read/Write**: `auth = null` attempting `get /users/user_1` -> `PERMISSION_DENIED`.
2. **Cross-Tenant Organization Read (PII / Data Leak)**: `auth.uid = 'user_2'` attempting `get /users/user_1/organizations/org_1` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Event List Scraping**: `auth.uid = 'user_2'` attempting `list /users/user_1/organizations/org_1/events` -> `PERMISSION_DENIED`.
4. **Forged Owner UID on Organization Create**: `auth.uid = 'user_1'` creating `/users/user_1/organizations/org_1` with `ownerUid: 'user_2'` -> `PERMISSION_DENIED`.
5. **Orphaned Event Creation**: `auth.uid = 'user_1'` creating `/users/user_1/organizations/non_existent_org/events/evt_1` where parent organization does not exist -> `PERMISSION_DENIED`.
6. **Shadow Field Injection ("Ghost Field")**: `auth.uid = 'user_1'` updating `/users/user_1/organizations/org_1` with an undeclared field `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Unverified Email Write**: `auth.uid = 'user_1', email_verified = false` attempting to create `/users/user_1` -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: `auth.uid = 'user_1'` creating `/users/user_1/logos/invalid$id!@#` -> `PERMISSION_DENIED`.
9. **Denial-of-Wallet Oversized String**: `auth.uid = 'user_1'` creating `/users/user_1/organizations/org_1` with `name` of 5,000 characters (exceeds max 200) -> `PERMISSION_DENIED`.
10. **Immutable Field Mutation (`createdAt` or `ownerUid` Tampering)**: `auth.uid = 'user_1'` updating `/users/user_1/organizations/org_1` with a modified `createdAt` or `ownerUid` -> `PERMISSION_DENIED`.
11. **Client Timestamp Forgery**: `auth.uid = 'user_1'` creating `/users/user_1/templates/tpl_1` with a past/future `createdAt` != `request.time` -> `PERMISSION_DENIED`.
12. **Invalid Enum Category on Logo Asset**: `auth.uid = 'user_1'` creating `/users/user_1/logos/logo_1` with `category: 'raw_photo'` -> `PERMISSION_DENIED`.
