export const LEGAL_LAST_UPDATED = "August 24, 2026";
export const LEGAL_CONTACT_EMAIL = "hello@slomarketplace.com";
export const LEGAL_ENTITY = "SLO Market";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Agreement",
    paragraphs: [
      `By creating an account, listing an item, buying, selling, messaging other users, or otherwise using slomarketplace.com and related services (the "Platform"), you agree to these Terms of Service, our Privacy Policy, Community Safety Guidelines, and—if you sell food or produce—our Food & Produce Seller Policy.`,
      "If you do not agree, do not use the Platform.",
    ],
  },
  {
    title: "2. What SLO Market is (and is not)",
    paragraphs: [
      `${LEGAL_ENTITY} is an online marketplace that helps people in San Luis Obispo County connect to buy and sell locally.`,
      "We are not a seller, buyer, broker, agent, escrow service, insurer, inspector, or guarantor of listed items. We do not own, possess, ship, inspect, test, certify, or guarantee products listed by users.",
      "Except where we facilitate payment processing through Stripe, each transaction is directly between the buyer and seller.",
    ],
  },
  {
    title: "3. Eligibility",
    paragraphs: [
      "You must be at least 18 years old and able to enter a binding contract. You represent that the information you provide is accurate and that you will keep it up to date.",
      "You may not create multiple accounts to evade enforcement, mislead other users, or abuse the Platform.",
    ],
  },
  {
    title: "4. Accounts and security",
    paragraphs: [
      "You are responsible for your login credentials and for all activity under your account. Notify us promptly if you believe your account has been compromised.",
      "We may suspend or terminate accounts that violate these Terms, create risk for other users, or are required to be restricted by law or payment partners.",
    ],
  },
  {
    title: "5. Listings and seller responsibilities",
    paragraphs: ["If you list items for sale, you agree that you:"],
    bullets: [
      "Own the item or have legal authority to sell it",
      "Provide accurate titles, descriptions, photos, prices, condition, and availability",
      "Comply with all applicable federal, California, and San Luis Obispo County laws",
      "Honor stated pickup, delivery, and pricing terms",
      "Remove or update listings that are sold, inaccurate, or no longer available",
    ],
  },
  {
    title: "6. Food, produce, garage sales, and photo stands",
    paragraphs: [
      "Sellers must complete Local Food & Produce Seller verification before listing food or produce. Food sellers are solely responsible for permits, registrations, labeling, allergens, and food safety. See our Food & Produce Seller Policy.",
      "Garage sales, yard sales, and produce stands may use photo tagging so buyers can select items from a single image. Each tagged item is treated as a separate listing, and the seller is responsible for the accuracy and availability of every tagged item.",
      "Service listings and wanted posts are informational. Service providers are independent users, not employees or agents of SLO Market.",
    ],
  },
  {
    title: "7. Prohibited conduct and items",
    paragraphs: [
      "You may not use the Platform to list prohibited items, post fraudulent or misleading listings, harass or threaten others, discriminate unlawfully, circumvent marketplace fees by moving paid transactions off-platform, scrape or disrupt the Platform, or infringe intellectual property rights.",
      "See our Community Safety Guidelines for examples of prohibited items and conduct. We may remove listings, delay or withhold payouts, suspend accounts, or report activity to authorities.",
    ],
  },
  {
    title: "8. Payments, fees, and Stripe Connect",
    paragraphs: [
      "Basic listings are free. Optional Enhanced Description is a separate paid feature, currently $1 per use.",
      "Paid marketplace checkout is processed by Stripe through Stripe Connect. Sellers must complete Stripe onboarding to receive payouts for online sales.",
      "SLO Market collects a 12% platform commission on applicable completed sales through Stripe application fees, unless a different rate is clearly disclosed at checkout.",
      "Stripe processing fees are handled according to Stripe Connect terms and are generally billed to the seller's connected account.",
      "We are not a bank or money transmitter. Payment timing, holds, chargebacks, and identity verification are subject to Stripe policies and applicable law.",
    ],
  },
  {
    title: "9. Orders, pickup, delivery, and completion",
    paragraphs: [
      "Buyers and sellers arrange pickup or local delivery through Platform messaging unless otherwise agreed. Only your selected city is shown publicly—not your home address.",
      "Inspect items before completing a transaction whenever possible. SLO Market does not guarantee item quality, legality, safety, or that any user will complete a transaction.",
      "When paying online, use the Platform checkout system. Arrangements made outside the Platform are at your own risk.",
    ],
  },
  {
    title: "10. Cancellations, refunds, and disputes",
    paragraphs: [
      "Refunds may be issued by sellers or administrators where supported through Stripe, depending on order status and payment state.",
      "Users may open disputes through Platform tools. We may review listings, orders, and messages to help resolve disputes but do not guarantee any particular outcome.",
      "Chargebacks initiated by payment providers may result in account restrictions or recovery from seller payouts where permitted by Stripe and law.",
    ],
  },
  {
    title: "11. Reviews and messaging",
    paragraphs: [
      "Reviews must be honest and related to a genuine transaction or interaction. We may hide or remove abusive, false, retaliatory, or off-topic reviews.",
      "Messages and related content may be stored and reviewed for safety, fraud prevention, customer support, and dispute resolution.",
    ],
  },
  {
    title: "12. Intellectual property",
    paragraphs: [
      "You retain ownership of content you post, but grant SLO Market a non-exclusive, royalty-free, worldwide license to host, display, reproduce, and promote your listings and related content on the Platform and in reasonable marketing for the Platform.",
      "Do not post content you do not have the right to use. SLO Market name, branding, and site design are our property.",
    ],
  },
  {
    title: "13. Disclaimers",
    paragraphs: [
      'THE PLATFORM AND ALL LISTINGS ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, SLO MARKET DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      "We do not warrant that listings are accurate, legal, safe, or that users will perform as promised.",
    ],
  },
  {
    title: "14. Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY CALIFORNIA LAW, SLO MARKET AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS, AND AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR PERSONAL INJURY ARISING FROM ITEMS BOUGHT OR SOLD THROUGH THE PLATFORM, FOOD-BORNE ILLNESS OR ALLERGIC REACTIONS, IN-PERSON MEETINGS, PICKUP OR DELIVERY, USER CONDUCT, OR PAYMENT PROCESSING ERRORS OR DELAYS.",
      "OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE PLATFORM WILL NOT EXCEED THE GREATER OF (A) ONE HUNDRED DOLLARS ($100) OR (B) THE FEES YOU PAID TO SLO MARKET IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.",
      "Some jurisdictions do not allow certain limitations; in those cases, our limits apply to the fullest extent permitted by law.",
    ],
  },
  {
    title: "15. Indemnification",
    paragraphs: [
      "You agree to defend, indemnify, and hold harmless SLO Market from claims, damages, fines, losses, and expenses (including reasonable attorneys' fees) arising from your listings, products, services, conduct, violation of law, violation of these Terms, or infringement or misrepresentation.",
    ],
  },
  {
    title: "16. Release",
    paragraphs: [
      "To the extent permitted by law, you release SLO Market from claims and damages arising from disputes with other users, except where SLO Market's own negligence or willful misconduct caused the harm and such release is not permitted by law.",
    ],
  },
  {
    title: "17. Termination",
    paragraphs: [
      "You may stop using the Platform at any time. We may suspend or terminate access for violations, risk, legal requirements, or non-compliance with payment partner rules.",
      "Sections that by their nature should survive termination—including payment obligations, disclaimers, limitation of liability, indemnification, and governing law—will survive.",
    ],
  },
  {
    title: "18. Changes to these Terms",
    paragraphs: [
      "We may update these Terms by posting a revised version with a new Last updated date. Material changes may require renewed acceptance where required by law. Continued use after changes become effective constitutes acceptance where permitted.",
    ],
  },
  {
    title: "19. Governing law and venue",
    paragraphs: [
      "These Terms are governed by the laws of the State of California, without regard to conflict-of-law rules.",
      "Except where prohibited by law, you agree that exclusive venue for disputes relating to these Terms or the Platform will be in the state or federal courts located in San Luis Obispo County, California.",
    ],
  },
  {
    title: "20. Contact",
    paragraphs: [
      `Questions about these Terms: ${LEGAL_CONTACT_EMAIL}`,
      "These Terms are a template tailored to SLO Market and should be reviewed by qualified legal counsel before being treated as final.",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "1. Overview",
    paragraphs: [
      `${LEGAL_ENTITY} ("SLO Market," "we," "us") respects your privacy. This Privacy Policy explains what information we collect, how we use it, and your choices.`,
      "By using the Platform, you agree to this Privacy Policy.",
    ],
  },
  {
    title: "2. Information we collect",
    paragraphs: ["We may collect:"],
    bullets: [
      "Account information: name, email address, password hash, profile photo, city, phone number if provided, and bio",
      "Listing and transaction information: listings, photos, prices, orders, reviews, favorites, and messages",
      "Food seller verification information: business name, permit details, certifications, and uploaded documents you choose to provide",
      "Payment-related information: Stripe account identifiers and transaction metadata. We do not store full credit card numbers",
      "Safety and support information: reports, disputes, and communications with us",
      "Technical information: IP address, browser type, device information, and cookies or similar technologies",
    ],
  },
  {
    title: "3. How we use information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Operate, maintain, and improve the Platform",
      "Process payments through Stripe and facilitate marketplace transactions",
      "Communicate with you about your account, orders, and Platform updates",
      "Promote safety, prevent fraud, enforce our Terms, and resolve disputes",
      "Comply with legal obligations and respond to lawful requests",
    ],
  },
  {
    title: "4. How we share information",
    paragraphs: [
      "We share information with service providers that help us operate the Platform, including payment processing (Stripe), hosting, email delivery, and analytics providers, only as needed to provide the service.",
      "Other users can see information you choose to make public, such as your display name, city, listings, reviews, and public profile details.",
      "We may disclose information if required by law, to protect rights and safety, or in connection with a merger, sale, or reorganization.",
      "We do not sell your personal information.",
    ],
  },
  {
    title: "5. Stripe and third-party sign-in",
    paragraphs: [
      "Payments are processed by Stripe. Stripe's privacy policy governs payment data it collects: https://stripe.com/privacy",
      "If you sign in with Google or another third-party provider, we receive information according to your settings with that provider and their policies.",
    ],
  },
  {
    title: "6. Location and address information",
    paragraphs: [
      "We ask for your city to show listings locally. Your exact home address is not required for basic use and is not displayed publicly on standard listings.",
      "Pickup and delivery arrangements should be made carefully through Platform messaging.",
    ],
  },
  {
    title: "7. Data retention",
    paragraphs: [
      "We retain account and transaction information while your account is active and for a reasonable period afterward for legal, tax, fraud-prevention, and dispute-resolution purposes.",
      "We may retain certain records even after account deletion where required by law or legitimate business need.",
    ],
  },
  {
    title: "8. Security",
    paragraphs: [
      "We use reasonable administrative, technical, and organizational measures designed to protect information. No method of transmission or storage is completely secure.",
    ],
  },
  {
    title: "9. Your California privacy rights",
    paragraphs: [
      "If you are a California resident, you may have rights to know, access, delete, and correct personal information, and to opt out of certain sharing. Because we do not sell personal information, opt-out of sale may not apply.",
      `To make a privacy request, contact ${LEGAL_CONTACT_EMAIL}. We may need to verify your identity before responding.`,
    ],
  },
  {
    title: "10. Children",
    paragraphs: [
      "The Platform is not directed to children under 13, and we do not knowingly collect personal information from children under 13.",
    ],
  },
  {
    title: "11. Changes",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The Last updated date at the top will reflect the latest version.",
    ],
  },
  {
    title: "12. Contact",
    paragraphs: [
      `Privacy questions or requests: ${LEGAL_CONTACT_EMAIL}`,
      "This Privacy Policy should be reviewed by qualified legal counsel before being treated as final.",
    ],
  },
];

export const FOOD_POLICY_SECTIONS: LegalSection[] = [
  {
    title: "1. Scope",
    paragraphs: [
      "This Food & Produce Seller Policy applies to users who activate Local Food & Produce Seller status on SLO Market.",
      "It supplements our Terms of Service and Community Safety Guidelines.",
    ],
  },
  {
    title: "2. Platform role",
    paragraphs: [
      "SLO Market does not grow, manufacture, prepare, inspect, test, certify, or guarantee food or produce sold by users.",
      "Sellers are solely responsible for the legality, safety, quality, labeling, and compliance of their products.",
    ],
  },
  {
    title: "3. Legal compliance",
    paragraphs: [
      "Sellers must comply with all applicable California and San Luis Obispo County laws, including agricultural sales rules and California Cottage Food Operations requirements.",
      "San Luis Obispo County Environmental Health handles food registration and permitting. Class A registration generally covers direct sales to consumers; Class B permits cover direct and indirect sales.",
      "SLO Market does not process County registrations or verify permits with government agencies.",
    ],
  },
  {
    title: "4. Verification and accuracy",
    paragraphs: [
      "Completing Local Food & Produce Seller verification means you attest that your information is accurate and truthful.",
      "Providing false or misleading information may result in removal of listings, suspension, or termination of your account.",
      "We may store the policy version and certification timestamps associated with your verification.",
    ],
  },
  {
    title: "5. Listing requirements",
    paragraphs: ["When listing food or produce, you agree that you will:"],
    bullets: [
      "Accurately describe products, including fresh produce, honey, jam, pickled goods, and similar items",
      "Provide permit or registration details when applicable, especially for packaged or preserved foods",
      "Not list foods that require refrigeration, contain prohibited ingredients, or require permits you do not hold",
      "Provide accurate ingredient, allergen, and labeling information whenever required by law",
      "Remove products immediately if you learn they do not comply with applicable requirements",
    ],
  },
  {
    title: "6. Produce stand photos",
    paragraphs: [
      "Produce stands may use photo tagging so buyers can select items from a stand image. Each tagged item must be accurately described, priced, and available.",
      "The seller is responsible for every tagged item, just as with individual listings.",
    ],
  },
  {
    title: "7. Buyer responsibility",
    paragraphs: [
      "Buyers should inspect produce and packaged foods before consuming or completing a transaction.",
      "Buyers with allergies or dietary restrictions should ask sellers directly about ingredients and handling.",
      "Report suspected unsafe or non-compliant listings through the Platform reporting tools.",
    ],
  },
];

export const SAFETY_GUIDELINES: string[] = [
  "Meet in a safe, public location when possible.",
  "Tell a friend or family member where you are going for local pickup or delivery.",
  "Inspect items carefully before paying or accepting them.",
  "Use SLO Market messaging to coordinate details instead of sharing unnecessary personal information.",
  "Use Platform checkout for online payments on listed items when payment is required.",
  "Be cautious of requests to pay outside the Platform for items originally listed here.",
  "Trust your instincts. If something feels wrong, walk away and report the listing or user.",
  "Do not share passwords, verification codes, or financial account details in messages.",
];
