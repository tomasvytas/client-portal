# DNS Troubleshooting - Invalid Configuration

## Why "Invalid Configuration" Appears

This is **normal** after changing nameservers! DNS propagation takes time.

## What to Check

### 1. Verify Nameservers in Hostinger
- Go to Hostinger → Domains → `task-chat.com` → Name Servers
- Should show:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`
- Make sure they're **saved** and **active**

### 2. Check DNS Propagation
You can check if nameservers have propagated:

**Using Terminal:**
```bash
dig NS task-chat.com
```

**Or use online tools:**
- [whatsmydns.net](https://www.whatsmydns.net/#NS/task-chat.com)
- [dnschecker.org](https://dnschecker.org/#NS/task-chat.com)

Look for `ns1.vercel-dns.com` and `ns2.vercel-dns.com` in the results.

### 3. Common Issues

**Nameservers not saved:**
- Go back to Hostinger and verify they're saved
- Make sure you clicked "Save" or "Update"

**Wrong nameservers:**
- Double-check: `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
- No typos, no extra spaces

**Still using old nameservers:**
- If you see Hostinger nameservers, changes haven't propagated yet
- Wait 10-30 minutes and check again

### 4. What Vercel Needs

Vercel needs to see that:
- Nameservers point to Vercel
- DNS records are configured (Vercel does this automatically when you use their nameservers)

## Timeline

- **5-15 minutes**: Usually works
- **30 minutes**: Most common
- **Up to 48 hours**: Worst case (rare)

## What to Do

1. **Wait 10-15 minutes** (if you just changed nameservers)
2. **Verify nameservers are saved** in Hostinger
3. **Check DNS propagation** using tools above
4. **Refresh Vercel dashboard** - it checks periodically
5. **If still invalid after 30 minutes**, double-check nameservers in Hostinger

## Once Valid

When Vercel shows "Valid Configuration":
- SSL certificate will be automatically provisioned (1-2 minutes)
- Your site will be live at https://www.task-chat.com

