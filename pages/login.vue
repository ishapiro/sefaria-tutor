<script setup lang="ts">
const { loginWithGoogle, loggedIn } = useAuth()
const router = useRouter()

// If already logged in, redirect to home
watchEffect(() => {
  if (loggedIn.value) {
    router.push('/')
  }
})

const email = ref('')
const password = ref('')
const isRegistering = ref(false)
const message = ref('')
const error = ref('')
const isLoading = ref(false)

const handleAuth = async () => {
  error.value = ''
  message.value = ''
  isLoading.value = true
  
  try {
    if (isRegistering.value) {
      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { email: email.value, password: password.value }
      })
      message.value = response.message
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
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ isRegistering ? 'Create your account' : 'Sign in to Sefaria Tutor' }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <button @click="isRegistering = !isRegistering" class="font-medium text-indigo-600 hover:text-indigo-500">
            {{ isRegistering ? 'sign in to your existing account' : 'register a new account' }}
          </button>
        </p>
      </div>

      <div v-if="message" class="bg-green-50 text-green-700 p-3 rounded-md text-sm">
        {{ message }}
      </div>
      
      <div v-if="error" class="bg-red-50 text-red-700 p-3 rounded-md text-sm">
        {{ error }}
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleAuth">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email-address" class="sr-only">Email address</label>
            <input v-model="email" id="email-address" name="email" type="email" autocomplete="email" required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address">
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input v-model="password" id="password" name="password" type="password" autocomplete="current-password" required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password">
          </div>
        </div>

        <div>
          <button type="submit" :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {{ isLoading ? 'Processing...' : (isRegistering ? 'Register' : 'Sign in') }}
          </button>
        </div>
      </form>

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
          <button @click="loginWithGoogle"
            class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <img class="h-5 w-5 mr-2" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo">
            Google
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
