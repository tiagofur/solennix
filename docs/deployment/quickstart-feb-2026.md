# 🚀 Solennix - Quick Deployment Guide (Feb 2026)

**Post-Security Hardening Update**

---

## 📋 Pre-Deployment Checklist

### ✅ New Environment Variables Required

```bash
# ===== AUTH (CRITICAL - NEW) =====
# No changes needed - cookies work automatically
# Verify CORS_ALLOWED_ORIGINS includes your frontend domain

# ===== EMAIL (CRITICAL - NEW) =====
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key_here
SMTP_FROM=noreply@solennix.com

# ===== FRONTEND URL (REQUIRED) =====
FRONTEND_URL=https://app.solennix.com

# ===== EXISTING VARS (Verify) =====
DATABASE_URL=postgresql://user:pass@host:5432/solennix
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CORS_ALLOWED_ORIGINS=https://app.solennix.com,https://www.solennix.com
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
```

---

## 🔧 Deployment Steps

### Step 1: Update Environment Variables

**Vercel/Netlify (Frontend):**
```bash
# No new vars needed for frontend
# Existing VITE_API_URL should point to backend
```

**Railway/Render/Heroku (Backend):**
```bash
# Add new variables in dashboard
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<from SendGrid>
SMTP_FROM=noreply@solennix.com
FRONTEND_URL=https://app.solennix.com

# Verify existing
DATABASE_URL=<connection string>
JWT_SECRET=<min 32 chars>
CORS_ALLOWED_ORIGINS=<comma-separated>
```

**Docker Compose:**
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - SMTP_HOST=smtp.sendgrid.net
      - SMTP_PORT=587
      - SMTP_USER=apikey
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - SMTP_FROM=noreply@solennix.com
      - FRONTEND_URL=https://app.solennix.com
```

---

### Step 2: Deploy Backend First

```bash
# Pull latest
git pull origin main

# Verify environment
cd backend
cat .env  # Check all vars present

# Run migrations (automatic on startup)
go run main.go
```

**Verify backend health:**
```bash
curl https://api.solennix.com/health
# Should return: {"status":"ok"}
```

---

### Step 3: Deploy Frontend

```bash
cd web
npm install
npm run build

# Deploy to hosting
# Vercel: vercel --prod
# Netlify: netlify deploy --prod
# Or: upload dist/ to CDN
```

---

### Step 4: Verify Auth Migration

1. **Open app in browser**
2. **Login** (will set new httpOnly cookie)
3. **DevTools → Application → Cookies**
4. **Verify cookie:**
   ```
   Name: auth_token
   Value: <JWT token>
   HttpOnly: ✅ Yes
   Secure: ✅ Yes (in HTTPS)
   SameSite: Strict
   ```

5. **Try authenticated request** (should work automatically)

---

### Step 5: Test Password Reset

1. **Click "Forgot Password"** on login page
2. **Enter email** → Submit
3. **Check inbox** (or SMTP logs)
4. **Verify email received** with reset link
5. **Click link** (goes to `/reset-password?token=...`)
6. **⚠️ Note**: Frontend page pending - manually construct URL for now
7. **Alternative**: Use curl to test:
   ```bash
   curl -X POST https://api.solennix.com/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"<from-email>","new_password":"NewPass123"}'
   ```

---

## 🔍 Post-Deployment Verification

### Test Checklist:

- [ ] Health endpoint responds: `/health`
- [ ] Login works (sets cookie)
- [ ] Dashboard loads after login
- [ ] API calls work (cookies sent automatically)
- [ ] Logout clears cookie
- [ ] Password reset email sends
- [ ] Can create event/client/product
- [ ] Stripe checkout creates session
- [ ] Payments record correctly

### Monitoring:

```bash
# Backend logs
tail -f /var/log/solennix.log | grep "auth_token cookie"

# Check for errors
tail -f /var/log/solennix.log | grep "ERROR"

# SMTP send attempts
tail -f /var/log/solennix.log | grep "Email sent"
```

---

## 🐛 Troubleshooting

### Issue: "Authentication required" after login

**Cause**: Cookies not being sent

**Fix**:
1. Verify `CORS_ALLOWED_ORIGINS` includes frontend domain (exact match)
2. Check browser console for CORS errors
3. Verify `credentials: 'include'` in api.ts
4. Confirm backend sends `Access-Control-Allow-Credentials: true`

**Debug:**
```bash
# Backend logs
grep "auth_token cookie" /var/log/solennix.log

# Check middleware
curl -i https://api.solennix.com/api/auth/me \
  -H "Cookie: auth_token=<token>"
```

---

### Issue: Password reset email not sending

**Cause**: SMTP not configured or credentials wrong

**Fix**:
1. Verify all SMTP env vars set
2. Test SMTP connection:
   ```bash
   telnet smtp.sendgrid.net 587
   # Should connect
   ```
3. Check SendGrid dashboard for blocked sends
4. Verify `SMTP_FROM` email is verified in SendGrid

**Debug:**
```bash
# Backend logs
grep "Password reset" /var/log/solennix.log
grep "Email sent" /var/log/solennix.log
grep "SMTP" /var/log/solennix.log
```

---

### Issue: "Stripe is not configured"

**Cause**: Missing Stripe env vars

**Fix**:
```bash
# Verify set
echo $STRIPE_SECRET_KEY
echo $STRIPE_PRO_PRICE_ID

# Should not be empty
```

---

### Issue: Old users still using localStorage

**Expected**: Backward compatibility maintained

**What happens**:
- Old users with localStorage tokens: Continue working via Authorization header
- Backend accepts BOTH cookies AND headers during migration
- On next login, user gets new cookie
- After 24h, old tokens expire naturally

**No action needed** - migration is gradual.

---

## 📊 Monitoring Metrics

### Key Metrics to Watch:

1. **Login Success Rate**: Should stay >95%
2. **401 Errors**: Spike = auth issue
3. **Email Send Rate**: Track forgot-password usage
4. **Cookie vs Header Auth**: Track migration progress

### Grafana/DataDog Queries:

```sql
-- Login success rate
SELECT COUNT(*) FROM logs
WHERE message = 'User logged in'
AND timestamp > NOW() - INTERVAL '1 hour'

-- Auth method distribution
SELECT
  CASE WHEN message LIKE '%cookie%' THEN 'cookie'
       WHEN message LIKE '%Authorization header%' THEN 'header'
  END as auth_method,
  COUNT(*)
FROM logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY auth_method
```

---

## 🔄 Rollback Plan

### If Deployment Fails:

```bash
# Revert to previous version
git revert HEAD~4..HEAD
git push origin main --force

# Or: Deploy previous tag
git checkout v0.8.0
deploy_script.sh
```

### Rollback is Safe:
- ✅ No database migrations (no schema changes)
- ✅ Cookie auth has fallback to headers
- ✅ Old frontend still works with old backend
- ✅ No data loss risk

---

## 📱 Mobile Apps (If Applicable)

### RevenueCat Webhooks:

**No changes needed** - RevenueCat webhooks still work:
- `/api/subscriptions/webhook/revenuecat`
- Authorization via header (unchanged)

---

## 🔐 Security Checklist

Post-deployment security verification:

- [ ] HTTPS enforced (Secure cookies require HTTPS)
- [ ] CORS configured correctly (specific origins, not `*`)
- [ ] Cookies set with HttpOnly flag
- [ ] Cookies set with Secure flag (production)
- [ ] Cookies set with SameSite=Strict
- [ ] SMTP credentials secured (not in code)
- [ ] JWT_SECRET rotated (if needed)
- [ ] Rate limiting active on /auth routes
- [ ] Stripe webhooks verified (signature check)

---

## 📞 Support

**Issues?**
- Check logs first: `tail -f /var/log/solennix.log`
- Review CHANGELOG.md for breaking changes
- Open issue: https://github.com/tiagofur/solennix/issues

**Emergency Rollback:**
```bash
git revert HEAD~4..HEAD
git push origin main --force
```

---

**Deployment Version**: v0.9.0
**Last Updated**: February 25, 2026
**Tested On**: Railway, Vercel, Docker Compose
