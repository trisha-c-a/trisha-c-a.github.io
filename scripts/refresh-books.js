#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = process.cwd();
const DATA_FILE = path.join(ROOT_DIR, "data", "books.json");
const GOODREADS_USER_ID = process.env.GOODREADS_USER_ID;
const GOODREADS_RSS_URL = GOODREADS_USER_ID
  ? `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?shelf=read`
  : "";

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTagValue(xmlBlock, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xmlBlock.match(regex);
  if (!match || !match[1]) {
    return "";
  }

  const raw = match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  return decodeXmlEntities(stripHtml(raw));
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeTitle(value) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeAuthor(value) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "trisha-reading-refresh-bot/1.0",
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response.text();
}

function parseGoodreadsRss(xml) {
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return itemMatches
    .map((itemXml) => {
      const title = extractTagValue(itemXml, "book_title") || extractTagValue(itemXml, "title");
      const author = extractTagValue(itemXml, "author_name");
      const bookId = extractTagValue(itemXml, "book_id");
      const isbn = extractTagValue(itemXml, "isbn") || "";
      const isbn13 = extractTagValue(itemXml, "isbn13") || "";
      const coverUrl = extractTagValue(itemXml, "book_large_image_url") || extractTagValue(itemXml, "book_image_url");
      const userReadAt = extractTagValue(itemXml, "user_read_at");
      const pubDate = extractTagValue(itemXml, "pubDate");
      const parsedDate = parseDate(userReadAt) || parseDate(pubDate);

      return {
        goodreadsId: bookId || `${normalizeTitle(title)}::${normalizeAuthor(author)}`,
        title,
        author,
        isbn,
        isbn13,
        coverUrl,
        dateRead: parsedDate ? parsedDate.toISOString().slice(0, 10) : null,
        yearRead: parsedDate ? parsedDate.getUTCFullYear() : null,
        hasDate: Boolean(parsedDate),
        genres: [],
        genreEnrichedFrom: "none",
      };
    })
    .filter((book) => Boolean(book.title));
}

function buildMergedBooks(parsedBooks, previousData) {
  const previousBooks = Array.isArray(previousData && previousData.books) ? previousData.books : [];
  const previousById = new Map(previousBooks.map((book) => [book.goodreadsId, book]));
  const mergedBooks = previousBooks.slice();
  const addedBooks = [];

  parsedBooks.forEach((book) => {
    if (previousById.has(book.goodreadsId)) {
      return;
    }

    addedBooks.push({
      ...book,
      genres: [],
      genreEnrichedFrom: "none",
    });
  });

  return mergedBooks.concat(addedBooks);
}

function buildStats(books) {
  const yearBreakdown = {};
  const genreCount = {};
  let minYear = null;
  let maxYear = null;

  books.forEach((book) => {
    if (book.yearRead) {
      const yearKey = String(book.yearRead);
      yearBreakdown[yearKey] = (yearBreakdown[yearKey] || 0) + 1;

      if (minYear === null || book.yearRead < minYear) {
        minYear = book.yearRead;
      }

      if (maxYear === null || book.yearRead > maxYear) {
        maxYear = book.yearRead;
      }
    }

    (book.genres || []).forEach((genreItem) => {
      const name = typeof genreItem === "string" ? genreItem : genreItem && genreItem.name;
      if (!name) {
        return;
      }

      genreCount[name] = (genreCount[name] || 0) + 1;
    });
  });

  return {
    totalBooks: books.length,
    yearBreakdown,
    genreCount,
    minYear,
    maxYear,
  };
}

function dedupeBooks(books) {
  const bookMap = new Map();

  books.forEach((book) => {
    const key = book.goodreadsId || `${normalizeTitle(book.title)}::${normalizeAuthor(book.author)}`;
    const existing = bookMap.get(key);

    if (!existing) {
      bookMap.set(key, book);
      return;
    }

    // Keep the entry with a known read date and latest date when both are present.
    if (!existing.dateRead && book.dateRead) {
      bookMap.set(key, book);
      return;
    }

    if (existing.dateRead && book.dateRead && existing.dateRead < book.dateRead) {
      bookMap.set(key, book);
    }
  });

  return Array.from(bookMap.values()).sort((a, b) => {
    if (!a.dateRead && !b.dateRead) {
      return a.title.localeCompare(b.title);
    }

    if (!a.dateRead) {
      return 1;
    }

    if (!b.dateRead) {
      return -1;
    }

    return b.dateRead.localeCompare(a.dateRead);
  });
}

async function readExistingData() {
  try {
    const text = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeDataFile(payload) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const nextText = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(DATA_FILE, nextText, "utf-8");
}

async function main() {
  if (!GOODREADS_RSS_URL) {
    throw new Error("Missing GOODREADS_USER_ID.");
  }

  const [xml, previousData] = await Promise.all([
    fetchText(GOODREADS_RSS_URL),
    readExistingData(),
  ]);

  const parsedBooks = parseGoodreadsRss(xml);
  const dedupedBooks = dedupeBooks(parsedBooks);
  const mergedBooks = buildMergedBooks(dedupedBooks, previousData);
  const stats = buildStats(mergedBooks);

  const payload = {
    lastUpdated: new Date().toISOString(),
    refreshStatus: "success",
    books: mergedBooks,
    stats,
  };

  await writeDataFile(payload);
  console.log(`Wrote ${mergedBooks.length} books to data/books.json`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
