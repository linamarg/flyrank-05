import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/linamarg/flyrank-05)';
const CACHE_DIR = 'cache';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    await delay(500); // pauses for 500ms
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

function extractNextPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const href = $('li.next a').attr('href');

  if (!href) {
    return null;
  }

  return new URL(href, pageUrl).href;
}

let currentUrl = 'https://books.toscrape.com/catalogue/page-1.html';
let allBookLinks = [];

for (let pageNum = 1; pageNum <= 3; pageNum++){
  const cacheFilePath = `cache/catalogue-page-${pageNum}.html`;
  const html = await fetchPage(currentUrl, cacheFilePath);
  allBookLinks = allBookLinks.concat(extractBookLinks(html, currentUrl));
  currentUrl = extractNextPage(html, currentUrl);
}

const uniqueUrls = [...new Set(allBookLinks)];

console.log(`catalogue_pages=3`);
console.log(`discovered=${allBookLinks.length}`);
console.log(`unique_urls=${uniqueUrls.length}`);


