export type BlogBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  keywords: string[];
  category: string;
  publishedAt: string;
  readTimeMinutes: number;
  author: string;
  coverImage: string;
  blocks: BlogBlock[];
}

export const BLOG_HERO_IMAGE = "/blog/hero.svg";

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-split-bills-with-friends-fairly",
    title: "How to Split Bills with Friends Fairly (Complete Guide)",
    excerpt:
      "Learn the best ways to split bills with friends using equal splits, custom amounts, and a free expense splitter app — without awkward money conversations.",
    keywords: [
      "split bills with friends",
      "how to split bills fairly",
      "bill splitting guide",
      "group expense tips",
      "expense splitter",
    ],
    category: "Guides",
    publishedAt: "2025-03-15",
    readTimeMinutes: 6,
    author: "BillBuddy Team",
    coverImage: "/blog/covers/split-bills-friends.svg",
    blocks: [
      {
        type: "p",
        text: "Splitting bills with friends sounds simple until someone pays for dinner, another covers the cab, and nobody remembers who owes what. A clear system — and the right expense splitter app — keeps friendships intact and math honest.",
      },
      {
        type: "h2",
        text: "Why fair bill splitting matters",
      },
      {
        type: "p",
        text: "Money is one of the top sources of tension in friend groups, roommate situations, and travel parties. Transparent expense tracking removes guesswork. Everyone sees the same numbers, which builds trust and prevents resentment from building up over time.",
      },
      {
        type: "h2",
        text: "Three popular ways to split expenses",
      },
      {
        type: "ul",
        items: [
          "Equal split — divide the total evenly among everyone who participated. Best for shared meals, groceries, or fixed group costs.",
          "Custom split — assign specific amounts when people ordered different items or used something unequally. Ideal for varied restaurant bills.",
          "Payer-first tracking — record who paid upfront, then calculate each person's share afterward. Works for trips where one person books hotels or flights.",
        ],
      },
      {
        type: "h2",
        text: "Step-by-step: split a bill in under 2 minutes",
      },
      {
        type: "ul",
        items: [
          "Create a group in BillBuddy for your trip, dinner, or household.",
          "Add the expense with the total amount, date, and who paid.",
          "Select participants and choose equal or custom split.",
          "Let the app calculate balances automatically — no spreadsheet needed.",
          "Settle up when ready via UPI, cash, or bank transfer and record the payment.",
        ],
      },
      {
        type: "h2",
        text: "Common mistakes to avoid",
      },
      {
        type: "p",
        text: "Waiting until the end of a trip to log expenses leads to forgotten receipts and disputes. Log costs as they happen. Also avoid informal IOU lists in chat apps — they get buried and are hard to reconcile. Use a dedicated group expense tracker instead.",
      },
    ],
  },
  {
    slug: "roommate-expense-tracker-guide",
    title: "Roommate Expense Tracker: Split Rent, Utilities & Groceries",
    excerpt:
      "A practical guide to tracking shared apartment costs with roommates — rent, utilities, groceries, and household bills using a free expense sharing app.",
    keywords: [
      "roommate expense tracker",
      "split rent with roommates",
      "shared apartment expenses",
      "household expense tracker",
      "roommate bill split",
    ],
    category: "Roommates",
    publishedAt: "2025-04-02",
    readTimeMinutes: 5,
    author: "BillBuddy Team",
    coverImage: "/blog/covers/roommates.svg",
    blocks: [
      {
        type: "p",
        text: "Living with roommates means shared rent, electricity, Wi-Fi, groceries, and occasional furniture purchases. Without a roommate expense tracker, small costs pile up and someone always feels they paid more than their fair share.",
      },
      {
        type: "h2",
        text: "What to track in a shared apartment",
      },
      {
        type: "ul",
        items: [
          "Monthly rent and maintenance fees",
          "Electricity, gas, water, and internet bills",
          "Shared groceries and cleaning supplies",
          "One-time purchases like furniture or appliances",
          "Guest-related costs if you agree to split them",
        ],
      },
      {
        type: "h2",
        text: "Set up a household group",
      },
      {
        type: "p",
        text: "Create a private group in BillBuddy for your apartment. Add all roommates, then log every shared expense as it occurs. Assign the payer and split equally or by room size if that is your agreement. The app shows each person's net balance in real time.",
      },
      {
        type: "h2",
        text: "Monthly settle-up routine",
      },
      {
        type: "p",
        text: "Pick one day each month to review balances and settle up. Record UPI or bank transfers inside the app so you have a payment history. This monthly habit prevents small debts from snowballing into bigger conflicts.",
      },
    ],
  },
  {
    slug: "trip-expense-splitting-guide",
    title: "Trip Expense Splitting: Track Group Travel Costs Easily",
    excerpt:
      "Planning a group vacation? Learn how to split travel expenses for flights, hotels, food, and activities with a trip expense splitter app.",
    keywords: [
      "trip expense splitter",
      "group travel expenses",
      "vacation expense tracker",
      "split travel costs",
      "group trip budget",
    ],
    category: "Travel",
    publishedAt: "2025-05-10",
    readTimeMinutes: 7,
    author: "BillBuddy Team",
    coverImage: "/blog/covers/travel.svg",
    blocks: [
      {
        type: "p",
        text: "Group trips are unforgettable — until it is time to figure out who paid for the Airbnb, train tickets, and that group dinner. A trip expense splitter keeps the focus on memories, not math.",
      },
      {
        type: "h2",
        text: "Categories to track on group trips",
      },
      {
        type: "ul",
        items: [
          "Transportation — flights, trains, cabs, fuel",
          "Accommodation — hotels, Airbnb, camping fees",
          "Food and drinks — restaurants, groceries, snacks",
          "Activities — tours, tickets, equipment rentals",
          "Emergency or misc costs — pharmacy, tips, parking",
        ],
      },
      {
        type: "h2",
        text: "Log expenses during the trip, not after",
      },
      {
        type: "p",
        text: "The biggest mistake groups make is waiting until they get home. Receipts get lost and memories fade. Add each expense to your BillBuddy travel group the same day it happens. Snap a photo of the receipt and use AI autofill to save time.",
      },
      {
        type: "h2",
        text: "Handling different spending styles",
      },
      {
        type: "p",
        text: "Not everyone spends the same on optional activities — and that is okay. Use custom splits when only some people join an excursion. Use equal splits for shared accommodation and group meals everyone attended.",
      },
    ],
  },
  {
    slug: "upi-bill-split-india-guide",
    title: "UPI Bill Split India: Settle Group Expenses the Smart Way",
    excerpt:
      "How to split bills using UPI in India — track group hisab, record UPI payments, and settle up with friends using an INR expense tracker app.",
    keywords: [
      "UPI bill split India",
      "UPI expense split",
      "hisab karo app",
      "INR expense tracker",
      "India bill splitter",
      "split bills UPI",
    ],
    category: "India",
    publishedAt: "2025-06-01",
    readTimeMinutes: 5,
    author: "BillBuddy Team",
    coverImage: "/blog/covers/upi-india.svg",
    blocks: [
      {
        type: "p",
        text: "UPI made paying friends instant — but it did not solve the harder question: who owes whom after a group dinner, trip, or shared purchase? Combining UPI with a group expense tracker like BillBuddy closes that gap.",
      },
      {
        type: "h2",
        text: "Why UPI alone is not enough",
      },
      {
        type: "p",
        text: "Sending ₹500 on PhonePe or Google Pay settles one payment, but it does not show the full picture across ten expenses and five people. You need a running balance — a hisab — that accounts for everything before you settle.",
      },
      {
        type: "h2",
        text: "How BillBuddy works with UPI",
      },
      {
        type: "ul",
        items: [
          "Track all group expenses in INR with ₹ symbol support",
          "See simplified balances — who should pay whom and how much",
          "Send UPI payment outside the app, then record it inside BillBuddy",
          "Keep a full payment history for every group",
        ],
      },
      {
        type: "h2",
        text: "Best practices for group hisab in India",
      },
      {
        type: "p",
        text: "Log expenses the same day, especially after outings. Use equal split for daftar lunches and custom split when someone did not eat or drink. Settle balances weekly for active groups to keep amounts small and manageable.",
      },
    ],
  },
  {
    slug: "equal-vs-custom-expense-split",
    title: "Equal vs Custom Expense Split: Which Should You Use?",
    excerpt:
      "Understand when to split bills equally versus custom amounts per person — and how an expense splitter app handles both automatically.",
    keywords: [
      "equal expense split",
      "custom expense split",
      "split bill equally",
      "expense split methods",
      "bill splitting app",
    ],
    category: "Tips",
    publishedAt: "2025-07-18",
    readTimeMinutes: 4,
    author: "BillBuddy Team",
    coverImage: "/blog/covers/equal-custom-split.svg",
    blocks: [
      {
        type: "p",
        text: "Every group expense falls into one of two buckets: everyone shares equally, or shares differ. Choosing the right split method keeps things fair and avoids unnecessary arguments.",
      },
      {
        type: "h2",
        text: "When to use equal split",
      },
      {
        type: "ul",
        items: [
          "Group dinners where everyone ordered similarly",
          "Shared groceries for the household",
          "Fixed costs like rent split among all roommates",
          "Trip costs everyone benefited from equally",
        ],
      },
      {
        type: "h2",
        text: "When to use custom split",
      },
      {
        type: "ul",
        items: [
          "Restaurant bills where people ordered different priced items",
          "Utilities when one roommate has a larger room",
          "Activities only some group members joined",
          "Any expense where participation was unequal",
        ],
      },
      {
        type: "h2",
        text: "Let the app do the math",
      },
      {
        type: "p",
        text: "BillBuddy supports both modes. Toggle equal split for quick entry, or switch to custom amounts and the app validates that shares add up to the total. Remaining balance indicators show if you are off by even a rupee or cent.",
      },
    ],
  },
  {
    slug: "settle-group-debts-without-awkwardness",
    title: "How to Settle Group Debts Without Awkward Conversations",
    excerpt:
      "Practical tips for settling up with friends using a settle up app — reduce tension, record payments, and keep group finances transparent.",
    keywords: [
      "settle up app",
      "settle group debts",
      "who owes whom",
      "group payment tracker",
      "pay back friends",
    ],
    category: "Tips",
    publishedAt: "2025-08-22",
    readTimeMinutes: 5,
    author: "BillBuddy Team",
    coverImage: "/blog/covers/settle-debts.svg",
    blocks: [
      {
        type: "p",
        text: "Asking a friend to pay you back feels uncomfortable — but unclear IOUs feel worse. The solution is a shared system where balances are visible to everyone and settling up becomes a normal, low-stress step.",
      },
      {
        type: "h2",
        text: "Make balances visible to the whole group",
      },
      {
        type: "p",
        text: "When everyone sees the same numbers in BillBuddy, there is no he-said-she-said. Balances update automatically after every expense and payment. Transparency removes the need for uncomfortable reminders.",
      },
      {
        type: "h2",
        text: "Simplify who pays whom",
      },
      {
        type: "p",
        text: "Complex group debts can be simplified. Instead of A owing B, B owing C, and C owing A, the app calculates net positions so fewer transactions are needed to get everyone to zero.",
      },
      {
        type: "h2",
        text: "Record every settlement",
      },
      {
        type: "p",
        text: "After paying via UPI, cash, or bank transfer, record the payment in the app. This closes the loop and updates balances instantly. Both parties have proof, and the group activity log shows a complete history.",
      },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
