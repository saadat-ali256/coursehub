import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import CommunityShortcut from "@/components/CommunityShortcut";
import NotificationCenter from "@/components/NotificationCenter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "CourseHub — Learn. Build. Grow.",
  description: "A premium modern learning platform for practical skills.",
};

const cleanExtensionScript = `
(function() {
  var ATTRS = ['bis_skin_checked', 'bis_register', 'cz-shortcut-listen'];
  function clean(node) {
    if (!node || node.nodeType !== 1) return;
    for (var i = 0; i < ATTRS.length; i++) {
      if (node.hasAttribute && node.hasAttribute(ATTRS[i])) {
        node.removeAttribute(ATTRS[i]);
      }
    }
    if (node.querySelectorAll) {
      try {
        var selector = ATTRS.map(function(a) { return '[' + a + ']'; }).join(',');
        var matches = node.querySelectorAll(selector);
        for (var j = 0; j < matches.length; j++) {
          for (var k = 0; k < ATTRS.length; k++) {
            matches[j].removeAttribute(ATTRS[k]);
          }
        }
      } catch (e) {}
    }
  }

  try {
    var origSet = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, val) {
      if (name === 'bis_skin_checked' || name === 'bis_register' || name === 'cz-shortcut-listen') {
        return;
      }
      return origSet.apply(this, arguments);
    };
  } catch (e) {}

  try {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') {
          if (m.attributeName && (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register' || m.attributeName === 'cz-shortcut-listen')) {
            try { m.target.removeAttribute(m.attributeName); } catch (e) {}
          }
        } else if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            clean(m.addedNodes[j]);
          }
        }
      }
    });

    if (document.documentElement) {
      clean(document.documentElement);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ATTRS,
        childList: true,
        subtree: true
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', function() {
        clean(document.body || document.documentElement);
      });
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: cleanExtensionScript,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider>
          {children}
          <NotificationCenter />
          <CommunityShortcut />
        </ClerkProvider>
      </body>
    </html>
  );
}
