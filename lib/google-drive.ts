import { google } from 'googleapis'

// Lazy initialization for Google Drive
let driveInstance: ReturnType<typeof google.drive> | null = null

function getDrive() {
  if (!driveInstance) {
    const credentials = process.env.GOOGLE_DRIVE_CREDENTIALS
    if (!credentials) {
      throw new Error('Missing GOOGLE_DRIVE_CREDENTIALS environment variable')
    }

    let credentialsJson
    try {
      credentialsJson = JSON.parse(credentials)
    } catch (e) {
      throw new Error('GOOGLE_DRIVE_CREDENTIALS must be valid JSON')
    }

    const auth = new google.auth.GoogleAuth({
      credentials: credentialsJson,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    driveInstance = google.drive({ version: 'v3', auth })
  }
  return driveInstance
}

/**
 * Find or create a folder in Google Drive
 * @param folderName - Name of the folder to find or create
 * @param parentFolderId - Optional parent folder ID (defaults to root)
 * @returns Folder ID
 */
export async function findOrCreateFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const drive = getDrive()

  // Escape single quotes in folder name for query
  const escapedName = folderName.replace(/'/g, "\\'")
  
  // First, try to find existing folder
  const query = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const parentQuery = parentFolderId ? ` and '${parentFolderId}' in parents` : " and 'root' in parents"
  
  const response = await drive.files.list({
    q: query + parentQuery,
    fields: 'files(id, name)',
    spaces: 'drive',
  })

  if (response.data.files && response.data.files.length > 0) {
    // Folder exists, return its ID
    return response.data.files[0].id!
  }

  // Folder doesn't exist, create it
  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  }
  
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId]
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  })

  return folder.data.id!
}

/**
 * Upload a file to Google Drive
 * @param fileBuffer - File buffer
 * @param fileName - Original file name
 * @param mimeType - File MIME type
 * @param folderId - Parent folder ID
 * @returns Object with fileId and webViewLink
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string; webContentLink?: string }> {
  const drive = getDrive()

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  }

  // Convert buffer to stream for better memory efficiency
  const { Readable } = await import('stream')
  const stream = Readable.from(fileBuffer)

  const media = {
    mimeType,
    body: stream,
  }

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  })

  return {
    fileId: file.data.id!,
    webViewLink: file.data.webViewLink || '',
    webContentLink: file.data.webContentLink || undefined,
  }
}

/**
 * Get a shareable link for a Google Drive file
 * @param fileId - Google Drive file ID
 * @returns Shareable link
 */
export async function getFileShareableLink(fileId: string): Promise<string> {
  const drive = getDrive()

  // Make file publicly viewable
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  // Get file metadata to get the link
  const file = await drive.files.get({
    fileId,
    fields: 'webViewLink, webContentLink',
  })

  // Return direct download link if available, otherwise web view link
  return file.data.webContentLink || file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
}

/**
 * Setup folder structure for a task: Task Name > Assets
 * @param taskName - Name of the task
 * @returns Object with taskFolderId and assetsFolderId
 */
export async function setupTaskFolders(taskName: string): Promise<{ taskFolderId: string; assetsFolderId: string }> {
  // Get the base folder ID from environment (shared folder with service account)
  const baseFolderId = process.env.GOOGLE_DRIVE_BASE_FOLDER_ID
  
  if (!baseFolderId) {
    throw new Error('GOOGLE_DRIVE_BASE_FOLDER_ID environment variable is required. Please share a Google Drive folder with the service account and set its folder ID.')
  }
  
  // Create or find task folder inside the base folder
  const taskFolderId = await findOrCreateFolder(taskName, baseFolderId)
  
  // Create or find Assets folder inside task folder
  const assetsFolderId = await findOrCreateFolder('Assets', taskFolderId)
  
  return { taskFolderId, assetsFolderId }
}

/**
 * Upload a document file to Google Drive
 * @param buffer - File buffer
 * @param fileName - Name of the document
 * @param folderId - Parent folder ID
 * @param mimeType - MIME type of the file
 * @returns Object with fileId and webViewLink
 */
export async function uploadDocumentToDrive(
  buffer: Buffer,
  fileName: string,
  folderId: string,
  mimeType: string = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDrive()

  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    mimeType,
  }

  const media = {
    mimeType,
    body: stream,
  }

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink',
  })

  // Make file shareable
  await getFileShareableLink(file.data.id!)

  return {
    fileId: file.data.id!,
    webViewLink: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id!}/view`,
  }
}

