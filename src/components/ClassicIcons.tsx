import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 📁 Authentic Windows XP Classic 3D Manila Folder
export const XpFolderIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      {/* Folder Back Gradient */}
      <linearGradient id="xpBackFolder" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#d98918" />
        <stop offset="100%" stopColor="#9c5a08" />
      </linearGradient>
      {/* Folder Front Flap 3D Gradient */}
      <linearGradient id="xpFrontFlap" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffea75" />
        <stop offset="25%" stopColor="#fcc428" />
        <stop offset="70%" stopColor="#e5980e" />
        <stop offset="100%" stopColor="#bf7308" />
      </linearGradient>
      {/* Paper Sheet Gradient */}
      <linearGradient id="xpDocSheet" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#dbeafe" />
      </linearGradient>
      {/* Bottom Drop Shadow */}
      <radialGradient id="xpShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Drop shadow underneath */}
    <ellipse cx="12" cy="21.5" rx="9" ry="1.5" fill="url(#xpShadow)" />

    {/* Folder Back Plate */}
    <path
      d="M2.5 5C2.5 4.17 3.17 3.5 4 3.5H9C9.6 3.5 10.1 3.8 10.5 4.3L11.7 5.7C12.1 6.2 12.6 6.5 13.2 6.5H20C20.83 6.5 21.5 7.17 21.5 8V17.5C21.5 18.33 20.83 19 20 19H4C3.17 19 2.5 18.33 2.5 17.5V5Z"
      fill="url(#xpBackFolder)"
      stroke="#7c4304"
      strokeWidth="0.8"
    />

    {/* White Paper Inside folder */}
    <path
      d="M5 5H19V12H5V5Z"
      fill="url(#xpDocSheet)"
      stroke="#94a3b8"
      strokeWidth="0.6"
    />
    <line x1="7" y1="7" x2="14" y2="7" stroke="#3b82f6" strokeWidth="0.8" strokeLinecap="round" />
    <line x1="7" y1="9" x2="16" y2="9" stroke="#94a3b8" strokeWidth="0.8" strokeLinecap="round" />

    {/* Folder Front Pocket (Angled 3D Isometric Look) */}
    <path
      d="M2 9.2C2 8.3 2.7 7.5 3.6 7.5H20.4C21.3 7.5 22 8.3 22 9.2L20.8 18.2C20.7 18.9 20.1 19.5 19.4 19.5H3.6C2.9 19.5 2.3 18.9 2.2 18.2L2 9.2Z"
      fill="url(#xpFrontFlap)"
      stroke="#a35f08"
      strokeWidth="0.8"
    />

    {/* Glossy Top Edge Highlight */}
    <path
      d="M3.2 8.5H20.8"
      stroke="#ffffff"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

// 💾 Authentic Windows XP 3.5" Floppy Disk (Cobalt Blue with Metal Slider & Label)
export const XpFloppyIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpDiskBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="50%" stopColor="#1d4ed8" />
        <stop offset="100%" stopColor="#0f2b7a" />
      </linearGradient>
      <linearGradient id="xpMetalShutter" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="40%" stopColor="#e2e8f0" />
        <stop offset="70%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
    </defs>

    {/* Diskette Main Shell */}
    <path
      d="M3 3.5C3 2.67 3.67 2 4.5 2H18.5L21.5 5V20.5C21.5 21.33 20.83 22 20 22H4C3.17 22 2.5 21.33 2.5 20.5V3.5Z"
      fill="url(#xpDiskBody)"
      stroke="#0f172a"
      strokeWidth="0.8"
    />

    {/* Top Outer Highlight Rim */}
    <path d="M4 3H18L21 6" stroke="#60a5fa" strokeWidth="0.8" />

    {/* Silver Metal Shutter with Hole */}
    <rect x="6.5" y="2" width="11" height="8" rx="0.8" fill="url(#xpMetalShutter)" stroke="#475569" strokeWidth="0.6" />
    <rect x="13.5" y="3.5" width="2.5" height="4.5" rx="0.5" fill="#1e3a8a" />

    {/* White Paper Label with Pen Lines */}
    <rect x="5.5" y="12" width="13" height="9.5" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
    <line x1="7.5" y1="14.5" x2="16.5" y2="14.5" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="7.5" y1="17.5" x2="14.5" y2="17.5" stroke="#2563eb" strokeWidth="1" strokeLinecap="round" />

    {/* Write Protect Notch */}
    <rect x="18.5" y="19" width="1.5" height="2" fill="#091845" />
  </svg>
);

// 🖥️ Authentic Windows XP "My Computer" (CRT Monitor + Bliss Wallpaper + Beige Case)
export const XpComputerIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpBezel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f1f5f9" />
        <stop offset="60%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
      <linearGradient id="xpScreenSky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="55%" stopColor="#93c5fd" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>

    {/* Monitor Case */}
    <rect x="2.5" y="2.5" width="19" height="14" rx="2" fill="url(#xpBezel)" stroke="#475569" strokeWidth="0.8" />
    <rect x="3.2" y="3.2" width="17.6" height="1" fill="#ffffff" opacity="0.8" />

    {/* Glass Screen */}
    <rect x="4.5" y="4" width="15" height="10" rx="1.2" fill="url(#xpScreenSky)" stroke="#1e293b" strokeWidth="0.7" />
    
    {/* XP Bliss Green Hill inside monitor */}
    <path d="M4.5 10.5C7.5 9 11 11 14 9.5C16.5 8.2 18 9.5 19.5 10.5V14H4.5V10.5Z" fill="#15803d" />
    <path d="M4.5 12C8 10.5 12 12 16 11C18 10.5 19 11.2 19.5 11.8V14H4.5V12Z" fill="#16a34a" />

    {/* Power LED Indicator */}
    <circle cx="18" cy="14.8" r="0.6" fill="#22c55e" />

    {/* Stand & Base */}
    <path d="M9.5 16.5H14.5L15.5 19.5H8.5L9.5 16.5Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.7" />
    <rect x="6.5" y="19.5" width="11" height="2" rx="0.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.7" />
    <line x1="7" y1="20" x2="17" y2="20" stroke="#ffffff" strokeWidth="0.5" />
  </svg>
);

// ⚙️ Authentic Windows XP Control Panel (Interlocking Silver Gear & Brass Wrench)
export const XpSettingsIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpChromeGear" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#e2e8f0" />
        <stop offset="70%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="xpGoldWrench" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#9a3412" />
      </linearGradient>
    </defs>

    {/* Silver 3D Gear */}
    <circle cx="11" cy="11" r="7.5" fill="url(#xpChromeGear)" stroke="#334155" strokeWidth="0.8" />
    <circle cx="11" cy="11" r="3" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />

    {/* Gear Teeth */}
    <path
      d="M11 2V4.5M11 17.5V20M2 11H4.5M17.5 11H20M4.6 4.6L6.5 6.5M15.5 15.5L17.4 17.4M4.6 17.4L6.5 15.5M15.5 6.5L17.4 4.6"
      stroke="#475569"
      strokeWidth="2.6"
      strokeLinecap="round"
    />

    {/* Golden/Brass Wrench tool across */}
    <path
      d="M14 14L21 21C21.6 21.6 22.4 21.2 22.8 20.6C23.2 20 22.8 19.2 22.2 18.6L16 12"
      stroke="url(#xpGoldWrench)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <circle cx="14" cy="13" r="1.5" fill="#facc15" stroke="#854d0e" strokeWidth="0.6" />
  </svg>
);

// 📅 Authentic Windows XP Flip Desk Calendar (Red Header & White Sheet with Spiral Rings)
export const XpCalendarIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpRedHeader" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="30%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="xpWhitePad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
    </defs>

    {/* Pad Base */}
    <rect x="2.5" y="4" width="19" height="17.5" rx="2.5" fill="url(#xpWhitePad)" stroke="#64748b" strokeWidth="0.8" />
    
    {/* Red Top Bar */}
    <path d="M2.5 6.5C2.5 5.1 3.6 4 5 4H19C20.4 4 21.5 5.1 21.5 6.5V9.5H2.5V6.5Z" fill="url(#xpRedHeader)" stroke="#7f1d1d" strokeWidth="0.8" />
    <line x1="3" y1="4.8" x2="21" y2="4.8" stroke="#fca5a5" strokeWidth="0.6" />

    {/* Spiral Binder Rings */}
    <rect x="5.5" y="2.5" width="2" height="3.5" rx="1" fill="#e2e8f0" stroke="#334155" strokeWidth="0.6" />
    <rect x="11" y="2.5" width="2" height="3.5" rx="1" fill="#e2e8f0" stroke="#334155" strokeWidth="0.6" />
    <rect x="16.5" y="2.5" width="2" height="3.5" rx="1" fill="#e2e8f0" stroke="#334155" strokeWidth="0.6" />

    {/* Calendar Month Matrix Cells */}
    <rect x="5" y="11.5" width="3" height="2.5" rx="0.5" fill="#3b82f6" />
    <rect x="10.5" y="11.5" width="3" height="2.5" rx="0.5" fill="#93c5fd" />
    <rect x="16" y="11.5" width="3" height="2.5" rx="0.5" fill="#93c5fd" />

    <rect x="5" y="15.5" width="3" height="2.5" rx="0.5" fill="#93c5fd" />
    <rect x="10.5" y="15.5" width="3" height="2.5" rx="0.5" fill="#ef4444" />
    <rect x="16" y="15.5" width="3" height="2.5" rx="0.5" fill="#93c5fd" />
  </svg>
);

// 📄 Authentic Windows XP New Document with Green Plus Badge (+)
export const XpAddDocIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpPaperFill" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
      <radialGradient id="xpGreenBadge" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="40%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#14532d" />
      </radialGradient>
    </defs>

    {/* Document Body with Dog Ear */}
    <path
      d="M4 3.5C4 2.67 4.67 2 5.5 2H14.5L20 7.5V20.5C20 21.33 19.33 22 18.5 22H5.5C4.67 22 4 21.33 4 20.5V3.5Z"
      fill="url(#xpPaperFill)"
      stroke="#64748b"
      strokeWidth="0.8"
    />
    
    {/* Folded Corner */}
    <path d="M14.5 2V7C14.5 7.55 14.95 8 15.5 8H20" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />

    {/* Text Lines */}
    <line x1="7" y1="6" x2="11.5" y2="6" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="7" y1="9.5" x2="15" y2="9.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="7" y1="13" x2="13" y2="13" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="7" y1="16.5" x2="11" y2="16.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />

    {/* Green Glossy Plus Badge */}
    <circle cx="17.5" cy="17.5" r="5" fill="url(#xpGreenBadge)" stroke="#ffffff" strokeWidth="1.2" />
    <path d="M17.5 14.8V20.2M14.8 17.5H20.2" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// 🔍 Authentic Windows XP Magnifying Glass (Search)
export const XpSearchIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpRimChrome" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      <radialGradient id="xpLensShine" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#f0f9ff" />
        <stop offset="50%" stopColor="#bae6fd" />
        <stop offset="100%" stopColor="#38bdf8" />
      </radialGradient>
      <linearGradient id="xpWoodHandle" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="50%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
    </defs>

    {/* Glass Lens */}
    <circle cx="10" cy="10" r="7.5" fill="url(#xpLensShine)" stroke="url(#xpRimChrome)" strokeWidth="2.2" />
    {/* Reflection Highlight Curve */}
    <path d="M6 7C7.2 5.5 9 5 11 5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />

    {/* Wooden handle with gold band */}
    <line x1="15.5" y1="15.5" x2="21.5" y2="21.5" stroke="url(#xpWoodHandle)" strokeWidth="3.8" strokeLinecap="round" />
    <line x1="14.8" y1="14.8" x2="16.5" y2="16.5" stroke="#facc15" strokeWidth="3.8" strokeLinecap="round" />
  </svg>
);

// 🔑 Authentic Windows XP Golden Brass Key
export const XpKeyIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpKeyGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="35%" stopColor="#facc15" />
        <stop offset="75%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>

    {/* Key Bow */}
    <circle cx="7.5" cy="7.5" r="5.5" fill="url(#xpKeyGold)" stroke="#78350f" strokeWidth="0.8" />
    <circle cx="7.5" cy="7.5" r="2.2" fill="#fafafa" stroke="#78350f" strokeWidth="0.6" />

    {/* Key Shaft */}
    <path d="M11.5 11.5L21.5 21.5" stroke="url(#xpKeyGold)" strokeWidth="3" strokeLinecap="round" />
    {/* Key Teeth */}
    <path d="M16 16L18.5 13.5M19 19L21.5 16.5" stroke="url(#xpKeyGold)" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// 🗑️ Authentic Windows XP Recycle Bin (Classic Silver Wire Mesh with Crumpled Sheets)
export const XpTrashIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpBinRim" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>

    {/* Top Elliptical Rim */}
    <ellipse cx="12" cy="5" rx="8" ry="2.5" fill="url(#xpBinRim)" stroke="#334155" strokeWidth="0.8" />

    {/* Mesh Body */}
    <path
      d="M4.5 5.5L7 20C7.2 21 8.5 21.8 12 21.8C15.5 21.8 16.8 21 17 20L19.5 5.5"
      fill="#e2e8f0"
      stroke="#334155"
      strokeWidth="0.8"
    />

    {/* Wire mesh lines */}
    <line x1="8.5" y1="6" x2="9.5" y2="21" stroke="#94a3b8" strokeWidth="0.8" />
    <line x1="12" y1="7" x2="12" y2="21.5" stroke="#94a3b8" strokeWidth="0.8" />
    <line x1="15.5" y1="6" x2="14.5" y2="21" stroke="#94a3b8" strokeWidth="0.8" />
    <ellipse cx="12" cy="13" rx="6.2" ry="1.5" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
  </svg>
);

// 🏢 Authentic Windows XP Office / Company Building
export const XpBuildingIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpBldgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>

    <rect x="4" y="3" width="16" height="19" rx="1.5" fill="url(#xpBldgGradient)" stroke="#1e3a8a" strokeWidth="0.8" />

    {/* Window Grid with Light Reflection */}
    <rect x="6.5" y="5.5" width="2.8" height="2.8" rx="0.4" fill="#ffffff" />
    <rect x="10.5" y="5.5" width="2.8" height="2.8" rx="0.4" fill="#ffffff" />
    <rect x="14.5" y="5.5" width="2.8" height="2.8" rx="0.4" fill="#fef08a" />

    <rect x="6.5" y="9.5" width="2.8" height="2.8" rx="0.4" fill="#fef08a" />
    <rect x="10.5" y="9.5" width="2.8" height="2.8" rx="0.4" fill="#ffffff" />
    <rect x="14.5" y="9.5" width="2.8" height="2.8" rx="0.4" fill="#ffffff" />

    <rect x="6.5" y="13.5" width="2.8" height="2.8" rx="0.4" fill="#ffffff" />
    <rect x="10.5" y="13.5" width="2.8" height="2.8" rx="0.4" fill="#ffffff" />
    <rect x="14.5" y="13.5" width="2.8" height="2.8" rx="0.4" fill="#fef08a" />

    {/* Entrance Door */}
    <rect x="9.5" y="18" width="5" height="4" rx="0.5" fill="#0f172a" />
  </svg>
);

// 🛡️ Authentic Windows XP Blue Security Shield
export const XpShieldIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpShieldFill" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="40%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
      fill="url(#xpShieldFill)"
      stroke="#0c4a6e"
      strokeWidth="0.8"
    />
    <path
      d="M12 4L6 7V11.5C6 15.5 8.5 19 12 20C15.5 19 18 15.5 18 11.5V7L12 4Z"
      fill="none"
      stroke="#bae6fd"
      strokeWidth="0.8"
    />
    <path
      d="M9 11.5L11 13.5L15 9.5"
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 🚪 Authentic Windows XP Classic Red Power / Shut Down Button
export const XpLogoffIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <radialGradient id="xpRedPower" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="40%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="9.5" fill="url(#xpRedPower)" stroke="#7f1d1d" strokeWidth="0.8" />
    <path d="M12 6.5V12" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    <path
      d="M8.5 8.5C7 10 6.5 12 7 14C7.8 16.5 10 17.5 12 17.5C14 17.5 16.2 16.5 17 14C17.5 12 17 10 15.5 8.5"
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

// ✏️ Authentic Windows XP Yellow Pencil with Pink Eraser
export const XpEditIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpPencilBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    {/* Body */}
    <path d="M17 3L21 7L8 20L4 21L5 17L17 3Z" fill="url(#xpPencilBody)" stroke="#713f12" strokeWidth="0.8" />
    {/* Eraser */}
    <path d="M17 3L21 7L19.5 8.5L15.5 4.5L17 3Z" fill="#f472b6" stroke="#db2777" strokeWidth="0.6" />
    {/* Ferrule */}
    <path d="M15.5 4.5L19.5 8.5L18.5 9.5L14.5 5.5L15.5 4.5Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
    {/* Lead Tip */}
    <polygon points="4,21 6,20 5,19" fill="#1e293b" />
  </svg>
);

// 🟢 Authentic Windows XP 3D Aqua/Luna Glossy Spheres (Status)
export const XpStatusSphere: React.FC<{ status: 'completed' | 'in_progress' | 'pending'; size?: number }> = ({ status, size = 12 }) => {
  if (status === 'completed') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="inline-block shrink-0">
        <defs>
          <radialGradient id="xpAquaGreen" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="35%" stopColor="#22c55e" />
            <stop offset="80%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#14532d" />
          </radialGradient>
        </defs>
        <circle cx="8" cy="8" r="7" fill="url(#xpAquaGreen)" stroke="#14532d" strokeWidth="0.8" />
        {/* Glass reflection bubble */}
        <ellipse cx="6" cy="5" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.75" />
      </svg>
    );
  }
  if (status === 'in_progress') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="inline-block shrink-0">
        <defs>
          <radialGradient id="xpAquaBlue" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="35%" stopColor="#0284c7" />
            <stop offset="80%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#082f49" />
          </radialGradient>
        </defs>
        <circle cx="8" cy="8" r="7" fill="url(#xpAquaBlue)" stroke="#0c4a6e" strokeWidth="0.8" />
        <ellipse cx="6" cy="5" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.75" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="inline-block shrink-0">
      <defs>
        <radialGradient id="xpAquaAmber" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="80%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
      <circle cx="8" cy="8" r="7" fill="url(#xpAquaAmber)" stroke="#78350f" strokeWidth="0.8" />
      <ellipse cx="6" cy="5" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.75" />
    </svg>
  );
};

// ☀️ Windows XP Classic 3D Golden Sun Icon (Light Mode)
export const XpSunIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <radialGradient id="xpSunCenter" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fffbeb" />
        <stop offset="25%" stopColor="#fde047" />
        <stop offset="70%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </radialGradient>
      <linearGradient id="xpSunRay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    {/* Sun Rays with 3D feel */}
    <path d="M12 1.5V4.5M12 19.5V22.5M1.5 12H4.5M19.5 12H22.5" stroke="url(#xpSunRay)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M4.6 4.6L6.8 6.8M17.2 17.2L19.4 19.4M4.6 19.4L6.8 17.2M17.2 6.8L19.4 4.6" stroke="url(#xpSunRay)" strokeWidth="2.2" strokeLinecap="round" />
    {/* Core Sun Ball */}
    <circle cx="12" cy="12" r="5.5" fill="url(#xpSunCenter)" stroke="#b45309" strokeWidth="0.8" />
    {/* Specular Bubble */}
    <ellipse cx="10" cy="9.5" rx="2" ry="1.2" fill="#ffffff" opacity="0.8" />
  </svg>
);

// 🌙 Windows XP Classic 3D Glowing Crescent Moon & Stars (Dark Mode)
export const XpMoonIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="xpMoonGrad" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="35%" stopColor="#facc15" />
        <stop offset="75%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <radialGradient id="xpMoonGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Soft celestial aura */}
    <circle cx="12" cy="12" r="9" fill="url(#xpMoonGlow)" />
    {/* Crescent Moon */}
    <path
      d="M19.5 13.8C18.8 17.8 15.2 20.8 11 20.8C6.1 20.8 2.2 16.9 2.2 12C2.2 7.8 5.2 4.2 9.2 3.5C8.3 4.9 7.8 6.5 7.8 8.3C7.8 13.1 11.7 17 16.5 17C17.6 17 18.6 16.6 19.5 16V13.8Z"
      fill="url(#xpMoonGrad)"
      stroke="#854d0e"
      strokeWidth="0.8"
    />
    {/* Shiny highlight */}
    <path
      d="M7 6C5 8 4 10.5 4 13"
      stroke="#ffffff"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.75"
    />
    {/* Sparkling 4-point Star 1 */}
    <path
      d="M17 4L17.7 5.5L19.2 6.2L17.7 6.9L17 8.4L16.3 6.9L14.8 6.2L16.3 5.5Z"
      fill="#ffffff"
      stroke="#60a5fa"
      strokeWidth="0.4"
    />
    {/* Sparkle 2 */}
    <circle cx="21" cy="10" r="1.2" fill="#bfdbfe" />
  </svg>
);

// Aliases for seamless backwards compatibility
export const Win95FolderIcon = XpFolderIcon;
export const Win95FloppyIcon = XpFloppyIcon;
export const Win95ComputerIcon = XpComputerIcon;
export const Win95SettingsIcon = XpSettingsIcon;
export const Win95CalendarIcon = XpCalendarIcon;
export const Win95AddDocIcon = XpAddDocIcon;
export const Win95SearchIcon = XpSearchIcon;
export const Win95KeyIcon = XpKeyIcon;
export const Win95TrashIcon = XpTrashIcon;
export const Win95BuildingIcon = XpBuildingIcon;
export const Win95ShieldIcon = XpShieldIcon;
export const Win95LogoffIcon = XpLogoffIcon;
export const Win95EditIcon = XpEditIcon;
export const Win95StatusSphere = XpStatusSphere;
