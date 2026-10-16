/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies all 12 adversarial payloads defined in security_spec.md return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  auth: { uid: string; email_verified: boolean } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Read/Write on user profile',
    auth: null,
    operation: 'get',
    path: '/users/user_1',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-Tenant Organization Read (User 2 reading User 1 org)',
    auth: { uid: 'user_2', email_verified: true },
    operation: 'get',
    path: '/users/user_1/organizations/org_1',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-Tenant Event List Scraping',
    auth: { uid: 'user_2', email_verified: true },
    operation: 'list',
    path: '/users/user_1/organizations/org_1/events',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Forged Owner UID on Organization Create',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'create',
    path: '/users/user_1/organizations/org_1',
    payload: { ownerUid: 'user_2', name: 'Spoofed Org' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Event Creation without parent Organization',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'create',
    path: '/users/user_1/organizations/missing_org/events/evt_1',
    payload: { ownerUid: 'user_1', organizationId: 'missing_org', title: 'Orphan Event' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection (Ghost Field isAdmin)',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'update',
    path: '/users/user_1/organizations/org_1',
    payload: { name: 'Updated Org', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unverified Email Write',
    auth: { uid: 'user_1', email_verified: false },
    operation: 'create',
    path: '/users/user_1',
    payload: { uid: 'user_1', displayName: 'Unverified' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning Attack with special characters',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'create',
    path: '/users/user_1/logos/bad$id!',
    payload: { id: 'bad$id!', ownerUid: 'user_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Denial-of-Wallet Oversized Organization Name (>200 chars)',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'create',
    path: '/users/user_1/organizations/org_1',
    payload: { id: 'org_1', ownerUid: 'user_1', name: 'A'.repeat(1000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable Field Mutation (createdAt tampering)',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'update',
    path: '/users/user_1/organizations/org_1',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery on Template Create',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'create',
    path: '/users/user_1/templates/tpl_1',
    payload: { id: 'tpl_1', ownerUid: 'user_1', createdAt: '2099-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Invalid Enum Category on Logo Asset',
    auth: { uid: 'user_1', email_verified: true },
    operation: 'create',
    path: '/users/user_1/logos/logo_1',
    payload: { id: 'logo_1', ownerUid: 'user_1', category: 'raw_event_photo' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
