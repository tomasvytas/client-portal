# GitHub Repository Setup

## Option 1: Create New Repository on GitHub (Recommended)

### Step 1: Create Repository on GitHub
1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `client-portal` (or any name you prefer)
   - **Description**: "Client Portal with AI Chat"
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

### Step 2: Copy the Repository URL
After creating, GitHub will show you a URL like:
```
https://github.com/YOUR_USERNAME/client-portal.git
```

### Step 3: Update Git Remote
Run this command (replace with your actual URL):
```bash
cd "/Users/tomasvytas/AI to AE/client-portal"
git remote set-url origin https://github.com/YOUR_USERNAME/client-portal.git
```

### Step 4: Push to GitHub
```bash
git push -u origin main
```

If it asks for authentication:
- Use a **Personal Access Token** (not your password)
- Create one: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Or use GitHub CLI: `gh auth login`

---

## Option 2: Use GitHub CLI (Easier)

If you have GitHub CLI installed:

```bash
cd "/Users/tomasvytas/AI to AE/client-portal"
gh repo create client-portal --private --source=. --remote=origin --push
```

This will:
- Create the repo on GitHub
- Set up the remote
- Push your code

---

## Option 3: Manual Setup

If you prefer to do it manually:

1. **Remove the placeholder remote:**
```bash
cd "/Users/tomasvytas/AI to AE/client-portal"
git remote remove origin
```

2. **Add your actual GitHub repository:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/client-portal.git
```

3. **Push:**
```bash
git push -u origin main
```

---

## Troubleshooting

**"Repository not found"**
- Make sure the repository exists on GitHub
- Check the URL is correct
- Ensure you have access to the repository

**"Authentication failed"**
- GitHub no longer accepts passwords
- Use a Personal Access Token instead
- Or use GitHub CLI: `gh auth login`

**"Remote origin already exists"**
- Remove it first: `git remote remove origin`
- Then add the correct one

---

## After Pushing

Once your code is on GitHub:
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Follow the deployment guide!

