// Security Rules Verification Suite (Reference Test Specification for Radmanesh Fashion)
// Validates the Dirty Dozen + Loyalty payloads against firestore.rules constraints.

export const dirtyDozenPayloads = [
  { name: 'Unauthenticated product write', path: 'products/prod_1', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'Product oversized sizes array (>10)', path: 'products/prod_2', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'Product shadow field injection', path: 'products/prod_1', op: 'update', expect: 'PERMISSION_DENIED' },
  { name: 'Order created with delivered status', path: 'orders/ord_1', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'Order created without atomic order_tracking', path: 'orders/ord_2', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'Guest list query on /orders', path: 'orders', op: 'list', expect: 'PERMISSION_DENIED' },
  { name: 'Non-owner get on /orders/ord_1', path: 'orders/ord_1', op: 'get', expect: 'PERMISSION_DENIED' },
  { name: 'Public list query on /order_tracking', path: 'order_tracking', op: 'list', expect: 'PERMISSION_DENIED' },
  { name: 'Customer altering order totalAfn', path: 'orders/ord_1', op: 'update', expect: 'PERMISSION_DENIED' },
  { name: 'User self-promoting in /admins', path: 'admins/attacker', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'Customer spoofing operator message', path: 'support_threads/t1/messages/m1', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'Invalid document ID characters', path: 'products/bad..id', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'User creating profile with forged non-zero points', path: 'users/attacker', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: 'User inflating loyalty points without atomic new order', path: 'users/attacker', op: 'update', expect: 'PERMISSION_DENIED' },
];
