/**
 * Utility function for logging debug information
 * @param {boolean} debug - Whether debug logging is enabled
 * @param {...any} args - Arguments to log
 */
export function log(debug, ...args) {
  if (debug) {
    // Convert objects to expanded JSON strings
    const expandedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2);
      }
      return arg;
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