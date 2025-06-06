/**
 * Truncates text to a specified length and adds ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 50) {
  if (typeof text !== 'string') return text;
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Recursively processes an object to truncate long text fields
 * @param {any} obj - Object to process
 * @param {string[]} preserveFields - Array of field names to preserve without truncation
 * @param {boolean} isTranslationResponse - Whether this is a translation response
 * @param {boolean} isNested - Whether this object is nested within another object
 * @param {boolean} showFull - Whether to show full content without truncation
 * @returns {any} Processed object with truncated text fields
 */
function processObject(obj, preserveFields = [], isTranslationResponse = false, isNested = false, showFull = false) {
  // If showFull is true, return the object as is
  if (showFull) {
    return obj;
  }

  // If this is a translation response, preserve the entire structure
  if (isTranslationResponse) {
    return obj;
  }

  if (typeof obj !== 'object' || obj === null) {
    return truncateText(obj);
  }

  if (Array.isArray(obj)) {
    // For arrays, show full entries if they're short enough
    if (isNested && obj.length > 3) {
      // Check if all items are short enough to show
      const allItemsShort = obj.every(item => 
        typeof item === 'string' ? item.length <= 15 : true
      );
      
      if (allItemsShort) {
        return obj.map(item => processObject(item, preserveFields, isTranslationResponse, true, showFull));
      }
      return `[Array with ${obj.length} items]`;
    }
    return obj.map(item => processObject(item, preserveFields, isTranslationResponse, true, showFull));
  }

  const processed = {};
  for (const [key, value] of Object.entries(obj)) {
    // Preserve certain fields without truncation
    if (preserveFields.includes(key)) {
      processed[key] = value;
    } else if (typeof value === 'string') {
      processed[key] = truncateText(value);
    } else if (Array.isArray(value)) {
      if (value.length > 3) {
        // Check if all items are short enough to show
        const allItemsShort = value.every(item => 
          typeof item === 'string' ? item.length <= 15 : true
        );
        
        if (allItemsShort) {
          processed[key] = value.map(item => processObject(item, preserveFields, isTranslationResponse, true, showFull));
        } else {
          processed[key] = `[Array with ${value.length} items]`;
        }
      } else {
        processed[key] = value.map(item => processObject(item, preserveFields, isTranslationResponse, true, showFull));
      }
    } else if (typeof value === 'object' && value !== null) {
      processed[key] = processObject(value, preserveFields, isTranslationResponse, true, showFull);
    } else {
      processed[key] = value;
    }
  }
  return processed;
}

/**
 * Utility function for logging debug information
 * @param {boolean} debug - Whether debug logging is enabled
 * @param {boolean} showFull - Whether to show full content without truncation
 * @param {...any} args - Arguments to log
 */
export function log(debug, showFull = false, ...args) {
  if (debug) {
    // Process and convert objects to expanded JSON strings
    const expandedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Check if this is a translation response
        const isTranslationResponse = arg.choices?.[0]?.message?.content !== undefined;
        
        // Preserve certain fields that need to be parsed as JSON
        const preserveFields = ['content', 'message', 'choices', 'data'];
        const processed = processObject(arg, preserveFields, isTranslationResponse, false, showFull);
        return JSON.stringify(processed, null, 2);
      }
      return showFull ? arg : truncateText(arg);
    });
    console.log(...expandedArgs);
  }
}

let lastTime = performance.now();

/**
 * Utility function for logging timing information
 * @param {string} label - Label for the timing log
 */
export function logTime(label) {
  const now = performance.now();
  console.log(`[Timing] ${label}: ${(now - lastTime).toFixed(2)}ms`);
  lastTime = now;
} 