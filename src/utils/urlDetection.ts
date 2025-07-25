/**
 * URL detection utilities for folder links
 */

export interface FolderUrl {
  url: string;
  type: 'drive' | 'notion' | 'dropbox';
  title?: string;
}

/**
 * Detect folder URLs from text
 */
export function detectFolderUrls(text: string): FolderUrl[] {
  const urls: FolderUrl[] = [];
  
  // Google Drive patterns
  const drivePatterns = [
    /https:\/\/drive\.google\.com\/(?:drive\/folders\/|file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/g,
    /https:\/\/docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/g
  ];
  
  // Notion patterns
  const notionPatterns = [
    /https:\/\/(?:www\.)?notion\.so\/([a-zA-Z0-9_-]+)/g,
    /https:\/\/[a-zA-Z0-9_-]+\.notion\.site\/([a-zA-Z0-9_-]+)/g
  ];
  
  // Dropbox patterns
  const dropboxPatterns = [
    /https:\/\/(?:www\.)?dropbox\.com\/(?:s|sh|scl\/fo)\/([a-zA-Z0-9_-]+)/g,
    /https:\/\/(?:www\.)?dropbox\.com\/home\/([a-zA-Z0-9_\/-]+)/g
  ];
  
  // Check Google Drive URLs
  drivePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      urls.push({
        url: match[0],
        type: 'drive',
        title: 'Google Drive'
      });
    }
  });
  
  // Check Notion URLs
  notionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      urls.push({
        url: match[0],
        type: 'notion',
        title: 'Notion'
      });
    }
  });
  
  // Check Dropbox URLs
  dropboxPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      urls.push({
        url: match[0],
        type: 'dropbox',
        title: 'Dropbox'
      });
    }
  });
  
  // Remove duplicates
  return urls.filter((url, index, self) => 
    index === self.findIndex(u => u.url === url.url)
  );
}

/**
 * Get icon for folder type
 */
export function getFolderIcon(type: 'drive' | 'notion' | 'dropbox'): string {
  switch (type) {
    case 'drive':
      return '📁';
    case 'notion':
      return '📝';
    case 'dropbox':
      return '📦';
    default:
      return '📂';
  }
}

/**
 * Validate if URL is accessible
 */
export function isValidFolderUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const validDomains = [
      'drive.google.com',
      'docs.google.com',
      'notion.so',
      'dropbox.com'
    ];
    
    return validDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}