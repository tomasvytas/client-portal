# Hostinger DNS Configuration for Vercel

## Step-by-Step Instructions

### Step 1: Add Domain in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter: `www.task-chat.com`
5. Click **"Add"**
6. Vercel will show you DNS configuration instructions

### Step 2: Configure DNS in Hostinger

1. **Login to Hostinger:**
   - Go to [hpanel.hostinger.com](https://hpanel.hostinger.com)
   - Login to your account

2. **Navigate to DNS Zone:**
   - Go to **Domains** → Select `task-chat.com`
   - Click **"DNS / Name Servers"** or **"DNS Zone Editor"**

3. **Add/Update DNS Records:**

   **For www.task-chat.com (CNAME record):**
   - **Type**: `CNAME`
   - **Name/Host**: `www`
   - **Value/Target**: `cname.vercel-dns.com`
   - **TTL**: `3600` (or default)
   - Click **"Add Record"** or **"Save"**

   **For task-chat.com root domain (A record):**
   - **Type**: `A`
   - **Name/Host**: `@` (or leave blank, or `task-chat.com`)
   - **Value/Target**: `76.76.21.21` (Vercel's IP - check Vercel dashboard for current IP)
   - **TTL**: `3600` (or default)
   - Click **"Add Record"** or **"Save"**

### Step 3: Alternative - Use Vercel Nameservers (Recommended)

Instead of individual DNS records, you can use Vercel's nameservers:

1. **In Vercel:**
   - After adding domain, Vercel will show you nameservers
   - They'll look like: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`, etc.

2. **In Hostinger:**
   - Go to **Domains** → `task-chat.com` → **"Name Servers"**
   - Change from "Hostinger Name Servers" to **"Custom Name Servers"**
   - Enter the nameservers Vercel provided
   - Click **"Save"**

   This is easier and Vercel manages all DNS automatically!

### Step 4: Wait for Propagation

- DNS changes can take 5 minutes to 48 hours
- Usually takes 5-30 minutes
- Vercel will show "Valid Configuration" when it's ready
- SSL certificate is automatically provisioned (takes 1-2 minutes after DNS is valid)

### Step 5: Verify

1. Check in Vercel dashboard - domain should show "Valid Configuration"
2. Visit `https://www.task-chat.com` - should load your app
3. SSL certificate should be active automatically

---

## Troubleshooting

**"Invalid Configuration" in Vercel:**
- Wait a few minutes for DNS to propagate
- Double-check DNS records are correct
- Make sure you saved changes in Hostinger

**"Domain not pointing to Vercel":**
- Verify CNAME/A records are correct
- Check TTL - lower values (300-600) propagate faster
- Use `dig www.task-chat.com` or online DNS checker to verify

**SSL not working:**
- Wait 1-2 minutes after DNS is valid
- Vercel automatically provisions SSL
- Check Vercel dashboard for SSL status

---

## Quick Reference

**CNAME Record:**
- Name: `www`
- Value: `cname.vercel-dns.com`

**A Record (if not using nameservers):**
- Name: `@`
- Value: `76.76.21.21` (check Vercel for current IP)

**Or use Vercel Nameservers** (easiest option!)

