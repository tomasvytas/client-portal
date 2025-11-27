# Google Drive Setup Guide

This guide will help you set up Google Drive integration for automatic image uploads.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google Drive API"
   - Click **Enable**

## Step 2: Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Service account name**: `client-portal-drive` (or any name)
   - **Service account ID**: Auto-generated
   - Click **Create and Continue**
4. Skip the optional steps and click **Done**

## Step 3: Create and Download Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create** - this will download a JSON file

## Step 4: Create a Shared Drive and Add Service Account

**IMPORTANT**: Service accounts cannot upload to regular Google Drive folders. You MUST use a **Shared Drive** (formerly Team Drive).

### Option A: Create a New Shared Drive (Recommended)

1. Go to [Google Drive](https://drive.google.com)
2. Click **Shared drives** in the left sidebar (or **New** → **Shared drive**)
3. Click **New** → **Shared drive**
4. Name it (e.g., "Task Chat Files")
5. Click **Create**
6. **Get the Shared Drive ID**:
   - Open the Shared Drive
   - Look at the URL: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
   - Copy the folder ID (the part after `/folders/`): `1a2b3c4d5e6f7g8h9i0j`
   - This is your `GOOGLE_DRIVE_BASE_FOLDER_ID`

### Option B: Use an Existing Shared Drive

1. Go to your existing Shared Drive
2. Get the folder ID from the URL (same as above)

### Add Service Account to Shared Drive

1. Open the downloaded JSON file
2. Find the `client_email` field (e.g., `client-portal-drive@project-id.iam.gserviceaccount.com`)
3. In your Shared Drive, click the **Shared drive settings** (gear icon)
4. Click **Manage members**
5. Click **Add members**
6. Paste the `client_email` address
7. Give it **Content Manager** or **Manager** role (NOT just Editor)
8. Click **Send**

**Note**: The service account will create task folders inside this Shared Drive.

## Step 5: Add Credentials to Environment Variables

1. Open the downloaded JSON file
2. Copy the entire JSON content
3. In Vercel (or your `.env` file), add:

```bash
GOOGLE_DRIVE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

GOOGLE_DRIVE_BASE_FOLDER_ID="1a2b3c4d5e6f7g8h9i0j"
```

**Important**: 
- The entire JSON must be on a single line
- Use single quotes around the JSON string
- Escape any single quotes inside the JSON if needed
- In Vercel, paste the JSON directly (it will handle escaping)
- Replace `1a2b3c4d5e6f7g8h9i0j` with your actual folder ID from Step 4

## Step 6: Deploy

After adding the environment variable:
1. Vercel will automatically redeploy
2. Or manually trigger a redeploy from the Deployments tab

## How It Works

When a user uploads an image:
1. System creates a folder structure: **Task Name** → **Assets**
2. Image is uploaded to the **Assets** folder in Google Drive
3. A shareable link is generated and stored in the database
4. The Google Drive file ID is stored in the asset metadata

## Priority Order

The system uses this priority for storage:
1. **Google Drive** (if `GOOGLE_DRIVE_CREDENTIALS` is set)
2. **Cloudinary** (if configured)
3. **Local filesystem** (development fallback)

## Troubleshooting

### Error: "Missing GOOGLE_DRIVE_CREDENTIALS"
- Make sure you've added the environment variable in Vercel
- Check that the JSON is valid (use a JSON validator)

### Error: "Permission denied"
- Make sure you've shared a Google Drive folder with the service account email
- Check that the service account has Editor permissions

### Files not appearing in Google Drive
- Check the service account email in the JSON file
- Verify the folder was shared with the correct email
- Make sure `GOOGLE_DRIVE_BASE_FOLDER_ID` is set correctly
- Verify the folder ID is correct (check the URL)
- Check Vercel logs for detailed error messages

### Error: "GOOGLE_DRIVE_BASE_FOLDER_ID environment variable is required"
- You need to set the `GOOGLE_DRIVE_BASE_FOLDER_ID` environment variable
- Get the folder ID from the Google Drive URL after sharing the folder with the service account
- The folder ID is the part after `/folders/` in the URL

