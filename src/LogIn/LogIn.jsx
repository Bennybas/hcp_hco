"use client"

import { useState, useEffect } from "react"
import { FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi"
import Header from "../Header/Header"

const LogIn = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user has visited before
    const hasVisitedBefore = localStorage.getItem("hasVisitedBefore")

    if (hasVisitedBefore) {
      setIsFirstVisit(false)

      // Get saved credentials if they exist
      const savedEmail = localStorage.getItem("userEmail")
      if (savedEmail) {
        setFormData((prev) => ({
          ...prev,
          email: savedEmail,
        }))
      }
    }

    const loggedInStatus = localStorage.getItem("isLoggedIn")
    if (loggedInStatus === "true") {
      setIsLoggedIn(true)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate API call
    setTimeout(() => {
      // Check against the expected credentials
      if (formData.email === "demo_nvs@chryselys.com" && formData.password === "nvs@123") {
        // Mark that user has visited before
        localStorage.setItem("hasVisitedBefore", "true")

        // Save email for next visit if remember me is checked
        const rememberMe = document.getElementById("remember-me").checked
        if (rememberMe) {
          localStorage.setItem("userEmail", formData.email)
        }

        // Set login state in localStorage
        localStorage.setItem("isLoggedIn", "true")

        // Instead of redirecting to "/dashboard", render the Header component
        // You can either use React Router or set a state to conditionally render
        setIsLoggedIn(true)
      } else {
        setError("Invalid credentials. Please try again.")
      }
      setIsLoading(false)
    }, 1500)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <>
      {isLoggedIn ? (
        <Header />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          {/* Rest of the login form remains the same */}
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <img src="/logo.svg" alt="Chryselys Logo" className="h-12" />
                </div>
                <p className="text-gray-700 mt-1">
                  {isFirstVisit ? "Sign in to get started" : "Sign in to your account"}
                </p>
              </div>

              {/* Form */}
              <div className="p-6 sm:p-8">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900"
                        // placeholder={isFirstVisit ? "demo_nvs@chryselys.com" : "Enter your email"}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900"
                        // placeholder={isFirstVisit ? "nvs@123" : "Enter your password"}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    {isFirstVisit && (
                      <p className="mt-1 text-xs text-gray-500">
                        
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        defaultChecked={!isFirstVisit}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                        Remember me
                      </label>
                    </div>
                    <div className="text-sm">
                      <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                        Forgot password?
                      </a>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                      isLoading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>
                </form>

                {/* <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                      Contact your administrator
                    </a>
                  </p>
                </div> */}
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Chryselys. All rights reserved.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LogIn
