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

## Step 4: Share Google Drive Folder with Service Account

1. Open the downloaded JSON file
2. Find the `client_email` field (e.g., `client-portal-drive@project-id.iam.gserviceaccount.com`)
3. Go to your Google Drive
4. Create a folder (or use an existing one) where you want to store task assets
5. Right-click the folder → **Share**
6. Paste the `client_email` address
7. Give it **Editor** permissions
8. Click **Send**

**Note**: The service account will create folders inside this shared folder, or you can use the root of the service account's Drive.

## Step 5: Add Credentials to Environment Variables

1. Open the downloaded JSON file
2. Copy the entire JSON content
3. In Vercel (or your `.env` file), add:

```bash
GOOGLE_DRIVE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Important**: 
- The entire JSON must be on a single line
- Use single quotes around the JSON string
- Escape any single quotes inside the JSON if needed
- In Vercel, paste the JSON directly (it will handle escaping)

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
- Check Vercel logs for detailed error messages

