import Link from "next/link"
import { Twitter, Github, MessageSquare, Send } from "lucide-react"

import { siteConfig } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const iconMap = {
  Twitter: Twitter,
  Github: Github,
  MessageSquare: MessageSquare,
  Send: Send,
}

export function Footer() {
  return (
    <footer id="contact" className="bg-gray-50 dark:bg-gray-900 py-12 md:py-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-teal-400 to-blue-600">
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                  GEO
                </div>
              </div>
              <span className="font-bold">{siteConfig.name}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A decentralized synchronized state machine inherently designed for Earth&apos;s geography.
            </p>
            <div className="flex space-x-4">
              {siteConfig.socials.map((social) => {
                const Icon = iconMap[social.icon as keyof typeof iconMap]

                return (
                  <Link
                    key={social.name}
                    href={social.href}
                    className="text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{social.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  Whitepaper
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  API Reference
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                >
                  Press
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Stay Updated</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Subscribe to our newsletter for the latest updates.
            </p>
            <form className="space-y-2">
              <div className="flex gap-2">
                <Input type="email" placeholder="Enter your email" className="max-w-[220px]" />
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Subscribe</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} GeoSVM Protocol. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
