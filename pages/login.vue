<script setup lang="ts">
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const { loginWithGoogle, loggedIn } = useAuth()
const router = useRouter()
const route = useRoute()
const { setSupportView, clearSupportView } = useSupportPageContext()

onMounted(() => setSupportView(SUPPORT_VIEW_NAMES.LOGIN))
onUnmounted(() => clearSupportView())

// If already logged in, redirect to home
watchEffect(() => {
  if (loggedIn.value) {
    router.push('/')
  }
})

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const name = ref('')
const isRegistering = ref(false)
const message = ref('')
const error = ref('')
const showSuccessDialog = ref(false)
const errorDebug = ref<any | null>(null)
const showErrorDebug = ref(false)
const isLoading = ref(false)
const authCapabilities = ref<{ googleEnabled: boolean; emailEnabled: boolean } | null>(null)
const capabilitiesError = ref('')
const turnstileToken = ref('')
const turnstileWidgetId = ref<string | null>(null)
const emailTaken = ref(false)

onMounted(async () => {
  try {
    authCapabilities.value = await $fetch('/api/auth/capabilities')
  } catch {
    // If this fails, default to showing everything (worst case: user clicks and sees a server error)
    capabilitiesError.value = 'Could not determine available login methods.'
    authCapabilities.value = { googleEnabled: true, emailEnabled: true }
  }
  
  // Load Cloudflare Turnstile script if required
  if (isRegistering.value && turnstileRequired.value && import.meta.client) {
    loadTurnstile()
  }
})

watch(isRegistering, (newVal) => {
  if (newVal && import.meta.client) {
    // Reset form when switching to registration
    password.value = ''
    passwordConfirm.value = ''
    name.value = ''
    turnstileToken.value = ''
    if (turnstileRequired.value) {
      nextTick(() => {
        loadTurnstile()
      })
    }
  } else {
    // Clean up Turnstile when switching away
    if (turnstileWidgetId.value && (window as any).turnstile) {
      try {
        (window as any).turnstile.remove(turnstileWidgetId.value)
      } catch {}
      turnstileWidgetId.value = null
    }
  }
})

const loadTurnstile = () => {
  if ((window as any).turnstile) {
    renderTurnstile()
    return
  }
  
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  script.async = true
  script.defer = true
  script.onload = () => {
    renderTurnstile()
  }
  document.head.appendChild(script)
}

const renderTurnstile = () => {
  const config = useRuntimeConfig()
  const siteKey = config.public.turnstileSiteKey || ''
  
  if (!siteKey || !(window as any).turnstile) return
  
  // Remove existing widget if any
  const container = document.getElementById('turnstile-widget')
  if (container && turnstileWidgetId.value) {
    try {
      (window as any).turnstile.remove(turnstileWidgetId.value)
    } catch {}
  }
  
  if (container) {
    turnstileWidgetId.value = (window as any).turnstile.render(container, {
      sitekey: siteKey,
      callback: (token: string) => {
        turnstileToken.value = token
      },
      'error-callback': () => {
        turnstileToken.value = ''
      },
      'expired-callback': () => {
        turnstileToken.value = ''
      }
    })
  }
}

const googleLoginError = computed(() => {
  if (route.query.error !== 'google_failed') return ''
  const reason = String(route.query.reason ?? '')
  if (reason === 'config') {
    return 'Google login is not configured on this deployment. Please use email/password or contact the administrator.'
  }
  if (reason === 'redirect_uri') {
    return 'Google login failed due to a redirect/callback URL mismatch. Please contact the administrator.'
  }
  if (reason === 'db') {
    return 'Google login failed due to a database configuration issue. Please try again later or contact the administrator.'
  }
  return 'Google login failed. Please try again, or use email/password.'
})

const googleEnabled = computed(() => authCapabilities.value?.googleEnabled !== false)
const emailEnabled = computed(() => authCapabilities.value?.emailEnabled !== false)

// Email validation
const emailError = computed(() => {
  if (!isRegistering.value || !email.value) return ''
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    return 'Please enter a valid email address'
  }
  if (emailTaken.value) {
    return 'An account with this email already exists. Please sign in or use a different email address.'
  }
  return ''
})

// Password complexity checker
const passwordStrength = computed(() => {
  if (!password.value) return { score: 0, label: '', color: '' }
  
  let score = 0
  const checks = {
    length: password.value.length >= 8,
    lowercase: /[a-z]/.test(password.value),
    uppercase: /[A-Z]/.test(password.value),
    number: /[0-9]/.test(password.value),
    special: /[^a-zA-Z0-9]/.test(password.value),
    long: password.value.length >= 12
  }
  
  if (checks.length) score++
  if (checks.lowercase) score++
  if (checks.uppercase) score++
  if (checks.number) score++
  if (checks.special) score++
  if (checks.long) score++
  
  if (score <= 2) return { score, label: 'Weak', color: 'red' }
  if (score <= 4) return { score, label: 'Fair', color: 'yellow' }
  if (score <= 5) return { score, label: 'Good', color: 'blue' }
  return { score, label: 'Strong', color: 'green' }
})

const passwordMatch = computed(() => {
  if (!isRegistering.value) return true
  if (!password.value || !passwordConfirm.value) return true
  return password.value === passwordConfirm.value
})

const turnstileRequired = computed(() => {
  if (!isRegistering.value) return false
  const config = useRuntimeConfig()
  return Boolean(config.public.turnstileSiteKey)
})

const canSubmit = computed(() => {
  if (!isRegistering.value) {
    return email.value && password.value && !emailError.value
  }
  const baseChecks = email.value && 
                     password.value && 
                     passwordConfirm.value &&
                     passwordMatch.value &&
                     !emailError.value &&
                     passwordStrength.value.score >= 3 &&
                     !emailTaken.value
  
  // Turnstile is only required if site key is configured
  if (turnstileRequired.value) {
    return baseChecks && turnstileToken.value
  }
  return baseChecks
})

const handleAuth = async () => {
  error.value = ''
  message.value = ''
  errorDebug.value = null
  showErrorDebug.value = false
  isLoading.value = true
  
  try {
    if (!emailEnabled.value) {
      error.value = 'Email/password login is not available on this server.'
      return
    }
    if (isRegistering.value) {
      if (!canSubmit.value) {
        error.value = 'Please complete all required fields correctly'
        return
      }
      
      const linkBaseUrl = import.meta.client ? window.location.origin : ''
      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { 
          email: email.value, 
          password: password.value,
          name: name.value || email.value.split('@')[0],
          turnstileToken: turnstileToken.value,
          linkBaseUrl: linkBaseUrl || undefined
        }
      })
      message.value = response.message
      showSuccessDialog.value = true
      // Reset form on success
      email.value = ''
      password.value = ''
      passwordConfirm.value = ''
      name.value = ''
      turnstileToken.value = ''
      if (turnstileWidgetId.value && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(turnstileWidgetId.value)
        } catch {}
      }
    } else {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email: email.value, password: password.value }
      })
      // useUserSession().fetch() will be handled by useAuth or global session
      window.location.href = '/'
    }
  } catch (err: any) {
    error.value = err.data?.message || 'An error occurred'
    errorDebug.value = err.data?.data?.debug || null
    // Reset Turnstile widget on registration errors so user can get a fresh token
    if (isRegistering.value && turnstileWidgetId.value && (window as any).turnstile) {
      try {
        (window as any).turnstile.reset(turnstileWidgetId.value)
        turnstileToken.value = ''
      } catch {}
    }
  } finally {
    isLoading.value = false
  }
}

const onEmailBlur = async () => {
  if (!isRegistering.value || !email.value) {
    emailTaken.value = false
    return
  }

  // Do not check if basic format is invalid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    emailTaken.value = false
    return
  }

  try {
    const result = await $fetch<{ exists: boolean }>(`/api/auth/email-exists?email=${encodeURIComponent(email.value)}`)
    emailTaken.value = result.exists

    if (result.exists && turnstileWidgetId.value && (window as any).turnstile) {
      try {
        (window as any).turnstile.reset(turnstileWidgetId.value)
        turnstileToken.value = ''
      } catch {}
    }
  } catch {
    // On failure, don't block the user; just clear the flag.
    emailTaken.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ isRegistering ? 'Create your account' : 'Sign in to Shoresh' }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <button @click="isRegistering = !isRegistering" class="font-medium text-indigo-600 hover:text-indigo-500">
            {{ isRegistering ? 'sign in to your existing account' : 'register a new account' }}
          </button>
        </p>
      </div>

      <div v-if="route.query.reset === 'success'" class="bg-green-50 text-green-700 p-3 rounded-md text-sm">
        Your password has been reset. You can now sign in with your new password.
      </div>
      <div v-if="message && !showSuccessDialog" class="bg-green-50 text-green-700 p-3 rounded-md text-sm">
        {{ message }}
      </div>
      
      <div v-if="capabilitiesError" class="bg-amber-50 text-amber-800 p-3 rounded-md text-sm">
        {{ capabilitiesError }}
      </div>

      <div v-if="googleLoginError" class="bg-red-50 text-red-700 p-3 rounded-md text-sm">
        {{ googleLoginError }}
      </div>

      <div v-if="error" class="bg-red-50 text-red-700 p-3 rounded-md text-sm">
        <div>{{ error }}</div>
        <div v-if="errorDebug" class="mt-2 text-xs text-red-800">
          <button
            type="button"
            class="underline hover:text-red-900"
            @click="showErrorDebug = !showErrorDebug"
          >
            {{ showErrorDebug ? 'Hide technical details' : 'Show technical details for support' }}
          </button>
          <div
            v-if="showErrorDebug"
            class="mt-2 bg-red-50 border border-dashed border-red-300 rounded p-2 font-mono whitespace-pre-wrap break-all text-[11px] text-red-900"
          >
            <p><strong>Provider:</strong> {{ errorDebug.provider || 'email-service' }}</p>
            <p v-if="errorDebug.statusCode"><strong>Status:</strong> {{ errorDebug.statusCode }}</p>
            <p v-if="errorDebug.name"><strong>Type:</strong> {{ errorDebug.name }}</p>
            <p v-if="errorDebug.message"><strong>Details:</strong> {{ errorDebug.message }}</p>
          </div>
        </div>
      </div>

      <form v-if="emailEnabled" class="mt-8 space-y-6" @submit.prevent="handleAuth">
        <div class="space-y-4">
          <!-- Email field -->
          <div>
            <label for="email-address" class="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input 
              v-model="email" 
              id="email-address" 
              name="email" 
              type="email" 
              autocomplete="email" 
              required
              :class="[
                'appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
                emailError ? 'border-red-300' : 'border-gray-300'
              ]"
              placeholder="your.email@example.com"
              @blur="onEmailBlur"
            >
            <p v-if="emailError" class="mt-1 text-sm text-red-600">{{ emailError }}</p>
          </div>

          <!-- Name field (registration only) -->
          <div v-if="isRegistering">
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              Name (optional)
            </label>
            <input 
              v-model="name" 
              id="name" 
              name="name" 
              type="text" 
              autocomplete="name"
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Your name"
            >
          </div>

          <!-- Password field -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input 
              v-model="password" 
              id="password" 
              name="password" 
              type="password" 
              :autocomplete="isRegistering ? 'new-password' : 'current-password'" 
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              :placeholder="isRegistering ? 'Create a password' : 'Password'"
            >
            <!-- Password strength indicator (registration only) -->
            <div v-if="isRegistering && password" class="mt-2">
              <div class="flex items-center gap-2 mb-1">
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    class="h-2 rounded-full transition-all"
                    :class="{
                      'bg-red-500': passwordStrength.color === 'red',
                      'bg-yellow-500': passwordStrength.color === 'yellow',
                      'bg-blue-500': passwordStrength.color === 'blue',
                      'bg-green-500': passwordStrength.color === 'green'
                    }"
                    :style="{ width: `${(passwordStrength.score / 6) * 100}%` }"
                  ></div>
                </div>
                <span class="text-xs font-medium" :class="{
                  'text-red-600': passwordStrength.color === 'red',
                  'text-yellow-600': passwordStrength.color === 'yellow',
                  'text-blue-600': passwordStrength.color === 'blue',
                  'text-green-600': passwordStrength.color === 'green'
                }">
                  {{ passwordStrength.label }}
                </span>
              </div>
              <p v-if="passwordStrength.score < 3" class="text-xs text-red-600">
                Password must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>
            <p v-if="!isRegistering && emailEnabled" class="mt-2 text-sm">
              <NuxtLink to="/reset-password" class="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </NuxtLink>
            </p>
          </div>

          <!-- Password confirmation (registration only) -->
          <div v-if="isRegistering">
            <label for="password-confirm" class="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input 
              v-model="passwordConfirm" 
              id="password-confirm" 
              name="password-confirm" 
              type="password" 
              autocomplete="new-password" 
              required
              :class="[
                'appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
                passwordConfirm && !passwordMatch ? 'border-red-300' : 'border-gray-300'
              ]"
              placeholder="Re-enter your password"
            >
            <p v-if="passwordConfirm && !passwordMatch" class="mt-1 text-sm text-red-600">
              Passwords do not match
            </p>
          </div>

          <!-- Cloudflare Turnstile CAPTCHA (registration only, if configured) -->
          <div v-if="isRegistering && turnstileRequired" id="turnstile-widget" class="flex justify-center"></div>
        </div>

        <div>
          <button 
            type="submit" 
            :disabled="isLoading || (isRegistering && !canSubmit)"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isLoading ? 'Processing...' : (isRegistering ? 'Register' : 'Sign in') }}
          </button>
        </div>
      </form>
      <div v-else class="mt-6 text-sm text-gray-600">
        Email/password login is not enabled on this server.
      </div>

      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div class="mt-6">
          <button v-if="googleEnabled" @click="loginWithGoogle"
            class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <img class="h-5 w-5 mr-2" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo">
            Google
          </button>
          <div v-else class="text-sm text-gray-600 text-center">
            Google login is not enabled on this server.
          </div>
        </div>
      </div>
    </div>

    <!-- Registration success dialog -->
    <div
      v-if="showSuccessDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div class="bg-white rounded-xl shadow-2xl border border-green-100 max-w-md w-full p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Registration successful</h3>
        <p class="text-sm text-gray-700">
          {{ message || 'Your account has been created. Please check your email for verification instructions.' }}
        </p>
        <p class="text-xs text-gray-500">
          After verifying your email, you can sign in and start using advanced Shoresh features.
        </p>
        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            @click="$router.push('/')"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
