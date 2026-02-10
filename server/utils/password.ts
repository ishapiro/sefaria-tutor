/**
 * Password hashing utilities using Web Crypto API (compatible with Cloudflare Workers)
 * Uses PBKDF2 with SHA-256 for password hashing
 */

/**
 * Hash a password using PBKDF2 (Web Crypto API - compatible with Cloudflare Workers)
 * Format: pbkdf2:iterations:salt:hash (all hex encoded)
 */
export async function hashPasswordWorkers(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const passwordData = encoder.encode(password)
  
  // Generate a random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // Use PBKDF2 with 100,000 iterations (adjust as needed for security/performance)
  const iterations = 100000
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  )
  
  // Convert to hex strings
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  // Return format: pbkdf2:iterations:salt:hash
  return `pbkdf2:${iterations}:${saltHex}:${hashHex}`
}

/**
 * Verify a password against a stored hash (Web Crypto API - compatible with Cloudflare Workers)
 */
export async function verifyPasswordWorkers(storedHash: string, password: string): Promise<boolean> {
  try {
    // Parse the stored hash format: pbkdf2:iterations:salt:hash
    const parts = storedHash.split(':')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      // Legacy format or invalid - return false
      return false
    }
    
    const iterations = parseInt(parts[1], 10)
    const saltHex = parts[2]
    const storedHashHex = parts[3]
    
    // Convert salt from hex to Uint8Array
    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    )
    
    // Hash the provided password with the same parameters
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    )
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes = 256 bits
    )
    
    // Convert to hex
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Compare hashes (constant-time comparison)
    return hashHex === storedHashHex
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}
