# Second Review & Complete API Specification

**Review Date:** October 24, 2025  
**Status:** 🔴 **CRITICAL PATH MISMATCH FOUND**

---

## 🔴 CRITICAL BUG FOUND - API Path Mismatch

### Issue: Frontend Using Wrong API Paths

**Problem:** Frontend code is calling routes with `/api/` prefix, but backend has NO global prefix!

#### Affected Files:

1. **`GoogleSignIn.tsx` (Line 27)** ❌
```typescript
await fetch(`${apiUrl}/api/users/sync`, {  // WRONG
```
**Should be:**
```typescript
await fetch(`${apiUrl}/users/sync`, {  // CORRECT
```

2. **`AuthContext.tsx` (Line 30)** ❌
```typescript
const response = await fetch(`${apiUrl}/api/users/me`, {  // WRONG
```
**Should be:**
```typescript
const response = await fetch(`${apiUrl}/users/me`, {  // CORRECT
```

### Fix Required:

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">/tmp/omegle-clone/packages/frontend/src/components/GoogleSignIn.tsx
