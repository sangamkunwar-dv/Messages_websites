import Link from 'next/link'
import { MessageSquare, Phone, Video, Share2, Lock, Zap, Users, Globe, Settings, TrendingUp, Check, Star } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Together</span>
          </div>
          <div className="flex gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-lg"
            >
              Log In
            </Link>
            <Link
              href="/auth/sign-up"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-semibold text-primary">NEW</span>
                <span className="text-sm text-primary/80">Now with encrypted messaging</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold leading-tight text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Connect with Anyone, Anytime
              </h1>
            </div>
            <p className="text-xl text-muted-foreground text-balance leading-relaxed">
              The all-in-one communication platform. Instant messaging, crystal-clear calls, secure file sharing. Experience the future of human connection.
            </p>
            <div className="flex gap-3 pt-4">
              <Link
                href="/auth/sign-up"
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/40 text-base"
              >
                Start For Free
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-4 border border-border rounded-xl font-semibold hover:bg-muted/50 transition-all text-base"
              >
                Sign In
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span>No credit card needed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span>Free forever plan</span>
              </div>
            </div>
          </div>
          
          <div className="relative h-96 group">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl border border-primary/20 h-full flex items-center justify-center overflow-hidden">
              <div className="absolute top-8 left-8 w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute bottom-12 right-12 w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center animate-pulse delay-300">
                <Phone className="w-6 h-6 text-purple-600" />
              </div>
              <div className="absolute top-1/3 right-8 w-14 h-14 bg-pink-500/20 rounded-full flex items-center justify-center animate-pulse delay-150">
                <Users className="w-7 h-7 text-pink-600" />
              </div>
              <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center">
                <Globe className="w-16 h-16 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-background/50 to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Packed with powerful features designed for modern communication
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group p-6 rounded-2xl border border-border hover:border-primary/50 bg-card/50 hover:bg-card transition-all hover:shadow-lg hover:shadow-primary/5 space-y-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg">Real-Time Messaging</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Instant message delivery with read receipts. Stay connected in real-time conversations with perfect synchronization.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-2xl border border-border hover:border-primary/50 bg-card/50 hover:bg-card transition-all hover:shadow-lg hover:shadow-primary/5 space-y-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg">Crystal Video Calls</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                HD video and audio quality. Make calls directly in the app with no additional software required.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-2xl border border-border hover:border-primary/50 bg-card/50 hover:bg-card transition-all hover:shadow-lg hover:shadow-primary/5 space-y-4">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500/20 to-pink-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Share2 className="w-7 h-7 text-pink-600" />
              </div>
              <h3 className="font-bold text-lg">Easy File Sharing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Share images, videos, and documents instantly. Secure storage with fast, reliable access.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 rounded-2xl border border-border hover:border-primary/50 bg-card/50 hover:bg-card transition-all hover:shadow-lg hover:shadow-primary/5 space-y-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lock className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-bold text-lg">Military-Grade Security</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                End-to-end encryption for all conversations. Your privacy is our top priority, always.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 rounded-2xl border border-border hover:border-primary/50 bg-card/50 hover:bg-card transition-all hover:shadow-lg hover:shadow-primary/5 space-y-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="font-bold text-lg">Lightning Fast</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                99.99% uptime guarantee. Optimized for speed with ultra-low latency worldwide.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 rounded-2xl border border-border hover:border-primary/50 bg-card/50 hover:bg-card transition-all hover:shadow-lg hover:shadow-primary/5 space-y-4">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="w-7 h-7 text-cyan-600" />
              </div>
              <h3 className="font-bold text-lg">Multi-Device Sync</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Access conversations on phone, tablet, or desktop. Seamless synchronization everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-primary/5 border-y border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-primary">10K+</h3>
              <p className="text-muted-foreground">Active Users</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-primary">99.9%</h3>
              <p className="text-muted-foreground">Uptime</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-primary">150+</h3>
              <p className="text-muted-foreground">Countries</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-primary">24/7</h3>
              <p className="text-muted-foreground">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Join Millions Connecting Today
            </h2>
            <p className="text-xl text-muted-foreground">
              Experience the future of communication. No credit card required.
            </p>
          </div>
          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Link
              href="/auth/sign-up"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/40"
            >
              Start Free Now
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 border border-border rounded-xl font-semibold hover:bg-muted/50 transition-all"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-gradient-to-b from-card to-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-bold text-lg">Together</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The modern communication platform connecting people worldwide through instant messaging, crystal-clear calls, and secure sharing.
              </p>
              <div className="flex gap-3">
                <Link href="#" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/20 transition-colors flex items-center justify-center text-sm">
                  f
                </Link>
                <Link href="#" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/20 transition-colors flex items-center justify-center text-sm">
                  t
                </Link>
                <Link href="#" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/20 transition-colors flex items-center justify-center text-sm">
                  in
                </Link>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Security
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    API
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-primary transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Cookies
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
              <p>
                © 2024 Together, Inc. All rights reserved. Built with <span className="text-primary">♥</span> by{' '}
                <Link href="#" className="text-primary hover:underline font-semibold">
                  Sangam Kunwar
                </Link>
              </p>
              <div className="flex gap-4 text-xs">
                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-700">
                  Status: Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
