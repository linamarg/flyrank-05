import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/linamarg/flyrank-05)';
const CACHE_DIR = 'cache';

async function fetchPage(url, cacheFilePath) {
  if (fs.existsSync(cacheFilePath)) {
    const html = fs.readFileSync(cacheFilePath, 'utf-8');
    console.log('CACHE HIT', cacheFilePath, html.length);
    return html;
  } else {
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(5000)
    });
    if (response.status !== 200) {
        throw new Error(`Fetch failed: ${response.status} for ${url}`);
    }
    const html = await response.text();
    fs.writeFileSync(cacheFilePath, html);
    console.log('FETCH', cacheFilePath, html.length);
    return html;
  }
}

function extractBookLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $('.product_pod h3 a').each((i, el) => {
    const href = $(el).attr('href');
    const absoluteUrl = new URL(href, pageUrl).href;
    links.push(absoluteUrl);
  });

  return links;
}

const url = 'https://books.toscrape.com/catalogue/page-1.html';
const cacheFilePath = 'cache/catalogue-page-1.html';

const html = await fetchPage(url, cacheFilePath);
const bookLinks = extractBookLinks(html, url);

console.log('found links:', bookLinks.length);
console.log(bookLinks.slice(0, 3)); // just print first 3 to sanity check