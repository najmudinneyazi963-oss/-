# Security Specification — Radmanesh Fashion

## 1. Data Invariants
1. A `Product` document can only be created, updated, or deleted by a verified administrator, and `priceAfn` must be positive (`> 0`), `stock >= 0`, `sizes.size() <= 10`, and `colors.size() <= 10`.
2. An `Order` document cannot be created without an atomic `OrderTracking` document created in the same batch (`existsAfter`), and `shippingStatus` at creation must strictly equal `'pending'`.
3. `Order` PII (`customerName`, `phone`, `address`) is never readable by non-owners or unauthenticated users; `order_tracking/{orderCode}` holds zero PII and disables `list` queries (`allow list: if false`).
4. Orders cannot be deleted by any client (`allow delete: if false`). Once `shippingStatus` reaches `'delivered'` or `'cancelled'`, non-admins cannot mutate the order.
5. `SupportThread` and `SupportMessage` list queries validate `resource.data.customerUid == request.auth.uid` or verified admin email without performing `get()`/`exists()` inside `allow list`.
6. All `createdAt` and `updatedAt` timestamps must match `request.time`.
7. Loyalty `points` on `users/{userId}` MUST initialize at `0` on registration and can only be modified by non-admins atomically alongside a newly created `orders/{lastOrderId}` document (`!exists` before batch, `existsAfter` after batch) where `pointsRedeemed <= existing.points`, `pointsDiscountAfn == pointsRedeemed * 5 <= subtotalAfn`, and `pointsEarned * 100 <= totalAfn`.

## 2. Dirty Dozen Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/products/p1` (Product tampering).
2. Product creation with `sizes` array of 20 items (`> 10` limit).
3. Product update injecting a ghost field `isVerified: true` (Shadow Update).
4. Order creation with `shippingStatus: 'delivered'` (State Shortcutting).
5. Order creation without an accompanying `/order_tracking/{orderCode}` write (Atomicity violation).
6. Guest user attempting `list` on `/orders` (PII scraping).
7. Guest user attempting `get` on another customer's `/orders/{orderId}` (PII exposure).
8. Authenticated non-admin attempting `list` on `/order_tracking` (Tracking enumeration).
9. Authenticated customer attempting to update `/orders/{orderId}` `totalAfn` or `shippingStatus` (Privilege escalation).
10. Authenticated user creating `/admins/{uid}` to grant themselves admin role (Self-assigned role).
11. Support message creation with `senderRole: 'operator'` from a non-admin customer (Operator impersonation).
12. Creating `/products/..bad..id..` with invalid ID characters or >128 bytes (Path ID poisoning).
13. Authenticated customer creating `/users/{uid}` with `points: 5000` instead of `0` (Initial loyalty balance forgery).
14. Authenticated customer updating `/users/{uid}` `points` directly or replaying an existing `lastOrderId` without creating a new atomic order (Loyalty points inflation).
