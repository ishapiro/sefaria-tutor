<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const token = computed(() => (route.query.token as string) || '')
const isResetMode = computed(() => Boolean(token.value))

// Request reset (no token): email form
const email = ref('')
const requestSent = ref(false)
const requestError = ref('')
const requestLoading = ref(false)

// Set new password (with token): password form
const password = ref('')
const passwordConfirm = ref('')
const resetSuccess = ref(false)
const resetError = ref('')
const resetLoading = ref(false)

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
  if (!password.value || !passwordConfirm.value) return true
  return password.value === passwordConfirm.value
})

const canSubmitRequest = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return email.value.trim() && emailRegex.test(email.value.trim())
})

const canSubmitReset = computed(() => {
  return (
    token.value &&
    password.value &&
    passwordConfirm.value &&
    passwordMatch.value &&
    passwordStrength.value.score >= 3
  )
})

async function submitRequest() {
  requestError.value = ''
  requestLoading.value = true
  try {
    const linkBaseUrl = import.meta.client ? window.location.origin : ''
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value.trim(), linkBaseUrl: linkBaseUrl || undefined }
    })
    requestSent.value = true
  } catch (err: any) {
    requestError.value = err.data?.message || 'Something went wrong. Please try again.'
  } finally {
    requestLoading.value = false
  }
}

async function submitReset() {
  resetError.value = ''
  resetLoading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value }
    })
    resetSuccess.value = true
  } catch (err: any) {
    resetError.value = err.data?.message || 'Something went wrong. Please try again.'
  } finally {
    resetLoading.value = false
  }
}

function goToLogin() {
  router.push('/login' + (resetSuccess.value ? '?reset=success' : ''))
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <!-- Request reset link (no token) -->
      <template v-if="!isResetMode">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot password?
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your email and we’ll send you a link to reset your password. This only works for email/password accounts.
          </p>
        </div>

        <div v-if="requestSent" class="space-y-4">
          <div class="bg-green-50 text-green-700 p-3 rounded-md text-sm">
            If an account exists with that email, you will receive a password reset link shortly. Please check your inbox and spam folder.
          </div>
          <NuxtLink to="/login" class="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Back to sign in
          </NuxtLink>
        </div>

        <form v-else class="mt-8 space-y-6" @submit.prevent="submitRequest">
          <div v-if="requestError" class="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {{ requestError }}
          </div>
          <div>
            <label for="reset-email" class="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              v-model="email"
              id="reset-email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="your.email@example.com"
            >
          </div>
          <div>
            <button
              type="submit"
              :disabled="!canSubmitRequest || requestLoading"
              class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ requestLoading ? 'Sending...' : 'Send reset link' }}
            </button>
          </div>
          <p class="text-center">
            <NuxtLink to="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Back to sign in
            </NuxtLink>
          </p>
        </form>
      </template>

      <!-- Set new password (with token) -->
      <template v-else>
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter a new password for your account.
          </p>
        </div>

        <div v-if="resetSuccess" class="space-y-4">
          <div class="bg-green-50 text-green-700 p-3 rounded-md text-sm">
            Your password has been reset. You can now sign in with your new password.
          </div>
          <button
            type="button"
            @click="goToLogin"
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign in
          </button>
        </div>

        <form v-else class="mt-8 space-y-6" @submit.prevent="submitReset">
          <div v-if="resetError" class="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {{ resetError }}
          </div>
          <div>
            <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              v-model="password"
              id="new-password"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Create a password"
            >
            <div v-if="password" class="mt-2">
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
                  />
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
          </div>
          <div>
            <label for="new-password-confirm" class="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              v-model="passwordConfirm"
              id="new-password-confirm"
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
          <div>
            <button
              type="submit"
              :disabled="!canSubmitReset || resetLoading"
              class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ resetLoading ? 'Resetting...' : 'Reset password' }}
            </button>
          </div>
          <p class="text-center">
            <NuxtLink to="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Back to sign in
            </NuxtLink>
          </p>
        </form>
      </template>
    </div>
  </div>
</template>
