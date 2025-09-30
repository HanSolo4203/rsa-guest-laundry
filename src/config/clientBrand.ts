export const tradeHotelBrand = {
  companyName: "The Trade Hotel",
  tagline: "A Boutique Hotel In Cape Town CBD",
  
  colors: {
    // Primary colors - use these for main CTAs and accents
    primary: "#2B5F44",        // Deep green (from green rooms)
    secondary: "#D4AF37",      // Gold/brass accent
    accent: "#E85D75",         // Coral pink (from pink rooms)
    
    // Supporting colors
    blue: "#4A90A4",           // Teal blue (from blue rooms)
    green: "#84A98C",          // Sage green
    pink: "#F4C2C2",           // Soft pink
    
    // Neutrals
    background: "#FFFFFF",     // White
    backgroundAlt: "#F8F6F3",  // Warm off-white
    text: "#2F2F2F",           // Charcoal
    textLight: "#6B6B6B",      // Gray
  },
  
  typography: {
    // Based on their clean, modern aesthetic
    headingFont: "'Inter', 'Helvetica Neue', sans-serif",
    bodyFont: "'Inter', 'Helvetica Neue', sans-serif",
    fontWeights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  spacing: {
    base: "16px",
    section: "80px",
    sectionMobile: "48px",
  },
  
  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "12px",
  },
  
  personality: {
    style: "quirky-luxury",
    tone: "friendly-conversational",
    approach: "bold-colorful",
  },
};

export type BrandConfig = typeof tradeHotelBrand;
