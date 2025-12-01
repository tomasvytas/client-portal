# Master Admin Setup Guide

## How to Set Up Master Admin Access

The master admin console allows you to view all organizations, clients, tasks, and platform statistics across all accounts.

### Step 1: Set Your Account as Master Admin

Run the following command in your terminal (from the project root):

```bash
npx tsx scripts/make-master-admin.ts your-email@example.com
```

Replace `your-email@example.com` with the email address of the account you want to make master admin.

**Example:**
```bash
npx tsx scripts/make-master-admin.ts tomas@example.com
```

### Step 2: Login

1. Go to your application's login page
2. Sign in with the email address you just set as master admin
3. You'll see the "Admin Panel" button in the header (if you have admin access)

### Step 3: Access Master Admin Dashboard

1. Click on "Admin Panel" in the header
2. You'll see a new "Master Admin" tab in the admin dashboard
3. Click on "Master Admin" to view:
   - Total organizations count
   - Total clients count
   - Total tasks count
   - Active subscriptions count
   - All organizations with details
   - Revenue calculations per organization

## What Master Admin Can See

- **All Organizations**: View every service provider organization
- **All Clients**: See all clients across all organizations
- **All Tasks**: Access tasks from all organizations
- **Platform Statistics**: Overview of the entire platform
- **Revenue Data**: Monthly revenue per organization

## Security Note

Master admin access is very powerful. Only set trusted accounts as master admin. The `isMasterAdmin` flag in the database controls this access.

## Troubleshooting

If you don't see the Master Admin tab:
1. Make sure you ran the script successfully
2. Sign out and sign back in to refresh your session
3. Check that `isMasterAdmin` is set to `true` in the database for your user

